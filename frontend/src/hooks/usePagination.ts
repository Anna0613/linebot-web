/**
 * 分頁和懶加載 React Query hooks
 * 提供高效的資料載入和分頁管理
 */
import { useQuery, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/services/UnifiedApiClient';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  active_only?: boolean;
  event_type?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number;
  prev_page?: number;
}

export interface BotUser {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  is_followed: boolean;
  first_interaction?: string;
  last_interaction?: string;
  interaction_count: string;
}

export interface BotInteraction {
  id: string;
  event_type: string;
  message_type?: string;
  message_content?: unknown;
  timestamp: string;
  user?: {
    line_user_id: string;
    display_name: string;
  };
}

export interface LogicTemplate {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotSummary {
  bot_info: {
    id: string;
    name: string;
    is_configured: boolean;
  };
  summary_stats: {
    total_users: number;
    active_users: number;
    today_interactions: number;
    today_active_users: number;
    total_templates: number;
    active_templates: number;
    generated_at: string;
    fallback?: boolean;
  };
}

// Bot 用戶分頁查詢
export const useBotUsers = (
  botId: string,
  params: PaginationParams = {},
  options?: UseQueryOptions<PaginatedResponse<BotUser>>
) => {
  return useQuery({
    queryKey: ['botUsers', botId, params],
    queryFn: async () => {
      const response = await apiClient.get(`/bot_dashboard/${botId}/users`, {
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          ...(params.search && { search: params.search }),
          ...(params.active_only !== undefined && { active_only: params.active_only }),
        }
      });
      return response.data;
    },
    enabled: !!botId,
    staleTime: 2 * 60 * 1000, // 2 分鐘
    gcTime: 5 * 60 * 1000, // 5 分鐘
    ...options,
  });
};

// Bot 互動記錄分頁查詢
export const useBotInteractions = (
  botId: string,
  params: PaginationParams = {},
  options?: UseQueryOptions<PaginatedResponse<BotInteraction>>
) => {
  return useQuery({
    queryKey: ['botInteractions', botId, params],
    queryFn: async () => {
      const response = await apiClient.get(`/bot_dashboard/${botId}/interactions`, {
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          ...(params.event_type && { event_type: params.event_type }),
        }
      });
      return response.data;
    },
    enabled: !!botId,
    staleTime: 1 * 60 * 1000, // 1 分鐘
    gcTime: 3 * 60 * 1000, // 3 分鐘
    ...options,
  });
};

// 邏輯模板分頁查詢
export const useLogicTemplates = (
  botId: string,
  params: PaginationParams = {},
  options?: UseQueryOptions<PaginatedResponse<LogicTemplate>>
) => {
  return useQuery({
    queryKey: ['logicTemplates', botId, params],
    queryFn: async () => {
      const response = await apiClient.get(`/bot_dashboard/${botId}/templates`, {
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          ...(params.active_only !== undefined && { active_only: params.active_only }),
        }
      });
      return response.data;
    },
    enabled: !!botId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
    gcTime: 10 * 60 * 1000, // 10 分鐘
    ...options,
  });
};

// Bot 概要統計查詢（用於首次快速載入）
export const useBotSummary = (
  botId: string,
  options?: UseQueryOptions<BotSummary>
) => {
  return useQuery({
    queryKey: ['botSummary', botId],
    queryFn: async () => {
      const response = await apiClient.get(`/bot_dashboard/${botId}/summary`);
      return response.data;
    },
    enabled: !!botId,
    staleTime: 1 * 60 * 1000, // 1 分鐘
    gcTime: 3 * 60 * 1000, // 3 分鐘
    ...options,
  });
};

// 無限捲動查詢 - Bot 用戶
export const useBotUsersInfinite = (
  botId: string,
  params: Omit<PaginationParams, 'page'> = {},
  options?: {enabled?: boolean; staleTime?: number; gcTime?: number}
) => {
  return useInfiniteQuery({
    queryKey: ['botUsersInfinite', botId, params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/bot_dashboard/${botId}/users`, {
        params: {
          page: pageParam,
          limit: params.limit || 20,
          ...(params.search && { search: params.search }),
          ...(params.active_only !== undefined && { active_only: params.active_only }),
        }
      });
      return response.data;
    },
    enabled: !!botId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.has_next ? lastPage.next_page : undefined;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
};

// 無限捲動查詢 - Bot 互動記錄
export const useBotInteractionsInfinite = (
  botId: string,
  params: Omit<PaginationParams, 'page'> = {},
  options?: {enabled?: boolean; staleTime?: number; gcTime?: number}
) => {
  return useInfiniteQuery({
    queryKey: ['botInteractionsInfinite', botId, params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/bot_dashboard/${botId}/interactions`, {
        params: {
          page: pageParam,
          limit: params.limit || 50,
          ...(params.event_type && { event_type: params.event_type }),
        }
      });
      return response.data;
    },
    enabled: !!botId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.has_next ? lastPage.next_page : undefined;
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
    ...options,
  });
};

// 輔助函數：創建分頁快取失效器
export const createPaginationInvalidator = (queryClient: unknown, botId: string) => {
  return {
    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: ['botUsers', botId] });
      queryClient.invalidateQueries({ queryKey: ['botUsersInfinite', botId] });
    },
    invalidateInteractions: () => {
      queryClient.invalidateQueries({ queryKey: ['botInteractions', botId] });
      queryClient.invalidateQueries({ queryKey: ['botInteractionsInfinite', botId] });
    },
    invalidateTemplates: () => {
      queryClient.invalidateQueries({ queryKey: ['logicTemplates', botId] });
    },
    invalidateSummary: () => {
      queryClient.invalidateQueries({ queryKey: ['botSummary', botId] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['botUsers', botId] });
      queryClient.invalidateQueries({ queryKey: ['botUsersInfinite', botId] });
      queryClient.invalidateQueries({ queryKey: ['botInteractions', botId] });
      queryClient.invalidateQueries({ queryKey: ['botInteractionsInfinite', botId] });
      queryClient.invalidateQueries({ queryKey: ['logicTemplates', botId] });
      queryClient.invalidateQueries({ queryKey: ['botSummary', botId] });
    }
  };
};