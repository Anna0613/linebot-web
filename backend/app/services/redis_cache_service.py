"""
Redis 快取服務
用於快取用戶對話歷史，減少對 MongoDB 的重複查詢
"""
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import redis
from redis.exceptions import RedisError

from app.config import settings

logger = logging.getLogger(__name__)


class RedisCacheService:
    """Redis 快取服務"""
    
    def __init__(self):
        """初始化 Redis 連接"""
        self._redis_client = None
        self._connect()
    
    def _connect(self):
        """建立 Redis 連接"""
        try:
            # 從設定中讀取 Redis 配置
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
            
            self._redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # 測試連接
            self._redis_client.ping()
            logger.info("Redis 連接成功")
            
        except Exception as e:
            logger.warning(f"Redis 連接失敗: {e}")
            self._redis_client = None
    
    @property
    def is_available(self) -> bool:
        """檢查 Redis 是否可用"""
        if not self._redis_client:
            return False
        
        try:
            self._redis_client.ping()
            return True
        except RedisError:
            return False
    
    def _get_conversation_cache_key(self, bot_id: str, line_user_id: str) -> str:
        """生成對話快取鍵名"""
        return f"conversation:{bot_id}:{line_user_id}"
    
    def _get_context_cache_key(self, bot_id: str, line_user_id: str, context_hash: str) -> str:
        """生成上下文快取鍵名"""
        return f"context:{bot_id}:{line_user_id}:{context_hash}"
    
    def get_conversation_cache(self, bot_id: str, line_user_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        從快取中獲取用戶對話歷史
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            
        Returns:
            對話歷史列表，如果快取不存在或過期則返回 None
        """
        if not self.is_available:
            return None
        
        try:
            cache_key = self._get_conversation_cache_key(bot_id, line_user_id)
            cached_data = self._redis_client.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"從快取獲取對話歷史: {cache_key}")
                return data.get('messages', [])
            
            return None
            
        except Exception as e:
            logger.warning(f"讀取對話快取失敗: {e}")
            return None
    
    def set_conversation_cache(
        self, 
        bot_id: str, 
        line_user_id: str, 
        messages: List[Dict[str, Any]], 
        ttl_seconds: int = 1800  # 30 分鐘
    ) -> bool:
        """
        設定用戶對話歷史快取
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            messages: 對話歷史列表
            ttl_seconds: 快取過期時間（秒）
            
        Returns:
            是否設定成功
        """
        if not self.is_available:
            return False
        
        try:
            cache_key = self._get_conversation_cache_key(bot_id, line_user_id)
            
            cache_data = {
                'messages': messages,
                'cached_at': datetime.now().isoformat(),
                'message_count': len(messages)
            }
            
            self._redis_client.setex(
                cache_key,
                ttl_seconds,
                json.dumps(cache_data, default=str)
            )
            
            logger.debug(f"設定對話快取: {cache_key}, 訊息數: {len(messages)}")
            return True
            
        except Exception as e:
            logger.warning(f"設定對話快取失敗: {e}")
            return False
    
    def update_conversation_cache(
        self, 
        bot_id: str, 
        line_user_id: str, 
        new_message: Dict[str, Any]
    ) -> bool:
        """
        更新對話快取（新增單筆訊息）
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            new_message: 新訊息
            
        Returns:
            是否更新成功
        """
        if not self.is_available:
            return False
        
        try:
            cache_key = self._get_conversation_cache_key(bot_id, line_user_id)
            cached_data = self._redis_client.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                messages = data.get('messages', [])
                
                # 新增新訊息
                messages.append(new_message)
                
                # 限制快取大小（保留最新的 500 筆訊息）
                if len(messages) > 500:
                    messages = messages[-500:]
                
                # 更新快取
                data['messages'] = messages
                data['message_count'] = len(messages)
                data['updated_at'] = datetime.now().isoformat()
                
                # 保持原有的 TTL
                ttl = self._redis_client.ttl(cache_key)
                if ttl > 0:
                    self._redis_client.setex(
                        cache_key,
                        ttl,
                        json.dumps(data, default=str)
                    )
                    logger.debug(f"更新對話快取: {cache_key}")
                    return True
            
            return False
            
        except Exception as e:
            logger.warning(f"更新對話快取失敗: {e}")
            return False
    
    def invalidate_conversation_cache(self, bot_id: str, line_user_id: str) -> bool:
        """
        清除用戶對話快取
        
        Args:
            bot_id: Bot ID
            line_user_id: LINE 用戶 ID
            
        Returns:
            是否清除成功
        """
        if not self.is_available:
            return False
        
        try:
            cache_key = self._get_conversation_cache_key(bot_id, line_user_id)
            result = self._redis_client.delete(cache_key)
            
            if result:
                logger.debug(f"清除對話快取: {cache_key}")
            
            return bool(result)
            
        except Exception as e:
            logger.warning(f"清除對話快取失敗: {e}")
            return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        獲取快取統計資訊
        
        Returns:
            快取統計資訊
        """
        if not self.is_available:
            return {'available': False}
        
        try:
            info = self._redis_client.info()
            
            # 統計對話快取數量
            conversation_keys = self._redis_client.keys('conversation:*')
            context_keys = self._redis_client.keys('context:*')
            
            return {
                'available': True,
                'memory_usage': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'conversation_cache_count': len(conversation_keys),
                'context_cache_count': len(context_keys),
                'total_keys': info.get('db0', {}).get('keys', 0) if 'db0' in info else 0
            }
            
        except Exception as e:
            logger.warning(f"獲取快取統計失敗: {e}")
            return {'available': False, 'error': str(e)}
    
    def cleanup_expired_cache(self) -> int:
        """
        清理過期的快取（手動清理，通常 Redis 會自動處理）
        
        Returns:
            清理的快取數量
        """
        if not self.is_available:
            return 0
        
        try:
            # 獲取所有對話快取鍵
            conversation_keys = self._redis_client.keys('conversation:*')
            context_keys = self._redis_client.keys('context:*')
            
            cleaned_count = 0
            
            # 檢查並清理過期的快取
            for key in conversation_keys + context_keys:
                ttl = self._redis_client.ttl(key)
                if ttl == -1:  # 沒有設定過期時間的鍵
                    # 設定預設過期時間（1 小時）
                    self._redis_client.expire(key, 3600)
                elif ttl == -2:  # 鍵不存在
                    cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"清理過期快取: {cleaned_count} 個")
            
            return cleaned_count
            
        except Exception as e:
            logger.warning(f"清理快取失敗: {e}")
            return 0


# 全域快取服務實例
cache_service = RedisCacheService()
