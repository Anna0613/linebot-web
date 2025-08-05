import { useState, useCallback, useRef } from 'react';
import VisualEditorApi, { FlexMessageSummary } from '../services/visualEditorApi';

interface CacheEntry {
  data: FlexMessageSummary[];
  timestamp: number;
  loading: boolean;
}

// 全域緩存 - 跨組件共享
const globalCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分鐘緩存

/**
 * FlexMessage 緩存 Hook
 * 提供智能緩存機制，避免重複的 API 請求
 */
export const useFlexMessageCache = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingPromiseRef = useRef<Promise<FlexMessageSummary[]> | null>(null);

  const getFlexMessages = useCallback(async (): Promise<FlexMessageSummary[]> => {
    const cacheKey = 'flex-messages-summary';
    const cached = globalCache.get(cacheKey);
    const now = Date.now();

    // 檢查緩存是否有效
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // 如果正在載入，返回載入中的 Promise
      if (cached.loading && loadingPromiseRef.current) {
        return loadingPromiseRef.current;
      }
      // 返回緩存的數據
      if (!cached.loading) {
        return cached.data;
      }
    }

    // 如果已經有載入中的請求，返回該 Promise
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    // 創建新的載入 Promise
    const loadPromise = (async () => {
      setIsLoading(true);
      setError(null);

      // 設置載入中的緩存條目
      globalCache.set(cacheKey, {
        data: cached?.data || [],
        timestamp: now,
        loading: true
      });

      try {
        const messages = await VisualEditorApi.getUserFlexMessagesSummary();
        
        // 更新緩存
        globalCache.set(cacheKey, {
          data: messages,
          timestamp: now,
          loading: false
        });

        setIsLoading(false);
        return messages;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '載入 FlexMessage 失敗';
        setError(errorMessage);
        setIsLoading(false);
        
        // 清除載入中的緩存條目
        globalCache.delete(cacheKey);
        
        throw err;
      } finally {
        loadingPromiseRef.current = null;
      }
    })();

    loadingPromiseRef.current = loadPromise;
    return loadPromise;
  }, []);

  // 清除緩存
  const clearCache = useCallback(() => {
    globalCache.clear();
    loadingPromiseRef.current = null;
  }, []);

  // 獲取緩存狀態
  const getCacheStatus = useCallback(() => {
    const cacheKey = 'flex-messages-summary';
    const cached = globalCache.get(cacheKey);
    if (!cached) return { isCached: false, isExpired: true };

    const now = Date.now();
    const isExpired = (now - cached.timestamp) >= CACHE_DURATION;
    
    return {
      isCached: true,
      isExpired,
      timestamp: cached.timestamp,
      dataCount: cached.data.length
    };
  }, []);

  return {
    getFlexMessages,
    clearCache,
    getCacheStatus,
    isLoading,
    error
  };
};

export default useFlexMessageCache;