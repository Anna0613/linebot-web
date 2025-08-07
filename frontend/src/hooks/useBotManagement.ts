import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, BotCreate } from "../services/puzzleApi";
import { authManager } from "../services/UnifiedAuthManager";
import { apiClient } from "../services/UnifiedApiClient";
import { botCacheService } from "../services/BotCacheService";
import { performanceMonitor } from "../utils/performanceMonitor";

interface UseBotManagementReturn {
  bots: Bot[];
  isLoading: boolean;
  error: string | null;
  createBot: (botData: BotCreate) => Promise<Bot | null>;
  fetchBots: (forceRefresh?: boolean) => Promise<void>;
  deleteBot: (botId: string) => Promise<boolean>;
  setError: (error: string | null) => void;
  clearError: () => void;
  // 新增快取相關方法
  refreshBotsCache: () => Promise<void>;
  clearBotsCache: () => void;
  getCacheStats: () => ReturnType<typeof botCacheService.getCacheStats>;
}

export const useBotManagement = (): UseBotManagementReturn => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 檢查認證狀態 - 使用統一認證管理器
  const checkAuth = useCallback(async () => {
    const isAuthenticated = await authManager.isAuthenticated();
    if (!isAuthenticated) {
      
      navigate("/login", {
        state: {
          from: window.location.pathname,
          message: "請先登入才能繼續操作",
        },
      });
      return false;
    }
    return true;
  }, [navigate]);

  // 創建 Bot - 使用統一API客戶端和快取
  const createBot = useCallback(
    async (botData: BotCreate): Promise<Bot | null> => {
      if (!(await checkAuth())) return null;

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.createBot(botData);
        
        if (response.error) {
          throw new Error(response.error);
        }

        const newBot = response.data as Bot;
        
        // 更新本地 bot 列表
        setBots((prevBots) => {
          const updatedBots = [...prevBots, newBot];
          // 同時更新快取
          botCacheService.addBotToCache(newBot);
          return updatedBots;
        });
        
        return newBot;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "創建 Bot 失敗";
        setError(errorMessage);

        // 統一認證管理器會自動處理401錯誤
        authManager.handleAuthError(err);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [checkAuth]
  );

  // 獲取 Bot 列表 - 帶快取優化
  const fetchBots = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!checkAuth()) return;

    // 如果不是強制刷新，先檢查快取
    if (!forceRefresh) {
      const cachedBots = performanceMonitor.measureCacheOperation(
        'getBotsList', 
        () => botCacheService.getBotsList(),
        true
      );
      
      if (cachedBots) {
        console.debug('使用快取的 Bot 清單');
        setBots(cachedBots);
        setIsLoading(false);
        
        // 背景更新資料（不阻塞 UI）
        setTimeout(async () => {
          try {
            const response = await performanceMonitor.measureDataFetch(
              'fetchBots-background',
              () => apiClient.getBots(),
              false
            );
            
            if (!response.error) {
              const freshBots = response.data;
              // 比較資料是否有變化，有變化才更新
              if (JSON.stringify(freshBots) !== JSON.stringify(cachedBots)) {
                setBots(freshBots);
                botCacheService.setBotsList(freshBots);
                console.debug('背景更新了 Bot 清單');
              }
            }
          } catch (err) {
            console.warn('背景更新 Bot 清單失敗:', err);
          }
        }, 100);
        
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await performanceMonitor.measureDataFetch(
        'fetchBots-api',
        () => apiClient.getBots(),
        false
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      const fetchedBots = response.data;
      setBots(fetchedBots);
      
      // 更新快取
      botCacheService.setBotsList(fetchedBots);
      
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "獲取 Bot 列表失敗";
      setError(errorMessage);

      // 如果是認證錯誤，重導向到登入頁
      if (errorMessage.includes("401") || errorMessage.includes("認證")) {
        authManager.clearAuth();
        navigate("/login", {
          state: {
            from: window.location.pathname,
            message: "登入已過期，請重新登入",
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, navigate]);

  // 刪除 Bot - 帶快取更新
  const deleteBot = useCallback(
    async (botId: string): Promise<boolean> => {
      if (!checkAuth()) return false;

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.deleteBot(botId);
        if (response.error) {
          throw new Error(response.error);
        }
        
        // 從本地列表和快取中移除
        setBots((prevBots) => {
          const updatedBots = prevBots.filter((bot) => bot.id !== botId);
          // 同時從快取中移除
          botCacheService.removeBotFromCache(botId);
          return updatedBots;
        });
        
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "刪除 Bot 失敗";
        setError(errorMessage);

        // 如果是認證錯誤，重導向到登入頁
        if (errorMessage.includes("401") || errorMessage.includes("認證")) {
          authManager.clearAuth();
          navigate("/login", {
            state: {
              from: window.location.pathname,
              message: "登入已過期，請重新登入",
            },
          });
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkAuth, navigate]
  );

  // 設置錯誤
  const setErrorCallback = useCallback((error: string | null) => {
    setError(error);
  }, []);

  // 清除錯誤
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 強制刷新 Bot 快取
  const refreshBotsCache = useCallback(async () => {
    await fetchBots(true); // 強制從 API 獲取最新資料
  }, [fetchBots]);

  // 清除 Bot 快取
  const clearBotsCache = useCallback(() => {
    botCacheService.clearAllBotCache();
  }, []);

  // 獲取快取統計
  const getCacheStats = useCallback(() => {
    return botCacheService.getCacheStats();
  }, []);

  // 組件掛載時檢查認證狀態
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    bots,
    isLoading,
    error,
    createBot,
    fetchBots,
    deleteBot,
    setError: setErrorCallback,
    clearError,
    // 新增快取相關方法
    refreshBotsCache,
    clearBotsCache,
    getCacheStats,
  };
};
