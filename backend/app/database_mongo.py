"""
MongoDB 資料庫連接和會話管理模組
"""
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError, OperationFailure
import tenacity

from .config import settings

logger = logging.getLogger(__name__)

class MongoDBManager:
    """MongoDB 連線管理器"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        
    async def connect(self) -> None:
        """建立 MongoDB 連線"""
        try:
            logger.info(f"正在連接 MongoDB: {settings.MONGODB_HOST}:{settings.MONGODB_PORT}")
            
            # 創建 MongoDB 客戶端
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                maxPoolSize=50,          # 最大連接池大小
                minPoolSize=10,          # 最小連接池大小
                maxIdleTimeMS=30000,     # 空閒連接超時 30 秒
                serverSelectionTimeoutMS=5000,  # 伺服器選擇超時 5 秒
                connectTimeoutMS=10000,  # 連接超時 10 秒
                socketTimeoutMS=20000,   # Socket 超時 20 秒
                retryWrites=True,        # 啟用寫入重試
                appName="linebot-web-api"  # 應用程式名稱
            )
            
            # 獲取資料庫實例
            self.database = self.client[settings.MONGODB_DATABASE]
            
            # 測試連接
            await self.check_connection()
            
            # 初始化 Beanie ODM
            await self.init_beanie()
            
            # 建立索引
            await self.ensure_indexes()
            
            logger.info("MongoDB 連接成功")
            
        except Exception as e:
            logger.error(f"MongoDB 連接失敗: {e}")
            raise
    
    async def init_beanie(self) -> None:
        """初始化 Beanie ODM"""
        try:
            from beanie import init_beanie
            from app.models.mongodb.conversation import ConversationDocument
            
            await init_beanie(
                database=self.database,
                document_models=[ConversationDocument]
            )
            logger.info("Beanie ODM 初始化完成")
            
        except Exception as e:
            logger.error(f"Beanie ODM 初始化失敗: {e}")
            raise
    
    async def disconnect(self) -> None:
        """關閉 MongoDB 連線"""
        if self.client:
            self.client.close()
            logger.info("MongoDB 連接已關閉")
    
    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_fixed(2),
        retry=tenacity.retry_if_exception_type((ServerSelectionTimeoutError, OperationFailure)),
        before_sleep=lambda retry_state: logger.debug(f"重試 MongoDB 連接: 第 {retry_state.attempt_number} 次嘗試")
    )
    async def check_connection(self) -> bool:
        """檢查 MongoDB 連接狀態"""
        if not self.client:
            raise ValueError("MongoDB 客戶端未初始化")
            
        # 發送 ping 命令測試連接
        await self.client.admin.command('ping')
        return True
    
    async def ensure_indexes(self) -> None:
        """確保必要的索引存在"""
        try:
            conversations_collection = self.database.conversations
            
            # 建立複合索引：(bot_id, line_user_id)
            await conversations_collection.create_index([
                ("bot_id", 1),
                ("line_user_id", 1)
            ], unique=True, name="bot_user_unique_idx")
            
            # 建立複合索引：(bot_id, line_user_id, messages.timestamp) 用於查詢和排序
            await conversations_collection.create_index([
                ("bot_id", 1),
                ("line_user_id", 1),
                ("messages.timestamp", -1)
            ], name="chat_history_idx")
            
            # 建立單一索引：updated_at 用於維護和清理
            await conversations_collection.create_index([
                ("updated_at", -1)
            ], name="updated_at_idx")
            
            # 建立複合索引：(messages.sender_type, messages.timestamp) 用於訊息類型查詢
            await conversations_collection.create_index([
                ("messages.sender_type", 1),
                ("messages.timestamp", -1)
            ], name="sender_time_idx")

            # 建立複合索引：(bot_id, messages.line_message_id) 用於防重複檢查
            await conversations_collection.create_index([
                ("bot_id", 1),
                ("messages.line_message_id", 1)
            ], name="line_message_id_idx")

            logger.info("MongoDB 索引創建完成")
            
        except Exception as e:
            logger.warning(f"創建索引時發生錯誤: {e}")
    
    def get_database(self) -> AsyncIOMotorDatabase:
        """獲取資料庫實例"""
        if self.database is None:
            raise ValueError("MongoDB 資料庫未連接")
        return self.database
    
    def get_collection(self, collection_name: str):
        """獲取集合實例"""
        return self.get_database()[collection_name]

# 全域 MongoDB 管理器實例
mongodb_manager = MongoDBManager()

async def get_mongodb() -> AsyncIOMotorDatabase:
    """依賴注入函數：獲取 MongoDB 資料庫實例"""
    return mongodb_manager.get_database()

async def init_mongodb():
    """初始化 MongoDB 連接"""
    await mongodb_manager.connect()

async def close_mongodb():
    """關閉 MongoDB 連接"""
    await mongodb_manager.disconnect()