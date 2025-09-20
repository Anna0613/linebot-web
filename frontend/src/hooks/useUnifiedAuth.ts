/**
 * 統一認證Hook - 替代所有分散的認證邏輯
 * 提供一致的認證狀態管理和API
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authManager, UnifiedUser, TokenInfo } from '../services/UnifiedAuthManager';
import { useToast } from './use-toast';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/CacheService';
import { authOptimizer } from '../utils/authOptimizer';

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
   * 刷新用戶信息（帶快取優化）
   */
  const refreshUserInfo = useCallback(async (forceRefresh = false) => {
    try {
      // 如果不是強制刷新，先檢查快取
      if (!forceRefresh) {
        const cachedProfile = cacheService.get<UnifiedUser>(CACHE_KEYS.USER_PROFILE);
        if (cachedProfile) {
          console.debug('使用快取的用戶檔案資料');
          setUser(cachedProfile);
          onAuthChange?.(true, cachedProfile);
          return;
        }
      }
      
      // 使用正確的用戶資料 API 端點
      const response = await fetch(
        getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.GET_PROFILE),
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
          // 同時快取用戶檔案資料
          cacheService.set(CACHE_KEYS.USER_PROFILE, userData, CACHE_TTL.USER_PROFILE);
          
          setUser(userData);
          onAuthChange?.(true, userData);
        }
      }
    } catch (err) {
      console.error('刷新用戶信息失敗:', err);
    }
  }, [onAuthChange]);

  /**
   * 檢查認證狀態（使用優化器）
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 首先從快取獲取用戶資料，提供即時顯示
      const cachedUser = authManager.getUserInfo();
      if (cachedUser) {
        setUser(cachedUser);
        onAuthChange?.(true, cachedUser);
      }

      // 使用認證優化器進行檢查
      const authResult = await authOptimizer.checkAuthenticationOptimized('useUnifiedAuth');
      
      if (authResult.isAuthenticated) {
        // 如果已認證，確保用戶資料是最新的
        const userData = authManager.getUserInfo();
        setUser(userData);
        onAuthChange?.(true, userData);
        
        // 如果是從快取獲取的結果，背景刷新用戶資料
        if (authResult.fromCache) {
          setTimeout(() => {
            refreshUserInfo(false); // 非強制刷新，優先使用快取
          }, 0);
        }
      } else {
        setUser(null);
        onAuthChange?.(false, null);
        
        if (requireAuth) {
          // 添加防抖機制，避免快速重複導航
          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 100);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '認證檢查失敗';
      setError(errorMessage);
      setUser(null);
      onAuthChange?.(false, null);
      
      if (requireAuth) {
        // 添加防抖機制，避免快速重複導航
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  }, [requireAuth, redirectTo, navigate, onAuthChange, refreshUserInfo]);

  /**
   * 傳統登錄
   */
  const login = useCallback(async (username: string, password: string, rememberMe = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGIN),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ username, password, remember_me: rememberMe }),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || '登錄失敗');
      }

      // 成功時由後端以 Set-Cookie 建立會話；不再依賴回傳 token
      if (response.ok) {
        await refreshUserInfo(true);
        toast({ title: '登錄成功', description: '歡迎回來！' });
        return true;
      }

      const data = await response.json();
      throw new Error(data?.error || data?.detail || '登錄失敗');
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
   * 傳統註冊
   */
  const register = useCallback(async (username: string, password: string, email: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.REGISTER),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, email }),
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = "註冊失敗";
        if (response.status === 422) {
          errorMessage = data.detail || "資料驗證失敗";
        } else if (response.status === 409) {
          errorMessage = data.detail || "用戶名稱或郵箱已被註冊";
        } else {
          errorMessage = data.detail || data.message || data.error || "註冊失敗";
        }
        throw new Error(errorMessage);
      }

      toast({
        title: '註冊成功',
        description: data.message || '註冊成功，請檢查您的郵箱以驗證帳戶',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '註冊失敗';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: '註冊失敗',
        description: errorMessage,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * LINE登錄處理
   */
  const handleLineLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 取得 LINE 登入 URL 並重導
      const resp = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include'
      });
      const data = await resp.json();
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || '無法獲取 LINE 登入連結');
      }
      window.location.href = data.url;
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'LINE登錄失敗';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'LINE登錄失敗', description: errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'include',
          }
        );
      } catch (err) {
        // 即使後端登出失敗，也要清除本地認證信息
        console.warn('後端登出失敗:', err);
      }

      // 清除本地認證信息和快取
      authManager.clearAuth('logout');
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
    // 不再提供 Authorization header，統一依賴 Cookie
    return { 'Content-Type': 'application/json', 'Accept': 'application/json' } as Record<string, string>;
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
    register,
    logout,
    handleLineLogin,
    checkAuthStatus,
    refreshUserInfo,
    getAuthHeaders,
    
    // 工具方法
    clearError: () => setError(null),
    setLoading,
    
    // 快取管理
    clearCache: () => {
      cacheService.clearPattern('^auth:');
      cacheService.clearPattern('^bots:');
    },
    forceRefreshUserInfo: () => refreshUserInfo(true),
  };
};
