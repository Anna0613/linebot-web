/**
 * Bot 管理相關的 React Query hooks
 * 提供高效能的資料獲取和狀態管理
 */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/services/UnifiedApiClient';
import { queryKeys, queryClient } from '@/hooks/useReactQuery';
import { useToast } from '@/hooks/use-toast';

// Bot 列表
export const useBots = () => {
  return useQuery({
    queryKey: queryKeys.bots,
    queryFn: async () => {
      const response = await apiClient.getBots();
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
};

// 創建 Bot mutation
export const useCreateBot = () => {

  const { toast } = useToast();

  return useMutation({
    mutationFn: async (botData: { name: string, channel_token: string, channel_secret: string }) => {
      const result = await apiClient.createBot(botData);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: (data) => {
      // 使快取失效，重新獲取 Bot 列表
      void queryClient.invalidateQueries({ queryKey: queryKeys.bots });
      
      toast({
        title: "創建成功",
        description: "Bot 已成功創建",
      });
      
      return data;
    },
    onError: (error: Error) => {
      // 錯誤處理交由 useBotManagement 統一處理
      throw error;
    }
  });
};

// 主要的 Bot 管理 hook，提供統一的介面
export const useBotManagement = () => {
  const { data: bots, isLoading, error, refetch } = useBots();
  const createBotMutation = useCreateBot();
  const [customError, setCustomError] = useState<string | null>(null);

  return {
    bots: bots?.data || [],
    isLoading: isLoading || createBotMutation.isPending,
    error: customError || error?.message || createBotMutation.error?.message,
    fetchBots: refetch,
    createBot: async (botData: { name: string, channel_token: string, channel_secret: string }) => {
      try {
        setCustomError(null);
        const result = await createBotMutation.mutateAsync(botData);
        return result.data;
      } catch (error: unknown) {
        // 提取錯誤訊息
        const errorMessage = (error as Error)?.message || (error as { error?: string })?.error || '創建 Bot 失敗';
        setCustomError(errorMessage);
        throw error;
      }
    },
    setError: setCustomError,
    clearError: () => setCustomError(null),
  };
};
