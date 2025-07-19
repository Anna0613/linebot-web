import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Clock } from 'lucide-react';

interface EmailVerificationPromptProps {
  onResendEmail: () => Promise<void>;
  initialCooldown?: number;
}

const EmailVerificationPrompt = ({ 
  onResendEmail, 
  initialCooldown = 0 
}: EmailVerificationPromptProps) => {
  const [resendCooldown, setResendCooldown] = useState(initialCooldown);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResendEmail();
      setResendCooldown(60); // 設置 60 秒冷卻時間
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <Mail className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="space-y-3">
          <p>
            您的帳號尚未驗證，請檢查您的電子郵件並點擊驗證連結。
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              {isResending ? (
                "發送中..."
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  {resendCooldown}秒後可重新發送
                </>
              ) : (
                "重新發送驗證郵件"
              )}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default EmailVerificationPrompt;