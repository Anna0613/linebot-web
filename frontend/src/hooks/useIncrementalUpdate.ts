/**
 * 增量更新 Hook
 * 提供智能數據更新，只更新變化的部分
 */
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useReactQuery';
import { apiClient } from '@/services/UnifiedApiClient';

interface UseIncrementalUpdateOptions {
  botId?: string;
  enableSmartUpdate?: boolean;
  updateThreshold?: number; // 更新閾值（秒）
}

export const useIncrementalUpdate = (options: UseIncrementalUpdateOptions = {}) => {
  const {
    botId,
    enableSmartUpdate = true,
    updateThreshold = 30 // 30 秒內不重複更新
  } = options;

  const queryClient = useQueryClient();
  const lastUpdateTimeRef = useRef<Record<string, number>>({});

  // 檢查是否需要更新
  const shouldUpdate = useCallback((dataType: string): boolean => {
    if (!enableSmartUpdate) return true;
    
    const now = Date.now();
    const lastUpdate = lastUpdateTimeRef.current[`${botId}-${dataType}`] || 0;
    
    return (now - lastUpdate) > (updateThreshold * 1000);
  }, [botId, enableSmartUpdate, updateThreshold]);

  // 記錄更新時間
  const recordUpdate = useCallback((dataType: string) => {
    lastUpdateTimeRef.current[`${botId}-${dataType}`] = Date.now();
  }, [botId]);

  // 增量更新分析數據
  const updateAnalyticsIncremental = useCallback(async (targetBotId?: string) => {
    const currentBotId = targetBotId || botId;
    if (!currentBotId) return;

    const dataType = 'analytics';
    if (!shouldUpdate(dataType)) {
      console.debug(`跳過 ${dataType} 更新，距離上次更新時間過短`);
      return;
    }

    try {
      const currentData = queryClient.getQueryData(queryKeys.botAnalytics(currentBotId));
      
      if (currentData) {
        // 只獲取最新的增量數據
        const latestData = await apiClient.getBotAnalyticsIncremental(currentBotId);
        
        queryClient.setQueryData(queryKeys.botAnalytics(currentBotId), (old: {data?: unknown}) => {
          if (!old?.data) return old;
          
          return {
            ...old,
            data: {
              ...old.data,
              ...latestData.data,
              lastUpdated: new Date().toISOString()
            }
          };
        });

        recordUpdate(dataType);
        console.log(`增量更新分析數據完成: ${currentBotId}`);
      } else {
        // 首次載入，進行完整查詢
        queryClient.invalidateQueries({ queryKey: queryKeys.botAnalytics(currentBotId) });
        recordUpdate(dataType);
      }
    } catch (error) {
      console.error('增量更新分析數據失敗:', error);
    }
  }, [botId, queryClient, shouldUpdate, recordUpdate]);

  // 智能 Webhook 狀態檢查
  const updateWebhookStatusSmart = useCallback(async (targetBotId?: string) => {
    const currentBotId = targetBotId || botId;
    if (!currentBotId) return;

    const dataType = 'webhook';
    if (!shouldUpdate(dataType)) {
      console.debug(`跳過 ${dataType} 狀態檢查，距離上次檢查時間過短`);
      return;
    }

    try {
      const cachedStatus = queryClient.getQueryData(queryKeys.webhookStatus(currentBotId));
      const lastCheck = cachedStatus?.lastChecked;
      const now = Date.now();
      
      // 只有超過 2 分鐘才重新檢查
      if (!lastCheck || (now - new Date(lastCheck).getTime()) > 2 * 60 * 1000) {
        const status = await apiClient.getWebhookStatusQuick(currentBotId);
        
        queryClient.setQueryData(queryKeys.webhookStatus(currentBotId), {
          ...status,
          lastChecked: new Date().toISOString()
        });

        recordUpdate(dataType);
        console.log(`Webhook 狀態檢查完成: ${currentBotId}`);
      }
    } catch (error) {
      console.error('Webhook 狀態檢查失敗:', error);
    }
  }, [botId, queryClient, shouldUpdate, recordUpdate]);

  // 更新活動列表（追加新活動）
  const updateActivitiesIncremental = useCallback(async (targetBotId?: string) => {
    const currentBotId = targetBotId || botId;
    if (!currentBotId) return;

    const dataType = 'activities';
    
    try {
      const currentData = queryClient.getQueryData(queryKeys.botActivities(currentBotId));
      const lastActivity = currentData?.data?.[0];
      const since = lastActivity?.timestamp || new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 預設 1 小時前
      
      const newActivities = await apiClient.getBotActivitiesSince(currentBotId, since);
      
      if (newActivities.data && newActivities.data.length > 0) {
        queryClient.setQueryData(queryKeys.botActivities(currentBotId), (old: {data?: unknown[]}) => {
          const existingActivities = old?.data || [];
          const combinedActivities = [...newActivities.data, ...existingActivities];
          
          // 去重並保持最新 50 條
          const uniqueActivities = combinedActivities.filter((activity, index, arr) => 
            arr.findIndex(a => a.id === activity.id) === index
          ).slice(0, 50);
          
          return {
            ...old,
            data: uniqueActivities,
            lastUpdated: new Date().toISOString()
          };
        });

        recordUpdate(dataType);
        console.log(`增量更新活動列表完成: ${currentBotId}, 新增 ${newActivities.data.length} 條`);
      }
    } catch (error) {
      console.error('增量更新活動列表失敗:', error);
    }
  }, [botId, queryClient, recordUpdate]);

  // 批次增量更新
  const batchIncrementalUpdate = useCallback(async (targetBotId?: string) => {
    const currentBotId = targetBotId || botId;
    if (!currentBotId) return;

    console.log(`開始批次增量更新: ${currentBotId}`);
    
    // 並行執行多個增量更新
    await Promise.allSettled([
      updateAnalyticsIncremental(currentBotId),
      updateWebhookStatusSmart(currentBotId),
      updateActivitiesIncremental(currentBotId)
    ]);

    console.log(`批次增量更新完成: ${currentBotId}`);
  }, [botId, updateAnalyticsIncremental, updateWebhookStatusSmart, updateActivitiesIncremental]);

  // 重置更新時間記錄
  const resetUpdateTimes = useCallback(() => {
    lastUpdateTimeRef.current = {};
  }, []);

  // 獲取上次更新時間
  const getLastUpdateTime = useCallback((dataType: string): number | null => {
    return lastUpdateTimeRef.current[`${botId}-${dataType}`] || null;
  }, [botId]);

  // 強制更新（忽略時間閾值）
  const forceUpdate = useCallback(async (dataType: 'analytics' | 'webhook' | 'activities' | 'all', targetBotId?: string) => {
    const currentBotId = targetBotId || botId;
    if (!currentBotId) return;

    // 臨時禁用智能更新
    
    try {
      switch (dataType) {
        case 'analytics':
          // 重置時間記錄以強制更新
          delete lastUpdateTimeRef.current[`${currentBotId}-analytics`];
          await updateAnalyticsIncremental(currentBotId);
          break;
        case 'webhook':
          delete lastUpdateTimeRef.current[`${currentBotId}-webhook`];
          await updateWebhookStatusSmart(currentBotId);
          break;
        case 'activities':
          delete lastUpdateTimeRef.current[`${currentBotId}-activities`];
          await updateActivitiesIncremental(currentBotId);
          break;
        case 'all':
          resetUpdateTimes();
          await batchIncrementalUpdate(currentBotId);
          break;
      }
    } catch (error) {
      console.error(`強制更新 ${dataType} 失敗:`, error);
    }
  }, [botId, updateAnalyticsIncremental, updateWebhookStatusSmart, updateActivitiesIncremental, batchIncrementalUpdate, resetUpdateTimes]);

  return {
    updateAnalyticsIncremental,
    updateWebhookStatusSmart,
    updateActivitiesIncremental,
    batchIncrementalUpdate,
    forceUpdate,
    resetUpdateTimes,
    getLastUpdateTime,
    shouldUpdate
  };
};
