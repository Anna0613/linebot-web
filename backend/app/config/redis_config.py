"""
Redis 配置和連接管理
提供高效能的快取解決方案
"""
import os
import json
import logging
from typing import Optional, Any, Dict, Union
from datetime import timedelta
from functools import wraps

# 條件導入 Redis - 如果未安裝則使用 mock
try:
    import redis
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    print("⚠️  Redis 未安裝，使用模擬模式")
    redis = None
    aioredis = None
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Redis 配置
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_URL = os.getenv("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")

# 快取配置 - 優化後的 TTL 設定
DEFAULT_CACHE_TTL = 900   # 15 分鐘 (從5分鐘提升)
WEBHOOK_STATUS_TTL = 600  # 10 分鐘 (從2分鐘提升)
BOT_ANALYTICS_TTL = 900   # 15 分鐘 (從5分鐘提升)
BOT_DASHBOARD_TTL = 1200  # 20 分鐘 (新增：儀表板複合數據)
USER_SESSION_TTL = 1800   # 30 分鐘 (保持不變)

class RedisManager:
    """Redis 連接管理器"""
    
    def __init__(self):
        self.redis_client: Optional[Any] = None
        self.is_connected = False
    
    async def connect(self):
        """建立 Redis 連接"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis 未安裝，跳過連接")
            return
            
        try:
            # 使用 redis.asyncio 建立連接
            self.redis_client = aioredis.from_url(
                REDIS_URL,
                password=REDIS_PASSWORD,
                decode_responses=True,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={}
            )
            
            # 測試連接
            await self.redis_client.ping()
            self.is_connected = True
            logger.info(f"Redis 連接成功: {REDIS_HOST}:{REDIS_PORT}")
            
        except Exception as e:
            logger.error(f"Redis 連接失敗: {e}")
            logger.warning("將繼續運行但無快取功能")
            self.is_connected = False
            self.redis_client = None
    
    async def disconnect(self):
        """關閉 Redis 連接"""
        if self.redis_client:
            await self.redis_client.close()
            self.is_connected = False
            logger.info("Redis 連接已關閉")
    
    def get_client(self) -> Optional[Any]:
        """獲取 Redis 客戶端"""
        return self.redis_client if self.is_connected else None

# 全域 Redis 管理器
redis_manager = RedisManager()

class CacheService:
    """快取服務"""
    
    @staticmethod
    def _serialize(data: Any) -> str:
        """序列化資料"""
        try:
            return json.dumps(data, default=str, ensure_ascii=False)
        except Exception as e:
            logger.error(f"資料序列化失敗: {e}")
            raise
    
    @staticmethod
    def _deserialize(data: str) -> Any:
        """反序列化資料"""
        try:
            return json.loads(data)
        except Exception as e:
            logger.error(f"資料反序列化失敗: {e}")
            return None
    
    @staticmethod
    async def set(
        key: str, 
        value: Any, 
        ttl: Optional[int] = DEFAULT_CACHE_TTL
    ) -> bool:
        """設定快取"""
        client = redis_manager.get_client()
        if not client:
            logger.warning("Redis 未連接，跳過快取設定")
            return False
        
        try:
            serialized_value = CacheService._serialize(value)
            if ttl:
                await client.setex(key, ttl, serialized_value)
            else:
                await client.set(key, serialized_value)
            return True
        except Exception as e:
            logger.error(f"設定快取失敗 {key}: {e}")
            return False
    
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """獲取快取"""
        client = redis_manager.get_client()
        if not client:
            return None
        
        try:
            cached_value = await client.get(key)
            if cached_value:
                return CacheService._deserialize(cached_value)
            return None
        except Exception as e:
            logger.error(f"獲取快取失敗 {key}: {e}")
            return None
    
    @staticmethod
    async def delete(key: str) -> bool:
        """刪除快取"""
        client = redis_manager.get_client()
        if not client:
            return False
        
        try:
            result = await client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"刪除快取失敗 {key}: {e}")
            return False
    
    @staticmethod
    async def exists(key: str) -> bool:
        """檢查快取是否存在"""
        client = redis_manager.get_client()
        if not client:
            return False
        
        try:
            result = await client.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"檢查快取存在失敗 {key}: {e}")
            return False
    
    @staticmethod
    async def invalidate_pattern(pattern: str) -> int:
        """根據模式批量刪除快取"""
        client = redis_manager.get_client()
        if not client:
            return 0
        
        try:
            keys = await client.keys(pattern)
            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"批量刪除快取失敗 {pattern}: {e}")
            return 0

# 快取鍵生成器
class CacheKeys:
    """快取鍵命名空間"""
    
    @staticmethod
    def bot_dashboard(bot_id: str, user_id: str) -> str:
        return f"dashboard:bot:{bot_id}:user:{user_id}"
    
    @staticmethod
    def bot_analytics(bot_id: str, period: str) -> str:
        return f"analytics:bot:{bot_id}:period:{period}"
    
    @staticmethod
    def webhook_status(bot_id: str) -> str:
        return f"webhook:status:bot:{bot_id}"
    
    @staticmethod
    def logic_templates(bot_id: str) -> str:
        return f"logic:templates:bot:{bot_id}"
    
    @staticmethod
    def bot_list(user_id: str) -> str:
        return f"bots:user:{user_id}"
    
    @staticmethod
    def user_session(user_id: str) -> str:
        return f"session:user:{user_id}"

# 快取裝飾器
def cache_result(
    key_generator,
    ttl: int = DEFAULT_CACHE_TTL,
    use_user_context: bool = True
):
    """快取結果裝飾器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 嘗試從參數中提取必要的資訊
            try:
                if use_user_context:
                    # 假設第一個參數是 request 或包含 user 資訊
                    current_user = None
                    for arg in args:
                        if hasattr(arg, 'id'):
                            current_user = arg
                            break
                    
                    if not current_user:
                        # 從 kwargs 中查找
                        current_user = kwargs.get('current_user')
                    
                    if current_user:
                        cache_key = key_generator(*args, current_user.id, **kwargs)
                    else:
                        cache_key = key_generator(*args, **kwargs)
                else:
                    cache_key = key_generator(*args, **kwargs)
                
                # 嘗試從快取獲取
                cached_result = await CacheService.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"快取命中: {cache_key}")
                    return cached_result
                
                # 執行原始函數
                result = await func(*args, **kwargs)
                
                # 將結果存入快取
                if result is not None:
                    await CacheService.set(cache_key, result, ttl)
                    logger.debug(f"結果已快取: {cache_key}")
                
                return result
                
            except Exception as e:
                logger.error(f"快取裝飾器錯誤: {e}")
                # 快取失敗時直接執行原始函數
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# 初始化和清理函數
async def init_redis():
    """初始化 Redis 連接"""
    await redis_manager.connect()

async def close_redis():
    """關閉 Redis 連接"""
    await redis_manager.disconnect()

# 快取失效工具
class CacheInvalidator:
    """快取失效管理"""
    
    @staticmethod
    async def invalidate_bot_cache(bot_id: str, user_id: str):
        """失效特定 Bot 的所有快取"""
        patterns = [
            f"dashboard:bot:{bot_id}:*",
            f"analytics:bot:{bot_id}:*",
            f"webhook:status:bot:{bot_id}",
            f"logic:templates:bot:{bot_id}",
        ]
        
        for pattern in patterns:
            await CacheService.invalidate_pattern(pattern)
        
        # 也失效用戶的 Bot 列表快取
        await CacheService.delete(CacheKeys.bot_list(user_id))
    
    @staticmethod
    async def invalidate_user_cache(user_id: str):
        """失效特定用戶的所有快取"""
        patterns = [
            f"*:user:{user_id}",
            f"*:user:{user_id}:*",
        ]
        
        for pattern in patterns:
            await CacheService.invalidate_pattern(pattern)
    
    @staticmethod
    async def invalidate_webhook_cache(bot_id: str):
        """失效 Webhook 快取"""
        await CacheService.delete(CacheKeys.webhook_status(bot_id))
    
    @staticmethod
    async def invalidate_analytics_cache(bot_id: str):
        """失效分析資料快取"""
        pattern = f"analytics:bot:{bot_id}:*"
        await CacheService.invalidate_pattern(pattern)