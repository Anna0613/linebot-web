"""
MongoDB 對話記錄模型
使用 Beanie ODM 進行文檔映射
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from beanie import Document
from bson import ObjectId


class AdminUserInfo(BaseModel):
    """管理者用戶資訊"""
    id: str = Field(..., description="管理者用戶 ID")
    username: str = Field(..., description="管理者用戶名")
    full_name: Optional[str] = Field(None, description="管理者全名")


class MessageDocument(BaseModel):
    """訊息文檔模型"""
    id: str = Field(default_factory=lambda: str(ObjectId()), description="訊息 ID")
    event_type: str = Field(..., description="事件類型 (message, follow, unfollow, postback)")
    message_type: str = Field(..., description="訊息類型 (text, image, audio, video, file, location, sticker)")
    content: Dict[str, Any] = Field(default_factory=dict, description="訊息內容 JSON")
    sender_type: str = Field(default="user", description="發送者類型 (user, admin)")
    admin_user: Optional[AdminUserInfo] = Field(None, description="管理者用戶資訊")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="訊息時間戳")
    media_url: Optional[str] = Field(None, description="媒體檔案 URL")
    media_path: Optional[str] = Field(None, description="媒體檔案路徑")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "64f5a8c9b1d2e3f4a5b6c7d8",
                "event_type": "message",
                "message_type": "text",
                "content": {"text": "Hello, World!"},
                "sender_type": "user",
                "timestamp": "2023-09-04T12:00:00Z"
            }
        }


class ConversationDocument(Document):
    """對話文檔模型"""
    bot_id: str = Field(..., description="Bot ID (UUID)")
    line_user_id: str = Field(..., description="LINE 用戶 ID")
    messages: List[MessageDocument] = Field(default_factory=list, description="訊息列表")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="建立時間")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新時間")
    
    class Settings:
        name = "conversations"  # 集合名稱
        indexes = [
            [("bot_id", 1), ("line_user_id", 1)],  # 複合唯一索引
            [("bot_id", 1), ("line_user_id", 1), ("messages.timestamp", -1)],  # 查詢索引
            [("updated_at", -1)],  # 更新時間索引
            [("messages.sender_type", 1), ("messages.timestamp", -1)],  # 發送者類型索引
        ]
        
    class Config:
        json_schema_extra = {
            "example": {
                "bot_id": "123e4567-e89b-12d3-a456-426614174000",
                "line_user_id": "U1234567890abcdef1234567890abcdef",
                "messages": [
                    {
                        "id": "64f5a8c9b1d2e3f4a5b6c7d8",
                        "event_type": "message",
                        "message_type": "text",
                        "content": {"text": "Hello"},
                        "sender_type": "user",
                        "timestamp": "2023-09-04T12:00:00Z"
                    }
                ],
                "created_at": "2023-09-04T10:00:00Z",
                "updated_at": "2023-09-04T12:00:00Z"
            }
        }
    
    async def add_message(self, message_data: Dict[str, Any]) -> MessageDocument:
        """新增訊息到對話中"""
        # 創建新的訊息文檔
        message = MessageDocument(**message_data)
        
        # 添加到訊息列表
        self.messages.append(message)
        
        # 更新時間戳
        self.updated_at = datetime.utcnow()
        
        # 保存到資料庫
        await self.save()
        
        return message
    
    async def get_messages(
        self, 
        limit: int = 50, 
        offset: int = 0,
        sender_type: Optional[str] = None
    ) -> List[MessageDocument]:
        """
        獲取訊息列表
        
        Args:
            limit: 限制返回的訊息數量
            offset: 跳過的訊息數量
            sender_type: 篩選發送者類型 (user, admin)
        """
        messages = self.messages
        
        # 按發送者類型篩選
        if sender_type:
            messages = [msg for msg in messages if msg.sender_type == sender_type]
        
        # 按時間戳排序（最新的在前）
        messages.sort(key=lambda x: x.timestamp, reverse=True)
        
        # 應用分頁
        end_index = offset + limit
        paginated_messages = messages[offset:end_index]
        
        # 返回時反轉順序，讓最舊的訊息在前面（聊天室顯示順序）
        return list(reversed(paginated_messages))
    
    async def get_message_count(self, sender_type: Optional[str] = None) -> int:
        """獲取訊息總數"""
        if sender_type:
            return len([msg for msg in self.messages if msg.sender_type == sender_type])
        return len(self.messages)
    
    async def delete_old_messages(self, keep_days: int = 30) -> int:
        """
        刪除舊訊息，保留指定天數內的訊息
        
        Args:
            keep_days: 保留的天數
            
        Returns:
            刪除的訊息數量
        """
        cutoff_time = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_time = cutoff_time.replace(day=cutoff_time.day - keep_days)
        
        original_count = len(self.messages)
        self.messages = [msg for msg in self.messages if msg.timestamp >= cutoff_time]
        deleted_count = original_count - len(self.messages)
        
        if deleted_count > 0:
            self.updated_at = datetime.utcnow()
            await self.save()
        
        return deleted_count
    
    @classmethod
    async def get_or_create_conversation(
        cls, 
        bot_id: str, 
        line_user_id: str
    ) -> "ConversationDocument":
        """獲取或創建對話文檔"""
        # 嘗試找到現有的對話
        conversation = await cls.find_one({
            "bot_id": bot_id,
            "line_user_id": line_user_id
        })
        
        # 如果不存在，創建新的對話
        if not conversation:
            conversation = cls(
                bot_id=bot_id,
                line_user_id=line_user_id,
                messages=[]
            )
            await conversation.save()
        
        return conversation
    
    @classmethod
    async def get_bot_conversations(
        cls, 
        bot_id: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> List["ConversationDocument"]:
        """獲取 Bot 的所有對話列表"""
        return await cls.find(
            {"bot_id": bot_id}
        ).sort([("updated_at", -1)]).skip(offset).limit(limit).to_list()
    
    @classmethod
    async def get_conversation_stats(cls, bot_id: str) -> Dict[str, int]:
        """獲取對話統計資訊"""
        pipeline = [
            {"$match": {"bot_id": bot_id}},
            {"$project": {
                "message_count": {"$size": "$messages"},
                "user_messages": {
                    "$size": {
                        "$filter": {
                            "input": "$messages",
                            "cond": {"$eq": ["$$this.sender_type", "user"]}
                        }
                    }
                },
                "admin_messages": {
                    "$size": {
                        "$filter": {
                            "input": "$messages",
                            "cond": {"$eq": ["$$this.sender_type", "admin"]}
                        }
                    }
                }
            }},
            {"$group": {
                "_id": None,
                "total_conversations": {"$sum": 1},
                "total_messages": {"$sum": "$message_count"},
                "total_user_messages": {"$sum": "$user_messages"},
                "total_admin_messages": {"$sum": "$admin_messages"}
            }}
        ]
        
        result = await cls.aggregate(pipeline).to_list()
        
        if result:
            stats = result[0]
            return {
                "total_conversations": stats.get("total_conversations", 0),
                "total_messages": stats.get("total_messages", 0),
                "total_user_messages": stats.get("total_user_messages", 0),
                "total_admin_messages": stats.get("total_admin_messages", 0)
            }
        
        return {
            "total_conversations": 0,
            "total_messages": 0,
            "total_user_messages": 0,
            "total_admin_messages": 0
        }