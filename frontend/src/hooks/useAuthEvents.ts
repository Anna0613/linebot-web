/**
 * 認證事件處理 Hook
 * 監聽認證相關的自定義事件並提供狀態管理
 */

import { useState, useEffect } from 'react';

export interface AuthEventDetail {
  message: string;
  isRememberMe: boolean;
}

export interface AuthEventState {
  isRecovering: boolean;
  recoveryMessage: string;
  showExpiredMessage: boolean;
  expiredMessage: string;
}

export const useAuthEvents = () => {
  const [authState, setAuthState] = useState<AuthEventState>({
    isRecovering: false,
    recoveryMessage: '',
    showExpiredMessage: false,
    expiredMessage: '',
  });

  useEffect(() => {
    // 認證恢復中事件
    const handleAuthRecoveryNeeded = (event: CustomEvent<AuthEventDetail>) => {
      console.log('收到認證恢復事件:', event.detail);
      setAuthState(prev => ({
        ...prev,
        isRecovering: true,
        recoveryMessage: event.detail.message,
        showExpiredMessage: false,
      }));
    };

    // 認證過期事件
    const handleAuthExpired = (event: CustomEvent<AuthEventDetail>) => {
      console.log('收到認證過期事件:', event.detail);
      setAuthState(prev => ({
        ...prev,
        isRecovering: false,
        showExpiredMessage: true,
        expiredMessage: event.detail.message,
      }));
    };

    // Refresh token 失效事件
    const handleAuthRefreshFailed = (event: CustomEvent<AuthEventDetail>) => {
      console.log('收到 refresh 失效事件:', event.detail);
      setAuthState(prev => ({
        ...prev,
        isRecovering: false,
        showExpiredMessage: true,
        expiredMessage: event.detail.message,
      }));
    };

    // 註冊事件監聽器
    window.addEventListener('auth_recovery_needed', handleAuthRecoveryNeeded as EventListener);
    window.addEventListener('auth_expired', handleAuthExpired as EventListener);
    window.addEventListener('auth_refresh_failed', handleAuthRefreshFailed as EventListener);

    // 清理事件監聽器
    return () => {
      window.removeEventListener('auth_recovery_needed', handleAuthRecoveryNeeded as EventListener);
      window.removeEventListener('auth_expired', handleAuthExpired as EventListener);
      window.removeEventListener('auth_refresh_failed', handleAuthRefreshFailed as EventListener);
    };
  }, []);

  // 清除恢復狀態
  const clearRecoveryState = () => {
    setAuthState(prev => ({
      ...prev,
      isRecovering: false,
      recoveryMessage: '',
    }));
  };

  // 清除過期提示
  const clearExpiredMessage = () => {
    setAuthState(prev => ({
      ...prev,
      showExpiredMessage: false,
      expiredMessage: '',
    }));
  };

  return {
    ...authState,
    clearRecoveryState,
    clearExpiredMessage,
  };
};

export default useAuthEvents;