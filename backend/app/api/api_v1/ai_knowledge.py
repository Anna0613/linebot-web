"""
AI Knowledge base management & AI takeover toggle
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.sql import text as sql_text

from app.db.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.models.user import User
from app.models.bot import Bot
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.schemas.ai_knowledge import (
    AIToggleResponse, AIToggleRequest,
    KnowledgeCreateTextRequest, KnowledgeChunkResponse,
    KnowledgeSearchResponse, KnowledgeSearchResponseItem,
    KnowledgeDocumentResponse, KnowledgeDocumentListResponse, BatchDeleteDocumentsRequest,
)
from app.services.storage.text_chunker import recursive_split

logger = logging.getLogger(__name__)

router = APIRouter()

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
                from app.services.ai.groq_service import GroqService
                if not GroqService.validate_model(payload.model):
                    raise HTTPException(status_code=400, detail='不支援的 Groq 模型')
        except ImportError:
            pass
        bot.ai_model = payload.model
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
        history_messages=getattr(bot, 'ai_history_messages', None),
        system_prompt=getattr(bot, 'ai_system_prompt', None),
    )


def _scope_to_bot_id(scope: str, bot_id: str) -> Optional[str]:
    # Knowledge is scoped to the current LINE Bot. The scope parameter is kept
    # for backward-compatible clients, but global knowledge is no longer used.
    return bot_id


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
        original_content=payload.content,
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

    chunks = [chunk for chunk in chunks if chunk and chunk.strip()]
    if not chunks:
        raise HTTPException(status_code=400, detail="內容不可為空")

    created_chunk = None
    for i, txt in enumerate(chunks):
        kc = KnowledgeChunk(
            document_id=doc.id,
            bot_id=scope_bot,
            content=txt,
            meta={"chunk_index": i, "source_type": "text"},
        )
        db.add(kc)
        if created_chunk is None:
            created_chunk = kc
    await db.commit()
    await db.refresh(created_chunk)
    return _to_chunk_response(created_chunk)


@router.get("/{bot_id}/knowledge/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    bot_id: str,
    q: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _ensure_bot_owned(db, bot_id, current_user.id)
    pattern = f"%{q.strip()}%"
    if not q.strip():
        return KnowledgeSearchResponse(items=[])

    stmt = (
        select(KnowledgeChunk)
        .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
        .where(
            KnowledgeChunk.bot_id == bot_id,
            KnowledgeChunk.deleted_at.is_(None),
            KnowledgeDocument.deleted_at.is_(None),
            or_(
                KnowledgeChunk.content.ilike(pattern),
                KnowledgeDocument.title.ilike(pattern),
                KnowledgeDocument.original_file_name.ilike(pattern),
                KnowledgeDocument.ai_summary.ilike(pattern),
                KnowledgeDocument.original_content.ilike(pattern),
            ),
        )
        .order_by(KnowledgeChunk.created_at.desc())
        .limit(10)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return KnowledgeSearchResponse(
        items=[
            KnowledgeSearchResponseItem(
                id=str(kc.id),
                document_id=str(kc.document_id),
                bot_id=str(kc.bot_id) if kc.bot_id else None,
                content=kc.content,
                score=1.0,
            )
            for kc in rows
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
