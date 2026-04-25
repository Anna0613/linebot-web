"""
自適應並發管理器
根據系統 CPU 和記憶體使用率動態調整並發數
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import psutil

logger = logging.getLogger(__name__)


class LoadLevel(Enum):
    """系統負載等級"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SystemMetrics:
    """系統指標"""
    cpu_percent: float
    memory_percent: float
    load_average: float
    timestamp: float
    load_level: LoadLevel


class AdaptiveConcurrencyManager:
    """
    自適應並發管理器
    
    特點：
    - 根據 CPU 和記憶體使用率動態調整並發數
    - 支援負載等級分類和對應的並發策略
    - 提供並發數調整的歷史記錄和統計
    - 支援手動覆蓋和緊急模式
    """
    
    def __init__(
        self,
        base_concurrency: int = 8,
        min_concurrency: int = 2,
        max_concurrency: int = 15,
        cpu_threshold_high: float = 0.8,
        cpu_threshold_critical: float = 0.9,
        memory_threshold_high: float = 0.8,
        memory_threshold_critical: float = 0.9,
        adjustment_interval: int = 30  # 調整間隔（秒）
    ):
        """
        初始化自適應並發管理器
        
        Args:
            base_concurrency: 基礎並發數
            min_concurrency: 最小並發數
            max_concurrency: 最大並發數
            cpu_threshold_high: CPU 高負載閾值
            cpu_threshold_critical: CPU 危險負載閾值
            memory_threshold_high: 記憶體高負載閾值
            memory_threshold_critical: 記憶體危險負載閾值
            adjustment_interval: 調整間隔（秒）
        """
        self.base_concurrency = base_concurrency
        self.min_concurrency = min_concurrency
        self.max_concurrency = max_concurrency
        self.cpu_threshold_high = cpu_threshold_high
        self.cpu_threshold_critical = cpu_threshold_critical
        self.memory_threshold_high = memory_threshold_high
        self.memory_threshold_critical = memory_threshold_critical
        self.adjustment_interval = adjustment_interval
        
        # 狀態追蹤
        self.current_concurrency = base_concurrency
        self.last_adjustment_time = 0
        self.adjustment_history: list[Dict[str, Any]] = []
        self.metrics_history: list[SystemMetrics] = []
        self.manual_override: Optional[int] = None
        self.emergency_mode = False
        
        # 統計資訊
        self.total_adjustments = 0
        self.performance_stats = {
            'avg_cpu': 0.0,
            'avg_memory': 0.0,
            'peak_cpu': 0.0,
            'peak_memory': 0.0
        }
        
        logger.info(
            f"AdaptiveConcurrencyManager 初始化完成: "
            f"基礎並發={base_concurrency}, 範圍=[{min_concurrency}, {max_concurrency}]"
        )
    
    async def get_system_metrics(self) -> SystemMetrics:
        """
        獲取系統指標
        
        Returns:
            SystemMetrics: 系統指標物件
        """
        try:
            # 獲取 CPU 使用率（1秒間隔）
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # 獲取記憶體使用率
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # 獲取負載平均值（僅在 Unix 系統上可用）
            try:
                load_avg = psutil.getloadavg()[0]  # 1分鐘負載平均
            except (AttributeError, OSError):
                # Windows 系統或其他不支援的系統
                load_avg = cpu_percent / 100.0
            
            # 計算負載等級
            load_level = self._calculate_load_level(cpu_percent, memory_percent)
            
            metrics = SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                load_average=load_avg,
                timestamp=time.time(),
                load_level=load_level
            )
            
            # 更新統計資訊
            self._update_performance_stats(metrics)
            
            # 保存歷史記錄（最多保留 100 條）
            self.metrics_history.append(metrics)
            if len(self.metrics_history) > 100:
                self.metrics_history.pop(0)
            
            return metrics
            
        except Exception as e:
            logger.error(f"獲取系統指標失敗: {e}")
            # 返回預設值
            return SystemMetrics(
                cpu_percent=50.0,
                memory_percent=50.0,
                load_average=0.5,
                timestamp=time.time(),
                load_level=LoadLevel.NORMAL
            )
    
    def _calculate_load_level(self, cpu_percent: float, memory_percent: float) -> LoadLevel:
        """
        計算系統負載等級
        
        Args:
            cpu_percent: CPU 使用率
            memory_percent: 記憶體使用率
            
        Returns:
            LoadLevel: 負載等級
        """
        cpu_ratio = cpu_percent / 100.0
        memory_ratio = memory_percent / 100.0
        
        # 取 CPU 和記憶體使用率的最大值作為整體負載指標
        max_usage = max(cpu_ratio, memory_ratio)
        
        if max_usage >= self.cpu_threshold_critical or max_usage >= self.memory_threshold_critical:
            return LoadLevel.CRITICAL
        elif max_usage >= self.cpu_threshold_high or max_usage >= self.memory_threshold_high:
            return LoadLevel.HIGH
        elif max_usage <= 0.3:
            return LoadLevel.LOW
        else:
            return LoadLevel.NORMAL
    
    def _update_performance_stats(self, metrics: SystemMetrics):
        """更新效能統計資訊"""
        # 更新平均值（簡單移動平均）
        alpha = 0.1  # 平滑係數
        self.performance_stats['avg_cpu'] = (
            alpha * metrics.cpu_percent + 
            (1 - alpha) * self.performance_stats['avg_cpu']
        )
        self.performance_stats['avg_memory'] = (
            alpha * metrics.memory_percent + 
            (1 - alpha) * self.performance_stats['avg_memory']
        )
        
        # 更新峰值
        self.performance_stats['peak_cpu'] = max(
            self.performance_stats['peak_cpu'], 
            metrics.cpu_percent
        )
        self.performance_stats['peak_memory'] = max(
            self.performance_stats['peak_memory'], 
            metrics.memory_percent
        )
    
    async def get_optimal_concurrency(self) -> int:
        """
        獲取最佳並發數
        
        Returns:
            int: 建議的並發數
        """
        # 檢查手動覆蓋
        if self.manual_override is not None:
            logger.debug(f"使用手動覆蓋並發數: {self.manual_override}")
            return self.manual_override
        
        # 檢查緊急模式
        if self.emergency_mode:
            logger.warning("緊急模式啟用，使用最小並發數")
            return self.min_concurrency
        
        # 獲取系統指標
        metrics = await self.get_system_metrics()
        
        # 檢查是否需要調整
        current_time = time.time()
        if current_time - self.last_adjustment_time < self.adjustment_interval:
            return self.current_concurrency
        
        # 根據負載等級計算並發數
        new_concurrency = self._calculate_concurrency_by_load(metrics)
        
        # 記錄調整
        if new_concurrency != self.current_concurrency:
            self._record_adjustment(metrics, self.current_concurrency, new_concurrency)
            self.current_concurrency = new_concurrency
            self.last_adjustment_time = current_time
            self.total_adjustments += 1
            
            logger.info(
                f"並發數調整: {self.current_concurrency} -> {new_concurrency} "
                f"(CPU: {metrics.cpu_percent:.1f}%, 記憶體: {metrics.memory_percent:.1f}%, "
                f"負載等級: {metrics.load_level.value})"
            )
        
        return new_concurrency
    
    def _calculate_concurrency_by_load(self, metrics: SystemMetrics) -> int:
        """
        根據負載等級計算並發數
        
        Args:
            metrics: 系統指標
            
        Returns:
            int: 建議的並發數
        """
        if metrics.load_level == LoadLevel.CRITICAL:
            # 危險負載：使用最小並發數
            return self.min_concurrency
        elif metrics.load_level == LoadLevel.HIGH:
            # 高負載：減少並發數
            return max(self.min_concurrency, self.base_concurrency // 2)
        elif metrics.load_level == LoadLevel.LOW:
            # 低負載：增加並發數
            return min(self.max_concurrency, self.base_concurrency * 2)
        else:
            # 正常負載：使用基礎並發數
            return self.base_concurrency
    
    def _record_adjustment(
        self, 
        metrics: SystemMetrics, 
        old_concurrency: int, 
        new_concurrency: int
    ):
        """記錄並發數調整"""
        adjustment_record = {
            'timestamp': metrics.timestamp,
            'cpu_percent': metrics.cpu_percent,
            'memory_percent': metrics.memory_percent,
            'load_level': metrics.load_level.value,
            'old_concurrency': old_concurrency,
            'new_concurrency': new_concurrency,
            'reason': f"負載等級: {metrics.load_level.value}"
        }
        
        self.adjustment_history.append(adjustment_record)
        
        # 保留最近 50 條調整記錄
        if len(self.adjustment_history) > 50:
            self.adjustment_history.pop(0)
    
    def set_manual_override(self, concurrency: Optional[int]):
        """
        設置手動覆蓋並發數
        
        Args:
            concurrency: 並發數，None 表示取消覆蓋
        """
        if concurrency is not None:
            concurrency = max(self.min_concurrency, min(self.max_concurrency, concurrency))
        
        self.manual_override = concurrency
        logger.info(f"手動覆蓋並發數設置為: {concurrency}")
    
    def set_emergency_mode(self, enabled: bool):
        """
        設置緊急模式
        
        Args:
            enabled: 是否啟用緊急模式
        """
        self.emergency_mode = enabled
        logger.warning(f"緊急模式 {'啟用' if enabled else '停用'}")
    
    def get_status(self) -> Dict[str, Any]:
        """
        獲取管理器狀態
        
        Returns:
            dict: 狀態資訊
        """
        latest_metrics = self.metrics_history[-1] if self.metrics_history else None
        
        return {
            'current_concurrency': self.current_concurrency,
            'base_concurrency': self.base_concurrency,
            'min_concurrency': self.min_concurrency,
            'max_concurrency': self.max_concurrency,
            'manual_override': self.manual_override,
            'emergency_mode': self.emergency_mode,
            'total_adjustments': self.total_adjustments,
            'latest_metrics': {
                'cpu_percent': latest_metrics.cpu_percent if latest_metrics else 0,
                'memory_percent': latest_metrics.memory_percent if latest_metrics else 0,
                'load_level': latest_metrics.load_level.value if latest_metrics else 'unknown',
                'timestamp': latest_metrics.timestamp if latest_metrics else 0
            },
            'performance_stats': self.performance_stats,
            'adjustment_history_count': len(self.adjustment_history)
        }


# 全域實例
_concurrency_manager = None

def get_adaptive_concurrency_manager() -> AdaptiveConcurrencyManager:
    """獲取全域自適應並發管理器實例"""
    global _concurrency_manager
    if _concurrency_manager is None:
        _concurrency_manager = AdaptiveConcurrencyManager()
    return _concurrency_manager
