"""Stage immutable knowledge publications for the R2 Worker."""

from pathlib import PurePath
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.knowledge.source_publication import MAX_BYTES, stage_version

from app.api.api_v1.inbox import owned_bot
from app.dependencies import get_db_primary

router = APIRouter(prefix="/{bot_id}/inbox/sources")


@router.get("")
async def sources(
    bot: UUID = Depends(owned_bot), db: AsyncSession = Depends(get_db_primary)
):
    rows = await db.execute(
        text("""
        SELECT s.id,s.active_version,v.version,v.filename,v.published_at
        FROM inbox_sources s JOIN LATERAL (
          SELECT version,filename,published_at FROM inbox_source_versions
          WHERE source_id=s.id ORDER BY version DESC LIMIT 1
        ) v ON true WHERE s.bot_id=:bot AND NOT s.withdrawn ORDER BY v.filename,s.id
    """),
        {"bot": bot},
    )
    return rows.mappings().all()


@router.put("/{source_id}", status_code=202)
async def publish(
    source_id: UUID,
    file: UploadFile = File(...),
    base_version: int = Form(..., ge=0),
    bot: UUID = Depends(owned_bot),
    db: AsyncSession = Depends(get_db_primary),
):
    name = PurePath(file.filename or "").name
    raw = await file.read(MAX_BYTES + 1)
    result = await stage_version(db, bot, source_id, base_version, name, raw)
    await db.commit()
    return result


@router.delete("/{source_id}")
async def withdraw(
    source_id: UUID,
    version: int,
    bot: UUID = Depends(owned_bot),
    db: AsyncSession = Depends(get_db_primary),
):
    params = dict(id=source_id, bot=bot)
    source = (
        await db.execute(
            text(
                "SELECT withdrawn FROM inbox_sources WHERE id=:id AND bot_id=:bot FOR UPDATE"
            ),
            params,
        )
    ).first()
    if not source:
        raise HTTPException(404, "找不到來源")
    latest = await db.scalar(
        text("SELECT max(version) FROM inbox_source_versions WHERE source_id=:id"),
        params,
    )
    if version != latest:
        raise HTTPException(409, "來源已更新，請重新整理")
    await db.execute(
        text("UPDATE inbox_sources SET withdrawn=true WHERE id=:id"), params
    )
    await db.execute(
        text(
            "UPDATE inbox_source_versions SET raw_bytes=NULL,normalized_bytes=NULL WHERE source_id=:id AND published_at IS NULL"
        ),
        params,
    )
    await db.commit()
    return {"withdrawn": True}
