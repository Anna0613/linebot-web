import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Key,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecuritySectionProps {
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  onDeleteAccount: () => void;
  showDeleteConfirmation?: boolean;
}

const SecuritySection = ({
  onChangePassword,
  onDeleteAccount,
  showDeleteConfirmation = false,
}: SecuritySectionProps) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { toast } = useToast();

  const validatePasswordForm = (): boolean => {
    if (!passwordForm.oldPassword) {
      toast({
        variant: "destructive",
        title: "請輸入現在的密碼",
      });
      return false;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "新密碼至少需要 6 個字元",
      });
      return false;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "新密碼確認不相符",
      });
      return false;
    }

    if (passwordForm.oldPassword === passwordForm.newPassword) {
      toast({
        variant: "destructive",
        title: "新密碼不能與現在的密碼相同",
      });
      return false;
    }

    return true;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    try {
      await onChangePassword(
        passwordForm.oldPassword,
        passwordForm.newPassword
      );

      // 重設表單
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangingPassword(false);

      toast({
        title: "密碼更新成功",
        description: "您的密碼已成功更新",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "密碼更新失敗",
        description:
          error instanceof Error ? error.message : "請檢查您的現在密碼是否正確",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getPasswordStrength = (
    password: string
  ): { level: number; text: string; color: string } => {
    if (password.length === 0)
      return { level: 0, text: "", color: "transparent" };
    if (password.length < 6) return { level: 1, text: "弱", color: "red" };
    if (password.length < 10)
      return { level: 2, text: "中等", color: "orange" };
    if (
      password.length >= 10 &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    ) {
      return { level: 3, text: "強", color: "green" };
    }
    return { level: 2, text: "中等", color: "orange" };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-[#1a1a40]" />
        <h2 className="text-xl font-bold text-[#1a1a40]">安全設定</h2>
      </div>

      <div className="space-y-6">
        {/* 密碼更改區塊 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <CardTitle className="text-lg">更改密碼</CardTitle>
            </div>
            <CardDescription>定期更改密碼以保護您的帳號安全</CardDescription>
          </CardHeader>

          <CardContent>
            {!isChangingPassword ? (
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                更改密碼
              </Button>
            ) : (
              <div className="space-y-4">
                {/* 現在的密碼 */}
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">現在的密碼</Label>
                  <div className="relative">
                    <Input
                      id="oldPassword"
                      type={showPasswords.old ? "text" : "password"}
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          oldPassword: e.target.value,
                        }))
                      }
                      placeholder="請輸入現在的密碼"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          old: !prev.old,
                        }))
                      }
                    >
                      {showPasswords.old ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 新密碼 */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">新密碼</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="請輸入新密碼（至少 6 個字元）"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          new: !prev.new,
                        }))
                      }
                    >
                      {showPasswords.new ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.newPassword && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>密碼強度：</span>
                      <span
                        style={{ color: passwordStrength.color }}
                        className="font-medium"
                      >
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                </div>

                {/* 確認新密碼 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">確認新密碼</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="請再次輸入新密碼"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          confirm: !prev.confirm,
                        }))
                      }
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.confirmPassword &&
                    passwordForm.newPassword !==
                      passwordForm.confirmPassword && (
                      <p className="text-sm text-red-600">密碼確認不相符</p>
                    )}
                  {passwordForm.confirmPassword &&
                    passwordForm.newPassword ===
                      passwordForm.confirmPassword && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        密碼確認相符
                      </p>
                    )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="flex items-center gap-2"
                  >
                    {passwordLoading ? "更新中..." : "更新密碼"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 帳號刪除區塊 */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <CardTitle className="text-lg text-red-700">危險區域</CardTitle>
            </div>
            <CardDescription>以下操作無法復原，請謹慎考慮</CardDescription>
          </CardHeader>

          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                刪除帳號將永久移除您的所有資料，包括創建的機器人、對話紀錄等。此操作無法復原。
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              onClick={onDeleteAccount}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              刪除帳號
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecuritySection;
