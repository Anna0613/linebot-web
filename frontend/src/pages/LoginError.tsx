import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// Removed unused Card components
import { Button } from "../components/ui/button";
import { XCircle, RefreshCw } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="web3-glass-card w-full max-w-md p-8 web3-hover-glow">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-web3-red" />
          </div>
          <h2 className="text-2xl font-bold text-web3-red mb-4">登入失敗</h2>
        </div>
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">LINE 登入過程中發生錯誤</p>
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-700 dark:text-red-300">錯誤詳情：{errorMessage}</p>
            </div>
          )}
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleRetryLogin}
              className="w-full web3-primary-button flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重試登入</span>
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              返回首頁
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginError;
