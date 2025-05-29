import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  preventBackToLogin?: boolean;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const {
    redirectTo = '/login',
    requireAuth = true,
    preventBackToLogin = true
  } = options;
  
  const navigate = useNavigate();

  useEffect(() => {
    // 檢查認證狀態
    const isAuthenticated = AuthService.isAuthenticated();
    
    if (requireAuth && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // 防止返回到登入頁面的歷史管理
    if (preventBackToLogin && isAuthenticated) {
      const referrer = document.referrer;
      const isFromLoginPages = referrer.includes('/login') || 
                               referrer.includes('/register') || 
                               referrer.includes('/forgetthepassword');
      
      // 如果是從登入相關頁面來的，替換當前的歷史記錄
      if (isFromLoginPages) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      // 監聽瀏覽器的後退按鈕
      const handlePopState = (event: PopStateEvent) => {
        // 如果用戶試圖返回且沒有認證，重定向到首頁
        if (!AuthService.isAuthenticated()) {
          navigate('/', { replace: true });
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [navigate, redirectTo, requireAuth, preventBackToLogin]);

  return {
    isAuthenticated: AuthService.isAuthenticated()
  };
}; 