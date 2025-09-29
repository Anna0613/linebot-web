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
logger.setLevel(logging.INFO)  # 確保 INFO 級別的日誌會被記錄

# 確保有 console handler
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
router = APIRouter()


def _process_action_for_line_api(action: dict) -> dict:
    """
    根據 action 類型處理參數，確保符合 LINE API 要求

    Args:
        action: 原始 action 字典

    Returns:
        處理後的 action 字典
    """
    if not action or not isinstance(action, dict):
        return {}

    action_type = action.get("type", "")
    logger.info(f"🔧 Processing action: type={action_type}, original_action={action}")
    processed_action = {"type": action_type}

    if action_type == "message":
        # message 類型需要 text 參數
        text = action.get("text")
        if not text:
            # 如果沒有 text，嘗試使用 data 作為備用（向後兼容）
            text = action.get("data", "點擊")
        processed_action["text"] = text

    elif action_type == "postback":
        # postback 類型需要 data 參數
        data = action.get("data", "")
        processed_action["data"] = data

        # 可選的 text 和 displayText
        if action.get("text"):
            processed_action["text"] = action["text"]
        if action.get("displayText"):
            processed_action["displayText"] = action["displayText"]

    elif action_type == "uri":
        # uri 類型需要 uri 參數
        uri = action.get("uri", "")
        processed_action["uri"] = uri

    elif action_type == "datetimepicker":
        # datetimepicker 類型需要 data 和 mode 參數
        data = action.get("data", "")
        mode = action.get("mode", "date")
        processed_action["data"] = data
        processed_action["mode"] = mode

        # 可選參數
        if action.get("initial"):
            processed_action["initial"] = action["initial"]
        if action.get("max"):
            processed_action["max"] = action["max"]
        if action.get("min"):
            processed_action["min"] = action["min"]

    elif action_type == "richmenuswitch":
        # richmenuswitch 類型需要 richMenuAliasId 參數
        rich_menu_alias_id = action.get("richMenuAliasId", "")
        processed_action["richMenuAliasId"] = rich_menu_alias_id

        # 可選的 data 參數
        if action.get("data"):
            processed_action["data"] = action["data"]

    # 移除 None 值
    processed_action = {k: v for k, v in processed_action.items() if v is not None}

    logger.info(f"✅ Processed action result: {processed_action}")
    return processed_action


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
    print(f"🌐 _line_create_and_upload called")
    print(f"🔍 Channel token length: {len(channel_token) if channel_token else 0}")
    print(f"🔍 Payload: {payload}")
    print(f"🔍 Image bytes length: {len(image_bytes)}")
    print(f"🔍 Content type: {content_type}")

    import aiohttp
    base = "https://api.line.me/v2/bot"
    base_data = "https://api-data.line.me/v2/bot"  # For image uploads
    headers_json = {"Authorization": f"Bearer {channel_token}", "Content-Type": "application/json"}

    try:
        print(f"🔍 Creating aiohttp session")
        async with aiohttp.ClientSession() as session:
            rich_menu_id = None
            try:
                # Step 1: Create Rich Menu
                print(f"🔍 Step 1: Creating Rich Menu")
                logger.info(f"Creating Rich Menu with payload: {payload}")
                print(f"🌐 Making POST request to: {base}/richmenu")

                async with session.post(f"{base}/richmenu", headers=headers_json, json=payload, timeout=20) as resp:
                    print(f"🌐 Response status: {resp.status}")
                    if resp.status != 200:
                        text = await resp.text()
                        print(f"❌ Create richmenu failed: HTTP {resp.status} - {text}")
                        logger.error(f"Create richmenu failed: HTTP {resp.status} - {text}")
                        return None

                    data = await resp.json()
                    print(f"✅ Response data: {data}")
                    rich_menu_id = data.get("richMenuId")
                    if not rich_menu_id:
                        print(f"❌ Create richmenu response missing richMenuId")
                        logger.error("Create richmenu response missing richMenuId")
                        return None

                    print(f"✅ Rich Menu created successfully: {rich_menu_id}")
                    logger.info(f"Rich Menu created successfully: {rich_menu_id}")

                # Step 2: Upload Image
                print(f"🔍 Step 2: Uploading image")
                logger.info(f"Uploading image to Rich Menu {rich_menu_id}, size: {len(image_bytes)} bytes, type: {content_type}")

                # Wait a moment for Rich Menu to be ready
                import asyncio
                print(f"⏳ Waiting 2 seconds for Rich Menu to be ready...")
                await asyncio.sleep(2)

                headers_bin = {"Authorization": f"Bearer {channel_token}", "Content-Type": content_type}
                upload_url = f"{base_data}/richmenu/{rich_menu_id}/content"
                print(f"🌐 Upload URL: {upload_url}")
                print(f"🔍 Upload headers: {headers_bin}")
                print(f"🔍 Using api-data.line.me for image upload")

                async with session.post(upload_url, headers=headers_bin, data=image_bytes, timeout=40) as resp2:
                    print(f"🌐 Upload response status: {resp2.status}")
                    print(f"🌐 Upload response headers: {dict(resp2.headers)}")
                    if resp2.status != 200:
                        text2 = await resp2.text()
                        print(f"❌ Upload richmenu image failed: HTTP {resp2.status} - {text2}")
                        logger.error(f"Upload richmenu image failed: HTTP {resp2.status} - {text2}")

                        # Let's also check if the Rich Menu still exists
                        print(f"🔍 Checking if Rich Menu {rich_menu_id} still exists...")
                        async with session.get(f"{base}/richmenu/{rich_menu_id}", headers={"Authorization": f"Bearer {channel_token}"}) as check_resp:
                            print(f"🔍 Rich Menu check status: {check_resp.status}")
                            if check_resp.status == 200:
                                check_data = await check_resp.json()
                                print(f"✅ Rich Menu still exists: {check_data}")
                            else:
                                check_text = await check_resp.text()
                                print(f"❌ Rich Menu check failed: {check_text}")

                        # Clean up: Delete the created Rich Menu if image upload fails
                        try:
                            async with session.delete(f"{base}/richmenu/{rich_menu_id}", headers={"Authorization": f"Bearer {channel_token}"}, timeout=10) as cleanup_resp:
                                if cleanup_resp.status == 200:
                                    logger.info(f"Cleaned up failed Rich Menu: {rich_menu_id}")
                                else:
                                    logger.warning(f"Failed to cleanup Rich Menu {rich_menu_id}: HTTP {cleanup_resp.status}")
                        except Exception as cleanup_err:
                            logger.warning(f"Error during Rich Menu cleanup: {cleanup_err}")

                        return None

                    print(f"✅ Image uploaded successfully to Rich Menu {rich_menu_id}")
                    logger.info(f"Image uploaded successfully to Rich Menu {rich_menu_id}")

                return rich_menu_id

            except Exception as e:
                print(f"❌ Error in _line_create_and_upload: {e}")
                logger.error(f"Error in _line_create_and_upload: {e}")
                import traceback
                print(f"❌ Traceback: {traceback.format_exc()}")

                # Clean up if Rich Menu was created but something went wrong
                if rich_menu_id:
                    try:
                        async with session.delete(f"{base}/richmenu/{rich_menu_id}", headers={"Authorization": f"Bearer {channel_token}"}, timeout=10) as cleanup_resp:
                            if cleanup_resp.status == 200:
                                logger.info(f"Cleaned up failed Rich Menu: {rich_menu_id}")
                    except Exception as cleanup_err:
                        logger.warning(f"Error during Rich Menu cleanup: {cleanup_err}")

                return None
    except Exception as outer_e:
        print(f"❌ Outer error in _line_create_and_upload: {outer_e}")
        logger.error(f"Outer error in _line_create_and_upload: {outer_e}")
        import traceback
        print(f"❌ Outer Traceback: {traceback.format_exc()}")
        return None


async def _line_set_default(channel_token: str, rich_menu_id: str) -> bool:
    """Set Rich Menu as default for all users."""
    import aiohttp
    base = "https://api.line.me/v2/bot"
    headers = {"Authorization": f"Bearer {channel_token}"}

    try:
        async with aiohttp.ClientSession() as session:
            logger.info(f"Setting Rich Menu {rich_menu_id} as default")
            async with session.post(f"{base}/user/all/richmenu/{rich_menu_id}", headers=headers, timeout=15) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.error(f"Set default richmenu failed: HTTP {resp.status} - {text}")
                    return False

                logger.info(f"Rich Menu {rich_menu_id} set as default successfully")
                return True

    except Exception as e:
        logger.error(f"Error setting Rich Menu as default: {e}")
        return False


async def _line_upload_content(channel_token: str, rich_menu_id: str, image_bytes: bytes, content_type: str) -> bool:
    """Upload image content to existing Rich Menu."""
    import aiohttp
    base = "https://api.line.me/v2/bot"
    headers = {"Authorization": f"Bearer {channel_token}", "Content-Type": content_type}

    try:
        async with aiohttp.ClientSession() as session:
            logger.info(f"Uploading content to Rich Menu {rich_menu_id}, size: {len(image_bytes)} bytes, type: {content_type}")
            async with session.post(f"{base}/richmenu/{rich_menu_id}/content", headers=headers, data=image_bytes, timeout=40) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.error(f"Upload content failed: HTTP {resp.status} - {text}")
                    return False

                logger.info(f"Content uploaded successfully to Rich Menu {rich_menu_id}")
                return True

    except Exception as e:
        logger.error(f"Error uploading content to Rich Menu: {e}")
        return False


async def _compress_image(image_bytes: bytes, max_size: int) -> bytes:
    """Compress image to fit within max_size limit."""
    try:
        from PIL import Image
        import io

        print(f"🔧 Starting image compression")
        print(f"🔍 Original size: {len(image_bytes)} bytes")

        # Load image
        img = Image.open(io.BytesIO(image_bytes))
        print(f"🔍 Image format: {img.format}, size: {img.size}, mode: {img.mode}")

        # Convert to RGB if necessary (for JPEG compression)
        if img.mode in ('RGBA', 'LA', 'P'):
            print(f"🔧 Converting {img.mode} to RGB")
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background

        # Try different quality levels
        for quality in [95, 90, 85, 80, 75, 70, 65, 60, 55, 50]:
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            compressed_bytes = output.getvalue()

            print(f"🔍 Quality {quality}: {len(compressed_bytes)} bytes")

            if len(compressed_bytes) <= max_size:
                print(f"✅ Compression successful at quality {quality}")
                return compressed_bytes

        # If still too large, try PNG with optimization
        print(f"🔧 Trying PNG compression")
        output = io.BytesIO()
        img.save(output, format='PNG', optimize=True)
        compressed_bytes = output.getvalue()

        print(f"🔍 PNG optimized: {len(compressed_bytes)} bytes")

        if len(compressed_bytes) <= max_size:
            print(f"✅ PNG compression successful")
            return compressed_bytes

        # Last resort: resize image
        print(f"🔧 Resizing image as last resort")
        scale_factor = (max_size / len(compressed_bytes)) ** 0.5
        new_width = int(img.width * scale_factor)
        new_height = int(img.height * scale_factor)

        print(f"🔍 Resizing from {img.size} to ({new_width}, {new_height})")
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        img_resized.save(output, format='JPEG', quality=85, optimize=True)
        final_bytes = output.getvalue()

        print(f"✅ Final compressed size: {len(final_bytes)} bytes")
        return final_bytes

    except Exception as e:
        print(f"❌ Image compression failed: {e}")
        # Return original bytes if compression fails
        return image_bytes


async def _get_image_bytes_for_menu(m: RichMenu) -> Optional[bytes]:
    """Try to load image bytes for a menu, from MinIO (preferred) or HTTP fallback."""
    print(f"🖼️ _get_image_bytes_for_menu called for Rich Menu {m.id}")
    logger.info(f"Loading image bytes for Rich Menu {m.id}, image_url: {m.image_url}")

    if not m.image_url:
        print(f"❌ Rich Menu {m.id} has no image_url")
        logger.error(f"Rich Menu {m.id} has no image_url")
        return None

    # Try MinIO first
    try:
        print(f"🔍 Trying MinIO for Rich Menu {m.id}")
        from app.services.minio_service import get_minio_service
        from urllib.parse import urlparse, parse_qs
        svc = get_minio_service()
        if svc:
            print(f"✅ MinIO service available")
            logger.info(f"Attempting to load image from MinIO for Rich Menu {m.id}")
            # parse object_path from proxy url
            parsed = urlparse(m.image_url)
            qs = parse_qs(parsed.query or "")
            object_path = None
            if "object_path" in qs:
                object_path = qs["object_path"][0]
                print(f"✅ Extracted object_path: {object_path}")
                logger.info(f"Extracted object_path from proxy URL: {object_path}")

            if object_path:
                print(f"🔍 Loading from MinIO bucket: {svc.bucket_name}, path: {object_path}")
                import asyncio
                data = await asyncio.to_thread(
                    lambda: svc.client.get_object(svc.bucket_name, object_path).read()
                )
                print(f"✅ Successfully loaded image from MinIO: {len(data)} bytes")
                logger.info(f"Successfully loaded image from MinIO: {len(data)} bytes")
                return data
            else:
                print(f"❌ Could not extract object_path from URL: {m.image_url}")
                logger.warning(f"Could not extract object_path from URL: {m.image_url}")
        else:
            print(f"❌ MinIO service not available")
            logger.warning("MinIO service not available")
    except Exception as e:
        print(f"❌ MinIO image loading failed: {e}")
        logger.warning(f"MinIO image loading failed for Rich Menu {m.id}: {e}")
        import traceback
        print(f"❌ MinIO Traceback: {traceback.format_exc()}")

    # Fallback to HTTP using requests (Windows compatible)
    try:
        print(f"🔍 Trying HTTP fallback for Rich Menu {m.id}")
        logger.info(f"Attempting HTTP fallback for Rich Menu {m.id}")
        import requests
        import asyncio

        def sync_download():
            print(f"🌐 Making HTTP request to: {m.image_url}")
            response = requests.get(m.image_url, timeout=20)
            print(f"🌐 HTTP response status: {response.status_code}")
            if response.status_code != 200:
                print(f"❌ HTTP image loading failed: HTTP {response.status_code}")
                logger.error(f"HTTP image loading failed: HTTP {response.status_code}")
                return None
            print(f"✅ HTTP response received: {len(response.content)} bytes")
            return response.content

        print(f"🔍 Starting async HTTP download")
        data = await asyncio.to_thread(sync_download)
        if data:
            print(f"✅ Successfully loaded image via HTTP: {len(data)} bytes")
            logger.info(f"Successfully loaded image via HTTP: {len(data)} bytes")
            return data
        else:
            print(f"❌ HTTP image loading failed for Rich Menu {m.id}")
            logger.error(f"HTTP image loading failed for Rich Menu {m.id}")
            return None
    except Exception as e:
        print(f"❌ HTTP image loading failed: {e}")
        logger.error(f"HTTP image loading failed for Rich Menu {m.id}: {e}")
        import traceback
        print(f"❌ HTTP Traceback: {traceback.format_exc()}")
        return None


@router.post("/{bot_id}/richmenus/{menu_id}/test")
async def test_publish_route(bot_id: str, menu_id: str):
    """Test route to verify routing works."""
    print(f"🧪🧪🧪 TEST ROUTE CALLED: bot_id={bot_id}, menu_id={menu_id}")
    return {"status": "success", "bot_id": bot_id, "menu_id": menu_id, "timestamp": "2025-09-29 17:22:00"}

@router.post("/{bot_id}/richmenus/{menu_id}/publish", response_model=RichMenuResponse)
async def publish_rich_menu(
    bot_id: str,
    menu_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """Re-publish the rich menu to LINE (create new if needed, upload image, set default)."""
    # 強制輸出日誌到控制台
    print(f"🚀🚀🚀 PUBLISH RICH MENU CALLED: bot_id={bot_id}, menu_id={menu_id}")
    logger.error(f"🚀🚀🚀 PUBLISH RICH MENU CALLED: bot_id={bot_id}, menu_id={menu_id}")

    try:
        logger.info(f"🚀 Starting publish_rich_menu for bot {bot_id}, menu {menu_id}")
        logger.info(f"🔍 Function parameters: bot_id={bot_id}, menu_id={menu_id}")
        logger.info(f"👤 Current user: {current_user.username if current_user else 'None'}")
    except Exception as e:
        logger.error(f"❌ Error in initial logging: {e}")
        raise HTTPException(status_code=500, detail=f"初始化錯誤: {str(e)}")

    print(f"🔍 Step 2: Verifying bot ownership")
    bot = await _assert_bot_ownership(db, bot_id, current_user.id)
    print(f"✅ Bot ownership verified for bot {bot_id}")
    logger.info(f"Bot ownership verified for bot {bot_id}")

    print(f"🔍 Step 3: Getting rich menu")
    res = await db.execute(select(RichMenu).where(RichMenu.id == menu_id, RichMenu.bot_id == bot.id))
    m: Optional[RichMenu] = res.scalars().first()
    if not m:
        print(f"❌ Rich Menu {menu_id} not found for bot {bot_id}")
        logger.error(f"Rich Menu {menu_id} not found for bot {bot_id}")
        raise HTTPException(status_code=404, detail="Rich Menu 不存在")

    print(f"✅ Found Rich Menu: {m.name}, image_url: {m.image_url}")
    logger.info(f"Found Rich Menu: {m.name}, image_url: {m.image_url}")

    # Force reload trigger
    print(f"🔄 Code reloaded at 17:32")

    # prepare payload
    print(f"🔍 Step 4: Preparing payload")
    print(f"🔍 m.size type: {type(m.size)}, value: {m.size}")
    print(f"🔍 m.selected: {m.selected}")
    print(f"🔍 m.name: {m.name}")
    print(f"🔍 m.chat_bar_text: {m.chat_bar_text}")
    print(f"🔍 m.areas: {m.areas}")

    try:
        # Handle size safely
        if isinstance(m.size, dict):
            height = int(m.size.get("height", 1686))
        elif isinstance(m.size, str):
            # Try to parse JSON string
            import json
            size_dict = json.loads(m.size)
            height = int(size_dict.get("height", 1686))
        else:
            height = 1686

        print(f"✅ Height determined: {height}")

        # 處理 areas，確保每個 action 都有正確的參數
        processed_areas = []
        for a in (m.areas or []):
            bounds = a.get("bounds", {})
            action = a.get("action", {})

            # 根據 action 類型處理參數
            processed_action = _process_action_for_line_api(action)

            processed_areas.append({
                "bounds": bounds,
                "action": processed_action
            })

        rm_payload = {
            "size": {"width": 2500, "height": height},
            "selected": bool(m.selected),
            "name": m.name,
            "chatBarText": m.chat_bar_text,
            "areas": processed_areas,
        }
        print(f"✅ Rich Menu payload prepared: {rm_payload}")
        logger.info(f"Rich Menu payload prepared: {rm_payload}")
    except Exception as e:
        print(f"❌ Error preparing payload: {e}")
        import traceback
        print(f"❌ Payload Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"準備 Rich Menu 資料時發生錯誤: {str(e)}")

    # get image bytes
    print(f"🔍 Step 5: Loading image bytes")
    logger.info(f"Starting to load image bytes for Rich Menu {menu_id}")
    try:
        img_bytes = await _get_image_bytes_for_menu(m)
        if not img_bytes:
            print(f"❌ Failed to load image bytes for Rich Menu {menu_id}")
            logger.error(f"Failed to load image bytes for Rich Menu {menu_id}")
            raise HTTPException(status_code=400, detail="找不到選單圖片或無法讀取")
        print(f"✅ Successfully loaded image bytes: {len(img_bytes)} bytes")
        logger.info(f"Successfully loaded image bytes: {len(img_bytes)} bytes")
    except Exception as e:
        print(f"❌ Exception while loading image bytes: {e}")
        logger.error(f"Exception while loading image bytes for Rich Menu {menu_id}: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=f"載入圖片時發生錯誤: {str(e)}")

    print(f"🔍 Step 6: Determining content type")
    content_type = "image/jpeg" if m.image_url and m.image_url.lower().endswith((".jpg", ".jpeg")) else "image/png"
    print(f"✅ Content type determined: {content_type}")
    logger.info(f"Content type determined: {content_type}")

    try:
        logger.info(f"Publishing Rich Menu {menu_id} to LINE for bot {bot_id}")

        # Clear old Rich Menu ID to ensure clean state
        old_rich_menu_id = m.line_rich_menu_id
        m.line_rich_menu_id = None
        await db.commit()

        # Check and compress image if needed
        print(f"🔍 Step 7: Checking image size")
        max_size = 1048576  # 1 MB in bytes
        if len(img_bytes) > max_size:
            print(f"⚠️ Image too large: {len(img_bytes)} bytes > {max_size} bytes")
            print(f"🔧 Compressing image...")
            img_bytes = await _compress_image(img_bytes, max_size)
            print(f"✅ Image compressed to: {len(img_bytes)} bytes")
        else:
            print(f"✅ Image size OK: {len(img_bytes)} bytes <= {max_size} bytes")

        # Create and upload new Rich Menu
        print(f"🔍 Step 8: Calling _line_create_and_upload")
        print(f"🔍 Channel token: {bot.channel_token[:10]}..." if bot.channel_token else "None")
        rid = await _line_create_and_upload(bot.channel_token, rm_payload, img_bytes, content_type)
        print(f"🔍 Step 9: _line_create_and_upload result: {rid}")
        if not rid:
            print(f"❌ Failed to create and upload Rich Menu {menu_id} to LINE")
            logger.error(f"Failed to create and upload Rich Menu {menu_id} to LINE")
            raise HTTPException(status_code=502, detail="LINE 平台發佈失敗：無法建立或上傳 Rich Menu")

        # Update database with new Rich Menu ID
        m.line_rich_menu_id = rid
        await db.commit()
        await db.refresh(m)
        logger.info(f"Rich Menu {menu_id} published to LINE with ID: {rid}")

        # Set as default if selected
        if m.selected and m.line_rich_menu_id:
            success = await _line_set_default(bot.channel_token, m.line_rich_menu_id)
            if success:
                logger.info(f"Rich Menu {rid} set as default successfully")
            else:
                logger.warning(f"Failed to set Rich Menu {rid} as default, but creation was successful")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish to LINE failed for Rich Menu {menu_id}: {e}")
        raise HTTPException(status_code=502, detail=f"LINE 平台發佈失敗：{str(e)}")

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
        size=payload.size.model_dump(),
        areas=[a.model_dump() for a in payload.areas],
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

    data = payload.model_dump(exclude_unset=True)
    if "size" in data and data["size"] is not None:
        data["size"] = payload.size.model_dump() if payload.size else None
    if "areas" in data and data["areas"] is not None:
        data["areas"] = [a.model_dump() for a in payload.areas or []]

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
            logger.info(f"Setting Rich Menu {menu_id} ({m.line_rich_menu_id}) as default")
            success = await _line_set_default(bot.channel_token, m.line_rich_menu_id)
            if not success:
                logger.error(f"Failed to set Rich Menu {m.line_rich_menu_id} as default on LINE platform")
                raise HTTPException(status_code=502, detail="設定預設 Rich Menu 失敗")
        else:
            logger.warning(f"Rich Menu {menu_id} has no LINE Rich Menu ID, cannot set as default")
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Rich Menu 尚未發佈到 LINE 平台，請先點擊「重新發佈到 LINE」按鈕",
                    "action_required": "publish",
                    "menu_id": menu_id
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"同步 LINE 預設 Rich Menu 失敗: {e}")
        raise HTTPException(status_code=502, detail="同步 LINE 預設 Rich Menu 失敗")

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
            logger.info(f"Syncing Rich Menu {menu_id} to LINE platform after image upload")
            # 處理 areas，確保每個 action 都有正確的參數
            processed_areas = []
            for a in (m.areas or []):
                bounds = a.get("bounds", {})
                action = a.get("action", {})

                # 根據 action 類型處理參數
                processed_action = _process_action_for_line_api(action)

                processed_areas.append({
                    "bounds": bounds,
                    "action": processed_action
                })

            rm_payload = {
                "size": {"width": 2500, "height": int(m.size.get("height", 1686)) if isinstance(m.size, dict) else 1686},
                "selected": bool(m.selected),
                "name": m.name,
                "chatBarText": m.chat_bar_text,
                "areas": processed_areas,
            }
            rid: Optional[str] = m.line_rich_menu_id
            if not rid:
                logger.info(f"Creating new Rich Menu on LINE platform for {menu_id}")
                rid = await _line_create_and_upload(bot.channel_token, rm_payload, processed_bytes, content_type)
                if rid:
                    m.line_rich_menu_id = rid
                    await db.commit()
                    await db.refresh(m)
                    logger.info(f"Rich Menu {menu_id} created on LINE with ID: {rid}")
                else:
                    logger.error(f"Failed to create Rich Menu {menu_id} on LINE platform")
            else:
                # 既有 id：只更新內容圖
                logger.info(f"Updating existing Rich Menu {rid} content on LINE platform")
                success = await _line_upload_content(bot.channel_token, rid, processed_bytes, content_type)
                if success:
                    logger.info(f"Rich Menu {rid} content updated successfully")
                else:
                    logger.error(f"Failed to update Rich Menu {rid} content")

            if m.selected and m.line_rich_menu_id:
                logger.info(f"Setting Rich Menu {m.line_rich_menu_id} as default")
                success = await _line_set_default(bot.channel_token, m.line_rich_menu_id)
                if success:
                    logger.info(f"Rich Menu {m.line_rich_menu_id} set as default successfully")
                else:
                    logger.warning(f"Failed to set Rich Menu {m.line_rich_menu_id} as default")
        except Exception as sync_err:
            logger.error(f"同步 LINE Rich Menu 失敗: {sync_err}")
            # Don't raise exception here - image upload was successful, LINE sync is optional
    except Exception as e:
        logger.error(f"上傳 Rich Menu 圖片失敗: {e}")
        raise HTTPException(status_code=500, detail="圖片上傳失敗")

    return _to_response(m)
