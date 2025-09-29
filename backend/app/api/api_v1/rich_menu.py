"""
Rich Menu management routes
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional, Dict, Any
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


async def _line_create_and_upload(
    channel_token: str,
    payload: Dict[str, Any],
    image_bytes: bytes,
    content_type: str,
) -> Optional[str]:
    """Create LINE rich menu and upload content. Return richMenuId or None."""
    import aiohttp
    base = "https://api.line.me/v2/bot"
    headers_json = {"Authorization": f"Bearer {channel_token}", "Content-Type": "application/json"}
    async with aiohttp.ClientSession() as session:
        # create
        async with session.post(f"{base}/richmenu", headers=headers_json, json=payload, timeout=20) as resp:
            if resp.status >= 400:
                text = await resp.text()
                logger.warning(f"Create richmenu failed: {resp.status} {text}")
                return None
            data = await resp.json()
            rich_menu_id = data.get("richMenuId")
            if not rich_menu_id:
                return None
        # upload content
        headers_bin = {"Authorization": f"Bearer {channel_token}", "Content-Type": content_type}
        async with session.post(f"{base}/richmenu/{rich_menu_id}/content", headers=headers_bin, data=image_bytes, timeout=40) as resp2:
            if resp2.status >= 400:
                text2 = await resp2.text()
                logger.warning(f"Upload richmenu image failed: {resp2.status} {text2}")
        return rich_menu_id


async def _line_set_default(channel_token: str, rich_menu_id: str) -> bool:
    import aiohttp
    base = "https://api.line.me/v2/bot"
    headers = {"Authorization": f"Bearer {channel_token}"}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{base}/user/all/richmenu/{rich_menu_id}", headers=headers, timeout=15) as resp:
            if resp.status >= 400:
                text = await resp.text()
                logger.warning(f"Set default richmenu failed: {resp.status} {text}")
                return False
            return True


async def _line_upload_content(channel_token: str, rich_menu_id: str, image_bytes: bytes, content_type: str) -> bool:
    import aiohttp
    base = "https://api.line.me/v2/bot"
    headers = {"Authorization": f"Bearer {channel_token}", "Content-Type": content_type}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{base}/richmenu/{rich_menu_id}/content", headers=headers, data=image_bytes, timeout=40) as resp:
            if resp.status >= 400:
                text = await resp.text()
                logger.warning(f"Upload content failed: {resp.status} {text}")
                return False
            return True


async def _get_image_bytes_for_menu(m: RichMenu) -> Optional[bytes]:
    """Try to load image bytes for a menu, from MinIO (preferred) or HTTP fallback."""
    try:
        from app.services.minio_service import get_minio_service
        from urllib.parse import urlparse, parse_qs
        svc = get_minio_service()
        if not svc or not m.image_url:
            raise RuntimeError("minio_service or image_url missing")
        # parse object_path from proxy url
        parsed = urlparse(m.image_url)
        qs = parse_qs(parsed.query or "")
        object_path = None
        if "object_path" in qs:
            object_path = qs["object_path"][0]
        if not object_path:
            # try direct path when not proxy format
            object_path = m.image_url
        import asyncio
        data = await asyncio.to_thread(
            lambda: svc.client.get_object(svc.bucket_name, object_path).read()
        )
        return data
    except Exception as _:
        # fallback HTTP
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(m.image_url, timeout=20) as resp:
                    if resp.status >= 400:
                        return None
                    return await resp.read()
        except Exception:
            return None


@router.post("/{bot_id}/richmenus/{menu_id}/publish", response_model=RichMenuResponse)
async def publish_rich_menu(
    bot_id: str,
    menu_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """Re-publish the rich menu to LINE (create new if needed, upload image, set default)."""
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot.id))
    m: Optional[RichMenu] = res.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")

    # prepare payload
    rm_payload = {
        "size": {"width": 2500, "height": int(m.size.get("height", 1686)) if isinstance(m.size, dict) else 1686},
        "selected": bool(m.selected),
        "name": m.name,
        "chatBarText": m.chat_bar_text,
        "areas": [
            {"bounds": a.get("bounds", {}), "action": a.get("action", {})}
            for a in (m.areas or [])
        ],
    }
    # get image bytes
    img_bytes = await _get_image_bytes_for_menu(m)
    if not img_bytes:
        raise HTTPException(status_code=400, detail="找不到選單圖片或無法讀取")
    content_type = "image/jpeg" if m.image_url and m.image_url.lower().endswith((".jpg", ".jpeg")) else "image/png"

    try:
        rid = await _line_create_and_upload(bot.channel_token, rm_payload, img_bytes, content_type)
        if not rid:
            raise HTTPException(status_code=502, detail="LINE 平台發佈失敗")
        m.line_rich_menu_id = rid
        await db.commit()
        await db.refresh(m)
        if m.selected and m.line_rich_menu_id:
            await _line_set_default(bot.channel_token, m.line_rich_menu_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Publish to LINE failed: {e}")
        raise HTTPException(status_code=502, detail="LINE 平台發佈失敗")

    return _to_response(m)


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
    # 同步 LINE 預設 Rich Menu
    try:
        if m.line_rich_menu_id:
            await _line_set_default(bot.channel_token, m.line_rich_menu_id)
    except Exception as e:
        logger.warning(f"同步 LINE 預設 Rich Menu 失敗: {e}")
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
        # 基本格式驗證
        allowed_types = {"image/jpeg": "jpg", "image/png": "png"}
        ctype = (image.content_type or "").lower()
        if ctype not in allowed_types:
            raise HTTPException(status_code=415, detail="不支援的圖片格式，僅支援 JPG/PNG")

        # 嘗試保護性尺寸驗證與校正
        processed_bytes = content
        try:
            from PIL import Image
            import io
            # 取得目標尺寸（依 richmenu 設定）
            target_w = 2500
            target_h = int(m.size.get("height", 1686)) if isinstance(m.size, dict) else 1686
            img = Image.open(io.BytesIO(content))
            img = img.convert("RGB") if ctype == "image/jpeg" else img.convert("RGBA")
            iw, ih = img.size
            # cover 縮放 + 置中裁切，確保最終符合規格
            scale = max(target_w / iw, target_h / ih)
            new_w, new_h = int(iw * scale), int(ih * scale)
            img = img.resize((new_w, new_h), Image.LANCZOS)
            left = max(0, (new_w - target_w) // 2)
            top = max(0, (new_h - target_h) // 2)
            img = img.crop((left, top, left + target_w, top + target_h))
            out = io.BytesIO()
            if ctype == "image/jpeg":
                img = img.convert("RGB")
                img.save(out, format="JPEG", quality=90)
            else:
                img.save(out, format="PNG")
            processed_bytes = out.getvalue()
        except Exception as _pil_err:
            logger.warning(f"PIL 驗證/校正失敗，將直接儲存原圖: {_pil_err}")

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
            BytesIO(processed_bytes),
            len(processed_bytes),
            content_type=content_type,
        )

        # get a presigned url via proxy helper
        image_url = svc.get_presigned_url(object_path)
        m.image_url = image_url or object_path
        await db.commit()
        await db.refresh(m)

        # 嘗試同步至 LINE 平台（建立/更新圖片、設定預設）
        try:
            rm_payload = {
                "size": {"width": 2500, "height": int(m.size.get("height", 1686)) if isinstance(m.size, dict) else 1686},
                "selected": bool(m.selected),
                "name": m.name,
                "chatBarText": m.chat_bar_text,
                "areas": [
                    {"bounds": a.get("bounds", {}), "action": a.get("action", {})}
                    for a in (m.areas or [])
                ],
            }
            rid: Optional[str] = m.line_rich_menu_id
            if not rid:
                rid = await _line_create_and_upload(bot.channel_token, rm_payload, processed_bytes, content_type)
                if rid:
                    m.line_rich_menu_id = rid
                    await db.commit()
                    await db.refresh(m)
            else:
                # 既有 id：只更新內容圖
                await _line_upload_content(bot.channel_token, rid, processed_bytes, content_type)

            if m.selected and m.line_rich_menu_id:
                await _line_set_default(bot.channel_token, m.line_rich_menu_id)
        except Exception as sync_err:
            logger.warning(f"同步 LINE Rich Menu 失敗: {sync_err}")
    except Exception as e:
        logger.error(f"上傳 Rich Menu 圖片失敗: {e}")
        raise HTTPException(status_code=500, detail="圖片上傳失敗")

    return _to_response(m)
