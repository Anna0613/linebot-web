"""
Embedding 查詢快取服務
用於快取常見查詢的 embedding，避免重複計算
"""
import hashlib
import json
from typing import List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class EmbeddingCache:
    """
    Embedding 快取管理器
    使用記憶體快取來存儲最近的查詢 embedding
    """
    
    def __init__(self, max_size: int = 1000, ttl_minutes: int = 60):
        """
        初始化快取
        
        Args:
            max_size: 最大快取條目數
            ttl_minutes: 快取過期時間（分鐘）
        """
        self._cache: dict = {}
        self._max_size = max_size
        self._ttl = timedelta(minutes=ttl_minutes)
        self._access_count: dict = {}  # 記錄訪問次數用於 LRU
        
    def _generate_key(self, text: str, model_name: str) -> str:
        """
        生成快取鍵
        
        Args:
            text: 查詢文本
            model_name: 模型名稱
            
        Returns:
            快取鍵
        """
        # 使用 SHA256 生成唯一鍵
        content = f"{text}:{model_name}"
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def get(self, text: str, model_name: str) -> Optional[List[float]]:
        """
        從快取獲取 embedding
        
        Args:
            text: 查詢文本
            model_name: 模型名稱
            
        Returns:
            embedding 向量，如果不存在或已過期則返回 None
        """
        key = self._generate_key(text, model_name)
        
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        
        # 檢查是否過期
        if datetime.now() - entry['timestamp'] > self._ttl:
            del self._cache[key]
            if key in self._access_count:
                del self._access_count[key]
            return None
        
        # 更新訪問計數
        self._access_count[key] = self._access_count.get(key, 0) + 1
        
        logger.debug(f"快取命中: {text[:50]}... (模型: {model_name})")
        return entry['embedding']
    
    def set(self, text: str, model_name: str, embedding: List[float]) -> None:
        """
        將 embedding 存入快取
        
        Args:
            text: 查詢文本
            model_name: 模型名稱
            embedding: embedding 向量
        """
        key = self._generate_key(text, model_name)
        
        # 如果快取已滿，移除最少使用的條目
        if len(self._cache) >= self._max_size and key not in self._cache:
            self._evict_lru()
        
        self._cache[key] = {
            'embedding': embedding,
            'timestamp': datetime.now(),
            'text_preview': text[:100]  # 保存預覽用於調試
        }
        self._access_count[key] = 1
        
        logger.debug(f"快取新增: {text[:50]}... (模型: {model_name})")
    
    def _evict_lru(self) -> None:
        """移除最少使用的快取條目"""
        if not self._access_count:
            return
        
        # 找到訪問次數最少的鍵
        lru_key = min(self._access_count, key=self._access_count.get)
        
        if lru_key in self._cache:
            del self._cache[lru_key]
        if lru_key in self._access_count:
            del self._access_count[lru_key]
        
        logger.debug(f"快取淘汰: {lru_key}")
    
    def clear(self) -> None:
        """清空快取"""
        self._cache.clear()
        self._access_count.clear()
        logger.info("快取已清空")
    
    def get_stats(self) -> dict:
        """
        獲取快取統計資訊
        
        Returns:
            包含快取統計的字典
        """
        return {
            'size': len(self._cache),
            'max_size': self._max_size,
            'ttl_minutes': self._ttl.total_seconds() / 60,
            'total_access': sum(self._access_count.values()),
        }


# 全局快取實例
_global_embedding_cache: Optional[EmbeddingCache] = None


def get_embedding_cache() -> EmbeddingCache:
    """
    獲取全局 embedding 快取實例
    
    Returns:
        EmbeddingCache 實例
    """
    global _global_embedding_cache
    
    if _global_embedding_cache is None:
        _global_embedding_cache = EmbeddingCache(
            max_size=1000,  # 快取 1000 個查詢
            ttl_minutes=60   # 1 小時過期
        )
    
    return _global_embedding_cache


def clear_embedding_cache() -> None:
    """清空全局 embedding 快取"""
    global _global_embedding_cache
    
    if _global_embedding_cache is not None:
        _global_embedding_cache.clear()

