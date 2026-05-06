import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import AuthFormLayout from "../components/AuthFormLayout";
import LINELoginButton from "../components/LINELoginButton";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import $ from "jquery";
import "jquery-validation";
import { Eye, EyeOff } from "lucide-react"; 

const Register = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const isSubmittingRef = useRef(false);

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
        if (isSubmittingRef.current) return;

        isSubmittingRef.current = true;
        clearError();

        try {
          // 從表單直接獲取值，確保是最新的
          const formData = new FormData(form);
          const usernameValue = formData.get('username') as string || username;
          const passwordValue = formData.get('password') as string || password;
          const emailValue = formData.get('email') as string || email;

          const success = await register(usernameValue, passwordValue, emailValue);

          if (success) {
            navigate("/email-verification-pending", {
              replace: true,
              state: { email: emailValue }
            });
          }
        } finally {
          isSubmittingRef.current = false;
        }
      },
    });
  }, [register, clearError, navigate, username, password, email]);

  const noopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    if (formRef.current) {
      $(formRef.current).submit();
    }
  };

  return (
    <AuthFormLayout title="建立帳號" description="先建立帳號，再開始做你的第一個 Bot。">
      <form ref={formRef} onSubmit={noopSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="username" className="text-slate-700">使用者名稱<span className="text-red-500">*</span></Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3 到 50 個字元"
            disabled={loading}
            className="app-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700">電子郵件<span className="text-red-500">*</span></Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
            className="app-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700">密碼<span className="text-red-500">*</span></Label>
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
              className="app-input pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 select-none text-slate-400 transition-colors hover:text-slate-700"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              aria-label="長按以暫時顯示密碼"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700">確認密碼<span className="text-red-500">*</span></Label>
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
              className="app-input pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 select-none text-slate-400 transition-colors hover:text-slate-700"
              onMouseDown={() => setShowConfirmPassword(true)}
              onMouseUp={() => setShowConfirmPassword(false)}
              onMouseLeave={() => setShowConfirmPassword(false)}
              onTouchStart={() => setShowConfirmPassword(true)}
              onTouchEnd={() => setShowConfirmPassword(false)}
              onTouchCancel={() => setShowConfirmPassword(false)}
              aria-label="長按以暫時顯示密碼"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
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
          <Label htmlFor="terms" className="text-sm text-slate-600">
            我同意{" "}
            <Link to="/terms" className="font-medium text-[#16a34a] hover:text-[#15803d] hover:underline">
              服務條款
            </Link>{" "}
            和{" "}
            <Link to="/privacy" className="font-medium text-[#16a34a] hover:text-[#15803d] hover:underline">
              隱私政策
            </Link>
          </Label>
        </div>

        <Button
          type="submit"
          className="app-primary-button w-full"
          disabled={loading}
        >
          {loading ? <Loader size="sm" /> : "建立帳號"}
        </Button>
      </form>

      <div className="flex items-center my-4">
        <Separator className="flex-1" />
        <span className="px-3 text-sm text-slate-500">或</span>
        <Separator className="flex-1" />
      </div>

      <div className="flex justify-center">
        <LINELoginButton />
      </div>

      <p className="text-center text-sm text-slate-500 mt-4">
        已經有帳號了？{" "}
        <Link to="/login" className="font-medium text-[#16a34a] hover:text-[#15803d] hover:underline">
          登入
        </Link>
      </p>
    </AuthFormLayout>
  );
};

export default Register;
