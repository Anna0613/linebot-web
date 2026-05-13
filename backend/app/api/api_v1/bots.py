"""
Bot 管理 API 路由
Updated: 2025-10-24
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from app.db.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.models.user import User
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse, FlexMessageCreate, FlexMessageResponse, FlexMessageUpdate, FlexMessageSummary,
    BotSummary, LineBotProfilePreviewRequest, LineBotProfileResponse,
    LogicTemplateCreate, LogicTemplateUpdate, LogicTemplateResponse, LogicTemplateSummary
)
from app.services.bot.bot_service import BotService
from app.services.storage.minio_service import get_minio_service, get_minio_last_error

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=BotResponse)
async def create_bot(
    bot_data: BotCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """建立新的 Bot"""
    return await BotService.create_bot(db, current_user.id, bot_data)

@router.get("/", response_model=List[BotResponse])
async def get_bots(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶的所有 Bot"""
    return await BotService.get_user_bots(db, current_user.id)

# FLEX 訊息相關路由 - 必須在 /{bot_id} 路由之前定義
@router.get("/messages", response_model=List[FlexMessageResponse])
async def get_flex_messages(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶的所有 Flex 訊息"""
    return await BotService.get_user_flex_messages(db, current_user.id)

@router.post("/messages", response_model=FlexMessageResponse)
async def create_flex_message(
    message_data: FlexMessageCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """建立 Flex 訊息"""
    return await BotService.create_flex_message(db, current_user.id, message_data)

@router.get("/messages/summary", response_model=List[FlexMessageSummary])
async def get_flex_messages_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶FLEX訊息摘要列表 - 用於下拉選單"""
    return await BotService.get_user_flex_messages_summary(db, current_user.id)

@router.put("/messages/{message_id}", response_model=FlexMessageResponse)
async def update_flex_message(
    message_id: str,
    message_data: FlexMessageUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """更新 Flex 訊息"""
    return await BotService.update_flex_message(db, message_id, current_user.id, message_data)

@router.post("/line-profile/preview", response_model=LineBotProfileResponse)
async def preview_line_bot_profile(
    profile_data: LineBotProfilePreviewRequest,
    db: AsyncSession = Depends(get_async_db),
    _current_user: User = Depends(get_current_user_async)
):
    """用未儲存的 LINE Channel 憑證預覽官方帳號基本資料"""
    return await BotService.preview_line_bot_profile(db, profile_data)

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得特定 Bot"""
    return await BotService.get_bot(db, bot_id, current_user.id)

@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: str,
    bot_data: BotUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """更新 Bot"""
    return await BotService.update_bot(db, bot_id, current_user.id, bot_data)

@router.get("/{bot_id}/line-profile", response_model=LineBotProfileResponse)
async def get_line_bot_profile(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """透過 LINE API 取得目前 Bot 的官方帳號基本資料"""
    return await BotService.get_line_bot_profile(db, bot_id, current_user.id)

@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """刪除 Bot"""
    return await BotService.delete_bot(db, bot_id, current_user.id)

# 視覺化編輯器相關路由
@router.get("/visual-editor/summary", response_model=List[BotSummary])
async def get_user_bots_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶 Bot 摘要列表 - 用於下拉選單"""
    return await BotService.get_user_bots_summary(db, current_user.id)

# 邏輯模板相關路由
@router.get("/{bot_id}/logic-templates", response_model=List[LogicTemplateResponse])
async def get_bot_logic_templates(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得Bot的所有邏輯模板"""
    return await BotService.get_bot_logic_templates(db, bot_id, current_user.id)

@router.get("/{bot_id}/logic-templates/summary", response_model=List[LogicTemplateSummary])
async def get_bot_logic_templates_summary(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得Bot邏輯模板摘要列表 - 用於下拉選單"""
    return await BotService.get_bot_logic_templates_summary(db, bot_id, current_user.id)

@router.post("/{bot_id}/logic-templates", response_model=LogicTemplateResponse)
async def create_logic_template(
    bot_id: str,
    template_data: LogicTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """創建邏輯模板"""
    # 確保bot_id一致
    template_data.bot_id = bot_id
    return await BotService.create_logic_template(db, current_user.id, template_data)

@router.get("/logic-templates/{template_id}", response_model=LogicTemplateResponse)
async def get_logic_template(
    template_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得特定邏輯模板"""
    return await BotService.get_logic_template(db, template_id, current_user.id)

@router.put("/logic-templates/{template_id}", response_model=LogicTemplateResponse)
async def update_logic_template(
    template_id: str,
    template_data: LogicTemplateUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """更新邏輯模板"""
    return await BotService.update_logic_template(db, template_id, current_user.id, template_data)

@router.post("/logic-templates/{template_id}/activate")
async def activate_logic_template(
    template_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """激活邏輯模板（設為活躍狀態）"""
    return await BotService.activate_logic_template(db, template_id, current_user.id)

@router.post("/logic-templates/{template_id}/deactivate")
async def deactivate_logic_template(
    template_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """停用邏輯模板（設為非活躍狀態）"""
    return await BotService.deactivate_logic_template(db, template_id, current_user.id)

@router.post("/{bot_id}/upload-logic-template-image")
async def upload_logic_template_image(
    bot_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
    request: Request = None,
):
    """
    上傳邏輯模板圖片到 MinIO

    Args:
        bot_id: Bot ID
        file: 上傳的圖片檔案

    Returns:
        包含圖片 URL 的 JSON 回應
    """
    # 圖片上傳端點
    try:
        # 驗證 Bot 擁有權
        bot = await BotService.get_bot(db, bot_id, current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在或無權訪問")

        # 驗證檔案類型
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支援的檔案類型: {file.content_type}。支援的類型: {', '.join(allowed_types)}"
            )

        # 驗證檔案大小（限制 10MB）
        max_size = 10 * 1024 * 1024  # 10MB
        file_data = await file.read()
        if len(file_data) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"檔案過大: {len(file_data)} bytes。最大允許: {max_size} bytes (10MB)"
            )

        # 一律使用 MinIO
        minio_service = get_minio_service()
        if not minio_service:
            last_err = get_minio_last_error() or "MinIO 未初始化"
            raise HTTPException(status_code=500, detail=f"MinIO 服務未初始化：{last_err}")

        object_path, _ = await minio_service.upload_logic_template_image(
            bot_id=bot_id,
            file_data=file_data,
            filename=file.filename or 'image.jpg',
            content_type=file.content_type or 'image/jpeg'
        )

        if not object_path:
            raise HTTPException(status_code=500, detail="圖片上傳失敗")

        # 生成代理 URL - 使用 MinIO 服務的方法確保 HTTPS
        from urllib.parse import quote
        encoded = quote(object_path, safe='/')

        # 使用 MinIO 服務的 get_presigned_url 方法生成正確的 HTTPS URL
        proxy_url = minio_service.get_presigned_url(object_path)

        if not proxy_url:
            # 回退方案：如果 MinIO 服務無法生成 URL，使用相對路徑
            proxy_url = f"/api/v1/minio/proxy?object_path={encoded}"
            logger.warning(f"MinIO 服務無法生成代理 URL，使用相對路徑: {proxy_url}")

        logger.info(f"邏輯模板圖片上傳成功: bot_id={bot_id}, url={proxy_url}")

        return {
            "success": True,
            "message": "圖片上傳成功",
            "data": {
                "object_path": object_path,
                "url": proxy_url,
                "filename": file.filename,
                "size": len(file_data),
                "content_type": file.content_type
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上傳邏輯模板圖片時發生錯誤: {e}")
        import traceback
        logger.error(f"詳細錯誤: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"上傳失敗: {str(e)}")

@router.post("/{bot_id}/upload-flex-message-image")
async def upload_flex_message_image(
    bot_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    上傳 Flex Message 圖片到 MinIO

    圖片會存放在 {bot_id}/flex-message-images/，並回傳可供 LINE Flex
    Message 使用的代理 URL。
    """
    try:
        bot = await BotService.get_bot(db, bot_id, current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在或無權訪問")

        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支援的檔案類型: {file.content_type}。支援的類型: {', '.join(allowed_types)}"
            )

        max_size = 10 * 1024 * 1024
        file_data = await file.read()
        if len(file_data) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"檔案過大: {len(file_data)} bytes。最大允許: {max_size} bytes (10MB)"
            )

        minio_service = get_minio_service()
        if not minio_service:
            last_err = get_minio_last_error() or "MinIO 未初始化"
            raise HTTPException(status_code=500, detail=f"MinIO 服務未初始化：{last_err}")

        object_path, _ = await minio_service.upload_flex_message_image(
            bot_id=bot_id,
            file_data=file_data,
            filename=file.filename or 'image.jpg',
            content_type=file.content_type or 'image/jpeg'
        )

        if not object_path:
            raise HTTPException(status_code=500, detail="圖片上傳失敗")

        from urllib.parse import quote
        encoded = quote(object_path, safe='/')
        proxy_url = minio_service.get_presigned_url(object_path)

        if not proxy_url:
            proxy_url = f"/api/v1/minio/proxy?object_path={encoded}"
            logger.warning(f"MinIO 服務無法生成代理 URL，使用相對路徑: {proxy_url}")

        logger.info(f"Flex Message 圖片上傳成功: bot_id={bot_id}, path={object_path}, url={proxy_url}")

        return {
            "success": True,
            "message": "圖片上傳成功",
            "data": {
                "object_path": object_path,
                "url": proxy_url,
                "filename": file.filename,
                "size": len(file_data),
                "content_type": file.content_type
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上傳 Flex Message 圖片時發生錯誤: {e}")
        import traceback
        logger.error(f"詳細錯誤: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"上傳失敗: {str(e)}")

@router.delete("/{bot_id}/flex-message-image")
async def delete_flex_message_image(
    bot_id: str,
    object_path: str = Query(..., description="MinIO 物件路徑"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    刪除 Flex Message 圖片積木對應的 MinIO 圖片。

    僅允許刪除目前 Bot 底下 flex-message-images 目錄內的物件，避免誤刪其他資源。
    """
    bot = await BotService.get_bot(db, bot_id, current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權訪問")

    expected_prefix = f"{bot_id}/flex-message-images/"
    if not object_path.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="無效的 Flex Message 圖片路徑")

    minio_service = get_minio_service()
    if not minio_service:
        last_err = get_minio_last_error() or "MinIO 未初始化"
        raise HTTPException(status_code=500, detail=f"MinIO 服務未初始化：{last_err}")

    deleted = minio_service.delete_object(object_path)
    if not deleted:
        raise HTTPException(status_code=500, detail="刪除 MinIO 圖片失敗")

    logger.info("Flex Message 圖片刪除成功: bot_id=%s, path=%s", bot_id, object_path)
    return {
        "success": True,
        "message": "圖片已刪除",
        "data": {
            "object_path": object_path,
        },
    }
