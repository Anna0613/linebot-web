"""Parse and stage immutable knowledge versions for both uploads and migration."""

from hashlib import sha256
from io import BytesIO
from pathlib import PurePath
from uuid import UUID, uuid4
from zipfile import ZipFile

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

MAX_BYTES = 5 * 1024 * 1024
MAX_TEXT = 2 * 1024 * 1024


def docx_parts(document):
    from docx.text.paragraph import Paragraph

    paragraph = table = 0
    for block in document.iter_inner_content():
        if isinstance(block, Paragraph):
            paragraph += 1
            yield f"第 {paragraph} 段", block.text
        else:
            table += 1
            for number, row in enumerate(block.rows, 1):
                yield f"表 {table} 第 {number} 列", " ｜ ".join(
                    cell.text for cell in row.cells
                )


def extract_sections(name: str, raw: bytes):
    ext = PurePath(name).suffix.lower()
    if ext not in (".txt", ".md", ".pdf", ".docx"):
        raise HTTPException(415, "請選擇 TXT、Markdown、PDF 或 DOCX 文件")
    try:
        if ext == ".pdf":
            from PyPDF2 import PdfReader

            pages = PdfReader(BytesIO(raw)).pages
            parts = (
                (f"第 {i} 頁", page.extract_text() or "")
                for i, page in enumerate(pages, 1)
            )
        elif ext == ".docx":
            from docx import Document

            with ZipFile(BytesIO(raw)) as archive:
                if sum(entry.file_size for entry in archive.infolist()) > MAX_BYTES * 8:
                    raise HTTPException(413, "解壓後的文件過大")
            parts = docx_parts(Document(BytesIO(raw)))
        else:
            parts = (
                (f"第 {i} 行", line)
                for i, line in enumerate(raw.decode("utf-8-sig").splitlines(), 1)
            )
        normalized = bytearray()
        sections = []
        for location, part in parts:
            for start in range(0, len(part), 1200):
                value = part[start : start + 1200].strip()
                if not value:
                    continue
                if "\x00" in value:
                    raise ValueError("invalid text")
                encoded = value.encode()
                if (
                    len(normalized) + len(encoded) + 1 > MAX_TEXT
                    or len(sections) >= 10000
                ):
                    raise HTTPException(413, "文件段落或文字量超出試行版上限")
                sections.append(
                    dict(
                        id=uuid4(),
                        location=(
                            location
                            if len(part) <= 1200
                            else f"{location} 字元 {start+1}–{min(len(part),start+1200)}"
                        ),
                        pos=len(normalized),
                        size=len(encoded),
                        content=value,
                        digest=sha256(encoded).hexdigest(),
                    )
                )
                normalized.extend(encoded)
                normalized.append(10)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, "無法從文件讀取文字") from exc
    if not sections:
        raise HTTPException(422, "文件沒有可引用的文字")
    return bytes(normalized), sections


async def stage_version(
    db: AsyncSession,
    bot: UUID,
    source_id: UUID,
    base_version: int,
    name: str,
    raw: bytes,
):
    """Caller owns the transaction and commits the metadata and sections together."""
    if not name or len(name) > 255:
        raise HTTPException(422, "文件名稱無效")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "檔案上限為 5 MiB")
    normalized, sections = await run_in_threadpool(extract_sections, name, raw)
    params = dict(
        id=source_id,
        bot=bot,
        version=base_version + 1,
        name=name,
        raw_hash=sha256(raw).hexdigest(),
        text_hash=sha256(normalized).hexdigest(),
    )
    if base_version == 0:
        await db.execute(
            text("""INSERT INTO inbox_sources(id,bot_id,legacy_document_id)
            SELECT :id,:bot,(SELECT id FROM knowledge_documents WHERE id=:id)
            WHERE NOT EXISTS(SELECT 1 FROM knowledge_documents WHERE id=:id AND (bot_id IS DISTINCT FROM :bot OR deleted_at IS NOT NULL))
            ON CONFLICT DO NOTHING"""),
            params,
        )
    row = (
        await db.execute(
            text("""
        SELECT s.active_version FROM inbox_sources s WHERE s.id=:id AND s.bot_id=:bot AND NOT s.withdrawn
          AND (s.legacy_document_id IS NULL OR EXISTS(SELECT 1 FROM knowledge_documents d
               WHERE d.id=s.legacy_document_id AND d.bot_id=s.bot_id AND d.deleted_at IS NULL))
        FOR UPDATE OF s
    """),
            params,
        )
    ).first()
    if not row:
        raise HTTPException(404, "找不到來源")
    previous = (
        await db.execute(
            text("""
        SELECT version,raw_hash,filename FROM inbox_source_versions WHERE source_id=:id ORDER BY version DESC LIMIT 1
    """),
            params,
        )
    ).first()
    if (
        previous
        and previous.version == base_version + 1
        and previous.raw_hash == params["raw_hash"]
        and previous.filename == name
    ):
        return {"version": previous.version}
    if row.active_version != base_version or (
        previous and previous.version != base_version
    ):
        raise HTTPException(409, "來源已更新或正在發布，請重新整理")
    await db.execute(
        text("""
        INSERT INTO inbox_source_versions(source_id,version,filename,raw_hash,text_hash,raw_bytes,normalized_bytes)
        VALUES(:id,:version,:name,:raw_hash,:text_hash,:raw,:normalized)
    """),
        {**params, "raw": raw, "normalized": normalized},
    )
    await db.execute(
        text("""
        INSERT INTO inbox_source_sections(id,source_id,version,location,byte_start,byte_length,content,sha256)
        VALUES(:id,:source,:version,:location,:pos,:size,:content,:digest)
    """),
        [dict(part, source=source_id, version=base_version + 1) for part in sections],
    )
    return {"version": base_version + 1}
