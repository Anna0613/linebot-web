import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailManagementSectionProps {
  email: string;
  emailVerified: boolean;
  isEditingEmail: boolean;
  isResendingEmailVerification: boolean;
  onEmailChange: (email: string) => void;
  onEditEmailToggle: (editing: boolean) => void;
  onSaveEmail: () => Promise<void>;
  onResendVerification: () => Promise<void>;
}

const EmailManagementSection = ({
  email,
  emailVerified,
  isEditingEmail,
  isResendingEmailVerification,
  onEmailChange,
  onEditEmailToggle,
  onSaveEmail,
  onResendVerification,
}: EmailManagementSectionProps) => {
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveEmail = async () => {
    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "無效的電子郵件",
        description: "請輸入有效的電子郵件地址",
      });
      return;
    }
    
    await onSaveEmail();
  };

  const getVerificationBadge = () => {
    if (emailVerified) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          已驗證
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          未驗證
        </Badge>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-[#1a1a40]" />
        <h2 className="text-xl font-bold text-[#1a1a40]">電子郵件管理</h2>
      </div>

      <div className="space-y-4">
        {/* 電子郵件輸入 */}
        <div className="space-y-2">
          <Label htmlFor="email">電子郵件地址</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              disabled={!isEditingEmail}
              className={!isEditingEmail ? "bg-gray-50" : ""}
              placeholder="請輸入您的電子郵件地址"
            />
            <Button
              variant={isEditingEmail ? "default" : "outline"}
              onClick={() => {
                if (isEditingEmail) {
                  handleSaveEmail();
                } else {
                  onEditEmailToggle(true);
                }
              }}
              className="whitespace-nowrap"
            >
              {isEditingEmail ? "儲存" : "編輯"}
            </Button>
            {isEditingEmail && (
              <Button
                variant="outline"
                onClick={() => onEditEmailToggle(false)}
              >
                取消
              </Button>
            )}
          </div>
        </div>

        {/* 驗證狀態 */}
        {email && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="font-medium">驗證狀態：</span>
                {getVerificationBadge()}
              </div>
            </div>
            
            {!emailVerified && email && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResendVerification}
                disabled={isResendingEmailVerification}
                className="flex items-center gap-2"
              >
                {isResendingEmailVerification ? (
                  <>
                    <Loader size="sm" />
                    發送中...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    重新發送驗證
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* 說明文字 */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>• 驗證的電子郵件將用於重要通知和密碼重設</p>
          <p>• 更改電子郵件後需要重新驗證</p>
          {!emailVerified && email && (
            <p className="text-yellow-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              請檢查您的電子郵件並點擊驗證連結
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailManagementSection;