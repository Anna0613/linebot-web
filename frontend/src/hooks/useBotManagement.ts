/**
 * Bot 管理相關的 React Query hooks
 * 提供高效能的資料獲取和狀態管理
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/UnifiedApiClient';
import { queryKeys, invalidateQueries, optimisticUpdates, batchCacheUpdate } from './useReactQuery';
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

// 單一 Bot 儀表板資料 (複合端點)
export const useBotDashboard = (
  botId: string | null,
  options?: {
    includeAnalytics?: boolean;
    includeLogic?: boolean;
    includeWebhook?: boolean;
    period?: 'day' | 'week' | 'month';
    enabled?: boolean;
  }
) => {
  const { enabled = true, ...queryOptions } = options || {};
  
  return useQuery({
    queryKey: [...queryKeys.botDashboard(botId || ''), queryOptions],
    queryFn: async () => {
      if (!botId) throw new Error('Bot ID is required');
      
      const response = await apiClient.getBotDashboard(botId, queryOptions);
      
      // 批次更新相關快取
      if (response.data) {
        batchCacheUpdate.updateDashboardData(botId, response.data);
      }
      
      return response;
    },
    enabled: enabled && !!botId,
    staleTime: 3 * 60 * 1000, // 3 分鐘
  });
};

// 輕量版儀表板資料 (用於快速載入)
export const useBotDashboardLight = (botId: string | null, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.botDashboardLight(botId || ''),
    queryFn: async () => {
      if (!botId) throw new Error('Bot ID is required');
      return await apiClient.getBotDashboardLight(botId);
    },
    enabled: enabled && !!botId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
  });
};

// 邏輯模板
export const useLogicTemplates = (botId: string | null, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.logicTemplates(botId || ''),
    queryFn: async () => {
      if (!botId) throw new Error('Bot ID is required');
      return await apiClient.getBotLogicTemplates(botId);
    },
    enabled: enabled && !!botId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
};

// Webhook 狀態
export const useWebhookStatus = (botId: string | null, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.webhookStatus(botId || ''),
    queryFn: async () => {
      if (!botId) throw new Error('Bot ID is required');
      return await apiClient.getWebhookStatus(botId);
    },
    enabled: enabled && !!botId,
    staleTime: 2 * 60 * 1000, // 2 分鐘 (webhook 狀態變化較頻繁)
  });
};

// 邏輯模板狀態切換 mutation
export const useToggleLogicTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, isActive }: { templateId: string, isActive: boolean }) => {
      return await apiClient.toggleLogicTemplate(templateId, isActive);
    },
    onMutate: async ({ templateId, isActive }) => {
      // 找出對應的 botId (從快取中查找)
      const botId = await findBotIdFromTemplate(templateId, queryClient);
      
      if (botId) {
        // 樂觀更新
        optimisticUpdates.updateLogicTemplateStatus(botId, templateId, isActive);
      }
      
      return { botId, templateId, isActive };
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: variables.isActive ? "啟用成功" : "停用成功",
        description: `邏輯模板已${variables.isActive ? "啟用" : "停用"}`,
      });
      
      if (context?.botId) {
        // 重新獲取最新資料
        invalidateQueries.logicTemplates(context.botId);
      }
    },
    onError: (error, variables, context) => {
      // 回滾樂觀更新
      if (context?.botId) {
        optimisticUpdates.updateLogicTemplateStatus(
          context.botId, 
          context.templateId, 
          !context.isActive
        );
      }
      
      toast({
        variant: "destructive",
        title: "操作失敗",
        description: "無法切換邏輯模板狀態",
      });
    }
  });
};

// 重新檢查 Webhook 狀態 mutation
export const useRefreshWebhookStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (botId: string) => {
      return await apiClient.getWebhookStatus(botId);
    },
    onSuccess: (data, botId) => {
      // 更新快取
      queryClient.setQueryData(queryKeys.webhookStatus(botId), data);
      
      toast({
        title: "狀態已更新",
        description: "Webhook 狀態檢查完成",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "檢查失敗",
        description: "無法獲取 Webhook 狀態",
      });
    }
  });
};

// 輔助函數：從模板 ID 找出對應的 Bot ID
async function findBotIdFromTemplate(templateId: string, queryClient: unknown): Promise<string | null> {
  // 嘗試從現有快取中找出包含此模板的 Bot
  const queryCache = (queryClient as {getQueryCache(): {getAll(): Array<{queryKey: unknown[], state: {data?: {data?: unknown[]}}}>}}).getQueryCache();
  
  for (const query of queryCache.getAll()) {
    if (query.queryKey[0] === 'bots' && 
        query.queryKey[2] === 'logicTemplates' && 
        query.state.data?.data) {
      
      const templates = query.state.data.data;
      const foundTemplate = templates.find((t: {id: string}) => t.id === templateId);
      
      if (foundTemplate) {
        return query.queryKey[1] as string; // Bot ID
      }
    }
  }
  
  return null;
}

// 主要的 Bot 管理 hook，提供統一的介面
export const useBotManagement = () => {
  const { data: bots, isLoading, error, refetch } = useBots();
  
  return {
    bots: bots?.data || [],
    isLoading,
    error,
    fetchBots: refetch,
  };
};