"""
對話服務層
處理 MongoDB 中的對話記錄相關業務邏輯
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId

from app.models.mongodb.conversation import ConversationDocument, MessageDocument, AdminUserInfo
from app.database_mongo import get_mongodb
from app.models.user import User

logger = logging.getLogger(__name__)


class ConversationService:
    """對話服務類"""
    
    @staticmethod
    async def get_or_create_conversation(
        bot_id: str, 
        line_user_id: str
    ) -> ConversationDocument:
        """
        獲取或創建對話記錄
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            
        Returns:
            ConversationDocument: 對話文檔
        """
        try:
            return await ConversationDocument.get_or_create_conversation(bot_id, line_user_id)
        except Exception as e:
            logger.error(f"獲取或創建對話失敗: {e}")
            raise
    
    @staticmethod
    async def get_message_by_id(message_id: str) -> Optional[MessageDocument]:
        """
        根據訊息 ID 獲取訊息
        
        Args:
            message_id: 訊息 ID
            
        Returns:
            MessageDocument: 訊息文檔，如果不存在則返回 None
        """
        try:
            # 在所有對話中查找具有指定 ID 的訊息
            conversations = await ConversationDocument.find(
                {"messages.id": message_id}
            ).to_list()
            
            for conversation in conversations:
                for message in conversation.messages:
                    if message.id == message_id:
                        return message
            
            return None
        except Exception as e:
            logger.error(f"根據 ID 獲取訊息失敗: {e}")
            return None
    
    @staticmethod
    async def get_conversation_by_message_id(message_id: str) -> Optional[ConversationDocument]:
        """
        根據訊息 ID 獲取對話
        
        Args:
            message_id: 訊息 ID
            
        Returns:
            ConversationDocument: 對話文檔，如果不存在則返回 None
        """
        try:
            # 查找包含指定訊息 ID 的對話
            conversation = await ConversationDocument.find_one(
                {"messages.id": message_id}
            )
            
            return conversation
        except Exception as e:
            logger.error(f"根據訊息 ID 獲取對話失敗: {e}")
            return None
    
    @staticmethod
    async def update_message_media(
        message_id: str, 
        media_path: Optional[str] = None, 
        media_url: Optional[str] = None
    ) -> bool:
        """
        更新訊息的媒體資訊
        
        Args:
            message_id: 訊息 ID
            media_path: 媒體檔案路徑
            media_url: 媒體檔案 URL
            
        Returns:
            bool: 是否更新成功
        """
        try:
            # 查找包含指定訊息的對話
            conversation = await ConversationDocument.find_one(
                {"messages.id": message_id}
            )
            
            if not conversation:
                logger.error(f"找不到包含訊息 ID {message_id} 的對話")
                return False
            
            # 更新訊息的媒體資訊
            for message in conversation.messages:
                if message.id == message_id:
                    if media_path is not None:
                        message.media_path = media_path
                    if media_url is not None:
                        message.media_url = media_url
                    break
            
            # 保存更新
            await conversation.save()
            logger.info(f"成功更新訊息 {message_id} 的媒體資訊")
            return True
            
        except Exception as e:
            logger.error(f"更新訊息媒體資訊失敗: {e}")
            return False
    
    @staticmethod
    async def get_pending_media_messages(bot_id: str, limit: int = 10) -> List[Tuple[ConversationDocument, MessageDocument]]:
        """
        獲取待處理的媒體訊息
        
        Args:
            bot_id: Bot ID
            limit: 限制數量
            
        Returns:
            List[Tuple[ConversationDocument, MessageDocument]]: 對話和訊息的元組列表
        """
        try:
            # 查找包含待處理媒體訊息的對話
            conversations = await ConversationDocument.find({
                "bot_id": bot_id,
                "messages.message_type": {"$in": ["image", "video", "audio"]},
                "messages.media_url": {"$in": [None, ""]},
                "messages.content": {"$ne": None}
            }).limit(limit).to_list()
            
            pending_messages = []
            for conversation in conversations:
                for message in conversation.messages:
                    if (message.message_type in ["image", "video", "audio"] and 
                        not message.media_url and 
                        message.content):
                        pending_messages.append((conversation, message))
                        if len(pending_messages) >= limit:
                            break
                if len(pending_messages) >= limit:
                    break
            
            return pending_messages
            
        except Exception as e:
            logger.error(f"獲取待處理媒體訊息失敗: {e}")
            return []
    
    @staticmethod
    async def get_today_message_count(bot_id: str) -> int:
        """
        獲取今日訊息數量
        
        Args:
            bot_id: Bot ID
            
        Returns:
            int: 今日訊息數量
        """
        try:
            from datetime import datetime, timedelta
            
            # 計算今日時間範圍
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            # 查詢今日訊息數量
            conversations = await ConversationDocument.find({
                "bot_id": bot_id,
                "messages.timestamp": {
                    "$gte": today_start,
                    "$lt": today_end
                }
            }).to_list()
            
            # 統計今日訊息總數
            message_count = 0
            for conversation in conversations:
                for message in conversation.messages:
                    if today_start <= message.timestamp < today_end:
                        message_count += 1
            
            return message_count
            
        except Exception as e:
            logger.error(f"獲取今日訊息數量失敗: {e}")
            return 0
    
    @staticmethod
    async def get_recent_messages(bot_id: str, since_date: datetime, limit: int = 100) -> List[MessageDocument]:
        """
        獲取最近訊息
        
        Args:
            bot_id: Bot ID
            since_date: 開始時間
            limit: 限制數量
            
        Returns:
            List[MessageDocument]: 最近訊息列表
        """
        try:
            conversations = await ConversationDocument.find({
                "bot_id": bot_id,
                "messages.timestamp": {"$gte": since_date}
            }).to_list()
            
            # 收集所有符合條件的訊息
            recent_messages = []
            for conversation in conversations:
                for message in conversation.messages:
                    if message.timestamp >= since_date:
                        recent_messages.append(message)
            
            # 按時間排序並限制數量
            recent_messages.sort(key=lambda x: x.timestamp, reverse=True)
            return recent_messages[:limit]
            
        except Exception as e:
            logger.error(f"獲取最近訊息失敗: {e}")
            return []
    
    @staticmethod
    async def get_last_message(bot_id: str) -> Optional[MessageDocument]:
        """
        獲取最後一條訊息
        
        Args:
            bot_id: Bot ID
            
        Returns:
            MessageDocument: 最後一條訊息，如果沒有則返回 None
        """
        try:
            conversation = await ConversationDocument.find_one(
                {"bot_id": bot_id},
                sort=[("updated_at", -1)]
            )
            
            if conversation and conversation.messages:
                # 返回最後一條訊息
                return conversation.messages[-1]
            
            return None
            
        except Exception as e:
            logger.error(f"獲取最後訊息失敗: {e}")
            return None
    
    @staticmethod
    async def add_user_message(
        bot_id: str,
        line_user_id: str,
        event_type: str,
        message_type: str,
        message_content: Dict[str, Any],
        media_url: Optional[str] = None,
        media_path: Optional[str] = None,
        line_message_id: Optional[str] = None
    ) -> tuple[MessageDocument, bool]:
        """
        添加用戶訊息（含重複檢查）

        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            event_type: 事件類型
            message_type: 訊息類型
            message_content: 訊息內容
            media_url: 媒體 URL
            media_path: 媒體路徑
            line_message_id: LINE 原始訊息 ID

        Returns:
            tuple[MessageDocument, bool]: (訊息文檔, 是否為新訊息)
        """
        try:
            # 如果有 line_message_id，先檢查是否已存在
            if line_message_id:
                existing_conversation = await ConversationDocument.find_one({
                    "bot_id": bot_id,
                    "messages.line_message_id": line_message_id
                })

                if existing_conversation:
                    existing_message = next(
                        (msg for msg in existing_conversation.messages
                         if msg.line_message_id == line_message_id),
                        None
                    )
                    if existing_message:
                        logger.warning(f"訊息已存在，跳過重複記錄: {line_message_id}")
                        return existing_message, False  # 返回現有訊息，標記為非新訊息

            # 獲取或創建對話
            conversation = await ConversationService.get_or_create_conversation(bot_id, line_user_id)

            # 構建訊息資料
            message_data = {
                "line_message_id": line_message_id,
                "event_type": event_type,
                "message_type": message_type,
                "content": message_content,
                "sender_type": "user",
                "timestamp": datetime.utcnow(),
                "media_url": media_url,
                "media_path": media_path
            }

            # 添加訊息
            message = await conversation.add_message(message_data)

            logger.info(f"用戶訊息已添加: bot_id={bot_id}, line_user_id={line_user_id}, message_id={message.id}, line_message_id={line_message_id}")
            return message, True  # 返回新訊息，標記為新訊息
            
        except Exception as e:
            logger.error(f"添加用戶訊息失敗: {e}")
            raise

    @staticmethod
    async def get_conversation_by_line_message_id(
        bot_id: str,
        line_message_id: str
    ) -> Optional[ConversationDocument]:
        """
        根據 LINE 訊息 ID 查找對話

        Args:
            bot_id: Bot ID
            line_message_id: LINE 原始訊息 ID

        Returns:
            ConversationDocument: 對話文檔，如果不存在則返回 None
        """
        try:
            conversation = await ConversationDocument.find_one({
                "bot_id": bot_id,
                "messages.line_message_id": line_message_id
            })
            return conversation
        except Exception as e:
            logger.error(f"根據 LINE 訊息 ID 查找對話失敗: {e}")
            return None
    
    @staticmethod
    async def add_admin_message(
        bot_id: str,
        line_user_id: str,
        admin_user: User,
        message_content: str,
        message_type: str = "text"
    ) -> MessageDocument:
        """
        添加管理者訊息
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            admin_user: 管理者用戶
            message_content: 訊息內容
            message_type: 訊息類型
            
        Returns:
            MessageDocument: 新增的訊息文檔
        """
        try:
            # 獲取或創建對話
            conversation = await ConversationService.get_or_create_conversation(bot_id, line_user_id)
            
            # 構建管理者資訊
            admin_info = AdminUserInfo(
                id=str(admin_user.id),
                username=admin_user.username,
                full_name=admin_user.username  # 使用 username 作為 full_name
            )
            
            # 構建訊息資料
            message_data = {
                "event_type": "message",
                "message_type": message_type,
                "content": message_content,  # 直接使用傳入的 message_content
                "sender_type": "admin",
                "admin_user": admin_info,
                "timestamp": datetime.utcnow()
            }
            
            # 添加訊息
            message = await conversation.add_message(message_data)
            
            logger.info(f"管理者訊息已添加: bot_id={bot_id}, line_user_id={line_user_id}, admin_id={admin_user.id}, message_id={message.id}")
            return message
            
        except Exception as e:
            logger.error(f"添加管理者訊息失敗: {e}")
            raise
    
    @staticmethod
    async def get_chat_history(
        bot_id: str,
        line_user_id: str,
        limit: int = 50,
        offset: int = 0,
        sender_type: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        獲取聊天記錄
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            limit: 限制返回的訊息數量
            offset: 跳過的訊息數量
            sender_type: 篩選發送者類型
            
        Returns:
            Tuple[List[Dict], int]: (聊天記錄列表, 總訊息數)
        """
        try:
            # 獲取對話
            conversation = await ConversationDocument.find_one({
                "bot_id": bot_id,
                "line_user_id": line_user_id
            })
            
            if not conversation:
                return [], 0
            
            # 獲取訊息列表
            messages = await conversation.get_messages(limit, offset, sender_type)
            total_count = await conversation.get_message_count(sender_type)
            
            # 格式化為 API 響應格式
            chat_history = []
            for message in messages:
                chat_record = {
                    "id": message.id,
                    "event_type": message.event_type,
                    "message_type": message.message_type,
                    "message_content": message.content,
                    "sender_type": message.sender_type,
                    "timestamp": message.timestamp.isoformat(),
                    "media_url": message.media_url,
                    "media_path": message.media_path
                }
                
                # 如果是管理者發送的訊息，加入管理者資訊
                if message.sender_type == "admin" and message.admin_user:
                    chat_record["admin_user"] = {
                        "id": message.admin_user.id,
                        "username": message.admin_user.username,
                        "full_name": message.admin_user.username  # 使用 username 作為 full_name
                    }
                
                chat_history.append(chat_record)
            
            logger.info(f"聊天記錄已獲取: bot_id={bot_id}, line_user_id={line_user_id}, count={len(chat_history)}")
            return chat_history, total_count
            
        except Exception as e:
            logger.error(f"獲取聊天記錄失敗: {e}")
            raise
    
    @staticmethod
    async def get_bot_conversations(
        bot_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        獲取 Bot 的所有對話列表
        
        Args:
            bot_id: Bot ID
            limit: 限制返回的對話數量
            offset: 跳過的對話數量
            
        Returns:
            Tuple[List[Dict], int]: (對話列表, 總對話數)
        """
        try:
            # 獲取對話列表
            conversations = await ConversationDocument.get_bot_conversations(bot_id, limit, offset)
            
            # 獲取總數
            total_count = await ConversationDocument.find({"bot_id": bot_id}).count()
            
            # 格式化響應
            conversation_list = []
            for conv in conversations:
                # 獲取最後一條訊息
                last_message = None
                if conv.messages:
                    last_msg = max(conv.messages, key=lambda x: x.timestamp)
                    last_message = {
                        "content": last_msg.content,
                        "timestamp": last_msg.timestamp.isoformat(),
                        "sender_type": last_msg.sender_type,
                        "message_type": last_msg.message_type
                    }
                
                conversation_list.append({
                    "line_user_id": conv.line_user_id,
                    "message_count": len(conv.messages),
                    "last_message": last_message,
                    "created_at": conv.created_at.isoformat(),
                    "updated_at": conv.updated_at.isoformat()
                })
            
            return conversation_list, total_count
            
        except Exception as e:
            logger.error(f"獲取 Bot 對話列表失敗: {e}")
            raise
    
    @staticmethod
    async def get_conversation_stats(bot_id: str) -> Dict[str, int]:
        """
        獲取對話統計資訊
        
        Args:
            bot_id: Bot ID
            
        Returns:
            Dict[str, int]: 統計資訊
        """
        try:
            stats = await ConversationDocument.get_conversation_stats(bot_id)
            logger.info(f"對話統計已獲取: bot_id={bot_id}, stats={stats}")
            return stats
            
        except Exception as e:
            logger.error(f"獲取對話統計失敗: {e}")
            raise
    
    @staticmethod
    async def delete_conversation(bot_id: str, line_user_id: str) -> bool:
        """
        刪除對話記錄
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            
        Returns:
            bool: 是否刪除成功
        """
        try:
            result = await ConversationDocument.find_one({
                "bot_id": bot_id,
                "line_user_id": line_user_id
            })
            
            if result:
                await result.delete()
                logger.info(f"對話已刪除: bot_id={bot_id}, line_user_id={line_user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"刪除對話失敗: {e}")
            raise
    
    @staticmethod
    async def cleanup_old_messages(
        bot_id: Optional[str] = None,
        keep_days: int = 30
    ) -> int:
        """
        清理舊訊息
        
        Args:
            bot_id: Bot ID (可選，若不提供則清理所有 Bot)
            keep_days: 保留的天數
            
        Returns:
            int: 清理的訊息數量
        """
        try:
            query = {"bot_id": bot_id} if bot_id else {}
            conversations = await ConversationDocument.find(query).to_list()
            
            total_deleted = 0
            for conversation in conversations:
                deleted_count = await conversation.delete_old_messages(keep_days)
                total_deleted += deleted_count
            
            logger.info(f"舊訊息清理完成: bot_id={bot_id}, deleted_count={total_deleted}")
            return total_deleted
            
        except Exception as e:
            logger.error(f"清理舊訊息失敗: {e}")
            raise
    
    @staticmethod
    async def search_messages(
        bot_id: str,
        query: str,
        message_type: Optional[str] = None,
        sender_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        搜尋訊息

        Args:
            bot_id: Bot ID
            query: 搜尋關鍵字
            message_type: 訊息類型篩選
            sender_type: 發送者類型篩選
            limit: 限制返回數量

        Returns:
            List[Dict]: 搜尋結果
        """
        try:
            # MongoDB 文本搜尋管道
            pipeline = [
                {"$match": {"bot_id": bot_id}},
                {"$unwind": "$messages"},
                {"$match": {
                    "$and": [
                        {"$or": [
                            {"messages.content.text": {"$regex": query, "$options": "i"}},
                            {"messages.content": {"$regex": query, "$options": "i"}}
                        ]}
                    ]
                }}
            ]

            # 添加類型篩選
            if message_type:
                pipeline[2]["$match"]["$and"].append({"messages.message_type": message_type})

            if sender_type:
                pipeline[2]["$match"]["$and"].append({"messages.sender_type": sender_type})

            # 排序和限制
            pipeline.extend([
                {"$sort": {"messages.timestamp": -1}},
                {"$limit": limit}
            ])

            results = await ConversationDocument.aggregate(pipeline).to_list()

            # 格式化結果
            search_results = []
            for result in results:
                message = result["messages"]
                search_results.append({
                    "line_user_id": result["line_user_id"],
                    "message_id": message["id"],
                    "content": message["content"],
                    "message_type": message["message_type"],
                    "sender_type": message["sender_type"],
                    "timestamp": message["timestamp"].isoformat(),
                    "admin_user": message.get("admin_user")
                })

            logger.info(f"訊息搜尋完成: bot_id={bot_id}, query={query}, results={len(search_results)}")
            return search_results

        except Exception as e:
            logger.error(f"搜尋訊息失敗: {e}")
            raise

    @staticmethod
    async def get_bot_activities(
        bot_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        獲取 Bot 活動記錄（從 MongoDB 對話記錄中提取）

        Args:
            bot_id: Bot ID
            limit: 限制返回的活動數量
            offset: 跳過的活動數量

        Returns:
            List[Dict]: 活動記錄列表
        """
        try:
            # 使用聚合管道獲取最近的訊息作為活動記錄
            pipeline = [
                {"$match": {"bot_id": bot_id}},
                {"$unwind": "$messages"},
                {"$sort": {"messages.timestamp": -1}},
                {"$skip": offset},
                {"$limit": limit},
                {"$project": {
                    "line_user_id": 1,
                    "message": "$messages"
                }}
            ]

            results = await ConversationDocument.aggregate(pipeline).to_list()

            activities = []
            for result in results:
                message = result["message"]
                line_user_id = result["line_user_id"]

                # 根據訊息類型和發送者類型決定活動類型
                if message["sender_type"] == "user":
                    if message["event_type"] == "follow":
                        activity_type = "user_join"
                        title = "新用戶關注"
                        description = f"用戶 {line_user_id[:8]}... 開始關注 Bot"
                    elif message["event_type"] == "unfollow":
                        activity_type = "user_leave"
                        title = "用戶取消關注"
                        description = f"用戶 {line_user_id[:8]}... 取消關注 Bot"
                    else:
                        activity_type = "message"
                        title = "收到新訊息"
                        if message["message_type"] == "text":
                            content = message.get("content", {})
                            text_content = content.get("text", "無內容") if isinstance(content, dict) else str(content)
                            description = f"用戶發送了文字訊息: {text_content[:50]}..."
                        else:
                            description = f"用戶發送了{message['message_type']}訊息"
                elif message["sender_type"] == "admin":
                    activity_type = "info"
                    title = "管理者回覆"
                    admin_user = message.get("admin_user", {})
                    admin_name = admin_user.get("username", "管理者") if admin_user else "管理者"
                    description = f"{admin_name} 回覆了用戶"
                else:
                    activity_type = "info"
                    title = "系統活動"
                    description = f"系統事件: {message['event_type']}"

                activities.append({
                    "id": message["id"],
                    "type": activity_type,
                    "title": title,
                    "description": description,
                    "timestamp": message["timestamp"].isoformat(),
                    "metadata": {
                        "userId": line_user_id,
                        "userName": f"用戶 {line_user_id[:8]}...",
                        "messageType": message["message_type"],
                        "eventType": message["event_type"],
                        "senderType": message["sender_type"],
                        "messageContent": message.get("content"),
                        "adminUser": message.get("admin_user")
                    }
                })

            logger.info(f"Bot 活動記錄已獲取: bot_id={bot_id}, count={len(activities)}")
            return activities

        except Exception as e:
            logger.error(f"獲取 Bot 活動記錄失敗: {e}")
            return []

    @staticmethod
    async def get_bot_analytics(
        bot_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        獲取 Bot 分析數據（從 MongoDB）

        Args:
            bot_id: Bot ID
            start_date: 開始時間
            end_date: 結束時間

        Returns:
            Dict: 分析數據
        """
        try:
            # 獲取時間範圍內的所有對話
            conversations = await ConversationDocument.find({
                "bot_id": bot_id,
                "messages.timestamp": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }).to_list()

            total_messages = 0
            active_users = set()
            today_messages = 0
            week_messages = 0
            month_messages = 0

            # 計算時間範圍
            from datetime import date, timedelta
            today_start = datetime.combine(date.today(), datetime.min.time())
            today_end = datetime.combine(date.today(), datetime.max.time())
            week_start = today_start - timedelta(days=7)
            month_start = today_start - timedelta(days=30)

            for conversation in conversations:
                for message in conversation.messages:
                    if start_date <= message.timestamp <= end_date:
                        total_messages += 1
                        active_users.add(conversation.line_user_id)

                        # 統計今日、本週、本月訊息
                        if today_start <= message.timestamp <= today_end:
                            today_messages += 1
                        if week_start <= message.timestamp <= today_end:
                            week_messages += 1
                        if month_start <= message.timestamp <= today_end:
                            month_messages += 1

            return {
                "totalMessages": total_messages,
                "activeUsers": len(active_users),
                "totalUsers": len(conversations),
                "todayMessages": today_messages,
                "weekMessages": week_messages,
                "monthMessages": month_messages,
                "averageMessagesPerUser": total_messages / len(active_users) if active_users else 0,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            }

        except Exception as e:
            logger.error(f"獲取 Bot 分析數據失敗: {e}")
            return {
                "totalMessages": 0,
                "activeUsers": 0,
                "totalUsers": 0,
                "todayMessages": 0,
                "weekMessages": 0,
                "monthMessages": 0,
                "averageMessagesPerUser": 0
            }

    @staticmethod
    async def get_message_stats(
        bot_id: str,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        獲取訊息統計數據（從 MongoDB）

        Args:
            bot_id: Bot ID
            days: 統計天數

        Returns:
            List[Dict]: 每日訊息統計
        """
        try:
            from datetime import timedelta

            stats = []
            for i in range(days):
                date = datetime.now() - timedelta(days=days-1-i)
                day_start = datetime.combine(date.date(), datetime.min.time())
                day_end = datetime.combine(date.date(), datetime.max.time())

                # 獲取當天的訊息數
                conversations = await ConversationDocument.find({
                    "bot_id": bot_id,
                    "messages.timestamp": {
                        "$gte": day_start,
                        "$lte": day_end
                    }
                }).to_list()

                received_count = 0
                sent_count = 0

                for conversation in conversations:
                    for message in conversation.messages:
                        if day_start <= message.timestamp <= day_end:
                            if message.sender_type == "user":
                                received_count += 1
                            elif message.sender_type == "admin":
                                sent_count += 1

                stats.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "received": received_count,
                    "sent": sent_count
                })

            return stats

        except Exception as e:
            logger.error(f"獲取訊息統計失敗: {e}")
            return []

    @staticmethod
    async def get_user_activity(bot_id: str) -> List[Dict[str, Any]]:
        """
        獲取用戶活躍度數據（從 MongoDB）

        Args:
            bot_id: Bot ID

        Returns:
            List[Dict]: 24小時活躍度數據
        """
        try:
            activity = []

            # 24小時數據，每3小時一個點
            for hour in [0, 6, 9, 12, 15, 18, 21, 23]:
                hour_start = datetime.now().replace(hour=hour, minute=0, second=0, microsecond=0)
                hour_end = hour_start.replace(hour=(hour+3) % 24 if hour != 23 else 23, minute=59, second=59)

                # 獲取這個時間段的活躍用戶數
                conversations = await ConversationDocument.find({
                    "bot_id": bot_id,
                    "messages.timestamp": {
                        "$gte": hour_start,
                        "$lte": hour_end
                    }
                }).to_list()

                active_users = set()
                for conversation in conversations:
                    for message in conversation.messages:
                        if hour_start <= message.timestamp <= hour_end:
                            active_users.add(conversation.line_user_id)

                activity.append({
                    "hour": f"{hour:02d}",
                    "activeUsers": len(active_users)
                })

            return activity

        except Exception as e:
            logger.error(f"獲取用戶活躍度失敗: {e}")
            return []

    @staticmethod
    async def get_usage_stats(bot_id: str) -> List[Dict[str, Any]]:
        """
        獲取功能使用統計（從 MongoDB）

        Args:
            bot_id: Bot ID

        Returns:
            List[Dict]: 功能使用統計
        """
        try:
            # 使用聚合管道統計訊息類型
            pipeline = [
                {"$match": {"bot_id": bot_id}},
                {"$unwind": "$messages"},
                {"$group": {
                    "_id": "$messages.message_type",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]

            results = await ConversationDocument.aggregate(pipeline).to_list()

            if not results:
                return [
                    {"feature": "文字訊息", "usage": 0, "percentage": 0},
                    {"feature": "圖片訊息", "usage": 0, "percentage": 0},
                    {"feature": "其他類型", "usage": 0, "percentage": 0}
                ]

            total_count = sum(item["count"] for item in results)

            # 轉換為前端需要的格式
            usage_stats = []
            for item in results:
                message_type = item["_id"]
                count = item["count"]
                percentage = (count / total_count * 100) if total_count > 0 else 0

                # 轉換訊息類型名稱
                feature_name = {
                    "text": "文字訊息",
                    "image": "圖片訊息",
                    "video": "影片訊息",
                    "audio": "語音訊息",
                    "sticker": "貼圖訊息",
                    "location": "位置訊息"
                }.get(message_type, "其他類型")

                usage_stats.append({
                    "feature": feature_name,
                    "usage": count,
                    "percentage": round(percentage, 1)
                })

            return usage_stats

        except Exception as e:
            logger.error(f"獲取功能使用統計失敗: {e}")
            return []

    @staticmethod
    async def update_message_media(message_id: str, media_path: str, media_url: str) -> bool:
        """
        更新訊息的媒體信息

        Args:
            message_id: 訊息 ID
            media_path: 媒體檔案路徑
            media_url: 媒體檔案 URL

        Returns:
            bool: 更新是否成功
        """
        try:
            # 查找包含該訊息的對話（訊息 ID 是字符串類型）
            conversation = await ConversationDocument.find_one({
                "messages.id": message_id
            })

            if conversation:
                # 找到對應的訊息並更新
                for message in conversation.messages:
                    if str(message.id) == message_id:
                        message.media_path = media_path
                        message.media_url = media_url
                        break

                # 保存對話
                await conversation.save()

                logger.info(f"訊息媒體信息更新成功: message_id={message_id}")
                return True
            else:
                logger.error(f"找不到包含訊息的對話: message_id={message_id}")
                return False

        except Exception as e:
            logger.error(f"更新訊息媒體信息失敗: {e}")
            import traceback
            logger.error(f"詳細錯誤: {traceback.format_exc()}")
            return False