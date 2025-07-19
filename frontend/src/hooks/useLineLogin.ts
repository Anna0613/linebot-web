import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineLoginService } from '../services/lineLogin';
import { useAuthForm } from './useAuthForm';

export const useLineLogin = () => {
  const [searchParams] = useSearchParams();
  const { handleSuccess, handleError, withLoading } = useAuthForm();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyLineLogin(token);
    }
  }, [searchParams]);

  const verifyLineLogin = async (token: string) => {
    await withLoading(async () => {
      try {
        const lineLoginService = LineLoginService.getInstance();
        const result = await lineLoginService.verifyToken(token);

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.display_name) {
          localStorage.setItem("line_token", token);
          localStorage.setItem("username", result.display_name);
          if (result.email) {
            localStorage.setItem("email", result.email);
          }
          
          // 清除登入前的歷史記錄
          window.history.replaceState(null, '', '/login');
          
          handleSuccess("登入成功！");
        } else {
          throw new Error("LINE 登入驗證失敗");
        }
      } catch (error: any) {
        handleError(error, "LINE 登入驗證失敗，請重試");
      }
    });
  };

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
      } catch (error: any) {
        handleError(error, "LINE 登入失敗，請重試");
      }
    });
  };

  return {
    handleLINELogin
  };
};