"""
RAG 查詢結果快取服務
用於快取 RAG 檢索結果，避免重複查詢資料庫
"""
import hashlib
import json
from typing import List, Tuple, Optional, Any
from datetime import datetime, timedelta
import logging

from app.models.knowledge import KnowledgeChunk

logger = logging.getLogger(__name__)


class RAGCache:
    """
    RAG 查詢結果快取管理器
    快取向量搜尋和混合搜尋的結果
    """
    
    def __init__(self, max_size: int = 500, ttl_minutes: int = 30):
        """
        初始化快取
        
        Args:
            max_size: 最大快取條目數
            ttl_minutes: 快取過期時間（分鐘）
        """
        self._cache: dict = {}
        self._max_size = max_size
        self._ttl = timedelta(minutes=ttl_minutes)
        self._access_count: dict = {}
        self._hit_count = 0
        self._miss_count = 0
        
    def _generate_key(
        self, 
        bot_id: str, 
        query: str, 
        search_type: str,
        **kwargs
    ) -> str:
        """
        生成快取鍵
        
        Args:
            bot_id: Bot ID
            query: 查詢文本
            search_type: 搜尋類型 (vector/hybrid/bm25)
            **kwargs: 其他參數（如 threshold, top_k 等）
            
        Returns:
            快取鍵
        """
        # 將所有參數序列化為字符串
        params = {
            'bot_id': bot_id,
            'query': query,
            'search_type': search_type,
            **kwargs
        }
        
        # 排序以確保一致性
        content = json.dumps(params, sort_keys=True)
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def get(
        self, 
        bot_id: str, 
        query: str, 
        search_type: str,
        **kwargs
    ) -> Optional[List[Tuple[dict, float]]]:
        """
        從快取獲取查詢結果
        
        Args:
            bot_id: Bot ID
            query: 查詢文本
            search_type: 搜尋類型
            **kwargs: 其他參數
            
        Returns:
            查詢結果列表，如果不存在或已過期則返回 None
        """
        key = self._generate_key(bot_id, query, search_type, **kwargs)
        
        if key not in self._cache:
            self._miss_count += 1
            return None
        
        entry = self._cache[key]
        
        # 檢查是否過期
        if datetime.now() - entry['timestamp'] > self._ttl:
            del self._cache[key]
            if key in self._access_count:
                del self._access_count[key]
            self._miss_count += 1
            return None
        
        # 更新訪問計數
        self._access_count[key] = self._access_count.get(key, 0) + 1
        self._hit_count += 1
        
        logger.debug(f"RAG 快取命中: {query[:50]}... (類型: {search_type})")
        return entry['results']
    
    def set(
        self, 
        bot_id: str, 
        query: str, 
        search_type: str,
        results: List[Tuple[Any, float]],
        **kwargs
    ) -> None:
        """
        將查詢結果存入快取
        
        Args:
            bot_id: Bot ID
            query: 查詢文本
            search_type: 搜尋類型
            results: 查詢結果（KnowledgeChunk 和分數的列表）
            **kwargs: 其他參數
        """
        key = self._generate_key(bot_id, query, search_type, **kwargs)
        
        # 如果快取已滿，移除最少使用的條目
        if len(self._cache) >= self._max_size and key not in self._cache:
            self._evict_lru()
        
        # 將 KnowledgeChunk 對象轉換為可序列化的字典
        serializable_results = []
        for chunk, score in results:
            if isinstance(chunk, KnowledgeChunk):
                chunk_dict = {
                    'id': str(chunk.id),
                    'document_id': str(chunk.document_id),
                    'bot_id': str(chunk.bot_id) if chunk.bot_id else None,
                    'content': chunk.content,
                    'created_at': chunk.created_at.isoformat() if chunk.created_at else None,
                    'updated_at': chunk.updated_at.isoformat() if chunk.updated_at else None,
                }
            else:
                chunk_dict = chunk
            
            serializable_results.append((chunk_dict, score))
        
        self._cache[key] = {
            'results': serializable_results,
            'timestamp': datetime.now(),
            'query_preview': query[:100]
        }
        self._access_count[key] = 1
        
        logger.debug(f"RAG 快取新增: {query[:50]}... (類型: {search_type})")
    
    def _evict_lru(self) -> None:
        """移除最少使用的快取條目"""
        if not self._access_count:
            return
        
        lru_key = min(self._access_count, key=self._access_count.get)
        
        if lru_key in self._cache:
            del self._cache[lru_key]
        if lru_key in self._access_count:
            del self._access_count[lru_key]
        
        logger.debug(f"RAG 快取淘汰: {lru_key}")
    
    def clear(self) -> None:
        """清空快取"""
        self._cache.clear()
        self._access_count.clear()
        self._hit_count = 0
        self._miss_count = 0
        logger.info("RAG 快取已清空")
    
    def get_stats(self) -> dict:
        """
        獲取快取統計資訊
        
        Returns:
            包含快取統計的字典
        """
        total_requests = self._hit_count + self._miss_count
        hit_rate = (self._hit_count / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self._cache),
            'max_size': self._max_size,
            'ttl_minutes': self._ttl.total_seconds() / 60,
            'hit_count': self._hit_count,
            'miss_count': self._miss_count,
            'hit_rate': f"{hit_rate:.2f}%",
            'total_access': sum(self._access_count.values()),
        }


# 全局快取實例
_global_rag_cache: Optional[RAGCache] = None


def get_rag_cache() -> RAGCache:
    """
    獲取全局 RAG 快取實例
    
    Returns:
        RAGCache 實例
    """
    global _global_rag_cache
    
    if _global_rag_cache is None:
        _global_rag_cache = RAGCache(
            max_size=500,   # 快取 500 個查詢結果
            ttl_minutes=30  # 30 分鐘過期
        )
    
    return _global_rag_cache


def clear_rag_cache() -> None:
    """清空全局 RAG 快取"""
    global _global_rag_cache
    
    if _global_rag_cache is not None:
        _global_rag_cache.clear()

