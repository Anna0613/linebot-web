import { useCallback } from "react";
import { LineLoginService } from "../services/lineLogin";
import { useAuthForm } from "./useAuthForm";

export const useLineLogin = () => {
  const { handleError, withLoading } = useAuthForm();

  const handleLINELogin = async () => {
    await withLoading(async () => {
      try {
        const lineLoginService = LineLoginService.getInstance();
        const result = await lineLoginService.getLoginUrl();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error("無法獲取 LINE 登入連結");
        }
      } catch (error: unknown) {
        handleError(error, "LINE 登入失敗，請重試");
      }
    });
  };

  return {
    handleLINELogin,
  };
};
