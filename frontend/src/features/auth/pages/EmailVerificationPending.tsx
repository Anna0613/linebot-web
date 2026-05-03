import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import AuthFormLayout from "../components/AuthFormLayout";
import { UnifiedApiClient } from "@/services/UnifiedApiClient";

const EmailVerificationPending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const email =
    typeof location.state?.email === "string" ? location.state.email : "";

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email) {
      setResendSuccess(false);
      setResendMessage("找不到剛註冊的信箱資訊，請回到註冊頁重新開始流程。");
      return;
    }

    setIsResending(true);
    setResendMessage("");
    setResendSuccess(false);

    try {
      const apiClient = new UnifiedApiClient();
      const response = await apiClient.resendEmailVerification(email);

      if (response.success || response.status === 200) {
        setResendSuccess(true);
        setResendMessage("驗證信已重新寄出，請到信箱完成驗證。");
        setResendCooldown(60);
      } else {
        setResendSuccess(false);
        setResendMessage(
          response.error || "重新寄送失敗，請稍後再試。"
        );
      }
    } catch (error) {
      setResendSuccess(false);
      setResendMessage("寄送失敗，請檢查網路連線或稍後再試。");
      console.error("重新發送驗證郵件錯誤:", error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthFormLayout
      title="確認您的電子郵件"
      description="完成信箱驗證後，才能登入 LINE Bot 工作台。"
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="app-soft-icon mb-4 h-14 w-14">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm leading-6 text-slate-600">
            我們已寄出驗證連結
            {email ? " 到" : "。請先完成驗證，再回來登入帳號。"}
          </p>
          {email && (
            <p className="mt-2 break-all rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-sm font-medium text-emerald-900">
              {email}
            </p>
          )}
        </div>

        <div className="app-muted-panel space-y-3">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                請先完成驗證
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                開啟收件匣中的驗證信，點擊連結完成帳號啟用。若沒有看到信件，請檢查垃圾郵件或促銷分類。
              </p>
            </div>
          </div>
          <div className="flex gap-3 border-t border-slate-200/70 pt-3">
            <Clock className="mt-0.5 h-5 w-5 flex-none text-emerald-700" />
            <p className="text-sm leading-6 text-slate-600">
              驗證連結有時效限制。連結失效時，請在此頁重新寄送驗證信。
            </p>
          </div>
        </div>

        {!email && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
            <p className="leading-6">
              目前頁面沒有註冊信箱資訊。若您是直接開啟此頁，請使用原本信箱中的驗證連結，或回到註冊頁重新開始流程。
            </p>
          </div>
        )}

        {resendMessage && (
          <div
            className={`flex gap-3 rounded-lg border p-4 text-sm ${
              resendSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {resendSuccess ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
            )}
            <p className="leading-6">{resendMessage}</p>
          </div>
        )}

        <div className="space-y-3">
          {email ? (
            <>
              <Button
                onClick={handleResendEmail}
                disabled={isResending || resendCooldown > 0}
                className="app-secondary-button w-full"
                variant="outline"
              >
                {isResending ? (
                  <>
                    <Loader size="sm" />
                    寄送中
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    {resendCooldown} 秒後可重新寄送
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    重新寄送驗證信
                  </>
                )}
              </Button>
              <Button
                onClick={() => navigate("/login")}
                className="app-primary-button w-full"
              >
                完成驗證後前往登入
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate("/register")}
              className="app-primary-button w-full"
            >
              返回註冊頁
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </AuthFormLayout>
  );
};

export default EmailVerificationPending;
