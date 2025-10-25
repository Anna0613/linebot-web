import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/UnifiedApiClient';
import { API_CONFIG } from '../config/apiConfig';

export interface QuotaStatus {
  quota_type: 'limited' | 'none' | 'unknown';
  quota_limit: number | null;
  quota_used: number;
  quota_remaining: number | null;
  usage_percentage: number;
  is_near_limit: boolean;
  is_exceeded: boolean;
  last_updated: string;
  error?: string;
}

export interface QuotaResponse {
  bot_id: string;
  bot_name: string;
  quota_status: QuotaStatus;
  timestamp: string;
}

interface UseQuotaStatusOptions {
  botId: string | null;
  enabled?: boolean;
  refreshInterval?: number; // 自動刷新間隔（毫秒），0 表示不自動刷新
}

interface UseQuotaStatusReturn {
  quotaStatus: QuotaStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 配額狀態查詢 Hook
 * 
 * @param options - 配置選項
 * @returns 配額狀態、載入狀態、錯誤訊息和重新查詢函數
 * 
 * @example
 * ```tsx
 * const { quotaStatus, isLoading, error, refetch } = useQuotaStatus({
 *   botId: selectedBotId,
 *   enabled: true,
 *   refreshInterval: 60000 // 每分鐘刷新一次
 * });
 * ```
 */
export function useQuotaStatus({
  botId,
  enabled = true,
  refreshInterval = 0
}: UseQuotaStatusOptions): UseQuotaStatusReturn {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaStatus = useCallback(async () => {
    if (!botId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 使用正確的 API URL
      const url = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/quota`;
      const response = await apiClient.get<QuotaResponse>(url);

      if (response.data && !response.error) {
        setQuotaStatus(response.data.quota_status);
      } else {
        setError(response.error || '取得配額狀態失敗');
        setQuotaStatus(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      setError(errorMessage);
      setQuotaStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [botId, enabled]);

  // 初始載入
  useEffect(() => {
    if (botId && enabled) {
      fetchQuotaStatus();
    }
  }, [botId, enabled, fetchQuotaStatus]);

  // 自動刷新
  useEffect(() => {
    if (!botId || !enabled || refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchQuotaStatus();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [botId, enabled, refreshInterval, fetchQuotaStatus]);

  return {
    quotaStatus,
    isLoading,
    error,
    refetch: fetchQuotaStatus
  };
}

