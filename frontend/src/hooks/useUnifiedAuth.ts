/**
 * 統一認證Hook - 替代所有分散的認證邏輯
 * 提供一致的認證狀態管理和API
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authManager, UnifiedUser, TokenInfo } from '../services/UnifiedAuthManager';
import { useToast } from './use-toast';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

interface UseUnifiedAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  onAuthChange?: (authenticated: boolean, user: UnifiedUser | null) => void;
}

export const useUnifiedAuth = (options: UseUnifiedAuthOptions = {}) => {
  const { requireAuth = false, redirectTo = '/login', onAuthChange } = options;
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 刷新用戶信息
   */
  const refreshUserInfo = useCallback(async () => {
    try {
      // 使用正確的用戶資料 API 端點
      const response = await fetch(
        getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.GET_PROFILE),
        {
          method: 'GET',
          headers: authManager.getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        if (result.data || result.id) {
          const profileData = result.data || result;
          const userData: UnifiedUser = {
            id: profileData.id || profileData.username,
            username: profileData.username,
            email: profileData.email,
            display_name: profileData.display_name || profileData.username,
            login_type: authManager.getUserInfo()?.login_type || 'traditional',
            // LINE 用戶相關資料
            line_id: profileData.line_id,
            picture_url: profileData.picture_url,
            isLineUser: profileData.isLineUser || false,
          };

          authManager.setUserInfo(userData);
          setUser(userData);
          onAuthChange?.(true, userData);
        }
      }
    } catch (err) {
      console.error('刷新用戶信息失敗:', err);
    }
  }, [onAuthChange]);

  /**
   * 檢查認證狀態
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const isAuthenticated = await authManager.isAuthenticated();
      
      if (isAuthenticated) {
        // 如果已認證，先從本地獲取用戶資料，然後刷新最新資料
        const userData = authManager.getUserInfo();
        setUser(userData);
        onAuthChange?.(true, userData);
        
        // 背景刷新用戶資料以獲取最新的 LINE 頭像等資訊
        refreshUserInfo();
      } else {
        setUser(null);
        onAuthChange?.(false, null);
        
        if (requireAuth) {
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '認證檢查失敗';
      setError(errorMessage);
      setUser(null);
      onAuthChange?.(false, null);
      
      if (requireAuth) {
        navigate(redirectTo, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [requireAuth, redirectTo, navigate, onAuthChange, refreshUserInfo]);

  /**
   * 傳統登錄
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGIN),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || '登錄失敗');
      }

      const data = await response.json();

      if (data.access_token) {
        // 使用統一認證管理器設置token
        const tokenInfo: TokenInfo = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: 'Bearer',
          expires_in: data.expires_in,
        };

        authManager.setTokenInfo(tokenInfo, 'traditional');

        // 設置用戶信息
        if (data.user) {
          const userData: UnifiedUser = {
            id: data.user.id || data.user.username,
            username: data.user.username,
            email: data.user.email,
            display_name: data.user.display_name || data.user.username,
            login_type: 'traditional',
          };

          authManager.setUserInfo(userData);
          setUser(userData);
          onAuthChange?.(true, userData);
        }

        toast({
          title: '登錄成功',
          description: `歡迎回來，${data.user?.username || '用戶'}！`,
        });

        return true;
      }

      throw new Error('回應中沒有找到access_token');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登錄失敗';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: '登錄失敗',
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, onAuthChange]);

  /**
   * LINE登錄處理
   */
  const handleLineLogin = useCallback(async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        getApiUrl(
          API_CONFIG.LINE_LOGIN.BASE_URL,
          API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        throw new Error('LINE token驗證失敗');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // 設置LINE token
      const tokenInfo: TokenInfo = {
        access_token: token,
        token_type: 'LINE',
      };

      authManager.setTokenInfo(tokenInfo, 'line');

      // 設置用戶信息
      const userData: UnifiedUser = {
        id: result.line_id || result.display_name,
        username: result.display_name,
        email: result.email,
        display_name: result.display_name,
        picture_url: result.picture_url,
        line_id: result.line_id,
        login_type: 'line',
      };

      authManager.setUserInfo(userData);
      setUser(userData);
      onAuthChange?.(true, userData);

      toast({
        title: 'LINE登錄成功',
        description: `歡迎，${result.display_name}！`,
      });

      return userData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'LINE登錄失敗';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'LINE登錄失敗',
        description: errorMessage,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, onAuthChange]);

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    try {
      // 嘗試調用後端登出API
      try {
        await fetch(
          getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGOUT),
          {
            method: 'POST',
            headers: authManager.getAuthHeaders(),
            credentials: 'include',
          }
        );
      } catch (err) {
        // 即使後端登出失敗，也要清除本地認證信息
        console.warn('後端登出失敗:', err);
      }

      // 清除本地認證信息
      authManager.clearAuth();
      setUser(null);
      onAuthChange?.(false, null);

      toast({
        title: '已登出',
        description: '您已成功登出',
      });

      navigate('/login', { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登出失敗';
      toast({
        variant: 'destructive',
        title: '登出失敗',
        description: errorMessage,
      });
    }
  }, [navigate, toast, onAuthChange]);

  /**
   * 獲取認證headers
   */
  const getAuthHeaders = useCallback(() => {
    return authManager.getAuthHeaders();
  }, []);

  // 初始化認證狀態
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // 狀態
    user,
    loading,
    error,
    isAuthenticated: !!user,
    
    // 方法
    login,
    logout,
    handleLineLogin,
    checkAuthStatus,
    refreshUserInfo,
    getAuthHeaders,
    
    // 工具方法
    clearError: () => setError(null),
    setLoading,
  };
};