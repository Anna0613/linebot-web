"""
MongoDB 資料庫連接和會話管理模組
"""
import asyncio
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
        self.is_connected: bool = False
        self.beanie_initialized: bool = False

    async def connect(self) -> bool:
        """建立 MongoDB 連線，返回連線是否成功"""
        try:
            logger.info(f"正在連接 MongoDB: {settings.MONGODB_HOST}:{settings.MONGODB_PORT}")

            # 創建 MongoDB 客戶端
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                maxPoolSize=20,          # 減少最大連接池大小
                minPoolSize=5,           # 減少最小連接池大小
                maxIdleTimeMS=30000,     # 空閒連接超時 30 秒
                serverSelectionTimeoutMS=10000,  # 增加伺服器選擇超時到 10 秒
                connectTimeoutMS=10000,  # 增加連接超時到 10 秒
                socketTimeoutMS=20000,   # 增加 Socket 超時到 20 秒
                retryWrites=True,        # 啟用寫入重試
                heartbeatFrequencyMS=10000,  # 心跳頻率 10 秒
                appName="linebot-web-api"  # 應用程式名稱
            )

            # 獲取資料庫實例
            self.database = self.client[settings.MONGODB_DATABASE]

            # 測試連接
            await self.check_connection()

            # 預熱連線池
            await self.warmup_connection_pool()

            # 等待一小段時間確保連線池完全建立
            import asyncio
            await asyncio.sleep(0.5)

            # 初始化 Beanie ODM
            await self.init_beanie()

            # 建立索引
            await self.ensure_indexes()

            self.is_connected = True
            logger.info("✅ MongoDB 連接成功")
            return True

        except Exception as e:
            logger.error(f"❌ MongoDB 連接失敗: {e}")
            logger.warning("⚠️  MongoDB 功能將不可用，但系統將繼續運行")
            self.is_connected = False
            self.beanie_initialized = False
            # 清理失敗的連接
            if self.client:
                self.client.close()
                self.client = None
            self.database = None
            return False
    
    async def init_beanie(self) -> None:
        """初始化 Beanie ODM"""
        if self.beanie_initialized:
            logger.debug("Beanie ODM 已經初始化，跳過")
            return

        try:
            from beanie import init_beanie
            from app.models.mongodb.conversation import ConversationDocument

            logger.info("正在初始化 Beanie ODM...")
            await init_beanie(
                database=self.database,
                document_models=[ConversationDocument]
            )
            self.beanie_initialized = True
            logger.info("✅ Beanie ODM 初始化完成")

        except Exception as e:
            logger.error(f"❌ Beanie ODM 初始化失敗: {e}")
            raise
    
    async def disconnect(self) -> None:
        """關閉 MongoDB 連線"""
        try:
            if self.client:
                self.client.close()
                logger.info("MongoDB 連接已關閉")
            self.is_connected = False
            self.beanie_initialized = False
        except Exception as e:
            logger.error(f"關閉 MongoDB 連接時發生錯誤: {e}")
    
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

    async def warmup_connection_pool(self) -> None:
        """預熱連線池"""
        try:
            logger.debug("正在預熱 MongoDB 連線池...")
            # 執行幾個簡單的操作來預熱連線池
            tasks = []
            for _ in range(3):  # 創建 3 個併發連線
                tasks.append(self.client.admin.command('ping'))

            await asyncio.gather(*tasks)
            logger.debug("✅ MongoDB 連線池預熱完成")

        except Exception as e:
            logger.warning(f"連線池預熱失敗: {e}")
            # 不拋出異常，因為這不是關鍵錯誤
    
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
    
    def get_database(self) -> Optional[AsyncIOMotorDatabase]:
        """獲取資料庫實例"""
        if not self.is_connected or self.database is None:
            logger.warning("MongoDB 未連接，返回 None")
            return None
        return self.database

    def get_collection(self, collection_name: str):
        """獲取集合實例"""
        database = self.get_database()
        if database is None:
            logger.warning(f"無法獲取集合 {collection_name}，MongoDB 未連接")
            return None
        return database[collection_name]

    def is_available(self) -> bool:
        """檢查 MongoDB 是否可用"""
        return self.is_connected and self.database is not None

# 全域 MongoDB 管理器實例
mongodb_manager = MongoDBManager()

async def get_mongodb() -> Optional[AsyncIOMotorDatabase]:
    """依賴注入函數：獲取 MongoDB 資料庫實例"""
    return mongodb_manager.get_database()

async def init_mongodb() -> bool:
    """初始化 MongoDB 連接，返回是否成功"""
    return await mongodb_manager.connect()

async def close_mongodb():
    """關閉 MongoDB 連接"""
    await mongodb_manager.disconnect()

def is_mongodb_available() -> bool:
    """檢查 MongoDB 是否可用"""
    return mongodb_manager.is_available()