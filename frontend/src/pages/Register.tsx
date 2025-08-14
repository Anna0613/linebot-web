import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import AuthFormLayout from "../components/forms/AuthFormLayout";
import LINELoginButton from "../components/LINELogin/LINELoginButton";
import { useAuthForm } from "../hooks/useAuthForm";
import { useLineLogin } from "../hooks/useLineLogin";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import "@/components/ui/loader.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const { loading, handleSuccess, handleError, withLoading } = useAuthForm({
    successRedirect: "/email-verification-pending",
  });
  const { handleLINELogin } = useLineLogin();

  const validateForm = () => {
    if (!username || !password || !confirmPassword || !email) {
      throw new Error("請填寫所有必填欄位");
    }

    // 用戶名稱驗證（與後端一致）
    if (username.length < 3) {
      throw new Error("用戶名稱必須至少 3 個字元");
    }

    if (username.length > 50) {
      throw new Error("用戶名稱不能超過 50 個字元");
    }

    if (password !== confirmPassword) {
      throw new Error("密碼確認不相符");
    }

    // 密碼驗證（與後端一致）
    if (password.length < 8) {
      throw new Error("密碼必須至少 8 個字元");
    }

    if (!agreeToTerms) {
      throw new Error("請同意服務條款");
    }

    // 簡單的電子郵件驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("請輸入有效的電子郵件地址");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await withLoading(async () => {
      try {
        validateForm();

        const response = await fetch(
          getApiUrl(
            API_CONFIG.AUTH.BASE_URL,
            API_CONFIG.AUTH.ENDPOINTS.REGISTER
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, email }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          // 處理不同類型的錯誤回應
          let errorMessage = "註冊失敗";

          if (response.status === 422) {
            // 驗證錯誤
            errorMessage = data.detail || data.message || "資料驗證失敗";
          } else if (response.status === 409) {
            // 衝突錯誤（用戶名或郵箱已存在）
            errorMessage = data.detail || data.message || "用戶名稱或郵箱已被註冊";
          } else {
            // 其他錯誤
            errorMessage = data.detail || data.message || data.error || "註冊失敗";
          }

          throw new Error(errorMessage);
        }

        handleSuccess("註冊成功！請檢查您的電子郵件以驗證帳號。");
      } catch (error: unknown) {
        handleError(error);
      }
    });
  };

  return (
    <AuthFormLayout title="註冊" description="建立您的 LINE Bot 建立平台帳號">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">使用者名稱 *</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入使用者名稱（3-50個字元）"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">電子郵件 *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="請輸入您的電子郵件"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密碼 *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入密碼（至少 8 個字元）"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">確認密碼 *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="請再次輸入密碼"
            disabled={loading}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={agreeToTerms}
            onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
            disabled={loading}
          />
          <Label htmlFor="terms" className="text-sm">
            我同意{" "}
            <Link to="/terms" className="text-[#F4A261] hover:underline">
              服務條款
            </Link>{" "}
            和{" "}
            <Link to="/privacy" className="text-[#F4A261] hover:underline">
              隱私政策
            </Link>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#F4A261] hover:bg-[#e6bc00] text-white"
          disabled={loading}
        >
          {loading ? <Loader size="sm" /> : "註冊"}
        </Button>
      </form>

      <div className="flex items-center my-4">
        <Separator className="flex-1" />
        <span className="px-3 text-sm text-muted-foreground">或</span>
        <Separator className="flex-1" />
      </div>

      <LINELoginButton onClick={handleLINELogin} disabled={loading} />

      <p className="text-center text-sm text-muted-foreground mt-4">
        已經有帳號了？{" "}
        <Link to="/login" className="text-[#F4A261] hover:underline">
          立即登入
        </Link>
      </p>
    </AuthFormLayout>
  );
};

export default Register;
