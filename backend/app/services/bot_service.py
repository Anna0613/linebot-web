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

from app.models.bot import Bot, FlexMessage, BotCode
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse,
    FlexMessageCreate, FlexMessageUpdate, FlexMessageResponse,
    BotCodeCreate, BotCodeUpdate, BotCodeResponse
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
        # 將內容轉換為 JSON 字串
        content_str = json.dumps(message_data.content) if isinstance(message_data.content, dict) else message_data.content
        
        db_message = FlexMessage(
            user_id=user_id,
            content=content_str
        )
        
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        
        return FlexMessageResponse(
            id=str(db_message.id),
            content=json.loads(db_message.content),
            user_id=str(db_message.user_id),
            created_at=db_message.created_at,
            updated_at=db_message.updated_at
        )
    
    @staticmethod
    def get_user_flex_messages(db: Session, user_id: UUID) -> List[FlexMessageResponse]:
        """取得用戶的所有 Flex 訊息"""
        messages = db.query(FlexMessage).filter(FlexMessage.user_id == user_id).all()
        return [
            FlexMessageResponse(
                id=str(msg.id),
                content=json.loads(msg.content),
                user_id=str(msg.user_id),
                created_at=msg.created_at,
                updated_at=msg.updated_at
            )
            for msg in messages
        ]
    
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