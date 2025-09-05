import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import "@/components/ui/loader.css";
import $ from "jquery";
import "jquery-validation";
import { Eye, EyeOff } from "lucide-react"; 

const LoginPage = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showEmailVerificationPrompt, setShowEmailVerificationPrompt] =
    useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loading, error, clearError, handleLineLogin } = useUnifiedAuth({
    redirectTo: "/login"
  });

  useEffect(() => {
    if (authManager.isAuthenticatedSync()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // 初始化 jQuery Validation
  useEffect(() => {
    if (!formRef.current) return;

    const $form = $(formRef.current);

    // 避免重複初始化
    if ($form.data("validator")) return;

    $form.validate({
      ignore: [],
      rules: {
        username: {
          required: true,
          minlength: 3,
        },
        password: {
          required: true,
          minlength: 6,
        },
        remote: {
          url: "/api/check-username",
          type: "post",
          data: { username: () => $("#username").val() }
        }        
      },
      messages: {
        username: {
          required: "請輸入帳號",
          minlength: "帳號至少需 3 個字元",
        },
        password: {
          required: "請輸入密碼",
          minlength: "密碼至少需 6 個字元",
        },
      },
      // 錯誤訊息插入位置
      errorPlacement: function (error, element) {
        error.addClass("text-red-600");
        if (element.attr("name") === "password" || element.attr("name") === "confirmPassword") {
          error.appendTo(element.closest(".space-y-2"));
        } else {
          error.insertAfter(element);
        }
      },
      // 加上錯誤樣式
      highlight: function (element) {
        $(element).addClass("is-invalid");
      },
      // 移除錯誤樣式
      unhighlight: function (element) {
        $(element).removeClass("is-invalid");
      },
      // 通過驗證時統一在這裡處理提交
      submitHandler: async (form, evt) => {
        evt?.preventDefault();
        clearError();

        // 直接使用 React state 中的值，而不是 FormData
        // 因為受控組件的值由 React state 管理
        const success = await login(username, password, rememberMe);

        if (success) {
          // 檢查是否需要郵件驗證
          if (error && error.includes("電子郵件")) {
            setShowEmailVerificationPrompt(true);
            return;
          }
          navigate("/dashboard", { replace: true });
        }
      },
    });

    // 元件卸載時清除
    return () => {
      try {
        const v = $form.data("validator");
        if (v) {
          v.destroy?.();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [clearError, error, login, navigate, password, rememberMe, username]);

  // 保留在 LINE 登入前先存 remember 狀態
  const handleLINELoginWithRememberMe = async () => {
    if (rememberMe) {
      sessionStorage.setItem("line_login_remember_me", "true");
    } else {
      sessionStorage.removeItem("line_login_remember_me");
    }
    await handleLineLogin();
  };

  const noopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRef.current) {
      // 交給 jQuery Validation 驗證與 submitHandler
      if ((window as { $?: unknown }).$) {
        ((window as { $: (element: HTMLElement) => { submit: () => void } }).$)(formRef.current).submit();
      } else {
        // 如果沒有 jQuery，使用原生表單處理
        console.info('使用原生表單處理（jQuery 未載入）');

        // 基本表單驗證
        if (!username.trim()) {
          toast({
            variant: "destructive",
            title: "驗證錯誤",
            description: "請輸入帳號",
          });
          return;
        }
        if (!password.trim()) {
          toast({
            variant: "destructive",
            title: "驗證錯誤",
            description: "請輸入密碼",
          });
          return;
        }

        clearError();

        try {
          // 直接調用登入邏輯，避免無限遞迴
          const success = await login(username, password, rememberMe);

          if (success) {
            // 檢查是否需要郵件驗證
            if (error && error.includes("電子郵件")) {
              setShowEmailVerificationPrompt(true);
              return;
            }

            // 登入成功，顯示成功訊息並導航
            console.info('登入成功，導航至 dashboard');
            navigate("/dashboard", { replace: true });
          }
        } catch (loginError) {
          console.error('登入過程發生錯誤:', loginError);
          // 錯誤已經在 login 函數中處理，這裡不需要額外處理
        }
      }
    }
  };

  const handleResendEmail = async () => {
    // 實作重新發送驗證郵件
    console.log("重新發送驗證郵件功能待實現");
  };

  return (
    <AuthFormLayout title="登入" description="歡迎回到 LINE Bot 建立平台">
      {showEmailVerificationPrompt && (
        <EmailVerificationPrompt
          onResendEmail={handleResendEmail}
          initialCooldown={0}
        />
      )}

      <form ref={formRef} onSubmit={noopSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="username">帳號</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入您的帳號"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密碼</Label>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入您的密碼"
              disabled={loading}
              className="pr-10" // 預留右側眼睛區域
            />

            {/* 長按顯示、鬆開隱藏 */}
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none text-muted-foreground"
              // 滑鼠
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              // 觸控
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              aria-label="長按以暫時顯示密碼"
              role="img"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              name="remember"     
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
            className="text-sm text-[hsl(var(--danger))] hover:underline"
          >
            忘記密碼？
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--line-green-hover))] text-[hsl(var(--primary-foreground))]"
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

      <div className="flex justify-center">
        <LINELoginButton onClick={handleLINELoginWithRememberMe} disabled={loading} />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4">
        還沒有帳號？{" "}
        <Link to="/register" className="text-[hsl(var(--danger))] hover:underline">
          立即註冊
        </Link>
      </p>
    </AuthFormLayout>
  );
};

export default LoginPage;