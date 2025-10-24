"""
Bot 管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging
import asyncio

from app.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.models.user import User
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse, FlexMessageCreate, FlexMessageResponse, FlexMessageUpdate, FlexMessageSummary,
    BotCodeCreate, BotCodeResponse, VisualEditorData, VisualEditorResponse, BotSummary,
    LogicTemplateCreate, LogicTemplateUpdate, LogicTemplateResponse, LogicTemplateSummary
)
from app.services.bot_service import BotService
from app.services.line_bot_service import LineBotService
from app.services.minio_service import get_minio_service

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

@router.delete("/messages/{message_id}")
async def delete_flex_message(
    message_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """刪除 Flex 訊息"""
    return await BotService.delete_flex_message(db, message_id, current_user.id)

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

@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """刪除 Bot"""
    return await BotService.delete_bot(db, bot_id, current_user.id)


# Bot 程式碼相關路由
@router.post("/codes", response_model=BotCodeResponse)
async def create_bot_code(
    code_data: BotCodeCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """建立 Bot 程式碼"""
    return await BotService.create_bot_code(db, current_user.id, code_data)

# 視覺化編輯器相關路由
@router.get("/visual-editor/summary", response_model=List[BotSummary])
async def get_user_bots_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶 Bot 摘要列表 - 用於下拉選單"""
    return await BotService.get_user_bots_summary(db, current_user.id)

@router.post("/{bot_id}/visual-editor/save", response_model=VisualEditorResponse)
async def save_visual_editor_data(
    bot_id: str,
    editor_data: VisualEditorData,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """儲存視覺化編輯器數據"""
    return await BotService.save_visual_editor_data(db, bot_id, current_user.id, editor_data)

@router.get("/{bot_id}/visual-editor", response_model=VisualEditorResponse)
async def get_visual_editor_data(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得視覺化編輯器數據"""
    return await BotService.get_visual_editor_data(db, bot_id, current_user.id)

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

@router.delete("/logic-templates/{template_id}")
async def delete_logic_template(
    template_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """刪除邏輯模板"""
    return await BotService.delete_logic_template(db, template_id, current_user.id)

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

# 媒體檔案相關路由
@router.get("/{bot_id}/messages/{interaction_id}/content")
async def get_message_content(
    bot_id: str,
    interaction_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得 LINE 消息的媒體內容"""
    from app.services.conversation_service import ConversationService
    
    try:
        # 驗證 Bot 所有權
        bot = await BotService.get_bot(db, bot_id, current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")
        
        # 從 MongoDB 中查找消息和對話
        message = await ConversationService.get_message_by_id(interaction_id)
        
        if not message:
            raise HTTPException(status_code=404, detail="訊息記錄不存在")
        
        # 獲取包含此訊息的對話
        conversation = await ConversationService.get_conversation_by_message_id(interaction_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="對話記錄不存在")
        
        # 檢查是否為媒體類型消息
        if message.message_type not in ['image', 'video', 'audio']:
            raise HTTPException(status_code=400, detail="非媒體類型消息")
        
        # 檢查是否已有媒體 URL
        if message.media_url:
            return {
                "success": True,
                "content_url": message.media_url,
                "interaction_id": interaction_id,
                "message_type": message.message_type
            }
        
        # 檢查是否有 LINE message ID 用於下載
        line_message_id = None
        if message.content and isinstance(message.content, dict):
            line_message_id = (
                message.content.get('line_message_id') or 
                message.content.get('id') or
                message.content.get('messageId')
            )
        
        if not line_message_id:
            # 對於舊的記錄，沒有 LINE message ID，無法下載媒體
            return {
                "success": False,
                "error": "legacy_media",
                "message": "此為較舊的媒體訊息，缺少必要的 LINE message ID，無法載入媒體內容",
                "interaction_id": interaction_id,
                "message_type": interaction.message_type
            }
        
        # 嘗試使用 LINE message ID 下載媒體內容
        try:
            from app.services.minio_service import get_minio_service
            minio_service = get_minio_service()
            if not minio_service:
                raise Exception("MinIO 服務未初始化")
            
            # 使用 MinIO 服務下載並上傳媒體
            media_path, media_url = await minio_service.upload_media_from_line(
                line_user_id=conversation.line_user_id,
                message_type=message.message_type,
                channel_token=bot.channel_token,
                line_message_id=line_message_id
            )
            
            if media_path and media_url:
                # 更新 MongoDB 中的訊息記錄
                await ConversationService.update_message_media(
                    message_id=interaction_id,
                    media_path=media_path,
                    media_url=media_url
                )
                
                return {
                    "success": True,
                    "content_url": media_url,
                    "interaction_id": interaction_id,
                    "message_type": interaction.message_type
                }
            else:
                return {
                    "success": False,
                    "error": "download_failed",
                    "message": "媒體檔案下載失敗，可能檔案已過期或不存在",
                    "interaction_id": interaction_id,
                    "message_type": interaction.message_type
                }
                
        except Exception as download_error:
            logger.error(f"媒體下載錯誤: {download_error}")
            return {
                "success": False,
                "error": "download_error",
                "message": f"媒體檔案處理失敗: {str(download_error)}",
                "interaction_id": interaction_id,
                "message_type": interaction.message_type
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"獲取媒體內容失敗: {str(e)}"
        )


@router.post("/{bot_id}/process-media")
async def process_pending_media(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """手動處理待處理的媒體檔案"""
    try:
        # 驗證 Bot 所有權
        bot = await BotService.get_bot(db, bot_id, current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")

        # 查找沒有媒體 URL 的媒體記錄
        pending_media = await ConversationService.get_pending_media_messages(bot_id, limit=10)

        if not pending_media:
            return {"message": "沒有待處理的媒體檔案", "processed": 0}

        processed_count = 0
        failed_count = 0

        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()

        if not minio_service:
            raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

        for conversation, message in pending_media:
            try:
                message_content = message.content
                line_message_id = (
                    message_content.get('line_message_id') or 
                    message_content.get('id') or
                    message_content.get('messageId')
                ) if message_content else None

                if not line_message_id:
                    logger.warning(f"訊息記錄 {message.id} 沒有 LINE message ID")
                    failed_count += 1
                    continue

                # 下載並上傳媒體
                media_path, media_url = await minio_service.upload_media_from_line(
                    line_user_id=conversation.line_user_id,
                    message_type=message.message_type,
                    channel_token=bot.channel_token,
                    line_message_id=line_message_id
                )

                if media_path and media_url:
                    # 更新 MongoDB 中的訊息記錄
                    await ConversationService.update_message_media(
                        message_id=message.id,
                        media_path=media_path,
                        media_url=media_url
                    )
                    processed_count += 1
                    logger.info(f"成功處理媒體檔案: {message.id}")
                else:
                    failed_count += 1
                    logger.error(f"處理媒體檔案失敗: {message.id}")

            except Exception as e:
                failed_count += 1
                logger.error(f"處理訊息記錄 {message.id} 時發生錯誤: {e}")

        # MongoDB 的更改已在上面自動保存

        return {
            "message": f"媒體處理完成",
            "processed": processed_count,
            "failed": failed_count,
            "total": len(pending_media)
        }

    except Exception as e:
        logger.error(f"處理媒體檔案時發生錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"處理失敗: {str(e)}")


@router.post("/{bot_id}/upload-logic-template-image")
async def upload_logic_template_image(
    bot_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """
    上傳邏輯模板圖片到 MinIO

    Args:
        bot_id: Bot ID
        file: 上傳的圖片檔案

    Returns:
        包含圖片 URL 的 JSON 回應
    """
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

        # 獲取 MinIO 服務
        minio_service = get_minio_service()
        if not minio_service:
            raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

        # 上傳圖片
        object_path, proxy_url = await minio_service.upload_logic_template_image(
            bot_id=bot_id,
            file_data=file_data,
            filename=file.filename or 'image.jpg',
            content_type=file.content_type or 'image/jpeg'
        )

        if not object_path or not proxy_url:
            raise HTTPException(status_code=500, detail="圖片上傳失敗")

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
