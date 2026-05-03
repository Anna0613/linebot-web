import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RotateCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import AuthFormLayout from "../components/AuthFormLayout";
import { API_CONFIG, getApiUrl } from "@/config/apiConfig";

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("無效的驗證連結");
        return;
      }

      try {
        const response = await fetch(
          getApiUrl(API_CONFIG.AUTH.BASE_URL, "/verify-email"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "電子郵件驗證成功！");
        } else {
          setStatus("error");
          setMessage(data.detail || data.message || "驗證失敗，請重試");
        }
      } catch (_error) {
        setStatus("error");
        setMessage("驗證過程發生錯誤，請稍後重試");
      }
    };

    verifyEmail();
  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <Loader fullPage={false} text="正在確認驗證連結" />
            <p className="text-sm leading-6 text-slate-500">
              請稍候，我們正在啟用您的帳號。
            </p>
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col items-center text-center">
            <div className="app-soft-icon mb-5 h-14 w-14">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-sm leading-6 text-slate-600">
              {message || "您的電子郵件已成功驗證。"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              現在可以使用帳號登入 LINE Bot 工作台。
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="app-primary-button mt-6 w-full"
            >
              前往登入
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <XCircle className="h-7 w-7" />
            </div>
            <p className="text-sm leading-6 text-slate-600">{message}</p>

            <div className="app-muted-panel mt-6 w-full space-y-3 text-left">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
                <p className="text-sm leading-6 text-slate-600">
                  請確認您點擊的是最新一封驗證信中的連結，且連結仍在有效時間內。
                </p>
              </div>
              <div className="flex gap-3 border-t border-slate-200/70 pt-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-700" />
                <p className="text-sm leading-6 text-slate-600">
                  帳號必須完成信箱驗證後才能登入。若連結已失效，請回到註冊流程重新取得驗證信。
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3 w-full">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="app-secondary-button w-full"
              >
                <RotateCw className="h-4 w-4" />
                重試
              </Button>
              <Button
                onClick={() => navigate("/register")}
                className="app-primary-button w-full"
              >
                返回註冊頁
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const pageTitle = {
    loading: "正在驗證信箱",
    success: "信箱驗證成功",
    error: "信箱驗證失敗",
  }[status];

  const pageDescription = {
    loading: "我們正在確認您的驗證連結。",
    success: "帳號已啟用，現在可以登入工作台。",
    error: "驗證連結無法完成啟用，請確認連結狀態。",
  }[status];

  return (
    <AuthFormLayout title={pageTitle} description={pageDescription}>
      {renderContent()}
    </AuthFormLayout>
  );
};

export default EmailVerification;
