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
      retry: (failureCount, error: any) => {
        // 如果是認證錯誤，不重試
        if (error?.response?.status === 401 || error?.response?.status === 403) {
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

// Query Keys - 統一管理快取鍵
export const queryKeys = {
  // Bot 相關
  bots: ['bots'] as const,
  bot: (id: string) => ['bots', id] as const,
  botDashboard: (id: string) => ['bots', id, 'dashboard'] as const,
  botDashboardLight: (id: string) => ['bots', id, 'dashboard', 'light'] as const,
  
  // Analytics 相關
  botAnalytics: (id: string, period?: string) => 
    ['bots', id, 'analytics', period].filter(Boolean) as const,
  botMessageStats: (id: string, days?: number) => 
    ['bots', id, 'messageStats', days].filter(Boolean) as const,
  botUserActivity: (id: string) => ['bots', id, 'userActivity'] as const,
  botUsageStats: (id: string) => ['bots', id, 'usageStats'] as const,
  
  // Logic Templates 相關
  logicTemplates: (botId: string) => ['bots', botId, 'logicTemplates'] as const,

  // Webhook 相關
  webhookStatus: (botId: string) => ['bots', botId, 'webhook', 'status'] as const,

  // Activities 相關
  botActivities: (botId: string) => ['bots', botId, 'activities'] as const,

  // User 相關
  user: ['user'] as const,
  userAvatar: ['user', 'avatar'] as const,
} as const;

// 快取無效化工具
export const invalidateQueries = {
  // 無效化特定 Bot 的所有快取
  allBotData: (botId: string) => {
    queryClient.invalidateQueries({ queryKey: ['bots', botId] });
  },
  
  // 無效化所有 Bot 列表
  allBots: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bots });
  },
  
  // 無效化特定 Bot 的儀表板資料
  botDashboard: (botId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.botDashboard(botId) });
  },
  
  // 無效化特定 Bot 的分析資料
  botAnalytics: (botId: string) => {
    queryClient.invalidateQueries({ queryKey: ['bots', botId, 'analytics'] });
  },
  
  // 無效化邏輯模板
  logicTemplates: (botId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.logicTemplates(botId) });
  },
  
  // 無效化 webhook 狀態
  webhookStatus: (botId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.webhookStatus(botId) });
  },
} as const;

// 預獲取工具
export const prefetchQueries = {
  // 預獲取 Bot 儀表板資料
  botDashboard: async (botId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.botDashboard(botId),
      staleTime: 30000, // 30 秒
    });
  },
  
  // 預獲取 Bot 列表
  botList: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.bots,
      staleTime: 60000, // 1 分鐘
    });
  },
} as const;

// 樂觀更新工具
export const optimisticUpdates = {
  // 樂觀更新邏輯模板狀態
  updateLogicTemplateStatus: (botId: string, templateId: string, isActive: boolean) => {
    queryClient.setQueryData(queryKeys.logicTemplates(botId), (old: any) => {
      if (!old?.data) return old;
      
      return {
        ...old,
        data: old.data.map((template: any) => 
          template.id === templateId 
            ? { ...template, is_active: isActive }
            : template
        )
      };
    });
  },
  
  // 樂觀更新 Webhook 狀態
  updateWebhookStatus: (botId: string, status: string) => {
    queryClient.setQueryData(queryKeys.webhookStatus(botId), (old: any) => {
      if (!old?.data) return old;
      
      return {
        ...old,
        data: {
          ...old.data,
          status,
          status_text: status === 'active' ? '已綁定' : '未綁定',
          checked_at: new Date().toISOString()
        }
      };
    });
  },
} as const;

// 批次快取更新
export const batchCacheUpdate = {
  // 批次更新儀表板資料
  updateDashboardData: (botId: string, dashboardData: any) => {
    const { bot_info, basic_stats, logic_templates, analytics, webhook_status } = dashboardData;
    
    // 更新基本資訊
    if (bot_info) {
      queryClient.setQueryData(queryKeys.bot(botId), (old: any) => ({
        ...old,
        data: { ...old?.data, ...bot_info }
      }));
    }
    
    // 更新邏輯模板
    if (logic_templates) {
      queryClient.setQueryData(queryKeys.logicTemplates(botId), {
        data: logic_templates,
        timestamp: new Date().toISOString()
      });
    }
    
    // 更新分析資料
    if (analytics) {
      queryClient.setQueryData(queryKeys.botAnalytics(botId, analytics.period), {
        data: analytics,
        timestamp: new Date().toISOString()
      });
    }
    
    // 更新 webhook 狀態
    if (webhook_status) {
      queryClient.setQueryData(queryKeys.webhookStatus(botId), {
        data: webhook_status,
        timestamp: new Date().toISOString()
      });
    }
  },
} as const;