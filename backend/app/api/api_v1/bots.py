"""
Bot 管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse, FlexMessageCreate, FlexMessageResponse, FlexMessageUpdate, FlexMessageSummary,
    BotCodeCreate, BotCodeResponse, VisualEditorData, VisualEditorResponse, BotSummary,
    LogicTemplateCreate, LogicTemplateUpdate, LogicTemplateResponse, LogicTemplateSummary
)
from app.services.bot_service import BotService
from app.services.line_bot_service import LineBotService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=BotResponse)
async def create_bot(
    bot_data: BotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """建立新的 Bot"""
    return BotService.create_bot(db, current_user.id, bot_data)

@router.get("/", response_model=List[BotResponse])
async def get_bots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶的所有 Bot"""
    return BotService.get_user_bots(db, current_user.id)

# FLEX 訊息相關路由 - 必須在 /{bot_id} 路由之前定義
@router.get("/messages", response_model=List[FlexMessageResponse])
async def get_flex_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶的所有 Flex 訊息"""
    return BotService.get_user_flex_messages(db, current_user.id)

@router.post("/messages", response_model=FlexMessageResponse)
async def create_flex_message(
    message_data: FlexMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """建立 Flex 訊息"""
    return BotService.create_flex_message(db, current_user.id, message_data)

@router.get("/messages/summary", response_model=List[FlexMessageSummary])
async def get_flex_messages_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶FLEX訊息摘要列表 - 用於下拉選單"""
    return BotService.get_user_flex_messages_summary(db, current_user.id)

@router.put("/messages/{message_id}", response_model=FlexMessageResponse)
async def update_flex_message(
    message_id: str,
    message_data: FlexMessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新 Flex 訊息"""
    return BotService.update_flex_message(db, message_id, current_user.id, message_data)

@router.delete("/messages/{message_id}")
async def delete_flex_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除 Flex 訊息"""
    return BotService.delete_flex_message(db, message_id, current_user.id)

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得特定 Bot"""
    return BotService.get_bot(db, bot_id, current_user.id)

@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: str,
    bot_data: BotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新 Bot"""
    return BotService.update_bot(db, bot_id, current_user.id, bot_data)

@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除 Bot"""
    return BotService.delete_bot(db, bot_id, current_user.id)


# Bot 程式碼相關路由
@router.post("/codes", response_model=BotCodeResponse)
async def create_bot_code(
    code_data: BotCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """建立 Bot 程式碼"""
    return BotService.create_bot_code(db, current_user.id, code_data)

# 視覺化編輯器相關路由
@router.get("/visual-editor/summary", response_model=List[BotSummary])
async def get_user_bots_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶 Bot 摘要列表 - 用於下拉選單"""
    return BotService.get_user_bots_summary(db, current_user.id)

@router.post("/{bot_id}/visual-editor/save", response_model=VisualEditorResponse)
async def save_visual_editor_data(
    bot_id: str,
    editor_data: VisualEditorData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """儲存視覺化編輯器數據"""
    return BotService.save_visual_editor_data(db, bot_id, current_user.id, editor_data)

@router.get("/{bot_id}/visual-editor", response_model=VisualEditorResponse)
async def get_visual_editor_data(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得視覺化編輯器數據"""
    return BotService.get_visual_editor_data(db, bot_id, current_user.id)

# 邏輯模板相關路由
@router.get("/{bot_id}/logic-templates", response_model=List[LogicTemplateResponse])
async def get_bot_logic_templates(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得Bot的所有邏輯模板"""
    return BotService.get_bot_logic_templates(db, bot_id, current_user.id)

@router.get("/{bot_id}/logic-templates/summary", response_model=List[LogicTemplateSummary])
async def get_bot_logic_templates_summary(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得Bot邏輯模板摘要列表 - 用於下拉選單"""
    return BotService.get_bot_logic_templates_summary(db, bot_id, current_user.id)

@router.post("/{bot_id}/logic-templates", response_model=LogicTemplateResponse)
async def create_logic_template(
    bot_id: str,
    template_data: LogicTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """創建邏輯模板"""
    # 確保bot_id一致
    template_data.bot_id = bot_id
    return BotService.create_logic_template(db, current_user.id, template_data)

@router.get("/logic-templates/{template_id}", response_model=LogicTemplateResponse)
async def get_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得特定邏輯模板"""
    return BotService.get_logic_template(db, template_id, current_user.id)

@router.put("/logic-templates/{template_id}", response_model=LogicTemplateResponse)
async def update_logic_template(
    template_id: str,
    template_data: LogicTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新邏輯模板"""
    return BotService.update_logic_template(db, template_id, current_user.id, template_data)

@router.delete("/logic-templates/{template_id}")
async def delete_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除邏輯模板"""
    return BotService.delete_logic_template(db, template_id, current_user.id)

@router.post("/logic-templates/{template_id}/activate")
async def activate_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """激活邏輯模板（設為活躍狀態）"""
    return BotService.activate_logic_template(db, template_id, current_user.id)

@router.post("/logic-templates/{template_id}/deactivate")
async def deactivate_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """停用邏輯模板（設為非活躍狀態）"""
    return BotService.deactivate_logic_template(db, template_id, current_user.id)

# 媒體檔案相關路由
@router.get("/{bot_id}/messages/{interaction_id}/content")
async def get_message_content(
    bot_id: str,
    interaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得 LINE 消息的媒體內容"""
    from app.models.line_user import LineBotUser, LineBotUserInteraction
    from uuid import UUID as PyUUID
    
    try:
        # 驗證 Bot 所有權
        bot = BotService.get_bot(db, bot_id, current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")
        
        # 獲取互動記錄以確定用戶ID和消息類型
        interaction_uuid = PyUUID(interaction_id)
        interaction = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.id == interaction_uuid
        ).first()
        
        if not interaction:
            raise HTTPException(status_code=404, detail="互動記錄不存在")
        
        # 獲取 LINE 用戶信息
        line_user = db.query(LineBotUser).filter(
            LineBotUser.id == interaction.line_user_id
        ).first()
        
        if not line_user:
            raise HTTPException(status_code=404, detail="用戶記錄不存在")
        
        # 檢查是否為媒體類型消息
        if interaction.message_type not in ['image', 'video', 'audio']:
            raise HTTPException(status_code=400, detail="非媒體類型消息")
        
        # 檢查是否已有媒體 URL
        if interaction.media_url:
            return {
                "success": True,
                "content_url": interaction.media_url,
                "interaction_id": interaction_id,
                "message_type": interaction.message_type
            }
        
        # 檢查是否有 LINE message ID 用於下載
        line_message_id = None
        if interaction.message_content and isinstance(interaction.message_content, dict):
            line_message_id = (
                interaction.message_content.get('line_message_id') or 
                interaction.message_content.get('id') or
                interaction.message_content.get('messageId')
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
                line_user_id=line_user.line_user_id,
                message_type=interaction.message_type,
                channel_token=bot.channel_token,
                line_message_id=line_message_id
            )
            
            if media_path and media_url:
                # 更新資料庫記錄
                interaction.media_path = media_path
                interaction.media_url = media_url
                db.commit()
                
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """手動處理待處理的媒體檔案"""
    try:
        # 驗證 Bot 所有權
        bot = BotService.get_bot(db, bot_id, current_user.id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")

        # 查找沒有媒體 URL 的媒體記錄
        pending_media = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio']),
            LineBotUserInteraction.media_url.is_(None),
            LineBotUserInteraction.message_content.isnot(None)
        ).limit(10).all()

        if not pending_media:
            return {"message": "沒有待處理的媒體檔案", "processed": 0}

        processed_count = 0
        failed_count = 0

        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()

        if not minio_service:
            raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

        for interaction in pending_media:
            try:
                message_content = interaction.message_content
                line_message_id = message_content.get('id') if message_content else None

                if not line_message_id:
                    logger.warning(f"互動記錄 {interaction.id} 沒有 LINE message ID")
                    failed_count += 1
                    continue

                # 下載並上傳媒體
                media_path, media_url = await minio_service.upload_media_from_line(
                    line_user_id=interaction.line_user_id,
                    message_type=interaction.message_type,
                    channel_token=bot.channel_token,
                    line_message_id=line_message_id
                )

                if media_path and media_url:
                    # 更新資料庫記錄
                    interaction.media_path = media_path
                    interaction.media_url = media_url
                    processed_count += 1
                    logger.info(f"成功處理媒體檔案: {interaction.id}")
                else:
                    failed_count += 1
                    logger.error(f"處理媒體檔案失敗: {interaction.id}")

            except Exception as e:
                failed_count += 1
                logger.error(f"處理互動記錄 {interaction.id} 時發生錯誤: {e}")

        # 提交所有更改
        db.commit()

        return {
            "message": f"媒體處理完成",
            "processed": processed_count,
            "failed": failed_count,
            "total": len(pending_media)
        }

    except Exception as e:
        logger.error(f"處理媒體檔案時發生錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"處理失敗: {str(e)}")