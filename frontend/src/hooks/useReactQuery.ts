/**
 * React Query 設定和自訂 hooks
 * 提供高效能的資料管理和快取
 */
import { QueryClient } from '@tanstack/react-query';

// 創建 Query Client 實例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 預設快取時間為 5 分鐘
      staleTime: 5 * 60 * 1000,
      // 在 5 分鐘內被視為新鮮，避免不必要的重新獲取
      gcTime: 10 * 60 * 1000, // 10 分鐘的垃圾收集時間
      // 自動重試失敗的請求
      retry: (failureCount, error) => {
        // 如果是認證錯誤，不重試
        const status = (error as Error & { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403) {
          return false;
        }
        // 最多重試 2 次
        return failureCount < 2;
      },
      // 重試延遲
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 在視窗重新聚焦時自動重新獲取
      refetchOnWindowFocus: false,
      // 在重新連線時自動重新獲取
      refetchOnReconnect: true,
    },
    mutations: {
      // 突變失敗時自動重試一次
      retry: 1,
    },
  },
});

export const queryKeys = { bots: ["bots"] as const };
