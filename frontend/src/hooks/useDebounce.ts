/**
 * useDebounce Hook - 防抖功能
 * 優化 API 請求，避免頻繁調用
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 防抖值 Hook
 * @param value 要防抖的值
 * @param delay 延遲時間（毫秒）
 * @returns 防抖後的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖回調 Hook
 * @param callback 要防抖的函數
 * @param delay 延遲時間（毫秒）
 * @returns 防抖後的函數
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 更新回調引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * 防抖 API 請求 Hook
 * @param apiCall API 請求函數
 * @param delay 防抖延遲時間
 * @returns { debouncedCall, cancel }
 */
export function useDebouncedApiCall<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const debouncedCall = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      // 取消之前的請求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 清除之前的定時器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      return new Promise((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            abortControllerRef.current = new AbortController();
            const result = await apiCall(...args);
            resolve(result);
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              reject(error);
            } else {
              resolve(null); // 請求被取消
            }
          }
        }, delay);
      });
    },
    [apiCall, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { debouncedCall, cancel };
}

/**
 * 防抖搜索 Hook
 * 專門用於搜索輸入防抖
 */
export function useDebouncedSearch(
  onSearch: (searchTerm: string) => void,
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  return { searchTerm, setSearchTerm };
}