import { useEffect, useRef, useCallback } from 'react';

interface SmartPollingOptions {
  /** 基礎輪詢間隔（毫秒） */
  baseInterval: number;
  /** 最大輪詢間隔（毫秒） */
  maxInterval?: number;
  /** 當沒有活動時的間隔倍數 */
  backoffMultiplier?: number;
  /** 是否啟用智能退避 */
  enableBackoff?: boolean;
  /** 檢查是否需要輪詢的函數 */
  shouldPoll?: () => boolean;
  /** 檢查是否有活動的函數 */
  hasActivity?: () => boolean;
}

/**
 * 智能輪詢 Hook - 基於 GitHub 最佳實踐
 * 
 * 特點：
 * 1. 智能退避：當沒有活動時逐漸增加間隔
 * 2. 條件輪詢：只在需要時進行輪詢
 * 3. 活動檢測：根據活動狀態調整頻率
 * 4. 自動清理：組件卸載時自動停止
 */
export const useSmartPolling = (
  callback: () => void | Promise<void>,
  options: SmartPollingOptions
) => {
  const {
    baseInterval,
    maxInterval = baseInterval * 8,
    backoffMultiplier = 1.5,
    enableBackoff = true,
    shouldPoll = () => true,
    hasActivity = () => true
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalRef = useRef(baseInterval);
  const lastActivityRef = useRef(Date.now());

  const clearCurrentInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const executeCallback = useCallback(async () => {
    try {
      await callback();
      
      // 檢查是否有活動
      if (hasActivity()) {
        lastActivityRef.current = Date.now();
        // 有活動時重置為基礎間隔
        currentIntervalRef.current = baseInterval;
      } else if (enableBackoff) {
        // 沒有活動時增加間隔
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity > baseInterval * 2) {
          currentIntervalRef.current = Math.min(
            currentIntervalRef.current * backoffMultiplier,
            maxInterval
          );
        }
      }
    } catch (error) {
      console.error('Smart polling callback error:', error);
    }
  }, [callback, hasActivity, enableBackoff, baseInterval, maxInterval, backoffMultiplier]);

  const startPolling = useCallback(() => {
    clearCurrentInterval();
    
    const poll = () => {
      if (shouldPoll()) {
        executeCallback();
      }
      
      // 設置下一次輪詢
      intervalRef.current = setTimeout(poll, currentIntervalRef.current);
    };
    
    // 立即執行一次
    poll();
  }, [clearCurrentInterval, shouldPoll, executeCallback]);

  const stopPolling = useCallback(() => {
    clearCurrentInterval();
    currentIntervalRef.current = baseInterval;
  }, [clearCurrentInterval, baseInterval]);

  const resetInterval = useCallback(() => {
    currentIntervalRef.current = baseInterval;
    lastActivityRef.current = Date.now();
  }, [baseInterval]);

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);

  return {
    startPolling,
    stopPolling,
    resetInterval,
    getCurrentInterval: () => currentIntervalRef.current
  };
};

/**
 * 認證檢查專用的智能輪詢 Hook
 */
export const useAuthPolling = (
  checkAuth: () => void | Promise<void>,
  options: Partial<SmartPollingOptions> = {}
) => {
  return useSmartPolling(checkAuth, {
    baseInterval: 5 * 60 * 1000, // 5 分鐘基礎間隔
    maxInterval: 15 * 60 * 1000, // 15 分鐘最大間隔
    enableBackoff: true,
    ...options
  });
};

/**
 * WebSocket 狀態檢查專用的智能輪詢 Hook
 */
export const useWebSocketPolling = (
  checkConnection: () => void | Promise<void>,
  isConnected: () => boolean,
  options: Partial<SmartPollingOptions> = {}
) => {
  return useSmartPolling(checkConnection, {
    baseInterval: 10 * 1000, // 10 秒基礎間隔
    maxInterval: 60 * 1000,  // 60 秒最大間隔
    shouldPoll: () => !isConnected(), // 只在未連接時輪詢
    hasActivity: isConnected,
    enableBackoff: true,
    ...options
  });
};

/**
 * 任務狀態檢查專用的智能輪詢 Hook
 */
export const useJobPolling = (
  fetchJobs: () => void | Promise<void>,
  hasActiveJobs: () => boolean,
  options: Partial<SmartPollingOptions> = {}
) => {
  return useSmartPolling(fetchJobs, {
    baseInterval: 5 * 1000,  // 5 秒基礎間隔
    maxInterval: 30 * 1000, // 30 秒最大間隔
    shouldPoll: hasActiveJobs, // 只在有活動任務時輪詢
    hasActivity: hasActiveJobs,
    enableBackoff: true,
    ...options
  });
};
