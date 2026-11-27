"""Freeze saved workflow and Flex definitions for side-effect-free inbox replays."""

import json
from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.api_v1.inbox import owned_bot
from app.dependencies import get_db_primary

router = APIRouter(prefix="/{bot_id}/inbox/releases")


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


@router.post("/templates/{template_id}")
async def freeze(
    template_id: UUID,
    bot: UUID = Depends(owned_bot),
    db: AsyncSession = Depends(get_db_primary),
):
    params = dict(bot=bot, template=template_id)
    template = (
        (
            await db.execute(
                text("""
        SELECT t.name,t.logic_blocks,t.user_id FROM logic_templates t JOIN bots b ON b.id=t.bot_id
        WHERE t.bot_id=:bot AND t.id=:template AND t.user_id=b.user_id FOR UPDATE OF t
    """),
                params,
            )
        )
        .mappings()
        .one_or_none()
    )
    if not template:
        raise HTTPException(404, "找不到這個頻道的流程")
    graph = template["logic_blocks"]
    if not isinstance(graph, dict) or graph.get("schemaVersion") != "workflow-graph/v1":
        raise HTTPException(422, "請先儲存新版流程圖")
    nodes = graph.get("nodes")
    edges = graph.get("edges")
    if (
        not isinstance(nodes, list)
        or not nodes
        or not isinstance(edges, list)
        or not all(
            isinstance(n, dict)
            and isinstance(n.get("data"), dict)
            and isinstance(n.get("id"), str)
            for n in nodes
        )
    ):
        raise HTTPException(422, "流程缺少可重播的節點")
    ids = {n["id"] for n in nodes}
    if len(ids) != len(nodes) or not all(
        isinstance(e, dict)
        and isinstance(e.get("source"), str)
        and isinstance(e.get("target"), str)
        and e["source"] in ids
        and e["target"] in ids
        for e in edges
    ):
        raise HTTPException(422, "流程節點或連線無效")
    flex_ids = {
        str(node["data"].get("flexMessageId") or "")
        for node in nodes
        if node.get("type") == "action.replyFlex"
    }
    assets = (
        (
            await db.execute(
                text("""
        SELECT id,name,content FROM flex_messages WHERE user_id=:owner AND id::text=ANY(CAST(:ids AS text[]))
        ORDER BY id
    """),
                {"owner": template["user_id"], "ids": sorted(flex_ids)},
            )
        )
        .mappings()
        .all()
    )
    if len(assets) != len(flex_ids):
        raise HTTPException(422, "有 Flex 節點尚未連到可讀取的樣板")
    flex = []
    for asset in assets:
        content = asset["content"]
        if isinstance(content, dict) and content.get("type") == "flex":
            content = content.get("contents")
        if not isinstance(content, dict) or content.get("type") not in (
            "bubble",
            "carousel",
        ):
            raise HTTPException(422, "請先在 Flex 編輯器儲存可預覽的樣板")
        flex.append(
            dict(
                id=str(asset["id"]),
                name=asset["name"],
                content=content,
                digest=sha256(canonical(content).encode()).hexdigest(),
            )
        )
    name = template["name"]
    digest = sha256(canonical([name, graph, flex]).encode()).hexdigest()
    previous = (
        (
            await db.execute(
                text("""
        SELECT id,version,digest FROM inbox_flow_releases WHERE bot_id=:bot AND template_id=:template
        ORDER BY version DESC LIMIT 1
    """),
                params,
            )
        )
        .mappings()
        .one_or_none()
    )
    if previous and previous["digest"] == digest:
        return {"id": previous["id"], "version": previous["version"]}
    version = previous["version"] + 1 if previous else 1
    release = uuid4()
    await db.execute(
        text("""
        INSERT INTO inbox_flow_releases(id,bot_id,template_id,name,version,digest,graph,flex)
        VALUES(:id,:bot,:template,:name,:version,:digest,CAST(:graph AS jsonb),CAST(:flex AS jsonb))
    """),
        dict(
            params,
            id=release,
            name=name,
            version=version,
            digest=digest,
            graph=canonical(graph),
            flex=canonical(flex),
        ),
    )
    await db.commit()
    return {"id": release, "version": version}


@router.get("")
async def releases(
    bot: UUID = Depends(owned_bot), db: AsyncSession = Depends(get_db_primary)
):
    result = await db.execute(
        text(
            "SELECT id,name,version FROM inbox_flow_releases WHERE bot_id=:bot ORDER BY created_at DESC,id"
        ),
        {"bot": bot},
    )
    return result.mappings().all()


@router.get("/{release}")
async def read_release(
    release: UUID,
    bot: UUID = Depends(owned_bot),
    db: AsyncSession = Depends(get_db_primary),
):
    row = (
        (
            await db.execute(
                text(
                    "SELECT id,name,version,graph,flex FROM inbox_flow_releases WHERE bot_id=:bot AND id=:id"
                ),
                {"bot": bot, "id": release},
            )
        )
        .mappings()
        .one_or_none()
    )
    if not row:
        raise HTTPException(404, "找不到流程版本")
    return row
