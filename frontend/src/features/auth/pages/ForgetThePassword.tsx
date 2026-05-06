import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import AuthFormLayout from "../components/AuthFormLayout";
import { API_CONFIG, getApiUrl } from "@/config/apiConfig";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "輸入錯誤",
        description: "請輸入電子郵件地址",
      });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "格式錯誤",
        description: "請輸入有效的電子郵件地址",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        getApiUrl(
          API_CONFIG.AUTH.BASE_URL,
          API_CONFIG.AUTH.ENDPOINTS.FORGOT_PASSWORD
        ),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMessage;
        // 處理後端返回的錯誤訊息
        const backendError = data.detail || data.error || data.message;
        
        // 根據後端返回的具體錯誤訊息進行映射
        if (backendError?.includes("郵箱地址不存在") || backendError?.includes("EMAIL_NOT_FOUND")) {
          errorMessage = "此電子郵件地址未註冊";
        } else if (backendError?.includes("電子郵件格式") || backendError?.includes("INVALID_EMAIL")) {
          errorMessage = "電子郵件格式不正確";
        } else if (backendError?.includes("請稍後再試") || backendError?.includes("RATE_LIMIT") || backendError?.includes("頻繁")) {
          errorMessage = "請求過於頻繁，請稍後再試";
        } else if (backendError?.includes("郵件發送失敗") || backendError?.includes("EMAIL_SEND_FAILED")) {
          errorMessage = "郵件發送失敗，請稍後再試";
        } else {
          // 直接使用後端返回的錯誤訊息，如果沒有則使用預設訊息
          errorMessage = backendError || "發送重設連結失敗，請稍後再試";
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: "信件已寄出",
        description: "重設連結已寄出，請到信箱查看。",
      });
      setEmail("");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: unknown) {
      console.error("Error occurred:", error);
      toast({
        variant: "destructive",
        title: "發送失敗",
        description:
          error instanceof Error ? error.message : "密碼重設郵件發送失敗",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout title="重設密碼" description="輸入註冊信箱，我們會寄出重設密碼連結。">
      {loading && <Loader fullPage />}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700">
            電子郵件
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="app-input"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="app-primary-button w-full"
        >
          {loading ? (
            <>
              <Loader size="sm" />
              寄送中
            </>
          ) : (
            "寄送重設連結"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link
          to="/login"
          className="font-medium text-[#16a34a] transition-colors hover:text-[#15803d] hover:underline"
        >
          返回登入
        </Link>
      </div>
    </AuthFormLayout>
  );
};

export default ForgetPassword;
