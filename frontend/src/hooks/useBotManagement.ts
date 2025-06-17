import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PuzzleApiService, Bot, BotCreate } from '../services/puzzleApi';
import { AuthService } from '../services/auth';

interface UseBotManagementReturn {
  bots: Bot[];
  isLoading: boolean;
  error: string | null;
  createBot: (botData: BotCreate) => Promise<Bot | null>;
  fetchBots: () => Promise<void>;
  deleteBot: (botId: string) => Promise<boolean>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useBotManagement = (): UseBotManagementReturn => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 檢查認證狀態
  const checkAuth = useCallback(() => {
    if (!AuthService.isAuthenticated()) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
          message: '請先登入才能繼續操作'
        }
      });
      return false;
    }
    return true;
  }, [navigate]);

  // 創建 Bot
  const createBot = useCallback(async (botData: BotCreate): Promise<Bot | null> => {
    if (!checkAuth()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const newBot = await PuzzleApiService.createBot(botData);
      // 更新本地 bot 列表
      setBots(prevBots => [...prevBots, newBot]);
      return newBot;
    } catch (err) {
      let errorMessage = '創建 Bot 失敗';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      
      // 如果是認證錯誤，重導向到登入頁
      if (errorMessage.includes('登入已過期') || errorMessage.includes('401') || errorMessage.includes('認證')) {
        AuthService.clearAuth();
        navigate('/login', {
          state: {
            from: window.location.pathname,
            message: '登入已過期，請重新登入'
          }
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, navigate]);

  // 獲取 Bot 列表
  const fetchBots = useCallback(async (): Promise<void> => {
    if (!checkAuth()) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedBots = await PuzzleApiService.getBots();
      setBots(fetchedBots);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '獲取 Bot 列表失敗';
      setError(errorMessage);
      
      // 如果是認證錯誤，重導向到登入頁
      if (errorMessage.includes('401') || errorMessage.includes('認證')) {
        AuthService.clearAuth();
        navigate('/login', {
          state: {
            from: window.location.pathname,
            message: '登入已過期，請重新登入'
          }
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, navigate]);

  // 刪除 Bot
  const deleteBot = useCallback(async (botId: string): Promise<boolean> => {
    if (!checkAuth()) return false;

    setIsLoading(true);
    setError(null);

    try {
      await PuzzleApiService.deleteBot(botId);
      // 從本地列表中移除
      setBots(prevBots => prevBots.filter(bot => bot.id !== botId));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刪除 Bot 失敗';
      setError(errorMessage);
      
      // 如果是認證錯誤，重導向到登入頁
      if (errorMessage.includes('401') || errorMessage.includes('認證')) {
        AuthService.clearAuth();
        navigate('/login', {
          state: {
            from: window.location.pathname,
            message: '登入已過期，請重新登入'
          }
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, navigate]);

  // 設置錯誤
  const setErrorCallback = useCallback((error: string | null) => {
    setError(error);
  }, []);

  // 清除錯誤
  const clearError = useCallback(() => {
    setError(null);
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
  };
}; 