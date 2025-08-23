"""
Bot 管理服務模組
處理 Bot 的 CRUD 操作、Flex 訊息管理、程式碼管理等
"""
import logging
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import json

logger = logging.getLogger(__name__)

from app.models.bot import Bot, FlexMessage, BotCode, LogicTemplate
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse,
    FlexMessageCreate, FlexMessageUpdate, FlexMessageResponse, FlexMessageSummary,
    BotCodeCreate, BotCodeUpdate, BotCodeResponse,
    VisualEditorData, VisualEditorResponse, BotSummary,
    LogicTemplateCreate, LogicTemplateUpdate, LogicTemplateResponse, LogicTemplateSummary
)

class BotService:
    """Bot 管理服務類別"""
    
    @staticmethod
    def create_bot(db: Session, user_id: UUID, bot_data: BotCreate) -> BotResponse:
        """建立新的 Bot"""
        # 檢查用戶 Bot 數量限制
        bot_count = db.query(Bot).filter(Bot.user_id == user_id).count()
        if bot_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="每個用戶最多只能建立 3 個 Bot"
            )
        
        # 檢查 Bot 名稱是否重複
        existing_bot = db.query(Bot).filter(
            Bot.user_id == user_id,
            Bot.name == bot_data.name
        ).first()
        if existing_bot:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bot 名稱已存在"
            )
        
        # 建立新的 Bot
        db_bot = Bot(
            user_id=user_id,
            name=bot_data.name,
            channel_token=bot_data.channel_token,
            channel_secret=bot_data.channel_secret
        )
        
        db.add(db_bot)
        db.commit()
        db.refresh(db_bot)
        
        return BotResponse(
            id=str(db_bot.id),
            name=db_bot.name,
            channel_token=db_bot.channel_token,
            channel_secret=db_bot.channel_secret,
            user_id=str(db_bot.user_id),
            created_at=db_bot.created_at,
            updated_at=db_bot.updated_at
        )
    
    @staticmethod
    def get_user_bots(db: Session, user_id: UUID) -> List[BotResponse]:
        """取得用戶的所有 Bot"""
        bots = db.query(Bot).filter(Bot.user_id == user_id).all()
        return [
            BotResponse(
                id=str(bot.id),
                name=bot.name,
                channel_token=bot.channel_token,
                channel_secret=bot.channel_secret,
                user_id=str(bot.user_id),
                created_at=bot.created_at,
                updated_at=bot.updated_at
            )
            for bot in bots
        ]
    
    @staticmethod
    def get_bot(db: Session, bot_id: str, user_id: UUID) -> BotResponse:
        """取得特定 Bot"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        return BotResponse(
            id=str(bot.id),
            name=bot.name,
            channel_token=bot.channel_token,
            channel_secret=bot.channel_secret,
            user_id=str(bot.user_id),
            created_at=bot.created_at,
            updated_at=bot.updated_at
        )
    
    @staticmethod
    def update_bot(db: Session, bot_id: str, user_id: UUID, bot_data: BotUpdate) -> BotResponse:
        """更新 Bot"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        # 檢查名稱重複（如果要更新名稱）
        if bot_data.name and bot_data.name != bot.name:
            existing_bot = db.query(Bot).filter(
                Bot.user_id == user_id,
                Bot.name == bot_data.name,
                Bot.id != bot_uuid
            ).first()
            if existing_bot:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Bot 名稱已存在"
                )
        
        # 更新 Bot 資料
        update_data = bot_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(bot, field, value)
        
        db.commit()
        db.refresh(bot)
        
        return BotResponse(
            id=str(bot.id),
            name=bot.name,
            channel_token=bot.channel_token,
            channel_secret=bot.channel_secret,
            user_id=str(bot.user_id),
            created_at=bot.created_at,
            updated_at=bot.updated_at
        )
    
    @staticmethod
    def delete_bot(db: Session, bot_id: str, user_id: UUID) -> Dict[str, str]:
        """刪除 Bot"""
        logger.info(f"嘗試刪除 Bot: bot_id={bot_id}, user_id={user_id}")
        
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
            logger.debug(f"UUID 轉換成功: {bot_uuid}")
        except ValueError as e:
            logger.error(f"UUID 轉換失敗: {bot_id}, 錯誤: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            logger.warning(f"Bot 不存在: bot_uuid={bot_uuid}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        logger.info(f"找到 Bot，準備刪除: bot_name={bot.name}")
        
        try:
            # 手動刪除相關的 BotCode 記錄（如果存在）
            from app.models.bot import BotCode
            bot_codes = db.query(BotCode).filter(BotCode.bot_id == bot_uuid).all()
            for code in bot_codes:
                logger.debug(f"刪除相關的 BotCode: {code.id}")
                db.delete(code)
            
            # 刪除 Bot 本身
            db.delete(bot)
            db.commit()
            logger.info(f"Bot 刪除成功: bot_id={bot_id}")
        except Exception as e:
            logger.error(f"刪除 Bot 時發生錯誤: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"刪除 Bot 時發生錯誤: {str(e)}"
            )
        
        return {"message": "Bot 已成功刪除"}
    
    @staticmethod
    def create_flex_message(db: Session, user_id: UUID, message_data: FlexMessageCreate) -> FlexMessageResponse:
        """建立 Flex 訊息"""
        # 檢查同名 Flex 訊息是否已存在
        existing_message = db.query(FlexMessage).filter(
            FlexMessage.user_id == user_id,
            FlexMessage.name == message_data.name
        ).first()
        
        if existing_message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="已存在同名的 Flex 訊息"
            )
        
        # 將內容轉換為 JSON 字串
        content_str = json.dumps(message_data.content) if isinstance(message_data.content, dict) else message_data.content
        
        db_message = FlexMessage(
            user_id=user_id,
            name=message_data.name,
            content=content_str
        )
        
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        
        return FlexMessageResponse(
            id=str(db_message.id),
            name=db_message.name,
            content=json.loads(db_message.content),
            user_id=str(db_message.user_id),
            created_at=db_message.created_at,
            updated_at=db_message.updated_at
        )
    
    @staticmethod
    def get_user_flex_messages(db: Session, user_id: UUID) -> List[FlexMessageResponse]:
        """取得用戶的所有 Flex 訊息"""
        try:
            messages = db.query(FlexMessage).filter(FlexMessage.user_id == user_id).all()
            result = []
            
            for msg in messages:
                try:
                    # 安全處理 content 字段 - 可能是字串或已經是字典
                    if isinstance(msg.content, str):
                        content = json.loads(msg.content)
                    else:
                        content = msg.content
                    
                    result.append(FlexMessageResponse(
                        id=str(msg.id),
                        name=msg.name,
                        content=content,
                        user_id=str(msg.user_id),
                        created_at=msg.created_at,
                        updated_at=msg.updated_at
                    ))
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"無法解析 FLEX 訊息內容: {msg.id}, 錯誤: {e}")
                    # 跳過無法解析的訊息
                    continue
            
            return result
        except Exception as e:
            logger.error(f"取得用戶 FLEX 訊息時發生錯誤: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"取得 FLEX 訊息失敗: {str(e)}"
            )
    
    @staticmethod
    def get_flex_message(db: Session, message_id: str, user_id: UUID) -> FlexMessageResponse:
        """取得特定 Flex 訊息"""
        message = db.query(FlexMessage).filter(
            FlexMessage.id == message_id,
            FlexMessage.user_id == user_id
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flex 訊息不存在"
            )
        
        return FlexMessageResponse(
            id=str(message.id),
            name=message.name,
            content=json.loads(message.content),
            user_id=str(message.user_id),
            created_at=message.created_at,
            updated_at=message.updated_at
        )
    
    @staticmethod
    def create_bot_code(db: Session, user_id: UUID, code_data: BotCodeCreate) -> BotCodeResponse:
        """建立 Bot 程式碼"""
        # 檢查 Bot 是否屬於該用戶
        bot = db.query(Bot).filter(
            Bot.id == code_data.bot_id,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        # 檢查是否已存在程式碼
        existing_code = db.query(BotCode).filter(BotCode.bot_id == code_data.bot_id).first()
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="該 Bot 已存在程式碼，請使用更新功能"
            )
        
        db_code = BotCode(
            user_id=user_id,
            bot_id=code_data.bot_id,
            code=code_data.code
        )
        
        db.add(db_code)
        db.commit()
        db.refresh(db_code)
        
        return BotCodeResponse(
            id=str(db_code.id),
            bot_id=str(db_code.bot_id),
            code=db_code.code,
            user_id=str(db_code.user_id),
            created_at=db_code.created_at,
            updated_at=db_code.updated_at
        )
    
    @staticmethod
    def get_user_bots_summary(db: Session, user_id: UUID) -> List[BotSummary]:
        """取得用戶 Bot 摘要列表"""
        bots = db.query(Bot).filter(Bot.user_id == user_id).order_by(Bot.created_at.desc()).all()
        return [
            BotSummary(
                id=str(bot.id),
                name=bot.name,
                created_at=bot.created_at
            )
            for bot in bots
        ]
    
    @staticmethod
    def save_visual_editor_data(
        db: Session, 
        bot_id: str, 
        user_id: UUID, 
        editor_data: VisualEditorData
    ) -> VisualEditorResponse:
        """儲存視覺化編輯器數據"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        # 驗證 Bot 是否屬於該用戶
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        try:
            # 序列化積木數據
            logic_blocks_json = json.dumps(editor_data.logic_blocks) if isinstance(editor_data.logic_blocks, (dict, list)) else editor_data.logic_blocks
            flex_blocks_json = json.dumps(editor_data.flex_blocks) if isinstance(editor_data.flex_blocks, (dict, list)) else editor_data.flex_blocks
            
            # 更新或創建 BotCode 記錄（儲存生成的程式碼）
            existing_code = db.query(BotCode).filter(BotCode.bot_id == bot_uuid).first()
            if existing_code:
                if editor_data.generated_code:
                    existing_code.code = editor_data.generated_code
                    db.commit()
                    db.refresh(existing_code)
            else:
                if editor_data.generated_code:
                    new_code = BotCode(
                        user_id=user_id,
                        bot_id=bot_uuid,
                        code=editor_data.generated_code
                    )
                    db.add(new_code)
                    db.commit()
                    db.refresh(new_code)
            
            # 儲存 Flex 訊息（如果有 flex_blocks）
            if editor_data.flex_blocks:
                # 創建新的 FlexMessage 記錄或更新現有的
                flex_message_name = f"{bot.name}_visual_editor_flex"
                existing_flex = db.query(FlexMessage).filter(
                    FlexMessage.user_id == user_id,
                    FlexMessage.name == flex_message_name
                ).first()
                
                if existing_flex:
                    existing_flex.content = flex_blocks_json
                    db.commit()
                    db.refresh(existing_flex)
                else:
                    new_flex = FlexMessage(
                        user_id=user_id,
                        name=flex_message_name,
                        content=flex_blocks_json
                    )
                    db.add(new_flex)
                    db.commit()
                    db.refresh(new_flex)
            
            return VisualEditorResponse(
                bot_id=str(bot_uuid),
                logic_blocks=json.loads(logic_blocks_json) if isinstance(logic_blocks_json, str) else logic_blocks_json,
                flex_blocks=json.loads(flex_blocks_json) if isinstance(flex_blocks_json, str) else flex_blocks_json,
                generated_code=editor_data.generated_code,
                created_at=bot.created_at,
                updated_at=bot.updated_at
            )
            
        except Exception as e:
            logger.error(f"儲存視覺化編輯器數據時發生錯誤: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"儲存數據時發生錯誤: {str(e)}"
            )
    
    @staticmethod
    def get_visual_editor_data(db: Session, bot_id: str, user_id: UUID) -> VisualEditorResponse:
        """取得視覺化編輯器數據"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        # 驗證 Bot 是否屬於該用戶
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        # 取得 Bot 程式碼
        bot_code = db.query(BotCode).filter(BotCode.bot_id == bot_uuid).first()
        generated_code = bot_code.code if bot_code else None
        
        # 取得 Flex 訊息
        flex_message_name = f"{bot.name}_visual_editor_flex"
        flex_message = db.query(FlexMessage).filter(
            FlexMessage.user_id == user_id,
            FlexMessage.name == flex_message_name
        ).first()
        
        # 默認空的積木數據
        logic_blocks = []
        flex_blocks = []
        
        if flex_message:
            try:
                flex_blocks = json.loads(flex_message.content) if isinstance(flex_message.content, str) else flex_message.content
            except json.JSONDecodeError:
                logger.warning(f"無法解析 Flex 訊息內容: {flex_message.id}")
                flex_blocks = []
        
        return VisualEditorResponse(
            bot_id=str(bot_uuid),
            logic_blocks=logic_blocks,
            flex_blocks=flex_blocks,
            generated_code=generated_code,
            created_at=bot.created_at,
            updated_at=bot.updated_at
        )
    
    # ===== 邏輯模板相關方法 =====
    
    @staticmethod
    def create_logic_template(db: Session, user_id: UUID, template_data: LogicTemplateCreate) -> LogicTemplateResponse:
        """創建邏輯模板"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(template_data.bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        # 驗證 Bot 是否屬於該用戶
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        # 檢查同名邏輯模板是否已存在
        existing_template = db.query(LogicTemplate).filter(
            LogicTemplate.bot_id == bot_uuid,
            LogicTemplate.name == template_data.name
        ).first()
        
        if existing_template:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="該Bot已存在同名的邏輯模板"
            )
        
        # 序列化邏輯積木數據
        logic_blocks_json = json.dumps(template_data.logic_blocks) if isinstance(template_data.logic_blocks, (dict, list)) else template_data.logic_blocks
        
        # 創建邏輯模板
        db_template = LogicTemplate(
            user_id=user_id,
            bot_id=bot_uuid,
            name=template_data.name,
            description=template_data.description,
            logic_blocks=logic_blocks_json,
            is_active=template_data.is_active
        )
        
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        
        return LogicTemplateResponse(
            id=str(db_template.id),
            name=db_template.name,
            description=db_template.description,
            logic_blocks=json.loads(db_template.logic_blocks) if isinstance(db_template.logic_blocks, str) else db_template.logic_blocks,
            is_active=db_template.is_active,
            bot_id=str(db_template.bot_id),
            user_id=str(db_template.user_id),
            generated_code=db_template.generated_code,
            created_at=db_template.created_at,
            updated_at=db_template.updated_at
        )
    
    @staticmethod
    def get_bot_logic_templates(db: Session, bot_id: str, user_id: UUID) -> List[LogicTemplateResponse]:
        """取得Bot的所有邏輯模板"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        # 驗證 Bot 是否屬於該用戶
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        templates = db.query(LogicTemplate).filter(
            LogicTemplate.bot_id == bot_uuid
        ).order_by(LogicTemplate.created_at.desc()).all()
        
        return [
            LogicTemplateResponse(
                id=str(template.id),
                name=template.name,
                description=template.description,
                logic_blocks=json.loads(template.logic_blocks) if isinstance(template.logic_blocks, str) else template.logic_blocks,
                is_active=template.is_active,
                bot_id=str(template.bot_id),
                user_id=str(template.user_id),
                generated_code=template.generated_code,
                created_at=template.created_at,
                updated_at=template.updated_at
            )
            for template in templates
        ]
    
    @staticmethod
    def get_bot_logic_templates_summary(db: Session, bot_id: str, user_id: UUID) -> List[LogicTemplateSummary]:
        """取得Bot邏輯模板摘要列表"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )
        
        # 驗證 Bot 是否屬於該用戶
        bot = db.query(Bot).filter(
            Bot.id == bot_uuid,
            Bot.user_id == user_id
        ).first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        templates = db.query(LogicTemplate).filter(
            LogicTemplate.bot_id == bot_uuid
        ).order_by(LogicTemplate.created_at.desc()).all()
        
        return [
            LogicTemplateSummary(
                id=str(template.id),
                name=template.name,
                description=template.description,
                is_active=template.is_active,
                created_at=template.created_at
            )
            for template in templates
        ]
    
    @staticmethod
    def get_logic_template(db: Session, template_id: str, user_id: UUID) -> LogicTemplateResponse:
        """取得特定邏輯模板"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            template_uuid = PyUUID(template_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的邏輯模板 ID 格式"
            )
        
        template = db.query(LogicTemplate).filter(
            LogicTemplate.id == template_uuid,
            LogicTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        return LogicTemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description,
            logic_blocks=json.loads(template.logic_blocks) if isinstance(template.logic_blocks, str) else template.logic_blocks,
            is_active=template.is_active,
            bot_id=str(template.bot_id),
            user_id=str(template.user_id),
            generated_code=template.generated_code,
            created_at=template.created_at,
            updated_at=template.updated_at
        )
    
    @staticmethod
    def update_logic_template(db: Session, template_id: str, user_id: UUID, template_data: LogicTemplateUpdate) -> LogicTemplateResponse:
        """更新邏輯模板"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            template_uuid = PyUUID(template_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的邏輯模板 ID 格式"
            )
        
        template = db.query(LogicTemplate).filter(
            LogicTemplate.id == template_uuid,
            LogicTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        # 檢查名稱重複（如果要更新名稱）
        if template_data.name and template_data.name != template.name:
            existing_template = db.query(LogicTemplate).filter(
                LogicTemplate.bot_id == template.bot_id,
                LogicTemplate.name == template_data.name,
                LogicTemplate.id != template_uuid
            ).first()
            if existing_template:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="該Bot已存在同名的邏輯模板"
                )
        
        # 更新邏輯模板資料
        update_data = template_data.dict(exclude_unset=True)
        
        # 特殊處理 logic_blocks 字段
        if 'logic_blocks' in update_data and update_data['logic_blocks'] is not None:
            update_data['logic_blocks'] = json.dumps(update_data['logic_blocks']) if isinstance(update_data['logic_blocks'], (dict, list)) else update_data['logic_blocks']
        
        for field, value in update_data.items():
            setattr(template, field, value)
        
        db.commit()
        db.refresh(template)
        
        return LogicTemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description,
            logic_blocks=json.loads(template.logic_blocks) if isinstance(template.logic_blocks, str) else template.logic_blocks,
            is_active=template.is_active,
            bot_id=str(template.bot_id),
            user_id=str(template.user_id),
            generated_code=template.generated_code,
            created_at=template.created_at,
            updated_at=template.updated_at
        )
    
    @staticmethod
    def delete_logic_template(db: Session, template_id: str, user_id: UUID) -> Dict[str, str]:
        """刪除邏輯模板"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            template_uuid = PyUUID(template_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的邏輯模板 ID 格式"
            )
        
        template = db.query(LogicTemplate).filter(
            LogicTemplate.id == template_uuid,
            LogicTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        try:
            db.delete(template)
            db.commit()
            logger.info(f"邏輯模板刪除成功: template_id={template_id}")
        except Exception as e:
            logger.error(f"刪除邏輯模板時發生錯誤: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"刪除邏輯模板時發生錯誤: {str(e)}"
            )
        
        return {"message": "邏輯模板已成功刪除"}
    
    @staticmethod
    def activate_logic_template(db: Session, template_id: str, user_id: UUID) -> Dict[str, str]:
        """激活邏輯模板（設為活躍狀態）"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            template_uuid = PyUUID(template_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的邏輯模板 ID 格式"
            )
        
        template = db.query(LogicTemplate).filter(
            LogicTemplate.id == template_uuid,
            LogicTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        try:
            # 設定目標模板為活躍（允許多個模板同時運行）
            template.is_active = "true"
            
            db.commit()
            logger.info(f"邏輯模板激活成功: template_id={template_id}")
        except Exception as e:
            logger.error(f"激活邏輯模板時發生錯誤: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"激活邏輯模板時發生錯誤: {str(e)}"
            )
        
        return {"message": "邏輯模板已成功激活"}
    
    @staticmethod
    def deactivate_logic_template(db: Session, template_id: str, user_id: UUID) -> Dict[str, str]:
        """停用邏輯模板"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            template_uuid = PyUUID(template_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的邏輯模板 ID 格式"
            )
        
        template = db.query(LogicTemplate).filter(
            LogicTemplate.id == template_uuid,
            LogicTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        try:
            # 設定目標模板為非活躍
            template.is_active = "false"
            
            db.commit()
            logger.info(f"邏輯模板停用成功: template_id={template_id}")
        except Exception as e:
            logger.error(f"停用邏輯模板時發生錯誤: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"停用邏輯模板時發生錯誤: {str(e)}"
            )
        
        return {"message": "邏輯模板已成功停用"}
    
    # ===== FLEX訊息增強方法 =====
    
    @staticmethod
    def update_flex_message(db: Session, message_id: str, user_id: UUID, message_data: FlexMessageUpdate) -> FlexMessageResponse:
        """更新 Flex 訊息"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            message_uuid = PyUUID(message_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的訊息 ID 格式"
            )
        
        message = db.query(FlexMessage).filter(
            FlexMessage.id == message_uuid,
            FlexMessage.user_id == user_id
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flex 訊息不存在"
            )
        
        # 檢查名稱重複（如果要更新名稱）
        if message_data.name and message_data.name != message.name:
            existing_message = db.query(FlexMessage).filter(
                FlexMessage.user_id == user_id,
                FlexMessage.name == message_data.name,
                FlexMessage.id != message_uuid
            ).first()
            if existing_message:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="已存在同名的 Flex 訊息"
                )
        
        # 更新 Flex 訊息資料
        update_data = message_data.dict(exclude_unset=True)
        
        # 特殊處理 content 字段
        if 'content' in update_data and update_data['content'] is not None:
            update_data['content'] = json.dumps(update_data['content']) if isinstance(update_data['content'], dict) else update_data['content']
        
        for field, value in update_data.items():
            setattr(message, field, value)
        
        db.commit()
        db.refresh(message)
        
        return FlexMessageResponse(
            id=str(message.id),
            name=message.name,
            content=json.loads(message.content) if isinstance(message.content, str) else message.content,
            user_id=str(message.user_id),
            created_at=message.created_at,
            updated_at=message.updated_at
        )
    
    @staticmethod
    def delete_flex_message(db: Session, message_id: str, user_id: UUID) -> Dict[str, str]:
        """刪除 Flex 訊息"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            message_uuid = PyUUID(message_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的訊息 ID 格式"
            )
        
        message = db.query(FlexMessage).filter(
            FlexMessage.id == message_uuid,
            FlexMessage.user_id == user_id
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flex 訊息不存在"
            )
        
        try:
            db.delete(message)
            db.commit()
            logger.info(f"Flex 訊息刪除成功: message_id={message_id}")
        except Exception as e:
            logger.error(f"刪除 Flex 訊息時發生錯誤: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"刪除 Flex 訊息時發生錯誤: {str(e)}"
            )
        
        return {"message": "Flex 訊息已成功刪除"}
    
    @staticmethod
    def get_user_flex_messages_summary(db: Session, user_id: UUID) -> List[FlexMessageSummary]:
        """取得用戶FLEX訊息摘要列表"""
        messages = db.query(FlexMessage).filter(
            FlexMessage.user_id == user_id
        ).order_by(FlexMessage.created_at.desc()).all()
        
        return [
            FlexMessageSummary(
                id=str(msg.id),
                name=msg.name,
                created_at=msg.created_at
            )
            for msg in messages
        ] 