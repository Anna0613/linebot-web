"""Persist the operator's broadcast intent and its selected recipients together."""

from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import text


async def enqueue_campaign(db, bot_id, user_id, data, *, selective):
    body = data.get("message")
    if not isinstance(body, str) or not body.strip() or len(body.encode("utf-16-le")) // 2 > 5000:
        raise HTTPException(422, "請提供 1 到 5000 字元的文字")
    recipients = data.get("user_ids")
    if selective or recipients is not None:
        if (
            not isinstance(recipients, list)
            or not 1 <= len(recipients) <= 500
            or any(not isinstance(uid, str) or not uid.strip() for uid in recipients)
        ):
            raise HTTPException(422, "請選取 1 到 500 位好友")
        recipients = sorted(set(recipients))
    try:
        key = UUID(data["client_key"]) if "client_key" in data else uuid4()
    except (TypeError, ValueError, AttributeError):
        raise HTTPException(422, "廣播識別碼格式錯誤")

    params = {
        "bot": bot_id,
        "actor": user_id,
        "body": body.strip(),
        "key": key,
        "targets": recipients,
    }
    active = await db.scalar(
        text("SELECT is_active FROM bots WHERE id=:bot AND user_id=:actor FOR UPDATE"), params
    )
    if active is None:
        raise HTTPException(404, "找不到頻道")
    previous = (
        await db.execute(
            text("""
        SELECT id, actor_id, body, recipients, delivery_state FROM inbox_campaigns
        WHERE bot_id=:bot AND client_key=:key
    """),
            params,
        )
    ).one_or_none()
    if previous:
        if previous.actor_id != user_id or previous.body != params["body"] or previous.recipients != recipients:
            raise HTTPException(409, "此識別碼已用於其他廣播")
        return {"success": True, "id": previous.id, "state": previous.delivery_state}
    if not active:
        raise HTTPException(409, "頻道已停用")
    if recipients:
        known = await db.scalar(
            text("""
            SELECT count(*) FROM (
                SELECT line_user_id FROM line_bot_users WHERE bot_id=:bot AND line_user_id=ANY(CAST(:targets AS text[]))
                UNION
                SELECT source_id FROM inbox_conversations WHERE bot_id=:bot AND source_type='user'
                  AND source_id=ANY(CAST(:targets AS text[]))
            ) contacts
        """),
            params,
        )
        if known != len(recipients):
            raise HTTPException(422, "廣播名單含有不屬於此頻道的好友")

    campaign = await db.scalar(
        text("""
        INSERT INTO inbox_campaigns(bot_id,actor_id,body,client_key,recipients)
        VALUES(:bot,:actor,:body,:key,CAST(:targets AS text[])) RETURNING id
    """),
        params,
    )
    if recipients:
        # Native LINE broadcasts target all followers. Only multicast supplies an
        # explicit recipient list that can truthfully be attached to individual chats.
        await db.execute(
            text("""
            WITH threads AS (
                INSERT INTO inbox_conversations(bot_id,source_type,source_id,last_seq,last_activity)
                SELECT :bot,'user',target,1,now() FROM unnest(CAST(:targets AS text[])) AS target ORDER BY target
                ON CONFLICT(bot_id,source_type,source_id) DO UPDATE SET
                    last_seq=inbox_conversations.last_seq+1,last_activity=greatest(inbox_conversations.last_activity,now())
                RETURNING id,last_seq
            )
            INSERT INTO inbox_messages(conversation_id,seq,line_message_id,actor_id,kind,body,occurred_at,
                                       delivery_state,client_key,dispatch_key,campaign_id)
            SELECT id,last_seq,'campaign:' || CAST(:campaign AS text),CAST(:actor AS text),'text',:body,now(),
                   'queued',gen_random_uuid(),gen_random_uuid(),CAST(CAST(:campaign AS text) AS uuid) FROM threads
        """),
            {**params, "campaign": str(campaign), "actor": str(user_id)},
        )
    await db.commit()
    return {"success": True, "id": campaign, "state": "queued"}
