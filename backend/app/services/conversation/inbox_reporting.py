"""Read the same PostgreSQL timeline used by the inbox and the delivery worker."""

from sqlalchemy import text

_MESSAGES = """FROM inbox_messages m JOIN inbox_conversations c ON c.id=m.conversation_id
    WHERE c.bot_id=:bot AND (m.delivery_state IS NULL OR m.delivery_state IN ('accepted','simulated'))"""


async def totals(db, bot, days):
    result = await db.execute(
        text(f"""
      SELECT count(*) FILTER (WHERE occurred_at >= now()-make_interval(days=>:days)) AS "totalMessages",
             count(*) FILTER (WHERE occurred_at >= date_trunc('day', now(), 'UTC')) AS "todayMessages",
             count(*) FILTER (WHERE occurred_at >= now()-interval '7 days') AS "weekMessages",
             count(*) FILTER (WHERE occurred_at >= now()-interval '30 days') AS "monthMessages",
             count(DISTINCT actor_id) FILTER (WHERE delivery_state IS NULL AND occurred_at>=now()-make_interval(days=>:days)) AS "activeUsers",
             now()-make_interval(days=>:days) AS "startDate",now() AS "endDate"
      {_MESSAGES} AND occurred_at >= now()-interval '30 days'
    """),
        {"bot": bot, "days": days},
    )
    return result.mappings().one()


async def series(db, bot, days, hourly):
    unit = "hour" if hourly else "day"
    periods = 24 if hourly else min(max(days or 7, 1), 366)
    start = (
        "date_trunc('day',now() AT TIME ZONE 'UTC')"
        if hourly
        else "date_trunc('day',now() AT TIME ZONE 'UTC')-make_interval(days=>:periods-1)"
    )
    rows = await db.execute(
        text(f"""
      WITH bounds AS (SELECT {start} AS first), counts AS (
        SELECT date_trunc('{unit}', m.occurred_at AT TIME ZONE 'UTC') AS bucket,
          count(*) FILTER (WHERE m.delivery_state IS NULL) AS received,
          count(*) FILTER (WHERE m.delivery_state IS NOT NULL) AS sent,
          count(DISTINCT m.actor_id) FILTER (WHERE m.delivery_state IS NULL) AS active
        {_MESSAGES} AND occurred_at >= ((SELECT first FROM bounds) AT TIME ZONE 'UTC') GROUP BY 1)
      SELECT bucket, coalesce(received,0) AS received,coalesce(sent,0) AS sent,coalesce(active,0) AS active
      FROM bounds, generate_series(first,first+(:periods-1)*interval '1 {unit}',interval '1 {unit}') AS buckets(bucket)
      LEFT JOIN counts USING(bucket) ORDER BY bucket
    """),
        {"bot": bot, "periods": periods},
    )
    return [dict(row) for row in rows.mappings()]


async def contact_count(db, bot):
    return await db.scalar(
        text("""
        SELECT count(*) FROM (
            SELECT line_user_id FROM line_bot_users WHERE bot_id=:bot
            UNION
            SELECT source_id FROM inbox_conversations WHERE bot_id=:bot AND source_type='user'
        ) contacts
    """),
        {"bot": bot},
    )


async def dashboard(db, bot, period):
    days = {"day": 1, "week": 7, "month": 30}.get(period, 7)
    metrics = await totals(db, bot, days)
    rows = await db.execute(
        text(f"""
        SELECT extract(hour FROM occurred_at AT TIME ZONE 'UTC')::int AS hour,
               count(DISTINCT actor_id) AS active
        {_MESSAGES} AND delivery_state IS NULL AND occurred_at>=now()-make_interval(days=>:days)
        GROUP BY 1 ORDER BY 1
    """),
        {"bot": bot, "days": days},
    )
    return {
        "active_users": metrics["activeUsers"],
        "total_interactions": metrics["totalMessages"],
        "today_interactions": metrics["todayMessages"],
        "week_interactions": metrics["weekMessages"],
        "month_interactions": metrics["monthMessages"],
        "period": period,
        "start_date": metrics["startDate"].isoformat(),
        "end_date": metrics["endDate"].isoformat(),
        "activity_distribution": [
            {"hour": f"{row.hour:02d}:00", "activeUsers": row.active} for row in rows
        ],
    }


async def contacts(db, bot, limit, offset):
    query = """FROM line_bot_users u FULL JOIN (
      SELECT c.id,c.bot_id,c.source_id,min(m.occurred_at) AS first_seen,c.last_activity,count(m.seq) AS interactions
      FROM inbox_conversations c LEFT JOIN inbox_messages m ON m.conversation_id=c.id AND m.delivery_state IS NULL
      WHERE c.bot_id=:bot AND c.source_type='user' GROUP BY c.id
    ) t ON u.bot_id=t.bot_id AND u.line_user_id=t.source_id WHERE coalesce(u.bot_id,t.bot_id)=:bot"""
    params = {"bot": bot, "lim": limit, "off": offset}
    count = await contact_count(db, bot)
    rows = await db.execute(
        text(
            """SELECT coalesce(u.id,t.id) AS id,coalesce(u.line_user_id,t.source_id) AS line_user_id,
      coalesce(u.display_name,t.source_id,u.line_user_id) AS display_name,coalesce(u.picture_url,'') AS picture_url,
      coalesce(u.status_message,'') AS status_message,coalesce(u.language,'') AS language,
      least(u.first_interaction,t.first_seen) AS first_interaction,greatest(u.last_interaction,t.last_activity) AS last_interaction,
      coalesce(t.interactions::text,u.interaction_count,'0') AS interaction_count,u.is_followed """
            + query
            + " ORDER BY last_interaction DESC NULLS LAST,line_user_id LIMIT :lim OFFSET :off"
        ),
        params,
    )
    return {
        "bot_id": bot,
        "users": rows.mappings().all(),
        "total_count": count,
        "source": "postgresql",
        "pagination": {
            "limit": limit,
            "offset": offset,
            "has_prev": offset > 0,
            "has_next": offset + limit < count,
            "has_more": offset + limit < count,
        },
    }


async def history(db, bot, user_id, limit, offset, sender_type=None):
    query = """FROM inbox_messages m JOIN inbox_conversations c ON c.id=m.conversation_id
        WHERE c.bot_id=:bot AND c.source_type='user' AND c.source_id=:user
        AND (CAST(:sender AS text) IS NULL OR :sender=CASE WHEN m.delivery_state IS NULL THEN 'user' ELSE 'admin' END)"""
    params = {
        "bot": bot,
        "user": user_id,
        "sender": sender_type,
        "lim": max(1, min(limit, 200)),
        "off": max(0, offset),
    }
    count = await db.scalar(text("SELECT count(*) " + query), params)
    rows = await db.execute(
        text(
            """SELECT m.line_message_id AS id,'message' AS event_type,m.kind AS message_type,
        jsonb_build_object('text',CASE WHEN m.withdrawn THEN '訊息已收回' ELSE m.body END) AS message_content,
        CASE WHEN m.delivery_state IS NULL THEN 'user' ELSE 'admin' END AS sender_type,m.occurred_at AS timestamp,m.delivery_state """
            + query
            + " ORDER BY m.seq DESC LIMIT :lim OFFSET :off"
        ),
        params,
    )
    return list(rows.mappings()), count
