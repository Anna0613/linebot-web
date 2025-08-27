"""
背景任務處理系統
實現任務佇列、快取預熱和效能監控
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import json
from concurrent.futures import ThreadPoolExecutor

from app.services.cache_service import get_cache, CacheWarmer, CacheMetrics
from app.config.redis_config import redis_manager

logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    """任務優先級"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class BackgroundTask:
    """背景任務定義"""
    id: str
    name: str
    func: Callable
    args: tuple = ()
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    delay: int = 0  # 延遲執行時間 (秒)
    max_retries: int = 3
    retry_count: int = 0
    scheduled_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def __lt__(self, other):
        """為了支援 PriorityQueue 排序"""
        if not isinstance(other, BackgroundTask):
            return NotImplemented
        # 按建立時間排序，作為次要比較條件
        return self.created_at < other.created_at

class TaskStatus(Enum):
    """任務狀態"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"

class BackgroundTaskManager:
    """背景任務管理器"""
    
    def __init__(self, max_concurrent_tasks: int = 10):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.task_queue = asyncio.PriorityQueue()
        self.running_tasks = {}
        self.task_history = {}
        self.thread_pool = ThreadPoolExecutor(max_workers=5)
        self.is_running = False
        self._worker_tasks = []
    
    async def add_task(
        self,
        task_id: str,
        name: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        delay: int = 0,
        max_retries: int = 3
    ) -> str:
        """添加背景任務"""
        kwargs = kwargs or {}
        
        scheduled_at = None
        if delay > 0:
            scheduled_at = datetime.now() + timedelta(seconds=delay)
        
        task = BackgroundTask(
            id=task_id,
            name=name,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            delay=delay,
            max_retries=max_retries,
            scheduled_at=scheduled_at
        )
        
        # 使用負優先級讓高優先級排在前面
        priority_value = -priority.value
        await self.task_queue.put((priority_value, task.created_at, task))
        
        logger.info(f"背景任務已添加: {task_id} - {name}")
        return task_id
    
    async def start(self):
        """啟動任務管理器"""
        if self.is_running:
            return
        
        self.is_running = True
        logger.info(f"背景任務管理器啟動，最大並行任務數: {self.max_concurrent_tasks}")
        
        # 啟動工作線程
        for i in range(self.max_concurrent_tasks):
            worker_task = asyncio.create_task(self._worker(f"worker-{i}"))
            self._worker_tasks.append(worker_task)
        
        # 啟動監控任務
        monitor_task = asyncio.create_task(self._monitor())
        self._worker_tasks.append(monitor_task)
    
    async def stop(self):
        """停止任務管理器"""
        self.is_running = False
        logger.info("正在停止背景任務管理器...")
        
        # 等待所有工作線程完成
        for task in self._worker_tasks:
            task.cancel()
        
        await asyncio.gather(*self._worker_tasks, return_exceptions=True)
        self.thread_pool.shutdown(wait=True)
        logger.info("背景任務管理器已停止")
    
    async def _worker(self, worker_id: str):
        """工作線程"""
        logger.info(f"工作線程啟動: {worker_id}")
        
        while self.is_running:
            try:
                # 等待任務，超時 1 秒
                try:
                    priority, created_at, task = await asyncio.wait_for(
                        self.task_queue.get(), timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # 檢查是否需要延遲執行
                if task.scheduled_at and datetime.now() < task.scheduled_at:
                    # 重新放回佇列
                    await self.task_queue.put((priority, created_at, task))
                    await asyncio.sleep(1)
                    continue
                
                # 執行任務
                self.running_tasks[task.id] = {
                    "task": task,
                    "worker_id": worker_id,
                    "started_at": datetime.now(),
                    "status": TaskStatus.RUNNING
                }
                
                logger.info(f"[{worker_id}] 執行任務: {task.name} (ID: {task.id})")
                
                try:
                    # 執行任務函數
                    if asyncio.iscoroutinefunction(task.func):
                        result = await task.func(*task.args, **task.kwargs)
                    else:
                        # 在線程池中執行同步函數
                        loop = asyncio.get_event_loop()
                        result = await loop.run_in_executor(
                            self.thread_pool, 
                            lambda: task.func(*task.args, **task.kwargs)
                        )
                    
                    # 任務完成
                    self._mark_task_completed(task.id, result)
                    logger.info(f"[{worker_id}] 任務完成: {task.name}")
                
                except Exception as e:
                    logger.error(f"[{worker_id}] 任務執行失敗: {task.name} - {e}")
                    await self._handle_task_failure(task, e)
                
                finally:
                    # 從運行列表中移除
                    self.running_tasks.pop(task.id, None)
                    self.task_queue.task_done()
            
            except Exception as e:
                logger.error(f"工作線程 {worker_id} 錯誤: {e}")
                await asyncio.sleep(1)
    
    async def _handle_task_failure(self, task: BackgroundTask, error: Exception):
        """處理任務失敗"""
        task.retry_count += 1
        
        if task.retry_count <= task.max_retries:
            logger.info(f"任務重試 ({task.retry_count}/{task.max_retries}): {task.name}")
            
            # 增加延遲時間 (指數退避)
            delay = 2 ** task.retry_count
            task.scheduled_at = datetime.now() + timedelta(seconds=delay)
            
            # 重新加入佇列
            priority_value = -task.priority.value
            await self.task_queue.put((priority_value, task.created_at, task))
            
            self.task_history[task.id] = {
                "task": task,
                "status": TaskStatus.RETRYING,
                "error": str(error),
                "completed_at": datetime.now()
            }
        else:
            # 超過重試次數，標記為失敗
            self._mark_task_failed(task.id, error)
    
    def _mark_task_completed(self, task_id: str, result: Any):
        """標記任務完成"""
        if task_id in self.running_tasks:
            task_info = self.running_tasks[task_id]
            self.task_history[task_id] = {
                "task": task_info["task"],
                "status": TaskStatus.COMPLETED,
                "result": result,
                "completed_at": datetime.now(),
                "duration": (datetime.now() - task_info["started_at"]).total_seconds()
            }
    
    def _mark_task_failed(self, task_id: str, error: Exception):
        """標記任務失敗"""
        if task_id in self.running_tasks:
            task_info = self.running_tasks[task_id]
            self.task_history[task_id] = {
                "task": task_info["task"],
                "status": TaskStatus.FAILED,
                "error": str(error),
                "completed_at": datetime.now(),
                "duration": (datetime.now() - task_info["started_at"]).total_seconds()
            }
        
        logger.error(f"任務最終失敗: {task_id} - {error}")
    
    async def _monitor(self):
        """監控任務狀態"""
        while self.is_running:
            try:
                # 清理過期的歷史記錄 (保留24小時)
                cutoff_time = datetime.now() - timedelta(hours=24)
                expired_tasks = [
                    task_id for task_id, task_info in self.task_history.items()
                    if task_info.get("completed_at", datetime.now()) < cutoff_time
                ]
                
                for task_id in expired_tasks:
                    del self.task_history[task_id]
                
                if expired_tasks:
                    logger.info(f"清理了 {len(expired_tasks)} 個過期任務記錄")
                
                await asyncio.sleep(3600)  # 每小時清理一次
                
            except Exception as e:
                logger.error(f"任務監控錯誤: {e}")
                await asyncio.sleep(60)
    
    def get_status(self) -> Dict[str, Any]:
        """獲取任務狀態"""
        return {
            "is_running": self.is_running,
            "queue_size": self.task_queue.qsize(),
            "running_tasks": len(self.running_tasks),
            "max_concurrent_tasks": self.max_concurrent_tasks,
            "history_count": len(self.task_history),
            "running_task_details": {
                task_id: {
                    "name": info["task"].name,
                    "worker_id": info["worker_id"],
                    "started_at": info["started_at"].isoformat(),
                    "duration": (datetime.now() - info["started_at"]).total_seconds()
                }
                for task_id, info in self.running_tasks.items()
            }
        }


# 全域任務管理器實例
_task_manager = None

def get_task_manager() -> BackgroundTaskManager:
    """獲取全域任務管理器"""
    global _task_manager
    if _task_manager is None:
        _task_manager = BackgroundTaskManager(max_concurrent_tasks=8)
    return _task_manager


class PerformanceOptimizer:
    """效能優化器"""
    
    def __init__(self, cache_manager=None, task_manager=None):
        self.cache_manager = cache_manager or get_cache()
        self.task_manager = task_manager or get_task_manager()
        self.cache_warmer = CacheWarmer(self.cache_manager)
        self.cache_metrics = CacheMetrics(self.cache_manager)
        
    async def setup_cache_warming(self):
        """設置快取預熱任務"""
        logger.info("設置快取預熱任務")
        
        # 添加常用快取預熱任務
        await self.task_manager.add_task(
            "cache_warmup_scheduler",
            "快取預熱排程器",
            self.cache_warmer.start_warmup_scheduler,
            priority=TaskPriority.LOW
        )
        
        # 添加指標收集任務
        await self.task_manager.add_task(
            "metrics_collector",
            "快取指標收集器",
            self._metrics_collector,
            priority=TaskPriority.LOW
        )
    
    async def _metrics_collector(self):
        """指標收集任務"""
        while True:
            try:
                await self.cache_metrics.collect_metrics()
                await asyncio.sleep(300)  # 每5分鐘收集一次
            except Exception as e:
                logger.error(f"指標收集失敗: {e}")
                await asyncio.sleep(60)
    
    async def optimize_database_queries(self):
        """優化資料庫查詢"""
        # 這裡可以添加資料庫查詢優化邏輯
        pass
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """生成優化報告"""
        cache_report = self.cache_metrics.get_performance_report()
        task_status = self.task_manager.get_status()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cache_performance": cache_report,
            "task_manager_status": task_status,
            "recommendations": self._generate_optimization_recommendations()
        }
    
    def _generate_optimization_recommendations(self) -> List[str]:
        """生成優化建議"""
        recommendations = []
        
        # 基於快取效能的建議
        cache_stats = self.cache_metrics.get_performance_report()
        if cache_stats.get("recommendations"):
            recommendations.extend(cache_stats["recommendations"])
        
        # 基於任務管理器的建議
        task_status = self.task_manager.get_status()
        queue_size = task_status.get("queue_size", 0)
        
        if queue_size > 50:
            recommendations.append("任務佇列積壓過多，考慮增加並行工作線程")
        
        if len(task_status.get("running_task_details", {})) == task_status.get("max_concurrent_tasks", 0):
            recommendations.append("所有工作線程都在忙碌，考慮增加最大並行任務數")
        
        return recommendations


# 預定義的常用背景任務

async def warm_bot_dashboard_cache(bot_id: str, user_id: str):
    """預熱 Bot 儀表板快取"""
    try:
        from app.api.api_v1.bot_dashboard import _get_analytics_data
        from app.database import SessionLocal
        
        logger.info(f"預熱 Bot {bot_id} 儀表板快取")
        
        db = SessionLocal()
        try:
            # 預熱不同時間週期的分析資料
            periods = ["day", "week", "month"]
            for period in periods:
                await _get_analytics_data(bot_id, period, db)
                
        finally:
            db.close()
            
        logger.info(f"Bot {bot_id} 儀表板快取預熱完成")
        
    except Exception as e:
        logger.error(f"儀表板快取預熱失敗 {bot_id}: {e}")

async def cleanup_expired_cache():
    """清理過期快取"""
    try:
        cache = get_cache()
        # L1 快取會自動清理，這裡主要清理 L2 快取
        logger.info("執行快取清理任務")
        
        # 這裡可以添加更多清理邏輯
        
        logger.info("快取清理任務完成")
    except Exception as e:
        logger.error(f"快取清理失敗: {e}")

async def generate_performance_report():
    """生成效能報告"""
    try:
        optimizer = PerformanceOptimizer()
        report = optimizer.get_optimization_report()
        
        # 這裡可以將報告儲存到檔案或發送通知
        logger.info("效能報告生成完成")
        logger.debug(f"效能報告: {json.dumps(report, indent=2, ensure_ascii=False)}")
        
    except Exception as e:
        logger.error(f"效能報告生成失敗: {e}")