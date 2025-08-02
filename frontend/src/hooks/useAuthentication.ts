import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";
// import { LineLoginService } from "../services/lineLogin";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { AuthService } from "../services/auth";

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
            "Content-Type": "application/json",
            ...(localStorage.getItem("auth_token") && {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            }),
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
          AuthService.isAuthenticated() &&
          preventBackToLogin
        ) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // 如果不需要認證但用戶已認證
        if (!requireAuth && AuthService.isAuthenticated()) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // 處理 LINE 登入 token
        const token = searchParams.get("token");
        const displayName = searchParams.get("display_name");

        if (token && allowLineLogin) {
          const userData = await verifyLineToken(token);
          if (userData) {
            setUser(userData);
            setLoading(false);
            return;
          }
        }

        if (displayName) {
          setUser({ display_name: displayName });
          setLoading(false);
          return;
        }

        // 檢查現有的認證狀態
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          const userData = await verifyLineToken(storedToken);
          if (userData) {
            setUser(userData);
          } else {
            await checkLoginStatus();
          }
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
  ]);

  const verifyLineToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(
        getApiUrl(
          API_CONFIG.LINE_LOGIN.BASE_URL,
          API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) throw new Error("Token 驗證失敗");

      const result = await response.json();
      return result;
    } catch (_error) {
      console.error("Error occurred:", _error);
      return null;
    }
  };


  const logout = () => {
    AuthService.clearToken();
    localStorage.clear();
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
