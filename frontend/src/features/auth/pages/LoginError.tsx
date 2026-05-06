import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// Removed unused Card components
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw } from "lucide-react";
import AuthFormLayout from "../components/AuthFormLayout";

const LoginError: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // 從 URL 參數取得錯誤訊息
    const error = searchParams.get("error");
    setErrorMessage(error || "未知錯誤");
  }, [searchParams]);

  const handleRetryLogin = () => {
    navigate("/login", { replace: true });
  };

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <AuthFormLayout title="登入失敗" description="LINE 登入沒有完成，請重新試一次。">
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
          <XCircle className="h-7 w-7" />
        </div>
        <p className="text-sm leading-6 text-slate-600">
          LINE 登入過程中發生錯誤。
        </p>
        {errorMessage && (
          <div className="mt-4 w-full rounded-lg border border-rose-200 bg-rose-50 p-3 text-left">
            <p className="break-words text-sm leading-6 text-rose-800">
              錯誤詳情：{errorMessage}
            </p>
          </div>
        )}
        <div className="mt-6 w-full space-y-3">
          <Button
            onClick={handleRetryLogin}
            className="app-primary-button w-full"
          >
            <RefreshCw className="h-4 w-4" />
            重試登入
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="app-secondary-button w-full">
            返回首頁
          </Button>
        </div>
      </div>
    </AuthFormLayout>
  );
};

export default LoginError;
