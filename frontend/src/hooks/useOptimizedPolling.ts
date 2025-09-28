import { useEffect, useRef, useCallback } from 'react';
import { useAuthPollingManager } from '@/services/AuthPollingManager';
import { useSmartPolling, useAuthPolling, useWebSocketPolling, useJobPolling } from './useSmartPolling';

/**
 * 優化的認證檢查 Hook
 * 使用全域認證管理器，避免重複請求
 */
export const useOptimizedAuthCheck = () => {
  const { start, stop, addListener, getAuthStatus } = useAuthPollingManager();
  
  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return {
    getAuthStatus,
    addListener
  };
};

/**
 * 優化的 WebSocket 狀態檢查 Hook
 * 只在連接斷開時進行檢查
 */
export const useOptimizedWebSocketCheck = (
  checkConnection: () => void | Promise<void>,
  isConnected: () => boolean
) => {
  return useWebSocketPolling(checkConnection, isConnected, {
    baseInterval: 10 * 1000,  // 10 秒基礎間隔
    maxInterval: 60 * 1000,   // 60 秒最大間隔
    enableBackoff: true
  });
};

/**
 * 優化的任務狀態檢查 Hook
 * 根據任務狀態動態調整檢查頻率
 */
export const useOptimizedJobCheck = (
  fetchJobs: () => void | Promise<void>,
  hasActiveJobs: () => boolean
) => {
  return useJobPolling(fetchJobs, hasActiveJobs, {
    baseInterval: 5 * 1000,   // 5 秒基礎間隔
    maxInterval: 30 * 1000,   // 30 秒最大間隔
    enableBackoff: true
  });
};

/**
 * 優化的活動刷新 Hook
 * 結合 WebSocket 狀態，只在必要時使用 HTTP 輪詢
 */
export const useOptimizedActivityRefresh = (
  onRefresh: () => void | Promise<void>,
  isWebSocketConnected: () => boolean,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
) => {
  const {
    autoRefresh = false,
    refreshInterval = 60000 // 60 秒預設間隔
  } = options;

  return useSmartPolling(onRefresh, {
    baseInterval: refreshInterval,
    maxInterval: refreshInterval * 4,
    shouldPoll: () => autoRefresh && !isWebSocketConnected(),
    hasActivity: () => true,
    enableBackoff: true
  });
};

/**
 * 條件輪詢 Hook
 * 只在滿足條件時進行輪詢
 */
export const useConditionalPolling = (
  callback: () => void | Promise<void>,
  condition: () => boolean,
  interval: number = 30000
) => {
  return useSmartPolling(callback, {
    baseInterval: interval,
    shouldPoll: condition,
    enableBackoff: false
  });
};

/**
 * 頁面可見性感知的輪詢 Hook
 * 當頁面不可見時停止輪詢，可見時恢復
 */
export const useVisibilityAwarePolling = (
  callback: () => void | Promise<void>,
  interval: number = 30000
) => {
  const isVisible = useRef(true);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return useSmartPolling(callback, {
    baseInterval: interval,
    shouldPoll: () => isVisible.current,
    enableBackoff: true
  });
};

/**
 * 網路狀態感知的輪詢 Hook
 * 當網路斷開時停止輪詢，恢復時立即執行
 */
export const useNetworkAwarePolling = (
  callback: () => void | Promise<void>,
  interval: number = 30000
) => {
  const isOnline = useRef(navigator.onLine);
  const { resetInterval, ...polling } = useSmartPolling(callback, {
    baseInterval: interval,
    shouldPoll: () => isOnline.current,
    enableBackoff: true
  });
  
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      resetInterval();
    };
    
    const handleOffline = () => {
      isOnline.current = false;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [resetInterval]);

  return polling;
};

/**
 * 用戶活動感知的輪詢 Hook
 * 根據用戶活動調整輪詢頻率
 */
export const useUserActivityAwarePolling = (
  callback: () => void | Promise<void>,
  interval: number = 30000
) => {
  const lastActivity = useRef(Date.now());
  const inactiveThreshold = 5 * 60 * 1000; // 5 分鐘無活動閾值
  
  useEffect(() => {
    const updateActivity = () => {
      lastActivity.current = Date.now();
    };
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  return useSmartPolling(callback, {
    baseInterval: interval,
    maxInterval: interval * 4,
    hasActivity: () => (Date.now() - lastActivity.current) < inactiveThreshold,
    enableBackoff: true
  });
};
