import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";
import { AuthService } from "../services/auth";

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
    console.error("錯誤:", error);
    toast({
      variant: "destructive",
      title: "錯誤",
      description: error instanceof Error ? error.message : defaultMessage,
    });
    AuthService.clearToken();
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
