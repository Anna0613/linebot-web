/**
 * 優化版本的 Token 過期警告組件
 * 使用全域認證管理器，避免重複的認證檢查
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, RefreshCw } from 'lucide-react';
import { authManager } from '@/services/UnifiedAuthManager';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuthCheck } from '@/hooks/useOptimizedPolling';

interface OptimizedTokenExpiryWarningProps {
  onExtendSession?: () => void;
  onLogout?: () => void;
}

export const OptimizedTokenExpiryWarning: React.FC<OptimizedTokenExpiryWarningProps> = ({
  onExtendSession,
  onLogout
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const { toast } = useToast();
  const { getAuthStatus, addListener } = useOptimizedAuthCheck();

  useEffect(() => {
    const checkTokenExpiry = () => {
      const authStatus = getAuthStatus();
      if (!authStatus?.isAuthenticated) {
        setShowWarning(false);
        return;
      }

      const token = authManager.getAccessToken();
      if (!token) {
        setShowWarning(false);
        return;
      }

      try {
        // 解析 JWT token 獲取過期時間
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // 轉換為毫秒
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        // 如果 token 在 5 分鐘內過期，顯示警告
        if (timeUntilExpiry > 0 && timeUntilExpiry <= 5 * 60 * 1000) {
          setTimeLeft(Math.floor(timeUntilExpiry / 1000));
          setShowWarning(true);
        } else if (timeUntilExpiry <= 0) {
          // Token 已過期
          setShowWarning(false);
          toast({
            variant: "destructive",
            title: "會話已過期",
            description: "請重新登入以繼續使用",
          });
          
          // 自動登出
          if (onLogout) {
            onLogout();
          }
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error('解析 token 失敗:', error);
        setShowWarning(false);
      }
    };

    // 監聽認證狀態變化
    const unsubscribe = addListener(checkTokenExpiry);
    
    // 立即檢查一次
    checkTokenExpiry();

    return unsubscribe;
  }, [toast, getAuthStatus, addListener, onLogout]);

  // 倒數計時器
  useEffect(() => {
    if (showWarning && timeLeft > 0) {
      const countdown = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setShowWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [showWarning, timeLeft]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      // 嘗試刷新 token
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "會話已延長",
          description: "您的登入會話已成功延長",
        });
        setShowWarning(false);
        
        if (onExtendSession) {
          onExtendSession();
        }
      } else {
        throw new Error('刷新失敗');
      }
    } catch (error) {
      console.error('延長會話失敗:', error);
      toast({
        variant: "destructive",
        title: "延長會話失敗",
        description: "無法延長會話，請重新登入",
      });
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-orange-800 flex items-center text-sm">
          <Clock className="h-4 w-4 mr-2" />
          會話即將過期
        </CardTitle>
        <CardDescription className="text-orange-700">
          您的登入會話將在 {formatTime(timeLeft)} 後過期
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleExtendSession}
            disabled={isExtending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                延長中...
              </>
            ) : (
              '延長會話'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onLogout}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            重新登入
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedTokenExpiryWarning;
