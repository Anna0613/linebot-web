"""
重試工具模組
提供異步重試裝飾器和相關工具函數，用於提升 API 調用的穩定性。
"""
import asyncio
import logging
import random
from functools import wraps
from typing import Type, Tuple, Callable, Any, Optional, Union

logger = logging.getLogger(__name__)


class RetryError(Exception):
    """重試失敗後的最終異常"""
    def __init__(self, message: str, last_exception: Exception, attempts: int):
        super().__init__(message)
        self.last_exception = last_exception
        self.attempts = attempts


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[int, Exception], None]] = None
):
    """
    異步重試裝飾器
    
    Args:
        max_attempts: 最大重試次數
        delay: 初始延遲時間（秒）
        backoff: 退避倍數
        max_delay: 最大延遲時間（秒）
        jitter: 是否添加隨機抖動
        exceptions: 需要重試的異常類型
        on_retry: 重試時的回調函數
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    # 如果是最後一次嘗試，直接拋出異常
                    if attempt == max_attempts - 1:
                        break
                    
                    # 計算延遲時間
                    wait_time = min(delay * (backoff ** attempt), max_delay)
                    
                    # 添加隨機抖動
                    if jitter:
                        wait_time *= (0.5 + random.random() * 0.5)
                    
                    # 記錄重試信息
                    logger.warning(
                        f"函數 {func.__name__} 第 {attempt + 1} 次嘗試失敗: {e}. "
                        f"將在 {wait_time:.2f} 秒後重試..."
                    )
                    
                    # 調用重試回調
                    if on_retry:
                        try:
                            on_retry(attempt + 1, e)
                        except Exception as callback_error:
                            logger.error(f"重試回調函數執行失敗: {callback_error}")
                    
                    # 等待後重試
                    await asyncio.sleep(wait_time)
            
            # 所有重試都失敗，拋出最終異常
            error_msg = f"函數 {func.__name__} 在 {max_attempts} 次嘗試後仍然失敗"
            raise RetryError(error_msg, last_exception, max_attempts)
        
        return wrapper
    return decorator


def exponential_backoff(
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    multiplier: float = 2.0,
    jitter: bool = True
) -> Callable[[int], float]:
    """
    指數退避延遲計算器
    
    Args:
        base_delay: 基礎延遲時間
        max_delay: 最大延遲時間
        multiplier: 倍數
        jitter: 是否添加隨機抖動
    
    Returns:
        延遲計算函數
    """
    def calculate_delay(attempt: int) -> float:
        delay = min(base_delay * (multiplier ** attempt), max_delay)
        if jitter:
            delay *= (0.5 + random.random() * 0.5)
        return delay
    
    return calculate_delay


class CircuitBreaker:
    """
    熔斷器模式實作
    當錯誤率過高時自動熔斷，避免持續的失敗調用
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: Type[Exception] = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                if self._should_attempt_reset():
                    self.state = "HALF_OPEN"
                else:
                    raise Exception("熔斷器開啟，拒絕調用")
            
            try:
                result = await func(*args, **kwargs)
                self._on_success()
                return result
            except self.expected_exception as e:
                self._on_failure()
                raise e
        
        return wrapper
    
    def _should_attempt_reset(self) -> bool:
        """檢查是否應該嘗試重置熔斷器"""
        if self.last_failure_time is None:
            return True
        
        import time
        return time.time() - self.last_failure_time >= self.recovery_timeout
    
    def _on_success(self):
        """成功時重置熔斷器"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """失敗時更新熔斷器狀態"""
        import time
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"熔斷器開啟，失敗次數: {self.failure_count}")


# 常用的重試配置
API_RETRY_CONFIG = {
    "max_attempts": 5,
    "delay": 1.0,
    "backoff": 2.0,
    "max_delay": 30.0,
    "jitter": True
}

DATABASE_RETRY_CONFIG = {
    "max_attempts": 3,
    "delay": 0.5,
    "backoff": 1.5,
    "max_delay": 10.0,
    "jitter": False
}

NETWORK_RETRY_CONFIG = {
    "max_attempts": 4,
    "delay": 2.0,
    "backoff": 2.0,
    "max_delay": 60.0,
    "jitter": True
}
