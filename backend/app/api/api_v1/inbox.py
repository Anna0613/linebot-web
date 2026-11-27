"""Read the new PG inbox through the existing authenticated application."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_async, get_db_primary
from app.models.bot import Bot
from app.models.user import User

router = APIRouter(prefix="/{bot_id}/inbox")


async def owned_bot(bot_id: UUID, response: Response, user: User = Depends(get_current_user_async),
                    db: AsyncSession = Depends(get_db_primary)) -> UUID:
    response.headers["Cache-Control"] = "private, no-store"
    found = await db.scalar(select(Bot.id).where(Bot.id == bot_id, Bot.user_id == user.id))
    if not found:
        raise HTTPException(404, "找不到頻道")
    return bot_id


@router.get("")
async def threads(bot_id: UUID = Depends(owned_bot), db: AsyncSession = Depends(get_db_primary),
                  limit: int = Query(40, ge=1, le=100), offset: int = Query(0, ge=0)):
    result = await db.execute(text("""
        SELECT c.id, c.source_type, c.source_id, c.owner_mode, c.ownership_epoch, c.last_activity,
               m.body, m.kind, m.withdrawn
        FROM inbox_conversations c
        LEFT JOIN LATERAL (
            SELECT body, kind, withdrawn FROM inbox_messages
            WHERE conversation_id=c.id ORDER BY occurred_at DESC, seq DESC LIMIT 1
        ) m ON true
        WHERE c.bot_id=:bot ORDER BY c.last_activity DESC, c.id DESC LIMIT :lim OFFSET :off
    """), {"bot": bot_id, "lim": limit + 1, "off": offset})
    rows = result.mappings().all()
    return {"items": rows[:limit], "has_more": len(rows) > limit}


@router.get("/{thread_id}/messages")
async def messages(thread_id: UUID, bot_id: UUID = Depends(owned_bot),
                   before: int | None = Query(None, ge=1), limit: int = Query(60, ge=1, le=100),
                   db: AsyncSession = Depends(get_db_primary)):
    params = {"bot": bot_id, "thread": thread_id, "lim": limit + 1, "before": before}
    thread = (await db.execute(text("""
        SELECT id, source_id, source_type, owner_mode, ownership_epoch FROM inbox_conversations
        WHERE bot_id=:bot AND id=:thread
    """), params)).mappings().one_or_none()
    if thread is None:
        raise HTTPException(404, "找不到對話")
    result = await db.execute(text("""
        SELECT seq, actor_id, kind, body, withdrawn, occurred_at FROM inbox_messages
        WHERE conversation_id=:thread AND (CAST(:before AS bigint) IS NULL OR seq < :before)
        ORDER BY seq DESC LIMIT :lim
    """), params)
    rows = result.mappings().all()
    return {"thread": thread, "items": list(reversed(rows[:limit])), "has_more": len(rows) > limit}


class Takeover(BaseModel):
    ownership_epoch: int = Field(ge=0)


@router.post("/{thread_id}/takeover")
async def takeover(thread_id: UUID, request: Takeover, bot_id: UUID = Depends(owned_bot),
                   db: AsyncSession = Depends(get_db_primary)):
    params = {"bot": bot_id, "thread": thread_id, "epoch": request.ownership_epoch}
    current = (await db.execute(text("""
        SELECT owner_mode, ownership_epoch FROM inbox_conversations
        WHERE bot_id=:bot AND id=:thread FOR UPDATE
    """), params)).mappings().one_or_none()
    if current is None:
        raise HTTPException(404, "找不到對話")
    if current["owner_mode"] == "human":
        return dict(current)
    if current["ownership_epoch"] != request.ownership_epoch:
        raise HTTPException(409, "對話狀態已變更，請重新整理")
    await db.execute(text("""
        UPDATE inbox_conversations SET owner_mode='human', ownership_epoch=ownership_epoch+1
        WHERE id=:thread
    """), params)
    await db.execute(text("""
        UPDATE inbox_jobs SET state='cancelled' WHERE conversation_id=:thread AND state='pending'
    """), params)
    await db.commit()
    return {"owner_mode": "human", "ownership_epoch": request.ownership_epoch + 1}
