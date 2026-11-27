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
        SELECT m.seq, m.actor_id, m.kind, m.body, m.withdrawn, m.occurred_at,m.delivery_state,
               j.seq IS NOT NULL AS can_draft,
               CASE WHEN j.draft_state='ready' AND p.id IS NULL THEN 'stale' ELSE j.draft_state END AS draft_state,
               CASE WHEN p.id IS NOT NULL THEN j.draft_body END AS draft_body,
               p.filename AS source_title, p.content AS source_excerpt,
               p.version AS source_version,p.location AS source_location,
               j.draft_tools, j.draft_model
        FROM inbox_messages m
        LEFT JOIN inbox_jobs j ON j.conversation_id=m.conversation_id AND j.seq=m.seq AND j.state='pending'
        LEFT JOIN inbox_published_sections p ON p.id=j.draft_chunk AND p.bot_id=:bot AND p.sha256=j.draft_hash
        WHERE m.conversation_id=:thread AND (CAST(:before AS bigint) IS NULL OR m.seq < :before)
        ORDER BY m.seq DESC LIMIT :lim
    """), params)
    rows = result.mappings().all()
    return {"thread": thread, "items": list(reversed(rows[:limit])), "has_more": len(rows) > limit}


@router.post("/{thread_id}/messages/{seq}/draft", status_code=202)
async def request_draft(thread_id: UUID, seq: int, bot_id: UUID = Depends(owned_bot),
                        db: AsyncSession = Depends(get_db_primary)):
    params = {"bot": bot_id, "thread": thread_id, "seq": seq}
    job = (await db.execute(text("""
        SELECT j.draft_state FROM inbox_jobs j JOIN inbox_conversations c ON c.id=j.conversation_id
        JOIN bots b ON b.id=c.bot_id AND b.is_active
        WHERE c.id=:thread AND c.bot_id=:bot AND c.owner_mode='auto'
          AND j.seq=:seq AND j.state='pending' AND j.ownership_epoch=c.ownership_epoch
        FOR UPDATE OF c,j
    """), params)).mappings().one_or_none()
    if job is None:
        raise HTTPException(409, "此訊息已不適合產生草稿")
    if job["draft_state"] not in ("working", "requested"):
        await db.execute(text("""
            UPDATE inbox_jobs SET draft_state='requested',draft_started_at=now(),draft_body=NULL,
                draft_chunk=NULL,draft_hash=NULL,draft_tools='[]',draft_model=NULL
            WHERE conversation_id=:thread AND seq=:seq
        """), params)
    await db.commit()
    return {"state": job["draft_state"] if job["draft_state"] == "working" else "requested"}


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


class HumanReply(Takeover):
    client_key: UUID
    body: str = Field(min_length=1, max_length=5000)


@router.post("/{thread_id}/replies", status_code=202)
async def enqueue_reply(thread_id: UUID, request: HumanReply, bot_id: UUID = Depends(owned_bot),
                        user: User = Depends(get_current_user_async), db: AsyncSession = Depends(get_db_primary)):
    body = request.body.strip()
    if not body or len(body.encode("utf-16-le")) // 2 > 5000:
        raise HTTPException(422, "訊息長度須介於 1 到 5000 字元")
    params = {"bot": bot_id, "thread": thread_id, "key": request.client_key, "body": body,
              "actor": str(user.id)}
    thread = (await db.execute(text("""
        SELECT c.owner_mode,c.ownership_epoch,b.is_active FROM inbox_conversations c
        JOIN bots b ON b.id=c.bot_id WHERE c.id=:thread AND c.bot_id=:bot FOR UPDATE OF c
    """), params)).one_or_none()
    if not thread:
        raise HTTPException(404, "找不到對話")
    previous = (await db.execute(text("""
        SELECT seq,body,delivery_state,actor_id FROM inbox_messages
        WHERE conversation_id=:thread AND client_key=:key
    """), params)).one_or_none()
    if previous:
        if previous.body != body or previous.actor_id != str(user.id):
            raise HTTPException(409, "回覆識別碼已使用")
        return {"seq": previous.seq, "state": previous.delivery_state}
    if not thread.is_active or thread.owner_mode != "human" or thread.ownership_epoch != request.ownership_epoch:
        raise HTTPException(409, "請先接手啟用中的對話")
    seq = await db.scalar(text("""
        WITH next AS (UPDATE inbox_conversations SET last_seq=last_seq+1,last_activity=greatest(last_activity,now())
                      WHERE id=:thread RETURNING last_seq)
        INSERT INTO inbox_messages(conversation_id,seq,line_message_id,actor_id,kind,body,occurred_at,
                                   delivery_state,client_key,dispatch_key,dispatch_after)
        SELECT :thread,last_seq,'out:' || CAST(CAST(:key AS uuid) AS text),:actor,'text',:body,now(),
               'queued',:key,gen_random_uuid(),now() FROM next RETURNING seq
    """), params)
    await db.commit()
    return {"seq": seq, "state": "queued"}


@router.post("/contacts/{line_user_id}/thread")
async def contact_thread(line_user_id: str, bot_id: UUID = Depends(owned_bot),
                         db: AsyncSession = Depends(get_db_primary)):
    params = {"bot": bot_id, "contact":line_user_id}
    row = (await db.execute(text("""
        SELECT id,source_id,source_type,owner_mode,ownership_epoch FROM inbox_conversations
        WHERE bot_id=:bot AND source_type='user' AND source_id=:contact
    """),params)).mappings().one_or_none()
    if row:
        return row
    row = (await db.execute(text("""
        INSERT INTO inbox_conversations(bot_id,source_type,source_id,last_activity)
        SELECT bot_id,'user',line_user_id,now() FROM line_bot_users WHERE bot_id=:bot AND line_user_id=:contact
        ON CONFLICT(bot_id,source_type,source_id) DO UPDATE SET source_id=excluded.source_id
        RETURNING id,source_id,source_type,owner_mode,ownership_epoch
    """),params)).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "找不到好友")
    await db.commit()
    return row
