import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import AuthFormLayout from "../components/forms/AuthFormLayout";
import EmailVerificationPrompt from "../components/forms/EmailVerificationPrompt";
import LINELoginButton from "../components/LINELogin/LINELoginButton";
import { useAuthForm } from "../hooks/useAuthForm";
import { useLineLogin } from "../hooks/useLineLogin";
import { ApiClient } from "../services/api";
import { AuthService } from "../services/auth";
import "@/components/ui/loader.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showEmailVerificationPrompt, setShowEmailVerificationPrompt] =
    useState(false);

  const { loading, handleSuccess, handleError, withLoading, navigate } =
    useAuthForm();
  const { handleLINELogin } = useLineLogin();

  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      handleError(new Error("請輸入帳號和密碼"), "請填寫所有必填欄位");
      return;
    }

    await withLoading(async () => {
      try {
        const response = await ApiClient.getInstance().login(username, password);

        if (response.error) {
          if (response.error.includes("電子郵件")) {
            setShowEmailVerificationPrompt(true);
            throw new Error(response.error);
          }
          throw new Error(response.error || "登入失敗");
        }

        // 確保 token 正確設置
        let token = AuthService.getToken();
        if (!token && response.data?.access_token) {
          AuthService.setToken(response.data.access_token);
          token = response.data.access_token;
        }

        if (!token) {
          if (response.data?.user?.username) {
            handleSuccess("登入成功！");
            return;
          }
          throw new Error("登入失敗，無法獲取 token 或用戶信息");
        }

        handleSuccess("登入成功！");
      } catch (error: unknown) {
        handleError(error);
      }
    });
  };

  const handleResendEmail = async () => {
    try {
      await ApiClient.getInstance().resendVerificationEmail(username);
      handleSuccess("驗證郵件已重新發送");
    } catch (error: unknown) {
      handleError(error, "重新發送郵件失敗");
    }
  };

  return (
    <AuthFormLayout title="登入" description="歡迎回到 LINE Bot 建立平台">
      {showEmailVerificationPrompt && (
        <EmailVerificationPrompt
          onResendEmail={handleResendEmail}
          initialCooldown={0}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">帳號</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入您的帳號"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密碼</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入您的密碼"
            disabled={loading}
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="remember" className="text-sm">
              記住我
            </Label>
          </div>
          <Link
            to="/forgetthepassword"
            className="text-sm text-[#F4A261] hover:underline"
          >
            忘記密碼？
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#F4A261] hover:bg-[#e6bc00] text-white"
          disabled={loading}
        >
          {loading ? <Loader size="sm" /> : "登入"}
        </Button>
      </form>

      <div className="flex items-center my-4">
        <Separator className="flex-1" />
        <span className="px-3 text-sm text-muted-foreground">或</span>
        <Separator className="flex-1" />
      </div>

      <LINELoginButton onClick={handleLINELogin} disabled={loading} />

      <p className="text-center text-sm text-muted-foreground mt-4">
        還沒有帳號？{" "}
        <Link to="/register" className="text-[#F4A261] hover:underline">
          立即註冊
        </Link>
      </p>
    </AuthFormLayout>
  );
};

export default LoginPage;
