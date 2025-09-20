"""
LINE Bot Service
處理 LINE Bot API 的核心服務
"""
import hashlib
import hmac
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import aiohttp
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import LineBotApiError, InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    ImageSendMessage, FlexSendMessage, RichMenu, StickerSendMessage
)

logger = logging.getLogger(__name__)

class LineBotService:
    """LINE Bot API 服務類"""
    
    def __init__(self, channel_token: str, channel_secret: str):
        """
        初始化 LINE Bot Service
        
        Args:
            channel_token: LINE Bot 頻道存取權杖
            channel_secret: LINE Bot 頻道密鑰
        """
        self.channel_token = channel_token
        self.channel_secret = channel_secret
        
        if channel_token and channel_secret:
            try:
                self.line_bot_api = LineBotApi(channel_token)
                self.handler = WebhookHandler(channel_secret)
            except Exception as e:
                logger.error(f"初始化 LINE Bot API 失敗: {e}")
                self.line_bot_api = None
                self.handler = None
        else:
            self.line_bot_api = None
            self.handler = None
    
    def is_configured(self) -> bool:
        """檢查是否已正確配置"""
        return self.line_bot_api is not None and self.handler is not None
    
    def verify_signature(self, body: bytes, signature: str) -> bool:
        """
        驗證 Webhook 簽名
        
        Args:
            body: 請求內容 (bytes)
            signature: LINE 提供的簽名
            
        Returns:
            bool: 簽名是否有效
        """
        if not signature:
            return False
            
        if not self.channel_secret:
            return False
            
        try:
            import base64
            
            # LINE 平台使用 HMAC-SHA256 生成簽名，然後進行 base64 編碼
            hash_value = hmac.new(
                self.channel_secret.encode('utf-8'),
                body,
                hashlib.sha256
            ).digest()
            
            # 將計算出的 hash 進行 base64 編碼
            expected_signature = base64.b64encode(hash_value).decode('utf-8')
            
            logger.debug(f"預期簽名: {expected_signature}")
            logger.debug(f"接收簽名: {signature}")
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"簽名驗證失敗: {e}")
            return False
    
    def verify_webhook_signature(self, body: str, signature: str) -> bool:
        """
        驗證 Webhook 簽名
        
        Args:
            body: 請求內容
            signature: LINE 提供的簽名
            
        Returns:
            bool: 簽名是否有效
        """
        if not self.channel_secret:
            return False
            
        try:
            hash_value = hmac.new(
                self.channel_secret.encode('utf-8'),
                body.encode('utf-8'),
                hashlib.sha256
            ).digest()
            expected_signature = "sha256=" + hash_value.hex()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"簽名驗證失敗: {e}")
            return False
    
    def get_bot_info(self) -> Optional[Dict]:
        """
        獲取 Bot 基本資訊，包含 Channel ID
        
        Returns:
            Dict: Bot 資訊
        """
        if not self.is_configured():
            return None
            
        try:
            from linebot.v3.messaging import Configuration, ApiClient, MessagingApi
            
            configuration = Configuration(access_token=self.channel_token)
            with ApiClient(configuration) as api_client:
                line_bot_api = MessagingApi(api_client)
                bot_info_response = line_bot_api.get_bot_info()
                
                # 記錄獲取到的資訊以便調試
                logger.info(f"獲取到 Bot 資訊 - user_id: {bot_info_response.user_id}, basic_id: {bot_info_response.basic_id}")
                
                return {
                    "user_id": bot_info_response.user_id,  # 這就是 Channel ID
                    "channel_id": bot_info_response.user_id,  # 明確標示為 channel_id
                    "basic_id": bot_info_response.basic_id,
                    "premium_id": bot_info_response.premium_id,
                    "display_name": bot_info_response.display_name,
                    "picture_url": bot_info_response.picture_url,
                    "chat_mode": bot_info_response.chat_mode,
                    "mark_as_read_mode": bot_info_response.mark_as_read_mode
                }
        except Exception as e:
            logger.error(f"獲取 Bot 資訊失敗: {e}")
            # 如果 API 調用失敗，返回基本資訊但不包含 channel_id
            return {
                "display_name": "LINE Bot",
                "picture_url": None,
                "basic_id": f"@{self.channel_token[:8]}",
                "premium_id": None,
                "channel_id": None,
                "error": f"API 調用失敗: {str(e)}"
            }
    
    async def async_get_bot_info(self) -> Optional[Dict]:
        """
        異步獲取 Bot 基本資訊，包含 Channel ID
        
        Returns:
            Dict: Bot 資訊
        """
        if not self.is_configured():
            return None
            
        try:
            # 使用 aiohttp 進行異步 HTTP 請求
            headers = {
                "Authorization": f"Bearer {self.channel_token}",
                "Content-Type": "application/json"
            }
            
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(
                    "https://api.line.me/v2/bot/info",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # 記錄獲取到的資訊以便調試
                        logger.info(f"異步獲取到 Bot 資訊 - userId: {data.get('userId')}, basicId: {data.get('basicId')}")
                        
                        return {
                            "user_id": data.get("userId"),  # 這就是 Channel ID
                            "channel_id": data.get("userId"),  # 明確標示為 channel_id
                            "basic_id": data.get("basicId"),
                            "premium_id": data.get("premiumId"),
                            "display_name": data.get("displayName", "LINE Bot"),
                            "picture_url": data.get("pictureUrl"),
                            "chat_mode": data.get("chatMode"),
                            "mark_as_read_mode": data.get("markAsReadMode")
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"異步獲取 Bot 資訊失敗: {response.status} - {error_text}")
                        return {
                            "display_name": "LINE Bot",
                            "picture_url": None,
                            "basic_id": f"@{self.channel_token[:8]}",
                            "premium_id": None,
                            "channel_id": None,
                            "error": f"API 調用失敗: {response.status}"
                        }
                        
        except asyncio.TimeoutError:
            logger.error("異步獲取 Bot 資訊超時")
            return {
                "display_name": "LINE Bot",
                "picture_url": None,
                "basic_id": f"@{self.channel_token[:8]}",
                "premium_id": None,
                "channel_id": None,
                "error": "請求超時"
            }
        except Exception as e:
            logger.error(f"異步獲取 Bot 資訊失敗: {e}")
            return {
                "display_name": "LINE Bot",
                "picture_url": None,
                "basic_id": f"@{self.channel_token[:8]}",
                "premium_id": None,
                "channel_id": None,
                "error": f"API 調用失敗: {str(e)}"
            }
    
    
    
    async def async_check_connection(self) -> bool:
        """
        異步檢查與 LINE API 的連接狀態
        
        Returns:
            bool: 連接是否正常
        """
        if not self.is_configured():
            return False
            
        try:
            # 異步獲取 Bot 資訊來測試連接
            await self.async_get_bot_info()
            return True
        except Exception as e:
            logger.error(f"異步連接檢查失敗: {e}")
            return False
    
    
    
    async def async_check_webhook_endpoint(self) -> Dict:
        """
        異步檢查 Webhook 端點設定狀態
        
        Returns:
            Dict: Webhook 設定資訊
        """
        if not self.is_configured():
            return {
                "is_set": False,
                "endpoint": None,
                "active": False,
                "error": "Bot 未配置"
            }
            
        try:
            headers = {
                "Authorization": f"Bearer {self.channel_token}",
                "Content-Type": "application/json"
            }
            
            # 使用 aiohttp 進行異步請求
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(
                    "https://api.line.me/v2/bot/channel/webhook/endpoint",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        endpoint = data.get("endpoint")
                        active = data.get("active", False)
                        
                        return {
                            "is_set": bool(endpoint),
                            "endpoint": endpoint,
                            "active": active,
                            "error": None
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"異步檢查 Webhook 端點失敗: {response.status} - {error_text}")
                        return {
                            "is_set": False,
                            "endpoint": None,
                            "active": False,
                            "error": f"API 錯誤: {response.status}"
                        }
                
        except asyncio.TimeoutError:
            logger.error("異步檢查 Webhook 端點超時")
            return {
                "is_set": False,
                "endpoint": None,
                "active": False,
                "error": "請求超時"
            }
        except Exception as e:
            logger.error(f"異步檢查 Webhook 端點失敗: {e}")
            return {
                "is_set": False,
                "endpoint": None,
                "active": False,
                "error": str(e)
            }
    
    def send_text_message(self, user_id: str, text: str) -> Dict:
        """
        發送文字訊息
        
        Args:
            user_id: 用戶 ID
            text: 訊息內容
            
        Returns:
            Dict: 發送結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")
            
        try:
            message = TextSendMessage(text=text)
            self.line_bot_api.push_message(user_id, message)
            
            return {
                "success": True,
                "message": "訊息發送成功",
                "timestamp": datetime.now().isoformat()
            }
        except LineBotApiError as e:
            logger.error(f"發送文字訊息失敗: {e}")
            raise Exception(f"LINE API 錯誤: {e.message}")
        except Exception as e:
            logger.error(f"發送文字訊息失敗: {e}")
            raise Exception(f"發送失敗: {str(e)}")
    
    def send_image_message(self, user_id: str, image_url: str, preview_url: Optional[str] = None) -> Dict:
        """
        發送圖片訊息
        
        Args:
            user_id: 用戶 ID
            image_url: 圖片 URL
            preview_url: 預覽圖片 URL
            
        Returns:
            Dict: 發送結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")
            
        try:
            if not preview_url:
                preview_url = image_url
                
            message = ImageSendMessage(
                original_content_url=image_url,
                preview_image_url=preview_url
            )
            self.line_bot_api.push_message(user_id, message)
            
            return {
                "success": True,
                "message": "圖片訊息發送成功",
                "timestamp": datetime.now().isoformat()
            }
        except LineBotApiError as e:
            logger.error(f"發送圖片訊息失敗: {e}")
            raise Exception(f"LINE API 錯誤: {e.message}")
        except Exception as e:
            logger.error(f"發送圖片訊息失敗: {e}")
            raise Exception(f"發送失敗: {str(e)}")
    
    def send_flex_message(self, user_id: str, alt_text: str, flex_content: Dict) -> Dict:
        """
        發送 Flex 訊息
        
        Args:
            user_id: 用戶 ID
            alt_text: 替代文字
            flex_content: Flex 訊息內容
            
        Returns:
            Dict: 發送結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")
            
        try:
            message = FlexSendMessage(
                alt_text=alt_text,
                contents=flex_content
            )
            self.line_bot_api.push_message(user_id, message)
            
            return {
                "success": True,
                "message": "Flex 訊息發送成功",
                "timestamp": datetime.now().isoformat()
            }
        except LineBotApiError as e:
            logger.error(f"發送 Flex 訊息失敗: {e}")
            raise Exception(f"LINE API 錯誤: {e.message}")
        except Exception as e:
            logger.error(f"發送 Flex 訊息失敗: {e}")
            raise Exception(f"發送失敗: {str(e)}")

    def send_sticker_message(self, user_id: str, package_id: str, sticker_id: str) -> Dict:
        """
        發送貼圖訊息

        Args:
            user_id: 用戶 ID
            package_id: 貼圖包 ID（字串）
            sticker_id: 貼圖 ID（字串）

        Returns:
            Dict: 發送結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")

        try:
            message = StickerSendMessage(package_id=package_id, sticker_id=sticker_id)
            self.line_bot_api.push_message(user_id, message)

            return {
                "success": True,
                "message": "貼圖訊息發送成功",
                "timestamp": datetime.now().isoformat()
            }
        except LineBotApiError as e:
            logger.error(f"發送貼圖訊息失敗: {e}")
            raise Exception(f"LINE API 錯誤: {e.message}")
        except Exception as e:
            logger.error(f"發送貼圖訊息失敗: {e}")
            raise Exception(f"發送失敗: {str(e)}")
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """
        獲取用戶資料
        
        Args:
            user_id: 用戶 ID
            
        Returns:
            Dict: 用戶資料
        """
        if not self.is_configured():
            return None
            
        try:
            profile = self.line_bot_api.get_profile(user_id)
            return {
                "user_id": user_id,
                "display_name": profile.display_name,
                "picture_url": profile.picture_url,
                "status_message": profile.status_message,
                "language": getattr(profile, 'language', None)
            }
        except LineBotApiError as e:
            logger.error(f"獲取用戶資料失敗: {e}")
            return None
        except Exception as e:
            logger.error(f"獲取用戶資料失敗: {e}")
            return None
    
    def create_rich_menu(self, rich_menu_data: Dict) -> Optional[str]:
        """
        創建 Rich Menu
        
        Args:
            rich_menu_data: Rich Menu 設定
            
        Returns:
            str: Rich Menu ID
        """
        if not self.is_configured():
            return None
            
        try:
            # 這裡需要根據實際的 RichMenu 模型來創建
            # 暫時返回模擬的 Rich Menu ID
            return f"richmenu-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        except Exception as e:
            logger.error(f"創建 Rich Menu 失敗: {e}")
            return None
    
    def get_message_statistics(self, date_range: Dict) -> Dict:
        """
        獲取訊息統計
        
        Args:
            date_range: 日期範圍
            
        Returns:
            Dict: 統計數據
        """
        # 模擬統計數據，實際應該從 LINE API 或數據庫獲取
        return {
            "total_messages": 1250,
            "text_messages": 800,
            "image_messages": 200,
            "flex_messages": 150,
            "other_messages": 100,
            "date_range": date_range
        }
    
    def get_user_statistics(self) -> Dict:
        """
        獲取用戶統計
        
        Returns:
            Dict: 用戶統計數據
        """
        # 模擬用戶統計，實際應該從數據庫或 LINE API 獲取
        return {
            "total_users": 89,
            "active_users_today": 45,
            "active_users_week": 78,
            "new_users_today": 5,
            "new_users_week": 12
        }
    
    def broadcast_message(self, message: str, user_ids: Optional[List[str]] = None) -> Dict:
        """
        廣播訊息
        
        Args:
            message: 訊息內容
            user_ids: 特定用戶 ID 列表（可選）
            
        Returns:
            Dict: 廣播結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")
            
        try:
            text_message = TextSendMessage(text=message)
            
            if user_ids:
                # 多播訊息
                self.line_bot_api.multicast(user_ids, text_message)
                target = f"{len(user_ids)} 個指定用戶"
            else:
                # 廣播訊息
                self.line_bot_api.broadcast(text_message)
                target = "所有用戶"
            
            return {
                "success": True,
                "message": f"訊息已廣播至 {target}",
                "timestamp": datetime.now().isoformat()
            }
        except LineBotApiError as e:
            logger.error(f"廣播訊息失敗: {e}")
            raise Exception(f"LINE API 錯誤: {e.message}")
        except Exception as e:
            logger.error(f"廣播訊息失敗: {e}")
            raise Exception(f"廣播失敗: {str(e)}")
    
    def send_message_to_user(self, user_id: str, message: str) -> Dict:
        """
        發送訊息給特定用戶
        
        Args:
            user_id: LINE 用戶 ID
            message: 訊息內容
            
        Returns:
            Dict: 發送結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")
            
        try:
            text_message = TextSendMessage(text=message)
            
            # 發送訊息給特定用戶
            self.line_bot_api.push_message(user_id, text_message)
            
            return {
                "success": True,
                "message": f"訊息已發送至用戶 {user_id}",
                "timestamp": datetime.now().isoformat()
            }
        except LineBotApiError as e:
            logger.error(f"發送訊息失敗: {e}")
            raise Exception(f"LINE API 錯誤: {e.message}")
        except Exception as e:
            logger.error(f"發送訊息失敗: {e}")
            raise Exception(f"發送失敗: {str(e)}")
    
    async def handle_webhook_event(self, body: bytes, db_session, bot_id: str) -> List[Dict]:
        """
        處理 Webhook 事件

        Args:
            body: 請求內容 (bytes)
            db_session: 數據庫會話
            bot_id: Bot ID

        Returns:
            List[Dict]: 處理結果
        """
        if not self.is_configured():
            raise ValueError("LINE Bot 未正確配置")

        try:
            # 解析 JSON
            body_str = body.decode('utf-8')
            events = json.loads(body_str).get('events', [])
            results = []

            for event in events:
                result = await self.process_event(event, db_session, bot_id)
                if result:
                    results.append(result)

            return results
        except Exception as e:
            logger.error(f"處理 Webhook 事件失敗: {e}")
            raise Exception(f"事件處理失敗: {str(e)}")
    
    async def process_event(self, event_data: Dict, db_session, bot_id: str) -> Optional[Dict]:
        """
        處理單個事件

        Args:
            event_data: 事件資料
            db_session: 數據庫會話
            bot_id: Bot ID

        Returns:
            Dict: 處理結果
        """
        try:
            event_type = event_data.get('type')

            if event_type == 'message':
                return await self.handle_message_event(event_data, db_session, bot_id)
            elif event_type == 'follow':
                return await self.handle_follow_event(event_data, db_session, bot_id)
            elif event_type == 'unfollow':
                return await self.handle_unfollow_event(event_data, db_session, bot_id)
            else:
                logger.info(f"未處理的事件類型: {event_type}")
                return None

        except Exception as e:
            logger.error(f"處理事件失敗: {e}")
            return None
    
    async def handle_message_event(self, event_data: Dict, db_session, bot_id: str) -> Dict:
        """處理訊息事件"""
        user_id = event_data.get('source', {}).get('userId')
        message_data = event_data.get('message', {})
        message_type = message_data.get('type')
        line_message_id = message_data.get('id')  # 獲取 LINE 原始 message ID
        
        # 記錄用戶互動到數據庫（直接調用異步方法）
        try:
            interaction_id = await self.record_user_interaction(
                db_session=db_session,
                bot_id=bot_id,
                user_id=user_id,
                event_type="message",
                message_type=message_type,
                message_content=message_data,
                line_message_id=line_message_id
            )
            if not interaction_id:
                logger.error(f"無法創建互動記錄，跳過媒體處理")
        except Exception as e:
            logger.error(f"處理訊息事件時出錯: {e}")
            import traceback
            logger.error(f"詳細錯誤信息: {traceback.format_exc()}")
            interaction_id = None
        
        # 如果是媒體訊息，使用背景任務處理媒體檔案上傳
        if message_type in ['image', 'video', 'audio'] and line_message_id and interaction_id:
            try:
                from app.services.background_tasks import get_task_manager, TaskPriority
                import asyncio
                
                # 獲取任務管理器
                task_manager = get_task_manager()
                
                # 創建媒體處理任務 ID
                task_id = f"media_upload_{interaction_id}_{line_message_id}"
                
                # 直接創建異步任務來處理媒體檔案
                loop = asyncio.get_event_loop()
                loop.create_task(self._process_media_async(
                    interaction_id=str(interaction_id),
                    line_user_id=user_id,
                    message_type=message_type,
                    line_message_id=line_message_id,
                    db_session=db_session
                ))
                
                logger.info(f"媒體處理任務已排程: {task_id} ({message_type})")
                
            except Exception as e:
                logger.error(f"排程媒體處理任務失敗: {e}")
                # 如果背景任務失敗，嘗試同步處理
                try:
                    asyncio.create_task(self._process_media_async(
                        interaction_id=str(interaction_id),
                        line_user_id=user_id,
                        message_type=message_type,
                        line_message_id=line_message_id,
                        db_session=db_session
                    ))
                except Exception as sync_error:
                    logger.error(f"同步媒體處理也失敗: {sync_error}")
        
        return {
            "event_type": "message",
            "user_id": user_id,
            "message_type": message_type,
            "processed_at": datetime.now().isoformat()
        }
    
    async def handle_follow_event(self, event_data: Dict, db_session, bot_id: str) -> Dict:
        """處理關注事件"""
        user_id = event_data.get('source', {}).get('userId')

        # 記錄用戶互動到數據庫
        try:
            await self.record_user_interaction(
                db_session=db_session,
                bot_id=bot_id,
                user_id=user_id,
                event_type="follow"
            )
        except Exception as e:
            logger.error(f"記錄關注事件失敗: {e}")

        return {
            "event_type": "follow",
            "user_id": user_id,
            "processed_at": datetime.now().isoformat()
        }
    
    async def handle_unfollow_event(self, event_data: Dict, db_session, bot_id: str) -> Dict:
        """處理取消關注事件"""
        user_id = event_data.get('source', {}).get('userId')

        # 記錄用戶互動到數據庫
        try:
            await self.record_user_interaction(
                db_session=db_session,
                bot_id=bot_id,
                user_id=user_id,
                event_type="unfollow"
            )
        except Exception as e:
            logger.error(f"記錄取消關注事件失敗: {e}")

        return {
            "event_type": "unfollow",
            "user_id": user_id,
            "processed_at": datetime.now().isoformat()
        }
    
    async def record_user_interaction(self, db_session, bot_id: str, user_id: str, event_type: str,
                               message_type: str = None, message_content: Dict = None, line_message_id: str = None):
        """記錄用戶互動到 MongoDB（替代舊的 PostgreSQL 方法）"""
        from app.models.line_user import LineBotUser
        from uuid import UUID as PyUUID
        from sqlalchemy import select

        try:
            bot_uuid = PyUUID(bot_id)

            # 以 AsyncSession 執行 upsert
            res = await db_session.execute(
                select(LineBotUser).where(
                    LineBotUser.bot_id == bot_uuid,
                    LineBotUser.line_user_id == user_id,
                )
            )
            lu = res.scalars().first()

            if not lu:
                # 取用戶資料（避免阻塞，放入 thread）
                profile = await asyncio.to_thread(self.get_user_profile, user_id)
                lu = LineBotUser(
                    bot_id=bot_uuid,
                    line_user_id=user_id,
                    display_name=(profile or {}).get("display_name"),
                    picture_url=(profile or {}).get("picture_url"),
                    status_message=(profile or {}).get("status_message"),
                    language=(profile or {}).get("language"),
                    is_followed=True if event_type != "unfollow" else False,
                    interaction_count="1",
                )
                db_session.add(lu)
            else:
                from sqlalchemy.sql import func as _func
                lu.last_interaction = _func.now()
                try:
                    current_count = int(lu.interaction_count or "0")
                    lu.interaction_count = str(current_count + 1)
                except (ValueError, TypeError):
                    lu.interaction_count = "1"
                if event_type == "follow":
                    lu.is_followed = True
                elif event_type == "unfollow":
                    lu.is_followed = False

            await db_session.commit()

            # 使用 ConversationService 記錄到 MongoDB
            from app.services.conversation_service import ConversationService

            # 準備訊息內容，添加 LINE message ID
            if message_content and line_message_id:
                enhanced_content = message_content.copy()
                enhanced_content['line_message_id'] = line_message_id
            else:
                enhanced_content = message_content or {}

            # 記錄到 MongoDB
            message, is_new = await ConversationService.add_user_message(
                bot_id=bot_id,
                line_user_id=user_id,
                event_type=event_type,
                message_type=message_type,
                message_content=enhanced_content
            )

            logger.info(f"✅ 成功記錄互動到 MongoDB: ID={message.id}, User={user_id}, Type={message_type}, IsNew={is_new}")
            return str(message.id)

        except Exception as e:
            logger.error(f"記錄用戶互動失敗: {e}")
            logger.error(f"Bot ID: {bot_id}, User ID: {user_id}, Event Type: {event_type}")
            logger.error(f"Message Type: {message_type}, LINE Message ID: {line_message_id}")
            import traceback
            logger.error(f"詳細錯誤信息: {traceback.format_exc()}")
            try:
                await db_session.rollback()
            except Exception:
                pass
            return None
    
    # 已移除未使用的同步背景媒體處理版本（請使用 _process_media_async）
    
    async def _process_media_async(self, interaction_id: str, line_user_id: str, message_type: str,
                                  line_message_id: str, db_session):
        """異步處理媒體檔案上傳到 MinIO"""
        from app.services.minio_service import get_minio_service
        from app.services.conversation_service import ConversationService

        try:
            logger.info(f"🔄 開始處理媒體檔案: message_id={line_message_id}, type={message_type}")

            minio_service = get_minio_service()
            if not minio_service:
                logger.warning("MinIO 服務未初始化，跳過媒體檔案處理")
                return

            # 上傳媒體檔案到 MinIO
            media_path, media_url = await minio_service.upload_media_from_line(
                line_user_id=line_user_id,
                message_type=message_type,
                channel_token=self.channel_token,
                line_message_id=line_message_id
            )

            if media_path and media_url:
                logger.info(f"✅ 媒體檔案上傳成功: path={media_path}, url={media_url}")

                # 更新 MongoDB 中的訊息記錄
                try:
                    # 根據 interaction_id 找到對應的訊息並更新
                    success = await ConversationService.update_message_media(
                        message_id=interaction_id,
                        media_path=media_path,
                        media_url=media_url
                    )

                    if success:
                        logger.info(f"✅ MongoDB 訊息媒體信息更新成功: message_id={interaction_id}")
                    else:
                        logger.error(f"❌ MongoDB 訊息媒體信息更新失敗: message_id={interaction_id}")

                except Exception as update_error:
                    logger.error(f"❌ 更新 MongoDB 訊息媒體信息時出錯: {update_error}")
                    import traceback
                    logger.error(f"詳細錯誤: {traceback.format_exc()}")
            else:
                logger.error(f"❌ 媒體檔案上傳失敗: interaction_id={interaction_id}")

        except Exception as e:
            logger.error(f"❌ 異步處理媒體檔案失敗: {e}")
            import traceback
            logger.error(f"詳細錯誤: {traceback.format_exc()}")
    
    # 已移除未使用的同步 I/O 輔助：get_bot_followers（請改用現有查詢或新增 async 版本）
    
    async def get_user_interaction_history(self, db_session, bot_id: str, line_user_id: str,
                                   limit: int = 20) -> List[Dict]:
        """獲取用戶的互動歷史（使用 MongoDB）"""
        try:
            # 使用 ConversationService 從 MongoDB 獲取聊天記錄
            from app.services.conversation_service import ConversationService

            chat_history, total_count = await ConversationService.get_chat_history(
                bot_id=bot_id,
                line_user_id=line_user_id,
                limit=limit,
                offset=0
            )

            return chat_history

        except Exception as e:
            logger.error(f"獲取用戶互動歷史失敗: {e}")
            return []
            try:
                db_session.rollback()
            except:
                pass
            return []
    
    # 已移除未使用的同步 I/O 輔助：create_rich_menu_real（請改用 v3 AsyncMessagingApi）
    
    # 已移除未使用的同步 I/O 輔助：get_rich_menus
    
    # 已移除未使用的同步 I/O 輔助：set_default_rich_menu
    
    # 已移除未使用的同步 I/O 輔助：delete_rich_menu
    
    # 此方法已移除，請使用 ConversationService.get_bot_analytics() 替代
    
    # 此方法已移除，請使用 ConversationService.get_message_stats() 替代
    
    # 此方法已移除，請使用 ConversationService.get_user_activity() 替代
    
    # 此方法已移除，請使用 ConversationService.get_usage_stats() 替代
    
    # 此方法已移除，請使用 ConversationService.get_bot_activities() 替代
