import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import AuthFormLayout from "../components/forms/AuthFormLayout";
import LINELoginButton from "../components/LINELogin/LINELoginButton";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import "@/components/ui/loader.css";
import $ from "jquery";
import "jquery-validation";
import { Eye, EyeOff } from "lucide-react"; 

const Register = () => {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const navigate = useNavigate();
  const { register, loading, clearError } = useUnifiedAuth();

  // jQuery Validation 初始化
  useEffect(() => {
    if (!formRef.current) return;

    const $form = $(formRef.current);
    if ($form.data("validator")) return;

    $form.validate({
      ignore: [],
      rules: {
        username: {
          required: true,
          minlength: 3,
          maxlength: 50,
        },
        email: {
          required: true,
          email: true,
        },
        password: {
          required: true,
          minlength: 8,
        },
        confirmPassword: {
          required: true,
          equalTo: "#password",
        },
        terms: {
          required: true,
        },
      },
      messages: {
        username: {
          required: "請輸入使用者名稱",
          minlength: "至少 3 個字元",
          maxlength: "不能超過 50 個字元",
        },
        email: {
          required: "請輸入電子郵件",
          email: "請輸入有效的電子郵件格式",
        },
        password: {
          required: "請輸入密碼",
          minlength: "至少 8 個字元",
        },
        confirmPassword: {
          required: "請再次輸入密碼",
          equalTo: "兩次輸入的密碼不一致",
        },
        terms: {
          required: "請同意服務條款",
        },
      },
      errorPlacement: function (error, element) {
        error.addClass("text-red-600 text-sm mt-1 block");
        if (element.attr("name") === "password" || element.attr("name") === "confirmPassword") {
          // 密碼 → 插在外層 
          error.appendTo(element.closest(".space-y-2"));
        } else if (element.attr("name") === "terms") {
          // 條款 → 插在外層
          error.insertAfter(element.closest(".flex.items-center"));
        } else {
          // 其他欄位 → 預設
          error.insertAfter(element);
        }
      },
      highlight: function (element) {
        $(element).addClass("is-invalid");
      },
      unhighlight: function (element) {
        $(element).removeClass("is-invalid");
      },
      submitHandler: async (form, evt) => {
        evt?.preventDefault();
        clearError();
        
        // 從表單直接獲取值，確保是最新的
        const formData = new FormData(form);
        const usernameValue = formData.get('username') as string || username;
        const passwordValue = formData.get('password') as string || password;
        const emailValue = formData.get('email') as string || email;
        
        console.log('表單提交資料:', { usernameValue, passwordValue, emailValue });
        
        const success = await register(usernameValue, passwordValue, emailValue);

        if (success) {
          navigate("/email-verification-pending", {
            replace: true,
            state: { email: emailValue }
          });
        }
      },
    });
  }, [register, clearError, navigate, username, password, email]);

  const noopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formRef.current) {
      $(formRef.current).submit();
    }
  };

  return (
    <AuthFormLayout title="註冊" description="建立您的 LINE Bot 建立平台帳號">
      <form ref={formRef} onSubmit={noopSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="username">使用者名稱<span className="text-red-500">*</span></Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入使用者名稱（3-50個字元）"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">電子郵件<span className="text-red-500">*</span></Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="請輸入您的電子郵件"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密碼<span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼（至少 8 個字元）"
              disabled={loading}
              className="pr-10"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none text-muted-foreground"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              role="img"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">確認密碼<span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="請再次輸入密碼"
              disabled={loading}
              className="pr-10"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer select-none text-muted-foreground"
              onMouseDown={() => setShowConfirmPassword(true)}
              onMouseUp={() => setShowConfirmPassword(false)}
              onMouseLeave={() => setShowConfirmPassword(false)}
              onTouchStart={() => setShowConfirmPassword(true)}
              onTouchEnd={() => setShowConfirmPassword(false)}
              onTouchCancel={() => setShowConfirmPassword(false)}
              role="img"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            name="terms"
            checked={agreeToTerms}
            onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
            disabled={loading}
          />
          <Label htmlFor="terms" className="text-sm">
            我同意{" "}
            <Link to="/terms" className="text-[hsl(var(--danger))] hover:underline">
              服務條款
            </Link>{" "}
            和{" "}
            <Link to="/privacy" className="text-[hsl(var(--danger))] hover:underline">
              隱私政策
            </Link>
          </Label>
        </div>

        <Button
          type="submit"
          className="web3-primary-button w-full"
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

      <div className="flex justify-center">
        <LINELoginButton />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4">
        已經有帳號了？{" "}
        <Link to="/login" className="text-[hsl(var(--danger))] hover:underline">
          立即登入
        </Link>
      </p>
    </AuthFormLayout>
  );
};

export default Register;