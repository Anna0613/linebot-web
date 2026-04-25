"""
多層快取服務
實現 L1 記憶體快取 + L2 Redis 分散式快取的架構
"""
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union, Callable, List
from functools import wraps
from dataclasses import dataclass, field
import json
import hashlib

# L1 快取 (記憶體快取)
from cachetools import TTLCache, LRUCache

# L2 快取 (Redis)
from app.config.redis_config import CacheService as RedisCache, redis_manager

logger = logging.getLogger(__name__)

@dataclass
class CacheConfig:
    """快取配置"""
    l1_enabled: bool = True
    l2_enabled: bool = True
    l1_max_size: int = 1000
    l1_ttl: int = 300  # 5分鐘
    l2_ttl: int = 900  # 15分鐘
    use_compression: bool = True


class MultiLayerCache:
    """多層快取管理器"""
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        
        # L1 快取：記憶體快取 (LRU + TTL)
        if self.config.l1_enabled:
            self.l1_cache = TTLCache(
                maxsize=self.config.l1_max_size,
                ttl=self.config.l1_ttl
            )
        else:
            self.l1_cache = None
            
        # L2 快取：Redis 分散式快取
        self.l2_cache = RedisCache if self.config.l2_enabled else None
        
        # 統計資料
        self.stats = {
            "l1_hits": 0,
            "l1_misses": 0,
            "l2_hits": 0,
            "l2_misses": 0,
            "total_requests": 0
        }
    
    def _generate_cache_key(self, key: str, **kwargs) -> str:
        """生成標準化的快取鍵"""
        if kwargs:
            # 將額外參數排序後加入鍵名
            params_str = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            key = f"{key}_{params_str}"
        
        # 如果鍵太長，使用 hash
        if len(key) > 200:
            key_hash = hashlib.md5(key.encode()).hexdigest()
            key = f"hash_{key_hash}"
        
        return key
    
    async def get(self, key: str, **kwargs) -> Optional[Any]:
        """
        多層獲取資料
        先從 L1 記憶體快取獲取，若沒有則從 L2 Redis 獲取
        """
        self.stats["total_requests"] += 1
        cache_key = self._generate_cache_key(key, **kwargs)
        
        # L1 快取檢查
        if self.l1_cache is not None:
            try:
                value = self.l1_cache.get(cache_key)
                if value is not None:
                    self.stats["l1_hits"] += 1
                    logger.debug(f"L1 快取命中: {cache_key}")
                    return value
                else:
                    self.stats["l1_misses"] += 1
            except Exception as e:
                logger.warning(f"L1 快取獲取失敗: {e}")
        
        # L2 快取檢查
        if self.l2_cache is not None:
            try:
                value = await self.l2_cache.get(cache_key)
                if value is not None:
                    self.stats["l2_hits"] += 1
                    logger.debug(f"L2 快取命中: {cache_key}")
                    
                    # 將資料回填到 L1 快取
                    if self.l1_cache is not None:
                        self.l1_cache[cache_key] = value
                    
                    return value
                else:
                    self.stats["l2_misses"] += 1
            except Exception as e:
                logger.warning(f"L2 快取獲取失敗: {e}")
        
        logger.debug(f"快取完全未命中: {cache_key}")
        return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        l1_ttl: Optional[int] = None,
        l2_ttl: Optional[int] = None,
        **kwargs
    ) -> bool:
        """
        多層設定資料
        同時設定到 L1 和 L2 快取
        """
        cache_key = self._generate_cache_key(key, **kwargs)
        success_count = 0
        
        # L1 快取設定
        if self.l1_cache is not None:
            try:
                # TTLCache 會自動處理 TTL
                self.l1_cache[cache_key] = value
                success_count += 1
                logger.debug(f"L1 快取設定成功: {cache_key}")
            except Exception as e:
                logger.warning(f"L1 快取設定失敗: {e}")
        
        # L2 快取設定
        if self.l2_cache is not None:
            try:
                ttl = l2_ttl or self.config.l2_ttl
                await self.l2_cache.set(cache_key, value, ttl)
                success_count += 1
                logger.debug(f"L2 快取設定成功: {cache_key}")
            except Exception as e:
                logger.warning(f"L2 快取設定失敗: {e}")
        
        return success_count > 0
    
    async def delete(self, key: str, **kwargs) -> bool:
        """多層刪除資料"""
        cache_key = self._generate_cache_key(key, **kwargs)
        success_count = 0
        
        # 從 L1 快取刪除
        if self.l1_cache is not None:
            try:
                if cache_key in self.l1_cache:
                    del self.l1_cache[cache_key]
                success_count += 1
            except Exception as e:
                logger.warning(f"L1 快取刪除失敗: {e}")
        
        # 從 L2 快取刪除
        if self.l2_cache is not None:
            try:
                await self.l2_cache.delete(cache_key)
                success_count += 1
            except Exception as e:
                logger.warning(f"L2 快取刪除失敗: {e}")
        
        return success_count > 0
    
    async def invalidate_pattern(self, pattern: str) -> bool:
        """按模式清除快取"""
        success_count = 0
        
        # 清除 L1 快取中符合模式的項目
        if self.l1_cache is not None:
            try:
                keys_to_delete = []
                for cache_key in list(self.l1_cache.keys()):
                    if pattern in cache_key:
                        keys_to_delete.append(cache_key)
                
                for cache_key in keys_to_delete:
                    del self.l1_cache[cache_key]
                
                success_count += len(keys_to_delete)
                logger.info(f"L1 快取清除 {len(keys_to_delete)} 個符合 '{pattern}' 的項目")
            except Exception as e:
                logger.warning(f"L1 快取模式清除失敗: {e}")
        
        # 清除 L2 快取中符合模式的項目
        if self.l2_cache is not None:
            try:
                from app.config.redis_config import CacheService
                await CacheService.invalidate_pattern(pattern)
                success_count += 1
            except Exception as e:
                logger.warning(f"L2 快取模式清除失敗: {e}")
        
        return success_count > 0
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取快取統計資料"""
        total_requests = self.stats["total_requests"]
        if total_requests == 0:
            return {**self.stats, "hit_rate": 0.0, "l1_hit_rate": 0.0, "l2_hit_rate": 0.0}
        
        l1_hits = self.stats["l1_hits"]
        l2_hits = self.stats["l2_hits"]
        total_hits = l1_hits + l2_hits
        
        return {
            **self.stats,
            "hit_rate": total_hits / total_requests * 100,
            "l1_hit_rate": l1_hits / total_requests * 100,
            "l2_hit_rate": l2_hits / total_requests * 100,
            "l1_cache_size": len(self.l1_cache) if self.l1_cache else 0
        }
    
    def clear_stats(self):
        """清除統計資料"""
        self.stats = {
            "l1_hits": 0,
            "l1_misses": 0,
            "l2_hits": 0,
            "l2_misses": 0,
            "total_requests": 0
        }


# 全域快取實例
_global_cache = None

def get_cache() -> MultiLayerCache:
    """獲取全域快取實例"""
    global _global_cache
    if _global_cache is None:
        config = CacheConfig(
            l1_enabled=True,
            l2_enabled=redis_manager.is_connected,
            l1_max_size=2000,       # 增加 L1 快取大小
            l1_ttl=300,             # L1 快取 5 分鐘
            l2_ttl=1800,            # L2 快取 30 分鐘
            use_compression=True
        )
        _global_cache = MultiLayerCache(config)
    return _global_cache


def cache_async(
    key_prefix: str,
    ttl: int = 300,
    l1_ttl: Optional[int] = None,
    l2_ttl: Optional[int] = None,
    use_args_in_key: bool = True,
    key_generator: Optional[Callable] = None
):
    """
    異步快取裝飾器
    支援多層快取架構
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache()
            
            # 生成快取鍵
            if key_generator:
                # 使用自定義鍵生成器
                cache_key = key_generator(*args, **kwargs)
            elif use_args_in_key:
                # 智慧處理參數，特別處理物件
                args_parts = []
                for arg in args:
                    if hasattr(arg, 'id'):  # 對於有 ID 屬性的物件 (如 Bot)
                        args_parts.append(f"id:{arg.id}")
                    else:
                        args_parts.append(str(arg)[:50])
                
                args_str = "_".join(args_parts)
                kwargs_str = "_".join(f"{k}:{str(v)[:50]}" for k, v in kwargs.items())
                cache_key = f"{key_prefix}:{func.__name__}:{args_str}:{kwargs_str}"
            else:
                # 只使用前綴和函數名
                cache_key = f"{key_prefix}:{func.__name__}"
                if args and hasattr(args[0], 'id'):
                    cache_key += f":{args[0].id}"
            
            # 嘗試從快取獲取
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 執行函數並快取結果
            result = await func(*args, **kwargs)
            
            # 設定快取
            await cache.set(
                cache_key, 
                result, 
                l1_ttl=l1_ttl or ttl,
                l2_ttl=l2_ttl or ttl * 3  # L2 快取時間較長
            )
            
            return result
        
        return wrapper
    return decorator


# 預熱機制
class CacheWarmer:
    """快取預熱器"""
    
    def __init__(self, cache: MultiLayerCache):
        self.cache = cache
        self.warmup_tasks = []
    
    def add_warmup_task(
        self, 
        key: str, 
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        interval: int = 3600  # 1小時重新預熱
    ):
        """添加預熱任務"""
        kwargs = kwargs or {}
        self.warmup_tasks.append({
            "key": key,
            "func": func,
            "args": args,
            "kwargs": kwargs,
            "interval": interval,
            "last_run": 0
        })
    
    async def run_warmup(self):
        """執行預熱任務"""
        current_time = time.time()
        
        for task in self.warmup_tasks:
            if current_time - task["last_run"] >= task["interval"]:
                try:
                    logger.info(f"執行快取預熱: {task['key']}")
                    result = await task["func"](*task["args"], **task["kwargs"])
                    await self.cache.set(task["key"], result)
                    task["last_run"] = current_time
                    logger.info(f"快取預熱完成: {task['key']}")
                except Exception as e:
                    logger.error(f"快取預熱失敗 {task['key']}: {e}")
    
    async def start_warmup_scheduler(self):
        """啟動預熱排程器"""
        while True:
            await self.run_warmup()
            await asyncio.sleep(300)  # 每5分鐘檢查一次


# 快取指標監控
class CacheMetrics:
    """快取指標收集器"""
    
    def __init__(self, cache: MultiLayerCache):
        self.cache = cache
        self.metrics_history = []
    
    async def collect_metrics(self):
        """收集快取指標"""
        stats = self.cache.get_stats()
        timestamp = datetime.now()
        
        metrics = {
            "timestamp": timestamp.isoformat(),
            "stats": stats,
            "redis_info": await self._get_redis_info()
        }
        
        self.metrics_history.append(metrics)
        
        # 保持最近100個指標記錄
        if len(self.metrics_history) > 100:
            self.metrics_history = self.metrics_history[-100:]
        
        return metrics
    
    async def _get_redis_info(self) -> Dict[str, Any]:
        """獲取 Redis 資訊"""
        try:
            client = redis_manager.get_client()
            if client:
                info = await client.info("memory")
                return {
                    "used_memory": info.get("used_memory", 0),
                    "used_memory_human": info.get("used_memory_human", "0B"),
                    "connected_clients": info.get("connected_clients", 0)
                }
        except Exception as e:
            logger.warning(f"獲取 Redis 資訊失敗: {e}")
        
        return {}
    
    def get_performance_report(self) -> Dict[str, Any]:
        """生成效能報告"""
        if not self.metrics_history:
            return {"error": "無可用指標數據"}
        
        latest = self.metrics_history[-1]
        stats = latest["stats"]
        
        return {
            "current_stats": stats,
            "recommendations": self._generate_recommendations(stats),
            "redis_status": latest.get("redis_info", {}),
            "metrics_count": len(self.metrics_history)
        }
    
    def _generate_recommendations(self, stats: Dict[str, Any]) -> List[str]:
        """生成效能建議"""
        recommendations = []
        
        hit_rate = stats.get("hit_rate", 0)
        if hit_rate < 50:
            recommendations.append("快取命中率低於50%，考慮增加快取時間或優化快取策略")
        
        l1_hit_rate = stats.get("l1_hit_rate", 0)
        if l1_hit_rate < 20:
            recommendations.append("L1快取命中率低，考慮增加記憶體快取大小")
        
        l1_cache_size = stats.get("l1_cache_size", 0)
        if l1_cache_size > 1800:  # 接近最大值 2000
            recommendations.append("L1快取接近容量上限，考慮增加最大大小")
        
        return recommendations