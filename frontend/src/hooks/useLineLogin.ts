import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { LineLoginService } from "../services/lineLogin";
import { useAuthForm } from "./useAuthForm";
import { UnifiedAuthManager } from "../services/UnifiedAuthManager";

export const useLineLogin = () => {
  const [searchParams] = useSearchParams();
  const { handleSuccess, handleError, withLoading } = useAuthForm();

  const verifyLineLogin = useCallback(
    async (token: string) => {
      await withLoading(async () => {
        try {
          const lineLoginService = LineLoginService.getInstance();
          const result = await lineLoginService.verifyToken(token);

          if (result.error) {
            throw new Error(result.error);
          }

          if (result.display_name) {
            // 使用 UnifiedAuthManager 設置認證資訊
            const authManager = UnifiedAuthManager.getInstance();
            await authManager.setTokens({
              access_token: token,
              token_type: "line",
              user_info: {
                username: result.display_name,
                email: result.email || ""
              }
            });

            // 清除登入前的歷史記錄
            window.history.replaceState(null, "", "/login");

            handleSuccess("登入成功！");
          } else {
            throw new Error("LINE 登入驗證失敗");
          }
        } catch (error: unknown) {
          handleError(error, "LINE 登入驗證失敗，請重試");
        }
      });
    },
    [withLoading, handleSuccess, handleError]
  );

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyLineLogin(token);
    }
  }, [searchParams, verifyLineLogin]);

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
