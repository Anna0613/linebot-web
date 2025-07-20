import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";
import { authManager } from "../services/UnifiedAuthManager";
import { securityMonitor } from "../utils/securityMonitor";

interface UseAuthFormOptions {
  onSuccess?: () => void;
  successRedirect?: string;
}

export const useAuthForm = (options: UseAuthFormOptions = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { onSuccess, successRedirect = "/dashboard" } = options;

  const handleSuccess = (message: string = "操作成功！") => {
    toast({
      title: message,
      description: "歡迎回來",
    });

    if (onSuccess) {
      onSuccess();
    } else {
      setTimeout(() => {
        navigate(successRedirect, { replace: true });
      }, 1000);
    }
  };

  const handleError = (
    error: unknown,
    defaultMessage: string = "操作失敗，請重試"
  ) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    
    // 記錄安全事件
    securityMonitor.logAuthFailure(errorMessage);
    
    toast({
      variant: "destructive",
      title: "錯誤",
      description: errorMessage,
    });
    
    // 使用統一認證管理器清除認證信息
    authManager.clearAuth();
  };

  const withLoading = async (asyncOperation: () => Promise<void>) => {
    if (loading) return;

    setLoading(true);
    try {
      await asyncOperation();
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    setLoading,
    handleSuccess,
    handleError,
    withLoading,
    navigate,
    toast,
  };
};
