"""
效能分析工具
用於測量和分析 RAG 檢索的各個階段耗時
"""
import time
import logging
from typing import Dict, List, Optional, Any, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """效能指標"""
    name: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def finish(self):
        """結束計時"""
        self.end_time = time.perf_counter()
        self.duration = self.end_time - self.start_time
        return self.duration


class PerformanceProfiler:
    """效能分析器"""
    
    def __init__(self, name: str = "default"):
        self.name = name
        self.metrics: List[PerformanceMetric] = []
        self.current_metric: Optional[PerformanceMetric] = None
        self._start_time = time.perf_counter()
        
    def start_metric(self, name: str, **metadata) -> PerformanceMetric:
        """開始一個新的效能指標"""
        metric = PerformanceMetric(
            name=name,
            start_time=time.perf_counter(),
            metadata=metadata
        )
        self.metrics.append(metric)
        self.current_metric = metric
        return metric
    
    def end_metric(self, metric: Optional[PerformanceMetric] = None):
        """結束效能指標"""
        if metric is None:
            metric = self.current_metric
        
        if metric and metric.end_time is None:
            duration = metric.finish()
            logger.debug(f"⏱️ {metric.name}: {duration*1000:.2f}ms")
            return duration
        return None
    
    @asynccontextmanager
    async def measure(self, name: str, **metadata):
        """上下文管理器，用於測量代碼塊的執行時間"""
        metric = self.start_metric(name, **metadata)
        try:
            yield metric
        finally:
            self.end_metric(metric)
    
    def get_summary(self) -> Dict[str, Any]:
        """獲取效能摘要"""
        total_time = time.perf_counter() - self._start_time
        
        summary = {
            'profiler_name': self.name,
            'total_time': total_time,
            'total_time_ms': total_time * 1000,
            'metrics': [],
            'breakdown': {}
        }
        
        for metric in self.metrics:
            if metric.duration is not None:
                metric_info = {
                    'name': metric.name,
                    'duration': metric.duration,
                    'duration_ms': metric.duration * 1000,
                    'percentage': (metric.duration / total_time * 100) if total_time > 0 else 0,
                    'metadata': metric.metadata
                }
                summary['metrics'].append(metric_info)
                summary['breakdown'][metric.name] = metric.duration * 1000
        
        return summary
    
    def print_summary(self):
        """打印效能摘要"""
        summary = self.get_summary()
        
        logger.info("=" * 80)
        logger.info(f"📊 效能分析報告: {self.name}")
        logger.info("=" * 80)
        logger.info(f"總耗時: {summary['total_time_ms']:.2f}ms")
        logger.info("-" * 80)
        
        for metric in summary['metrics']:
            logger.info(
                f"  {metric['name']:<40} {metric['duration_ms']:>8.2f}ms ({metric['percentage']:>5.1f}%)"
            )
            if metric['metadata']:
                for key, value in metric['metadata'].items():
                    logger.info(f"    └─ {key}: {value}")
        
        logger.info("=" * 80)
        
        return summary


# 全局效能分析器實例
_active_profilers: Dict[str, PerformanceProfiler] = {}


def get_profiler(name: str = "default") -> PerformanceProfiler:
    """獲取或創建效能分析器"""
    if name not in _active_profilers:
        _active_profilers[name] = PerformanceProfiler(name)
    return _active_profilers[name]


def clear_profiler(name: str = "default"):
    """清除效能分析器"""
    if name in _active_profilers:
        del _active_profilers[name]


def clear_all_profilers():
    """清除所有效能分析器"""
    _active_profilers.clear()


@asynccontextmanager
async def profile_async(name: str, profiler_name: str = "default", **metadata):
    """
    異步上下文管理器，用於測量異步代碼塊的執行時間
    
    使用範例:
    async with profile_async("embedding_generation", query_length=100):
        embedding = await generate_embedding(query)
    """
    profiler = get_profiler(profiler_name)
    async with profiler.measure(name, **metadata):
        yield


def profile_sync(name: str, profiler_name: str = "default", **metadata):
    """
    同步裝飾器，用於測量函數執行時間
    
    使用範例:
    @profile_sync("database_query")
    def query_database():
        return db.query()
    """
    def decorator(func: Callable):
        async def async_wrapper(*args, **kwargs):
            profiler = get_profiler(profiler_name)
            async with profiler.measure(name, **metadata):
                return await func(*args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            profiler = get_profiler(profiler_name)
            metric = profiler.start_metric(name, **metadata)
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                profiler.end_metric(metric)
        
        # 判斷是否為異步函數
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# 便利函數
async def profile_rag_query(
    query: str,
    bot_id: str,
    profiler_name: str = "rag_query"
) -> PerformanceProfiler:
    """
    為 RAG 查詢創建專用的效能分析器
    
    Returns:
        PerformanceProfiler 實例
    """
    profiler = PerformanceProfiler(profiler_name)
    profiler.start_metric("total", query=query[:50], bot_id=bot_id)
    return profiler

