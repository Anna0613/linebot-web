"""
Rich Menu management routes
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from uuid import UUID as PyUUID
import logging
import uuid

from app.dependencies import get_current_user_async  # use standard HTTP auth dependency
from app.database_async import get_async_db
from app.models.user import User
from app.models.bot import Bot
from app.models.line_user import RichMenu
from app.schemas.rich_menu import (
    RichMenuCreate,
    RichMenuUpdate,
    RichMenuResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _assert_bot_ownership(db: AsyncSession, bot_id: str, user_id) -> Bot:
    try:
        bot_uuid = PyUUID(bot_id)
    except Exception:
        raise HTTPException(status_code=400, detail="無效的 Bot ID 格式")

    res = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
    bot = res.scalars().first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在")
    return bot


def _to_response(model: RichMenu) -> RichMenuResponse:
    return RichMenuResponse(
        id=str(model.id),
        bot_id=str(model.bot_id),
        line_rich_menu_id=model.line_rich_menu_id,
        name=model.name,
        chat_bar_text=model.chat_bar_text,
        selected=bool(model.selected),
        size=model.size or {},
        areas=model.areas or [],
        image_url=model.image_url,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


@router.get("/{bot_id}/richmenus", response_model=List[RichMenuResponse])
async def list_rich_menus(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.bot_id == bot.id).order_by(RichMenu.created_at.desc()))
    items = res.scalars().all()
    return [_to_response(m) for m in items]


@router.post("/{bot_id}/richmenus", response_model=RichMenuResponse)
async def create_rich_menu(
    bot_id: str,
    payload: RichMenuCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)

    db_item = RichMenu(
        bot_id=bot.id,
        name=payload.name,
        chat_bar_text=payload.chat_bar_text,
        selected=payload.selected,
        size=payload.size.dict(),
        areas=[a.dict() for a in payload.areas],
    )

    # 若設定為預設，取消其他選取
    if payload.selected:
        await db.execute(
            update(RichMenu)
            .where(RichMenu.bot_id == bot.id)
            .values(selected=False)
        )

    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)

    return _to_response(db_item)


@router.get("/{bot_id}/richmenus/{menu_id}", response_model=RichMenuResponse)
async def get_rich_menu(
    bot_id: str,
    menu_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot.id))
    m = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")
    return _to_response(m)


@router.put("/{bot_id}/richmenus/{menu_id}", response_model=RichMenuResponse)
async def update_rich_menu(
    bot_id: str,
    menu_id: str,
    payload: RichMenuUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot_id))
    m: Optional[RichMenu] = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")

    data = payload.dict(exclude_unset=True)
    if "size" in data and data["size"] is not None:
        data["size"] = payload.size.dict() if payload.size else None
    if "areas" in data and data["areas"] is not None:
        data["areas"] = [a.dict() for a in payload.areas or []]

    for k, v in data.items():
        setattr(m, k, v)

    # 若改為預設，取消其他選取
    if payload.selected:
        await db.execute(
            update(RichMenu)
            .where(RichMenu.bot_id == bot.id, RichMenu.id != m.id)
            .values(selected=False)
        )

    await db.commit()
    await db.refresh(m)
    return _to_response(m)


@router.delete("/{bot_id}/richmenus/{menu_id}")
async def delete_rich_menu(
    bot_id: str,
    menu_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot.id))
    m = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")
    await db.delete(m)
    await db.commit()
    return {"message": "刪除成功"}


@router.post("/{bot_id}/richmenus/{menu_id}/default")
async def set_default_rich_menu(
    bot_id: str,
    menu_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot_id))
    m = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")

    await db.execute(update(RichMenu).where(RichMenu.bot_id == bot.id).values(selected=False))
    m.selected = True
    await db.commit()
    await db.refresh(m)
    return _to_response(m)


@router.delete("/{bot_id}/richmenus/default")
async def unset_default_rich_menu(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    await _assert_bot_ownership(db, bot_id, current_user.id)
    await db.execute(update(RichMenu).where(RichMenu.bot_id == bot_id).values(selected=False))
    await db.commit()
    return {"message": "已取消預設 Rich Menu"}


@router.post("/{bot_id}/richmenus/{menu_id}/image", response_model=RichMenuResponse)
async def upload_rich_menu_image(
    bot_id: str,
    menu_id: str,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot.id))
    m: Optional[RichMenu] = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")

    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="空的圖片內容")

    try:
        from app.services.minio_service import get_minio_service
        svc = get_minio_service()
        if not svc:
            raise RuntimeError("MinIO 服務不可用")

        # object path: richmenus/{bot_id}/{uuid}.{ext}
        content_type = image.content_type or "application/octet-stream"
        ext = svc._get_file_extension(content_type)
        object_path = f"richmenus/{bot_id}/{uuid.uuid4().hex}{ext}"

        import asyncio
        from io import BytesIO

        await asyncio.to_thread(
            svc.client.put_object,
            svc.bucket_name,
            object_path,
            BytesIO(content),
            len(content),
            content_type=content_type,
        )

        # get a presigned url via proxy helper
        image_url = svc.get_presigned_url(object_path)
        m.image_url = image_url or object_path
        await db.commit()
        await db.refresh(m)
    except Exception as e:
        logger.error(f"上傳 Rich Menu 圖片失敗: {e}")
        raise HTTPException(status_code=500, detail="圖片上傳失敗")

    return _to_response(m)
