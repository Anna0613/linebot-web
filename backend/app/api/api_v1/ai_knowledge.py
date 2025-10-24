"""
AI Knowledge base management & AI takeover toggle
"""
from __future__ import annotations

import logging
from typing import Optional
import asyncio
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert
from sqlalchemy.sql import text as sql_text

from app.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.models.user import User
from app.models.bot import Bot
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.schemas.ai_knowledge import (
    AIToggleResponse, AIToggleRequest,
    KnowledgeCreateTextRequest, KnowledgeCreateBulkRequest,
    KnowledgeChunkUpdateRequest, KnowledgeListResponse, KnowledgeChunkResponse,
    KnowledgeSearchResponse, KnowledgeSearchResponseItem, BatchDeleteRequest,
    KnowledgeDocumentResponse, KnowledgeDocumentListResponse, BatchDeleteDocumentsRequest,
)
from app.services.text_chunker import recursive_split
from app.services.embedding_service import embed_text, embed_texts
from app.services.file_text_extractor import extract_text_by_mime
from app.services.minio_service import get_minio_service
from app.services.stream_file_processor import get_stream_file_processor

# 導入 pgvector 支援
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None

logger = logging.getLogger(__name__)

router = APIRouter()


def _format_embedding_for_db(embedding: list[float]) -> any:
    """
    格式化嵌入向量以便儲存到資料庫

    Args:
        embedding: 嵌入向量列表

    Returns:
        適合資料庫儲存的格式
    """
    import math

    # 清理嵌入向量，移除 NaN、Infinity 等無效值
    cleaned_embedding = []
    for value in embedding:
        if math.isnan(value) or math.isinf(value):
            cleaned_embedding.append(0.0)  # 用 0.0 替換無效值
        else:
            cleaned_embedding.append(float(value))

    if Vector is not None:
        # 如果有 pgvector，返回清理後的列表
        return cleaned_embedding
    else:
        # 如果沒有 pgvector，轉換為 JSON 字串格式
        import json
        return json.dumps(cleaned_embedding)


async def _ensure_bot_owned(db: AsyncSession, bot_id: str, user_id) -> Bot:
    res = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == user_id))
    bot = res.scalars().first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限")
    return bot


@router.get("/{bot_id}/ai/settings", response_model=AIToggleResponse)
async def get_ai_settings(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _ensure_bot_owned(db, bot_id, current_user.id)
    return AIToggleResponse(
        bot_id=str(bot.id),
        ai_takeover_enabled=bool(bot.ai_takeover_enabled),
        provider=getattr(bot, 'ai_model_provider', None),
        model=getattr(bot, 'ai_model', None),
        rag_threshold=getattr(bot, 'ai_rag_threshold', None),
        rag_top_k=getattr(bot, 'ai_rag_top_k', None),
        history_messages=getattr(bot, 'ai_history_messages', None),
        system_prompt=getattr(bot, 'ai_system_prompt', None),
    )


@router.post("/{bot_id}/ai/settings", response_model=AIToggleResponse)
async def set_ai_settings(
    bot_id: str,
    payload: AIToggleRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _ensure_bot_owned(db, bot_id, current_user.id)
    bot.ai_takeover_enabled = bool(payload.enabled)
    # 更新 provider/model（目前聚焦 groq）
    if payload.provider:
        bot.ai_model_provider = payload.provider
    if payload.model:
        # validate if groq
        try:
            if (payload.provider or bot.ai_model_provider) == 'groq':
                from app.services.groq_service import GroqService
                if not GroqService.validate_model(payload.model):
                    raise HTTPException(status_code=400, detail='不支援的 Groq 模型')
        except ImportError:
            pass
        bot.ai_model = payload.model
    # RAG 參數
    if payload.rag_threshold is not None:
        bot.ai_rag_threshold = float(payload.rag_threshold)
    if payload.rag_top_k is not None:
        bot.ai_rag_top_k = int(payload.rag_top_k)
    if payload.history_messages is not None:
        bot.ai_history_messages = int(payload.history_messages)
    if payload.system_prompt is not None:
        bot.ai_system_prompt = str(payload.system_prompt)
    await db.commit()
    await db.refresh(bot)
    return AIToggleResponse(
        bot_id=str(bot.id),
        ai_takeover_enabled=bool(bot.ai_takeover_enabled),
        provider=getattr(bot, 'ai_model_provider', None),
        model=getattr(bot, 'ai_model', None),
        rag_threshold=getattr(bot, 'ai_rag_threshold', None),
        rag_top_k=getattr(bot, 'ai_rag_top_k', None),
        history_messages=getattr(bot, 'ai_history_messages', None),
        system_prompt=getattr(bot, 'ai_system_prompt', None),
    )


def _scope_to_bot_id(scope: str, bot_id: str) -> Optional[str]:
    return bot_id if scope == "project" else None


def _to_chunk_response(row) -> KnowledgeChunkResponse:
    return KnowledgeChunkResponse(
        id=str(row.id),
        document_id=str(row.document_id),
        bot_id=str(row.bot_id) if row.bot_id else None,
        source_type=row.meta.get("source_type") if row.meta else "text",
        content=row.content,
        created_at=row.created_at.isoformat() if row.created_at else "",
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )


@router.get("/{bot_id}/knowledge", response_model=KnowledgeListResponse)
async def list_knowledge(
    bot_id: str,
    scope: str = Query("project", regex="^(project|global)$"),
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    offset = (page - 1) * page_size

    # Filter by scope
    target_bot_id = _scope_to_bot_id(scope, bot_id)

    # 只查詢未刪除的切塊和文件
    base = select(KnowledgeChunk).join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id).where(
        KnowledgeChunk.deleted_at.is_(None),
        KnowledgeDocument.deleted_at.is_(None)
    )

    if target_bot_id is None:
        base = base.where(KnowledgeChunk.bot_id == None)  # noqa: E711
    else:
        base = base.where(KnowledgeChunk.bot_id == bot_id)

    if q:
        base = base.where(KnowledgeChunk.content.ilike(f"%{q}%"))

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    res = await db.execute(base.order_by(KnowledgeChunk.created_at.desc()).offset(offset).limit(page_size))
    items = [
        _to_chunk_response(row)
        for row in res.scalars().all()
    ]

    return KnowledgeListResponse(items=items, total=int(total), page=page, page_size=page_size)


@router.post("/{bot_id}/knowledge/text", response_model=KnowledgeChunkResponse)
async def add_text_knowledge(
    bot_id: str,
    payload: KnowledgeCreateTextRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)

    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="內容不可為空")

    scope_bot = _scope_to_bot_id(payload.scope, bot_id)

    # Create document row
    doc = KnowledgeDocument(
        bot_id=scope_bot,
        source_type="text",
        title=(payload.content[:40] + ("…" if len(payload.content) > 40 else "")),
        chunked=payload.auto_chunk,
        meta={"source_type": "text"},
    )
    db.add(doc)
    await db.flush()

    # Build chunks
    chunks: list[str]
    if not payload.auto_chunk or len(payload.content) <= 500:
        chunks = [payload.content]
    else:
        chunks = recursive_split(payload.content, chunk_size=payload.chunk_size, overlap=payload.overlap)

    # 使用 768 維度模型 all-mpnet-base-v2
    embs = await embed_texts(chunks, model_name="all-mpnet-base-v2")
    created_chunk = None
    for i, (txt, emb) in enumerate(zip(chunks, embs)):
        kc = KnowledgeChunk(
            document_id=doc.id,
            bot_id=scope_bot,
            content=txt,
            embedding=_format_embedding_for_db(emb),
            embedding_model="all-mpnet-base-v2",
            embedding_dimensions="768",
            meta={"chunk_index": i, "source_type": "text"},
        )
        db.add(kc)
        if created_chunk is None:
            created_chunk = kc
    await db.commit()
    await db.refresh(created_chunk)
    return _to_chunk_response(created_chunk)


@router.post("/{bot_id}/knowledge/bulk", response_model=KnowledgeListResponse)
async def add_bulk_text(
    bot_id: str,
    payload: KnowledgeCreateBulkRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="內容不可為空")

    scope_bot = _scope_to_bot_id(payload.scope, bot_id)
    doc = KnowledgeDocument(
        bot_id=scope_bot,
        source_type="bulk",
        title=(payload.content[:40] + ("…" if len(payload.content) > 40 else "")),
        chunked=True,
        meta={"source_type": "bulk"},
    )
    db.add(doc)
    await db.flush()

    chunks = recursive_split(payload.content, chunk_size=payload.chunk_size, overlap=payload.overlap)
    # 使用 768 維度模型 all-mpnet-base-v2
    embs = await embed_texts(chunks, model_name="all-mpnet-base-v2")
    created: list[KnowledgeChunkResponse] = []
    for i, (txt, emb) in enumerate(zip(chunks, embs)):
        kc = KnowledgeChunk(
            document_id=doc.id,
            bot_id=scope_bot,
            content=txt,
            embedding=_format_embedding_for_db(emb),
            embedding_model="all-mpnet-base-v2",
            embedding_dimensions="768",
            meta={"chunk_index": i, "source_type": "bulk"},
        )
        db.add(kc)
    await db.commit()
    # list first page of created doc chunks
    res = await db.execute(select(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id).order_by(KnowledgeChunk.created_at.asc()))
    items = [_to_chunk_response(r) for r in res.scalars().all()]
    return KnowledgeListResponse(items=items, total=len(items), page=1, page_size=len(items))


@router.post("/{bot_id}/knowledge/file", response_model=KnowledgeListResponse)
async def add_file_knowledge(
    bot_id: str,
    scope: str = Form("project"),
    file: UploadFile = File(...),
    chunk_size: int = Form(800),
    overlap: int = Form(80),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    try:
        await _ensure_bot_owned(db, bot_id, current_user.id)

        # 使用流式檔案處理器
        stream_processor = get_stream_file_processor()

        # 流式處理檔案（包含格式驗證、大小檢查和記憶體監控）
        try:
            data = await stream_processor.process_upload_stream(file)
            logger.info(f"檔案 {file.filename} 流式處理完成，大小: {len(data) / 1024 / 1024:.2f}MB")
        except HTTPException:
            # 重新拋出 HTTP 異常（檔案格式、大小或記憶體問題）
            raise
        except Exception as e:
            logger.error(f"檔案流式處理失敗: {e}")
            raise HTTPException(status_code=500, detail=f"檔案處理失敗: {str(e)}")

        # Extract text（移至 thread pool 避免阻塞事件圈）
        try:
            import asyncio as _asyncio
            text = await _asyncio.to_thread(extract_text_by_mime, file.filename or "", file.content_type, data)
            logger.info(f"檔案 {file.filename} 文字提取完成，文字長度: {len(text)} 字元")
        except Exception as e:
            logger.error(f"檔案文字提取失敗: {e}")
            raise HTTPException(status_code=400, detail=f"檔案處理失敗: {str(e)}")

        if not text.strip():
            raise HTTPException(status_code=400, detail="檔案內容為空或無法提取文字")

        # Upload to MinIO
        minio = get_minio_service()
        object_path = None
        if minio:
            try:
                # store under knowledge path: {bot_or_global}/knowledge/{uuid}.{ext}
                ext = (file.filename or "").split(".")[-1].lower() if file.filename else "bin"
                user_folder = (bot_id if scope == "project" else "global")
                # Reuse put_object directly
                import uuid
                object_path = f"{user_folder}/knowledge/{uuid.uuid4().hex}.{ext}"
                await asyncio.to_thread(
                    minio.client.put_object,
                    minio.bucket_name,
                    object_path,
                    io.BytesIO(data),
                    len(data),
                    content_type=file.content_type or "application/octet-stream",
                )
                logger.info(f"檔案上傳到 MinIO 成功: {object_path}")
            except Exception as e:  # store may fail; continue without object
                logger.warning(f"MinIO 上傳知識檔案失敗: {e}")

        scope_bot = _scope_to_bot_id(scope, bot_id)

        # Create document
        doc = KnowledgeDocument(
            bot_id=scope_bot,
            source_type="file",
            title=(file.filename or "上傳檔案"),
            original_file_name=file.filename,
            object_path=object_path,
            chunked=True,
            meta={"source_type": "file", "filename": file.filename, "content_type": file.content_type},
        )
        db.add(doc)
        await db.flush()

        # Chunk and embed
        chunks = recursive_split(text, chunk_size=chunk_size, overlap=overlap)
        if not chunks:
            raise HTTPException(status_code=400, detail="檔案內容無法分割成有效的知識片段")

        logger.info(f"開始處理 {len(chunks)} 個知識片段")

        # 使用 768 維度模型 all-mpnet-base-v2
        try:
            embs = await embed_texts(chunks, model_name="all-mpnet-base-v2")
        except Exception as e:
            logger.error(f"嵌入向量生成失敗: {e}")
            raise HTTPException(status_code=500, detail=f"嵌入向量生成失敗: {str(e)}")

        # 優化：使用批次插入提升效能
        chunk_data = []
        for i, (txt, emb) in enumerate(zip(chunks, embs)):
            chunk_data.append({
                "id": uuid.uuid4(),
                "document_id": doc.id,
                "bot_id": scope_bot,
                "content": txt,
                "embedding": _format_embedding_for_db(emb),
                "embedding_model": "all-mpnet-base-v2",
                "embedding_dimensions": "768",
                "meta": {"chunk_index": i, "source_type": "file"}
            })

        # 批次插入所有知識塊
        if chunk_data:
            from sqlalchemy import insert
            await db.execute(insert(KnowledgeChunk).values(chunk_data))

        await db.commit()
        logger.info(f"成功創建文檔和 {len(chunks)} 個知識片段")

        # 獲取創建的知識片段
        res = await db.execute(
            select(KnowledgeChunk)
            .where(KnowledgeChunk.document_id == doc.id)
            .order_by(KnowledgeChunk.created_at.asc())
        )
        items = [_to_chunk_response(r) for r in res.scalars().all()]

        return KnowledgeListResponse(
            items=items,
            total=len(items),
            page=1,
            page_size=len(items)
        )

    except HTTPException:
        # 重新拋出 HTTP 異常
        await db.rollback()
        raise
    except Exception as e:
        # 處理其他未預期的錯誤
        await db.rollback()
        logger.error(f"檔案知識上傳失敗: {e}")
        raise HTTPException(status_code=500, detail=f"檔案處理失敗: {str(e)}")


@router.put("/{bot_id}/knowledge/chunks/{chunk_id}", response_model=KnowledgeChunkResponse)
async def update_chunk(
    bot_id: str,
    chunk_id: str,
    payload: KnowledgeChunkUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)
    res = await db.execute(select(KnowledgeChunk).where(KnowledgeChunk.id == chunk_id))
    kc = res.scalars().first()
    if not kc:
        raise HTTPException(status_code=404, detail="知識片段不存在")
    kc.content = payload.content
    # 使用 768 維度模型 all-mpnet-base-v2
    embedding = await embed_text(payload.content, model_name="all-mpnet-base-v2")
    kc.embedding = _format_embedding_for_db(embedding)
    kc.embedding_model = "all-mpnet-base-v2"
    kc.embedding_dimensions = "768"
    await db.commit()
    await db.refresh(kc)
    # carry source_type via meta
    return _to_chunk_response(kc)


async def _delete_chunk_logic(
    db: AsyncSession,
    chunk_id: str,
) -> bool:
    """
    刪除知識片段的核心邏輯
    返回 True 表示成功，False 表示片段不存在
    """
    res = await db.execute(select(KnowledgeChunk).where(KnowledgeChunk.id == chunk_id))
    kc = res.scalars().first()
    if not kc:
        return False

    # find doc and check if last chunk
    doc_id = kc.document_id
    await db.delete(kc)
    await db.flush()

    # check if doc has remaining chunks
    remaining = (await db.execute(select(func.count()).where(KnowledgeChunk.document_id == doc_id))).scalar() or 0
    if remaining == 0:
        # delete document and MinIO object if any
        doc = (await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))).scalars().first()
        if doc:
            object_path = doc.object_path
            await db.delete(doc)
            if object_path:
                try:
                    minio = get_minio_service()
                    if minio:
                        await asyncio.to_thread(minio.client.remove_object, minio.bucket_name, object_path)
                except Exception as e:
                    logger.warning(f"刪除 MinIO 檔案失敗: {e}")
    return True


@router.delete("/{bot_id}/knowledge/chunks/{chunk_id}")
async def delete_chunk(
    bot_id: str,
    chunk_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)

    success = await _delete_chunk_logic(db, chunk_id)
    if not success:
        raise HTTPException(status_code=404, detail="知識片段不存在")

    await db.commit()
    return {"success": True}


@router.post("/{bot_id}/knowledge/chunks/batch-delete")
async def batch_delete_chunks(
    bot_id: str,
    payload: BatchDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)

    deleted_count = 0
    failed_chunks = []

    try:
        # 在單一事務中處理所有刪除操作
        for cid in payload.chunk_ids:
            try:
                success = await _delete_chunk_logic(db, cid)
                if success:
                    deleted_count += 1
                else:
                    failed_chunks.append(cid)
                    logger.warning(f"知識片段不存在: {cid}")
            except Exception as e:
                failed_chunks.append(cid)
                logger.error(f"刪除知識片段失敗 {cid}: {e}")

        await db.commit()

        result = {"success": True, "deleted_count": deleted_count}
        if failed_chunks:
            result["failed_chunks"] = failed_chunks
            result["message"] = f"成功刪除 {deleted_count} 個片段，{len(failed_chunks)} 個失敗"
        else:
            result["message"] = f"成功刪除 {deleted_count} 個片段"

        return result

    except Exception as e:
        await db.rollback()
        logger.error(f"批量刪除知識片段失敗: {e}")
        raise HTTPException(status_code=500, detail=f"批量刪除失敗: {str(e)}")


@router.get("/{bot_id}/knowledge/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    bot_id: str,
    q: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)
    # vector search using raw SQL to compute cosine similarity
    from app.services.rag_service import RAGService
    items = await RAGService.retrieve(db, bot_id, q)
    return KnowledgeSearchResponse(
        items=[
            KnowledgeSearchResponseItem(
                id=str(kc.id),
                document_id=str(kc.document_id),
                bot_id=str(kc.bot_id) if kc.bot_id else None,
                content=kc.content,
                score=score,
            )
            for kc, score in items
        ]
    )


# ========== 文件列表 API（新增）==========

@router.get("/{bot_id}/knowledge/documents", response_model=KnowledgeDocumentListResponse)
async def list_knowledge_documents(
    bot_id: str,
    scope: str = Query("project", regex="^(project|global)$"),
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    取得知識庫文件列表（而非切塊列表）

    Args:
        bot_id: Bot ID
        scope: project（專案）或 global（全域）
        q: 搜尋關鍵字（搜尋標題或檔案名稱）
        page: 頁碼
        page_size: 每頁筆數
    """
    await _ensure_bot_owned(db, bot_id, current_user.id)
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    offset = (page - 1) * page_size

    # Filter by scope
    target_bot_id = _scope_to_bot_id(scope, bot_id)

    # 基礎查詢：只查詢未刪除的文件
    base = select(KnowledgeDocument).where(KnowledgeDocument.deleted_at.is_(None))

    if target_bot_id is None:
        base = base.where(KnowledgeDocument.bot_id == None)  # noqa: E711
    else:
        base = base.where(KnowledgeDocument.bot_id == bot_id)

    # 搜尋標題或檔案名稱
    if q:
        base = base.where(
            (KnowledgeDocument.title.ilike(f"%{q}%")) |
            (KnowledgeDocument.original_file_name.ilike(f"%{q}%"))
        )

    # 計算總數
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    # 取得文件列表
    res = await db.execute(base.order_by(KnowledgeDocument.created_at.desc()).offset(offset).limit(page_size))
    documents = res.scalars().all()

    # 為每個文件計算切塊數量
    items = []
    for doc in documents:
        # 計算未刪除的切塊數量
        chunk_count_query = select(func.count()).where(
            KnowledgeChunk.document_id == doc.id,
            KnowledgeChunk.deleted_at.is_(None)
        )
        chunk_count = (await db.execute(chunk_count_query)).scalar() or 0

        items.append(KnowledgeDocumentResponse(
            id=str(doc.id),
            bot_id=str(doc.bot_id) if doc.bot_id else None,
            source_type=doc.source_type,
            title=doc.title,
            original_file_name=doc.original_file_name,
            ai_summary=doc.ai_summary,
            chunk_count=chunk_count,
            created_at=doc.created_at.isoformat() if doc.created_at else "",
            updated_at=doc.updated_at.isoformat() if doc.updated_at else "",
        ))

    return KnowledgeDocumentListResponse(
        items=items,
        total=int(total),
        page=page,
        page_size=page_size
    )


# ========== 軟刪除文件 API（新增）==========

async def _soft_delete_document_logic(
    db: AsyncSession,
    document_id: str,
) -> bool:
    """
    軟刪除文件的核心邏輯
    返回 True 表示成功，False 表示文件不存在或已刪除
    """
    from datetime import datetime, timezone

    # 查詢文件
    res = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.deleted_at.is_(None)
        )
    )
    doc = res.scalars().first()
    if not doc:
        return False

    # 設定文件的 deleted_at
    now = datetime.now(timezone.utc)
    doc.deleted_at = now

    # 同時軟刪除所有關聯的切塊
    await db.execute(
        sql_text("""
            UPDATE knowledge_chunks
            SET deleted_at = :now
            WHERE document_id = :doc_id AND deleted_at IS NULL
        """),
        {"now": now, "doc_id": str(document_id)}
    )

    await db.flush()
    return True


@router.delete("/{bot_id}/knowledge/documents/{document_id}")
async def soft_delete_document(
    bot_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """軟刪除單個文件（同時軟刪除所有關聯的切塊）"""
    await _ensure_bot_owned(db, bot_id, current_user.id)

    success = await _soft_delete_document_logic(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="文件不存在或已刪除")

    await db.commit()
    return {"success": True, "message": "文件已刪除"}


@router.post("/{bot_id}/knowledge/documents/batch-delete")
async def batch_soft_delete_documents(
    bot_id: str,
    payload: BatchDeleteDocumentsRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """批次軟刪除文件（同時軟刪除所有關聯的切塊）"""
    await _ensure_bot_owned(db, bot_id, current_user.id)

    deleted_count = 0
    failed_documents = []

    try:
        # 在單一事務中處理所有刪除操作
        for doc_id in payload.document_ids:
            try:
                success = await _soft_delete_document_logic(db, doc_id)
                if success:
                    deleted_count += 1
                else:
                    failed_documents.append(doc_id)
                    logger.warning(f"文件不存在或已刪除: {doc_id}")
            except Exception as e:
                failed_documents.append(doc_id)
                logger.error(f"刪除文件失敗 {doc_id}: {e}")

        await db.commit()

        result = {"success": True, "deleted_count": deleted_count}
        if failed_documents:
            result["failed_documents"] = failed_documents
            result["message"] = f"成功刪除 {deleted_count} 個文件，{len(failed_documents)} 個失敗"
        else:
            result["message"] = f"成功刪除 {deleted_count} 個文件"

        return result

    except Exception as e:
        await db.rollback()
        logger.error(f"批量刪除文件失敗: {e}")
        raise HTTPException(status_code=500, detail=f"批量刪除失敗: {str(e)}")
