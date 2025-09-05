import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, RefreshCw } from 'lucide-react';
import { authManager } from '@/services/UnifiedAuthManager';
import { useToast } from '@/hooks/use-toast';

interface TokenExpiryWarningProps {
  onExtendSession?: () => void;
  onLogout?: () => void;
}

export const TokenExpiryWarning: React.FC<TokenExpiryWarningProps> = ({
  onExtendSession,
  onLogout
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = authManager.getAccessToken();
      if (!token) return;

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
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error('解析 token 失敗:', error);
      }
    };

    // 立即檢查一次
    checkTokenExpiry();

    // 每 30 秒檢查一次
    const interval = setInterval(checkTokenExpiry, 30000);

    return () => clearInterval(interval);
  }, [toast]);

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
    try {
      // 嘗試刷新 token
      const refreshed = await authManager.refreshToken();
      if (refreshed) {
        setShowWarning(false);
        toast({
          title: "會話已延長",
          description: "您的會話已成功延長",
        });
        onExtendSession?.();
      } else {
        throw new Error('無法刷新 token');
      }
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "延長會話失敗",
        description: "請重新登入以繼續使用",
      });
      onLogout?.();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="h-4 w-4" />
            會話即將過期
          </CardTitle>
          <CardDescription className="text-orange-700">
            您的會話將在 {formatTime(timeLeft)} 後過期
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleExtendSession}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              延長會話
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWarning(false)}
              className="flex-1"
            >
              忽略
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenExpiryWarning;
