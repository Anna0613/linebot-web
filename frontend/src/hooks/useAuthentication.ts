import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";
// import { LineLoginService } from "../services/lineLogin";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { UnifiedAuthManager } from "../services/UnifiedAuthManager";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  email?: string;
}

interface UseAuthenticationOptions {
  requireAuth?: boolean;
  preventBackToLogin?: boolean;
  redirectTo?: string;
  allowLineLogin?: boolean;
}

export const useAuthentication = (options: UseAuthenticationOptions = {}) => {
  const {
    requireAuth = false,
    preventBackToLogin = false,
    redirectTo = "/login",
    allowLineLogin = true,
  } = options;

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const authManager = UnifiedAuthManager.getInstance();

  const checkLoginStatus = useCallback(async () => {
    try {
      
      const nativeFetch = window.fetch.bind(window);
      const response = await nativeFetch(
        getApiUrl(
          API_CONFIG.AUTH.BASE_URL,
          API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN
        ),
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // 處理新格式 API 回應
        if (data.authenticated && data.user) {
          setUser({
            display_name: data.user.username,
            username: data.user.username,
            email: data.user.email,
          });
          return;
        }

        // 處理舊格式回應
        if (data.message && typeof data.message === "string") {
          const messagePattern = /User (.+?) is logged in/;
          const match = data.message.match(messagePattern);

          if (match && match[1]) {
            const username = match[1];
            setUser({ display_name: username, username });
            return;
          }
        }

        throw new Error("無效的 API 回應格式");
      } else {
        if (requireAuth) {
          setError("請先登入");
          navigate(redirectTo);
        }
      }
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (requireAuth) {
        setError("請先登入");
        navigate(redirectTo);
      }
    }
  }, [requireAuth, redirectTo, navigate, setError]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      setError(null);

      try {
        // 如果需要認證但用戶已認證，且防止返回登入頁
        if (
          requireAuth &&
          await authManager.isAuthenticated() &&
          preventBackToLogin
        ) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // 如果不需要認證但用戶已認證
        if (!requireAuth && await authManager.isAuthenticated()) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // 新流程：不再處理 URL 中的 token/display_name 參數

        // 檢查現有的認證狀態
        const userInfo = authManager.getUserInfo();
        if (userInfo && await authManager.isAuthenticated()) {
          setUser({
            display_name: userInfo.display_name,
            username: userInfo.username,
            email: userInfo.email,
            line_id: userInfo.line_id,
            picture_url: userInfo.picture_url
          });
        } else {
          await checkLoginStatus();
        }
      } catch (_error) {
        console.error("Error occurred:", _error);
        if (requireAuth) {
          setError("認證失敗，請重新登入");
          navigate(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [
    searchParams,
    navigate,
    requireAuth,
    preventBackToLogin,
    redirectTo,
    allowLineLogin,
    checkLoginStatus,
    authManager,
  ]);

  const verifyLineToken = async (_token: string): Promise<User | null> => {
    // 已移除舊的 LINE token 客戶端驗證流程
    return null;
  };


  const logout = () => {
    authManager.clearAuth('logout');
    setUser(null);
    navigate("/login");
    toast({
      title: "已登出",
      description: "您已成功登出",
    });
  };

  const showError = (message: string) => {
    setError(message);
    toast({
      variant: "destructive",
      title: "錯誤",
      description: message,
    });
  };

  const showSuccess = (message: string) => {
    toast({
      title: "成功",
      description: message,
    });
  };

  return {
    user,
    loading,
    error,
    logout,
    showError,
    showSuccess,
    verifyLineToken,
    checkLoginStatus,
    isAuthenticated: !!user,
    setUser,
    setError,
  };
};
