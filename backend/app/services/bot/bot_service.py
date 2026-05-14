"""
Bot 管理服務模組
處理 Bot 的 CRUD 操作、Flex 訊息管理、程式碼管理等（已全面改為 AsyncSession）
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import json

logger = logging.getLogger(__name__)
DUPLICATE_LINE_BOT_DETAIL = "此 LINE Bot 已於本系統註冊過，無法重複建立"

from app.models.bot import Bot, FlexMessage, BotCode, LogicTemplate
from app.services.line.line_bot_service import LineBotService
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse,
    FlexMessageCreate, FlexMessageUpdate, FlexMessageResponse, FlexMessageSummary,
    BotSummary, LineBotProfilePreviewRequest, LineBotProfileResponse,
    LogicTemplateCreate, LogicTemplateUpdate, LogicTemplateResponse, LogicTemplateSummary
)

class BotService:
    """Bot 管理服務類別（async）"""

    @staticmethod
    async def _auto_bind_line_webhook(bot: Bot) -> Dict[str, Any]:
        """Set the LINE Messaging API webhook endpoint for this bot."""
        if not bot.channel_token or not bot.channel_secret:
            return {"success": False, "error": "Bot 尚未設定 LINE Channel Token 或 Secret"}

        endpoint = LineBotService.build_webhook_endpoint(str(bot.id))
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        result = await line_bot_service.ensure_webhook_endpoint(endpoint)

        if result.get("success"):
            logger.info("LINE Webhook 已自動綁定: bot_id=%s endpoint=%s", bot.id, endpoint)
        else:
            logger.warning("LINE Webhook 自動綁定失敗: bot_id=%s endpoint=%s error=%s", bot.id, endpoint, result.get("error"))

        return result

    @staticmethod
    def _extract_line_bot_user_id(info: Optional[Dict[str, Any]]) -> Optional[str]:
        """Return LINE Messaging API bot userId from a bot info payload."""
        if not info:
            return None

        line_bot_user_id = info.get("user_id") or info.get("channel_id")
        if not line_bot_user_id:
            return None

        return str(line_bot_user_id).strip() or None

    @staticmethod
    async def _get_verified_line_bot_info(channel_token: str, channel_secret: str) -> Dict[str, Any]:
        """Fetch LINE bot info and require a stable LINE bot identity."""
        line_bot_service = LineBotService(channel_token, channel_secret)
        info = await line_bot_service.async_get_bot_info()

        if not info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無法取得 LINE Bot 資訊，請確認 Channel Access Token 是否正確"
            )

        error = info.get("error")
        line_bot_user_id = BotService._extract_line_bot_user_id(info)
        display_name = str(info.get("display_name") or "").strip()

        if error or not line_bot_user_id or not display_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error or "LINE API 未回傳有效 Bot 資訊，請確認 Channel Access Token 是否正確"
            )

        return info

    @staticmethod
    async def _find_legacy_registered_line_bot(
        db: AsyncSession,
        line_bot_user_id: str,
        *,
        exclude_bot_id: Optional[UUID] = None,
    ) -> Optional[Bot]:
        """
        Check older rows that were created before line_bot_user_id existed.
        These rows cannot be found by the unique index until they are updated.
        """
        stmt = select(Bot).where(Bot.line_bot_user_id.is_(None))
        if exclude_bot_id is not None:
            stmt = stmt.where(Bot.id != exclude_bot_id)

        result = await db.execute(stmt)
        legacy_bots = result.scalars().all()

        for existing_bot in legacy_bots:
            if not existing_bot.channel_token:
                continue

            try:
                info = await LineBotService(
                    existing_bot.channel_token,
                    existing_bot.channel_secret,
                ).async_get_bot_info()
            except Exception as exc:
                logger.warning(
                    "檢查既有 Bot 的 LINE 身分失敗: bot_id=%s error=%s",
                    existing_bot.id,
                    exc,
                )
                continue

            existing_line_bot_user_id = BotService._extract_line_bot_user_id(info)
            if existing_line_bot_user_id == line_bot_user_id:
                return existing_bot

        return None

    @staticmethod
    async def _ensure_line_bot_not_registered(
        db: AsyncSession,
        line_bot_user_id: str,
        *,
        channel_token: Optional[str] = None,
        exclude_bot_id: Optional[UUID] = None,
        include_legacy_scan: bool = True,
    ) -> None:
        """Raise 409 if the LINE official account is already registered."""
        conditions = [Bot.line_bot_user_id == line_bot_user_id]
        if channel_token:
            conditions.append(Bot.channel_token == channel_token)

        stmt = select(Bot).where(or_(*conditions))
        if exclude_bot_id is not None:
            stmt = stmt.where(Bot.id != exclude_bot_id)

        result = await db.execute(stmt)
        existing_bot = result.scalars().first()
        if existing_bot:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=DUPLICATE_LINE_BOT_DETAIL
            )

        if include_legacy_scan:
            legacy_bot = await BotService._find_legacy_registered_line_bot(
                db,
                line_bot_user_id,
                exclude_bot_id=exclude_bot_id,
            )
            if legacy_bot:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=DUPLICATE_LINE_BOT_DETAIL
                )

    @staticmethod
    def _apply_line_bot_info(bot: Bot, info: Dict[str, Any]) -> None:
        bot.line_bot_user_id = BotService._extract_line_bot_user_id(info)
        bot.line_bot_basic_id = info.get("basic_id")
        bot.line_bot_display_name = info.get("display_name")
        # picture_url 在建立後由 _upload_bot_avatar_to_minio 處理

    @staticmethod
    async def _upload_bot_avatar_to_minio(db: AsyncSession, bot: Bot, picture_url: Optional[str]) -> None:
        """下載 LINE Bot 頭像並上傳至 MinIO，成功後更新 bot.line_bot_picture_url"""
        if not picture_url:
            return
        try:
            from app.services.storage.minio_service import get_minio_service
            minio = get_minio_service()
            if not minio:
                logger.warning("MinIO 服務未初始化，跳過 Bot 頭像上傳: bot_id=%s", bot.id)
                return
            _, proxy_url = await minio.upload_bot_avatar(str(bot.id), picture_url)
            if proxy_url:
                bot.line_bot_picture_url = proxy_url
                await db.commit()
                await db.refresh(bot)
                logger.info("Bot 頭像已儲存至 MinIO: bot_id=%s url=%s", bot.id, proxy_url)
        except Exception as e:
            logger.warning("上傳 Bot 頭像至 MinIO 失敗（不影響建立流程）: bot_id=%s error=%s", bot.id, e)

    @staticmethod
    def _bot_response(bot: Bot) -> BotResponse:
        return BotResponse(
            id=str(bot.id),
            name=bot.name,
            channel_token=bot.channel_token,
            channel_secret=bot.channel_secret,
            line_bot_user_id=bot.line_bot_user_id,
            line_bot_basic_id=bot.line_bot_basic_id,
            line_bot_display_name=bot.line_bot_display_name,
            line_bot_picture_url=bot.line_bot_picture_url,
            user_id=str(bot.user_id),
            created_at=bot.created_at,
            updated_at=bot.updated_at
        )

    @staticmethod
    async def _commit_bot_changes(db: AsyncSession, duplicate_name_detail: str = "Bot 名稱已存在") -> None:
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            error_text = str(exc.orig or exc)
            if "idx_bot_line_bot_user_id" in error_text or "line_bot_user_id" in error_text:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=DUPLICATE_LINE_BOT_DETAIL
                ) from exc
            if "unique_bot_name_per_user" in error_text:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=duplicate_name_detail
                ) from exc
            raise
    
    @staticmethod
    async def create_bot(db: AsyncSession, user_id: UUID, bot_data: BotCreate) -> BotResponse:
        """建立新的 Bot"""
        # 檢查用戶 Bot 數量限制
        res_cnt = await db.execute(select(func.count()).select_from(Bot).where(Bot.user_id == user_id))
        bot_count = res_cnt.scalar() or 0
        if bot_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="每個用戶最多只能建立 3 個 Bot"
            )

        # 檢查 Bot 名稱是否重複
        res_exist = await db.execute(
            select(Bot).where(Bot.user_id == user_id, Bot.name == bot_data.name)
        )
        existing_bot = res_exist.scalars().first()
        if existing_bot:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bot 名稱已存在"
            )

        line_bot_info = await BotService._get_verified_line_bot_info(
            bot_data.channel_token,
            bot_data.channel_secret,
        )
        line_bot_user_id = BotService._extract_line_bot_user_id(line_bot_info)

        if not line_bot_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LINE API 未回傳有效 Bot 身分，請確認 Channel Access Token 是否正確"
            )

        await BotService._ensure_line_bot_not_registered(
            db,
            line_bot_user_id,
            channel_token=bot_data.channel_token,
        )

        # 建立新的 Bot
        db_bot = Bot(
            user_id=user_id,
            name=bot_data.name,
            channel_token=bot_data.channel_token,
            channel_secret=bot_data.channel_secret
        )
        BotService._apply_line_bot_info(db_bot, line_bot_info)

        db.add(db_bot)
        await BotService._commit_bot_changes(db)
        await db.refresh(db_bot)

        try:
            await BotService._auto_bind_line_webhook(db_bot)
        except Exception as e:
            logger.warning("建立 Bot 後自動綁定 LINE Webhook 失敗: bot_id=%s error=%s", db_bot.id, e)

        # 下載並快取 LINE Bot 頭像至 MinIO（不阻塞建立流程）
        picture_url = line_bot_info.get("picture_url")
        await BotService._upload_bot_avatar_to_minio(db, db_bot, picture_url)

        return BotService._bot_response(db_bot)
    
    @staticmethod
    async def _backfill_avatar_if_missing(db: AsyncSession, bot: Bot) -> None:
        """若 Bot 缺少 MinIO 頭像，從 LINE API 重新抓取並存入 MinIO（背景執行）"""
        if bot.line_bot_picture_url or not bot.channel_token or not bot.channel_secret:
            return
        try:
            line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
            info = await line_bot_service.async_get_bot_info()
            if info and not info.get("error"):
                picture_url = info.get("picture_url")
                await BotService._upload_bot_avatar_to_minio(db, bot, picture_url)
        except Exception as e:
            logger.debug("補抓 Bot 頭像失敗（非嚴重）: bot_id=%s error=%s", bot.id, e)

    @staticmethod
    async def get_user_bots(db: AsyncSession, user_id: UUID) -> List[BotResponse]:
        """取得用戶的所有 Bot (優化查詢：使用 eager loading)"""
        import asyncio
        # 使用 selectinload 預載入相關資料，避免 N+1 問題
        stmt = (
            select(Bot)
            .options(
                selectinload(Bot.logic_templates),
                selectinload(Bot.bot_code),
            )
            .where(Bot.user_id == user_id)
            .order_by(Bot.created_at.desc())
        )
        result = await db.execute(stmt)
        bots = result.scalars().all()

        # 對缺少頭像的既有 Bot 並行補抓（在 return 前等待完成，確保本次回應即有頭像）
        bots_missing_avatar = [b for b in bots if not b.line_bot_picture_url and b.channel_token]
        if bots_missing_avatar:
            await asyncio.gather(
                *[BotService._backfill_avatar_if_missing(db, b) for b in bots_missing_avatar],
                return_exceptions=True,
            )

        return [BotService._bot_response(bot) for bot in bots]
    
    @staticmethod
    async def get_bot(db: AsyncSession, bot_id: str, user_id: UUID) -> BotResponse:
        """取得特定 Bot (優化查詢：使用 eager loading)"""
        try:
            # 將字符串 UUID 轉換為 UUID 對象
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )

        # 使用 eager loading 預載入相關資料
        stmt = (
            select(Bot)
            .options(
                selectinload(Bot.logic_templates),
                selectinload(Bot.bot_code),
            )
            .where(Bot.id == bot_uuid, Bot.user_id == user_id)
        )
        result = await db.execute(stmt)
        bot = result.scalars().first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        return BotService._bot_response(bot)
    
    @staticmethod
    async def update_bot(db: AsyncSession, bot_id: str, user_id: UUID, bot_data: BotUpdate) -> BotResponse:
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

        res_bot = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
        bot = res_bot.scalars().first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        update_data = bot_data.dict(exclude_unset=True)

        # 檢查名稱重複（如果要更新名稱）
        if update_data.get("name") and update_data["name"] != bot.name:
            res_exist = await db.execute(
                select(Bot).where(Bot.user_id == user_id, Bot.name == update_data["name"], Bot.id != bot_uuid)
            )
            existing_bot = res_exist.scalars().first()
            if existing_bot:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Bot 名稱已存在"
                )

        if "channel_token" in update_data or "channel_secret" in update_data:
            next_channel_token = update_data.get("channel_token", bot.channel_token)
            next_channel_secret = update_data.get("channel_secret", bot.channel_secret)
            line_bot_info = await BotService._get_verified_line_bot_info(
                next_channel_token,
                next_channel_secret,
            )
            line_bot_user_id = BotService._extract_line_bot_user_id(line_bot_info)

            if not line_bot_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="LINE API 未回傳有效 Bot 身分，請確認 Channel Access Token 是否正確"
                )

            await BotService._ensure_line_bot_not_registered(
                db,
                line_bot_user_id,
                channel_token=next_channel_token,
                exclude_bot_id=bot_uuid,
            )

            update_data["line_bot_user_id"] = line_bot_user_id
            update_data["line_bot_basic_id"] = line_bot_info.get("basic_id")
            update_data["line_bot_display_name"] = line_bot_info.get("display_name")
        
        # 更新 Bot 資料
        for field, value in update_data.items():
            setattr(bot, field, value)
        
        await BotService._commit_bot_changes(db)
        await db.refresh(bot)

        if "channel_token" in update_data or "channel_secret" in update_data:
            try:
                await BotService._auto_bind_line_webhook(bot)
            except Exception as e:
                logger.warning("更新 Bot 後自動綁定 LINE Webhook 失敗: bot_id=%s error=%s", bot.id, e)
            # 憑證更新時重新抓取並快取頭像
            new_picture_url = line_bot_info.get("picture_url")
            await BotService._upload_bot_avatar_to_minio(db, bot, new_picture_url)

        return BotService._bot_response(bot)

    @staticmethod
    async def get_line_bot_profile(db: AsyncSession, bot_id: str, user_id: UUID) -> LineBotProfileResponse:
        """透過 LINE Messaging API 取得官方帳號真實 Bot 資訊"""
        try:
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的 Bot ID 格式"
            )

        res_bot = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
        bot = res_bot.scalars().first()

        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )

        from app.services.line.line_bot_service import LineBotService

        if not bot.channel_token or not bot.channel_secret:
            return LineBotProfileResponse(
                is_live=False,
                error="尚未設定 Channel Access Token 或 Channel Secret",
                fetched_at=datetime.utcnow(),
            )

        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        info = await line_bot_service.async_get_bot_info()

        if not info:
            return LineBotProfileResponse(
                is_live=False,
                error="無法從 LINE API 取得 Bot 資訊",
                fetched_at=datetime.utcnow(),
            )

        error = info.get("error")
        is_live = not bool(error) and bool(info.get("channel_id") or info.get("user_id"))

        if not is_live:
            return LineBotProfileResponse(
                is_live=False,
                error=error or "LINE API 未回傳有效 Bot 資訊",
                fetched_at=datetime.utcnow(),
            )

        return LineBotProfileResponse(
            user_id=info.get("user_id"),
            channel_id=info.get("channel_id") or info.get("user_id"),
            basic_id=info.get("basic_id"),
            premium_id=info.get("premium_id"),
            display_name=info.get("display_name"),
            picture_url=info.get("picture_url"),
            chat_mode=info.get("chat_mode"),
            mark_as_read_mode=info.get("mark_as_read_mode"),
            is_live=True,
            fetched_at=datetime.utcnow(),
        )

    @staticmethod
    async def preview_line_bot_profile(
        db: AsyncSession,
        profile_data: LineBotProfilePreviewRequest,
    ) -> LineBotProfileResponse:
        """用尚未儲存的 LINE Channel 憑證取得官方帳號資訊"""
        line_bot_service = LineBotService(profile_data.channel_token, profile_data.channel_secret)
        info = await line_bot_service.async_get_bot_info()

        if not info:
            return LineBotProfileResponse(
                is_live=False,
                error="無法從 LINE API 取得 Bot 資訊",
                fetched_at=datetime.utcnow(),
            )

        error = info.get("error")
        display_name = info.get("display_name")
        is_live = not bool(error) and bool(display_name) and bool(info.get("channel_id") or info.get("user_id"))

        if not is_live:
            return LineBotProfileResponse(
                is_live=False,
                error=error or "LINE API 未回傳有效 Bot 資訊",
                fetched_at=datetime.utcnow(),
            )

        line_bot_user_id = BotService._extract_line_bot_user_id(info)
        if line_bot_user_id:
            await BotService._ensure_line_bot_not_registered(
                db,
                line_bot_user_id,
                channel_token=profile_data.channel_token,
                include_legacy_scan=False,
            )

        return LineBotProfileResponse(
            user_id=info.get("user_id"),
            channel_id=info.get("channel_id") or info.get("user_id"),
            basic_id=info.get("basic_id"),
            premium_id=info.get("premium_id"),
            display_name=display_name,
            picture_url=info.get("picture_url"),
            chat_mode=info.get("chat_mode"),
            mark_as_read_mode=info.get("mark_as_read_mode"),
            is_live=True,
            fetched_at=datetime.utcnow(),
        )
    
    @staticmethod
    async def delete_bot(db: AsyncSession, bot_id: str, user_id: UUID) -> Dict[str, str]:
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
        
        res_bot = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
        bot = res_bot.scalars().first()
        
        if not bot:
            logger.warning(f"Bot 不存在: bot_uuid={bot_uuid}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        logger.info(f"找到 Bot，準備刪除: bot_name={bot.name}")
        
        try:
            # 手動刪除相關的 BotCode 記錄（如果存在）
            res_codes = await db.execute(select(BotCode).where(BotCode.bot_id == bot_uuid))
            bot_codes = res_codes.scalars().all()
            for code in bot_codes:
                logger.debug(f"刪除相關的 BotCode: {code.id}")
                await db.delete(code)

            # 刪除 Bot 本身
            await db.delete(bot)
            await db.commit()
            logger.info(f"Bot 刪除成功: bot_id={bot_id}")
        except Exception as e:
            logger.error(f"刪除 Bot 時發生錯誤: {e}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"刪除 Bot 時發生錯誤: {str(e)}"
            )
        
        return {"message": "Bot 已成功刪除"}
    
    @staticmethod
    async def create_flex_message(db: AsyncSession, user_id: UUID, message_data: FlexMessageCreate) -> FlexMessageResponse:
        """建立 Flex 訊息"""
        # 檢查同名 Flex 訊息是否已存在
        res_exist = await db.execute(
            select(FlexMessage).where(FlexMessage.user_id == user_id, FlexMessage.name == message_data.name)
        )
        existing_message = res_exist.scalars().first()
        
        if existing_message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="已存在同名的 Flex 訊息"
            )
        # 解析/編譯 content 與 design_blocks（雙軌儲存）
        compiled_contents = None
        design_blocks = None
        try:
            from app.services.line.logic_engine_service import LogicEngineService
            # 若有顯式 design_blocks 優先保存
            if getattr(message_data, 'design_blocks', None) is not None:
                design_blocks = message_data.design_blocks
            # 嘗試從 content 中萃取 blocks
            if design_blocks is None and isinstance(message_data.content, dict) and isinstance(message_data.content.get('blocks'), list):
                design_blocks = message_data.content.get('blocks')
            # 編譯最終 contents（bubble/carousel）
            compiled_contents = LogicEngineService._to_flex_contents(message_data.content)
        except Exception as e:
            logger.warning(f"編譯 Flex 內容失敗，將原樣保存 content：{e}")
            compiled_contents = message_data.content

        # JSONB 欄位會自動處理序列化
        db_message = FlexMessage(
            user_id=user_id,
            name=message_data.name,
            content=compiled_contents,
            design_blocks=design_blocks
        )

        db.add(db_message)
        await db.commit()
        await db.refresh(db_message)
        
        return FlexMessageResponse(
            id=str(db_message.id),
            name=db_message.name,
            content=db_message.content,
            design_blocks=db_message.design_blocks,
            user_id=str(db_message.user_id),
            created_at=db_message.created_at,
            updated_at=db_message.updated_at
        )
    
    @staticmethod
    async def get_user_flex_messages(db: AsyncSession, user_id: UUID) -> List[FlexMessageResponse]:
        """取得用戶的所有 Flex 訊息"""
        try:
            res = await db.execute(select(FlexMessage).where(FlexMessage.user_id == user_id))
            messages = res.scalars().all()
            result = []
            
            for msg in messages:
                try:
                    # JSONB 欄位會自動解析內容
                    content = msg.content
                    
                    result.append(FlexMessageResponse(
                        id=str(msg.id),
                        name=msg.name,
                        content=content,
                        design_blocks=msg.design_blocks,
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
    async def get_flex_message(db: AsyncSession, message_id: str, user_id: UUID) -> FlexMessageResponse:
        """取得特定 Flex 訊息"""
        res = await db.execute(select(FlexMessage).where(FlexMessage.id == message_id, FlexMessage.user_id == user_id))
        message = res.scalars().first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flex 訊息不存在"
            )
        
        return FlexMessageResponse(
            id=str(message.id),
            name=message.name,
            content=message.content,
            design_blocks=message.design_blocks,
            user_id=str(message.user_id),
            created_at=message.created_at,
            updated_at=message.updated_at
        )
    
    @staticmethod
    async def get_user_bots_summary(db: AsyncSession, user_id: UUID) -> List[BotSummary]:
        """取得用戶 Bot 摘要列表"""
        res = await db.execute(
            select(Bot).where(Bot.user_id == user_id).order_by(Bot.created_at.desc())
        )
        bots = res.scalars().all()
        return [
            BotSummary(
                id=str(bot.id),
                name=bot.name,
                created_at=bot.created_at
            )
            for bot in bots
        ]
    
    # ===== 邏輯模板相關方法 =====
    
    @staticmethod
    async def create_logic_template(db: AsyncSession, user_id: UUID, template_data: LogicTemplateCreate) -> LogicTemplateResponse:
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
        res_bot = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
        bot = res_bot.scalars().first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        # 檢查同名邏輯模板是否已存在
        res_exist = await db.execute(
            select(LogicTemplate).where(LogicTemplate.bot_id == bot_uuid, LogicTemplate.name == template_data.name)
        )
        existing_template = res_exist.scalars().first()
        
        if existing_template:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="該Bot已存在同名的邏輯模板"
            )
        
        # 創建邏輯模板（JSONB 欄位會自動處理序列化）
        db_template = LogicTemplate(
            user_id=user_id,
            bot_id=bot_uuid,
            name=template_data.name,
            description=template_data.description,
            logic_blocks=template_data.logic_blocks,
            is_active=template_data.is_active
        )
        
        db.add(db_template)
        await db.commit()
        await db.refresh(db_template)
        
        return LogicTemplateResponse(
            id=str(db_template.id),
            name=db_template.name,
            description=db_template.description,
            logic_blocks=db_template.logic_blocks,
            is_active=db_template.is_active,
            bot_id=str(db_template.bot_id),
            user_id=str(db_template.user_id),
            generated_code=db_template.generated_code,
            created_at=db_template.created_at,
            updated_at=db_template.updated_at
        )
    
    @staticmethod
    async def get_bot_logic_templates(db: AsyncSession, bot_id: str, user_id: UUID) -> List[LogicTemplateResponse]:
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
        res_bot = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
        bot = res_bot.scalars().first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        res_tpl = await db.execute(
            select(LogicTemplate).where(LogicTemplate.bot_id == bot_uuid).order_by(LogicTemplate.created_at.desc())
        )
        templates = res_tpl.scalars().all()
        
        return [
            LogicTemplateResponse(
                id=str(template.id),
                name=template.name,
                description=template.description,
                logic_blocks=template.logic_blocks,
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
    async def get_bot_logic_templates_summary(db: AsyncSession, bot_id: str, user_id: UUID) -> List[LogicTemplateSummary]:
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
        res_bot = await db.execute(select(Bot).where(Bot.id == bot_uuid, Bot.user_id == user_id))
        bot = res_bot.scalars().first()
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot 不存在"
            )
        
        res_tpl = await db.execute(
            select(LogicTemplate).where(LogicTemplate.bot_id == bot_uuid).order_by(LogicTemplate.created_at.desc())
        )
        templates = res_tpl.scalars().all()
        
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
    async def get_logic_template(db: AsyncSession, template_id: str, user_id: UUID) -> LogicTemplateResponse:
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
        
        res_tpl = await db.execute(
            select(LogicTemplate).where(LogicTemplate.id == template_uuid, LogicTemplate.user_id == user_id)
        )
        template = res_tpl.scalars().first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        return LogicTemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description,
            logic_blocks=template.logic_blocks,
            is_active=template.is_active,
            bot_id=str(template.bot_id),
            user_id=str(template.user_id),
            generated_code=template.generated_code,
            created_at=template.created_at,
            updated_at=template.updated_at
        )
    
    @staticmethod
    async def update_logic_template(db: AsyncSession, template_id: str, user_id: UUID, template_data: LogicTemplateUpdate) -> LogicTemplateResponse:
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
        
        res_tpl = await db.execute(
            select(LogicTemplate).where(LogicTemplate.id == template_uuid, LogicTemplate.user_id == user_id)
        )
        template = res_tpl.scalars().first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        # 檢查名稱重複（如果要更新名稱）
        if template_data.name and template_data.name != template.name:
            res_exist = await db.execute(
                select(LogicTemplate).where(
                    LogicTemplate.bot_id == template.bot_id,
                    LogicTemplate.name == template_data.name,
                    LogicTemplate.id != template_uuid,
                )
            )
            existing_template = res_exist.scalars().first()
            if existing_template:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="該Bot已存在同名的邏輯模板"
                )
        
        # 更新邏輯模板資料（JSONB 欄位會自動處理序列化）
        update_data = template_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(template, field, value)
        
        await db.commit()
        await db.refresh(template)
        
        return LogicTemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description,
            logic_blocks=template.logic_blocks,
            is_active=template.is_active,
            bot_id=str(template.bot_id),
            user_id=str(template.user_id),
            generated_code=template.generated_code,
            created_at=template.created_at,
            updated_at=template.updated_at
        )
    
    @staticmethod
    async def activate_logic_template(db: AsyncSession, template_id: str, user_id: UUID) -> Dict[str, str]:
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
        
        res_tpl = await db.execute(
            select(LogicTemplate).where(LogicTemplate.id == template_uuid, LogicTemplate.user_id == user_id)
        )
        template = res_tpl.scalars().first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        try:
            # 設定目標模板為活躍（允許多個模板同時運行）
            template.is_active = "true"

            await db.commit()
            logger.info(f"邏輯模板激活成功: template_id={template_id}")
        except Exception as e:
            logger.error(f"激活邏輯模板時發生錯誤: {e}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"激活邏輯模板時發生錯誤: {str(e)}"
            )
        
        return {"message": "邏輯模板已成功激活"}
    
    @staticmethod
    async def deactivate_logic_template(db: AsyncSession, template_id: str, user_id: UUID) -> Dict[str, str]:
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
        
        res_tpl = await db.execute(
            select(LogicTemplate).where(LogicTemplate.id == template_uuid, LogicTemplate.user_id == user_id)
        )
        template = res_tpl.scalars().first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邏輯模板不存在"
            )
        
        try:
            # 設定目標模板為非活躍
            template.is_active = "false"

            await db.commit()
            logger.info(f"邏輯模板停用成功: template_id={template_id}")
        except Exception as e:
            logger.error(f"停用邏輯模板時發生錯誤: {e}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"停用邏輯模板時發生錯誤: {str(e)}"
            )
        
        return {"message": "邏輯模板已成功停用"}
    
    # ===== FLEX訊息增強方法 =====
    
    @staticmethod
    async def update_flex_message(db: AsyncSession, message_id: str, user_id: UUID, message_data: FlexMessageUpdate) -> FlexMessageResponse:
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
        
        res_msg = await db.execute(
            select(FlexMessage).where(FlexMessage.id == message_uuid, FlexMessage.user_id == user_id)
        )
        message = res_msg.scalars().first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flex 訊息不存在"
            )
        
        # 檢查名稱重複（如果要更新名稱）
        if message_data.name and message_data.name != message.name:
            res_exist = await db.execute(
                select(FlexMessage).where(
                    FlexMessage.user_id == user_id,
                    FlexMessage.name == message_data.name,
                    FlexMessage.id != message_uuid,
                )
            )
            existing_message = res_exist.scalars().first()
            if existing_message:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="已存在同名的 Flex 訊息"
                )
        
        # 更新 Flex 訊息資料（雙軌）
        update_data = message_data.dict(exclude_unset=True)
        name_changed = 'name' in update_data
        content_changed = 'content' in update_data
        design_blocks_changed = 'design_blocks' in update_data

        if name_changed:
            message.name = update_data['name']

        # 如果提供了 design_blocks，直接存；並以 content（若有）或 design_blocks 編譯最終 contents
        compiled_contents = None
        if design_blocks_changed:
            message.design_blocks = update_data['design_blocks']

        if content_changed or design_blocks_changed:
            try:
                from app.services.line.logic_engine_service import LogicEngineService
                src = update_data.get('content', None)
                if src is None and message.design_blocks is not None:
                    # 只有 blocks，組成設計器格式以便編譯
                    src = {'blocks': message.design_blocks}
                compiled_contents = LogicEngineService._to_flex_contents(src)
                message.content = compiled_contents
            except Exception as e:
                logger.warning(f"編譯更新後 Flex 內容失敗，保留原 content：{e}")
                if content_changed:
                    message.content = update_data['content']

        await db.commit()
        await db.refresh(message)
        
        return FlexMessageResponse(
            id=str(message.id),
            name=message.name,
            content=message.content,
            design_blocks=message.design_blocks,
            user_id=str(message.user_id),
            created_at=message.created_at,
            updated_at=message.updated_at
        )
    
    @staticmethod
    async def get_user_flex_messages_summary(db: AsyncSession, user_id: UUID) -> List[FlexMessageSummary]:
        """取得用戶FLEX訊息摘要列表"""
        res = await db.execute(
            select(FlexMessage).where(FlexMessage.user_id == user_id).order_by(FlexMessage.created_at.desc())
        )
        messages = res.scalars().all()
        
        return [
            FlexMessageSummary(
                id=str(msg.id),
                name=msg.name,
                created_at=msg.created_at
            )
            for msg in messages
        ] 
