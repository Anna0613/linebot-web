import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import AuthFormLayout from "../components/forms/AuthFormLayout";
import EmailVerificationPrompt from "../components/forms/EmailVerificationPrompt";
import LINELoginButton from "../components/LINELogin/LINELoginButton";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { authManager } from "../services/UnifiedAuthManager";
import "@/components/ui/loader.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showEmailVerificationPrompt, setShowEmailVerificationPrompt] =
    useState(false);

  const navigate = useNavigate();
  const { login, loading, error, clearError, handleLineLogin } = useUnifiedAuth({
    redirectTo: "/login"
  });

  useEffect(() => {
    if (authManager.isAuthenticatedSync()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      return;
    }

    clearError(); // 清除之前的錯誤
    
    const success = await login(username, password, rememberMe);
    
    if (success) {
      // 檢查是否需要郵件驗證
      if (error && error.includes("電子郵件")) {
        setShowEmailVerificationPrompt(true);
        return;
      }
      
      // 登入成功，重定向到儀表板
      navigate("/dashboard", { replace: true });
    }
  };

  const handleResendEmail = async () => {
    // TODO: 實現重新發送驗證郵件功能
    console.log("重新發送驗證郵件功能待實現");
  };

  const handleLINELoginWithRememberMe = async () => {
    // 由於 LINE 登錄是重定向流程，我們需要將 rememberMe 狀態存在某個地方
    // 這裡先將狀態存在 sessionStorage，在登錄成功後讀取
    if (rememberMe) {
      sessionStorage.setItem('line_login_remember_me', 'true');
    } else {
      sessionStorage.removeItem('line_login_remember_me');
    }
    
    // 觸發 LINE 登錄
    await handleLineLogin();
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
            autoComplete="current-password"
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

      <LINELoginButton onClick={handleLINELoginWithRememberMe} disabled={loading} />

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
