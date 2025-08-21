import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle } from "lucide-react";
import { authManager } from "../services/UnifiedAuthManager";

const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3); // 倒數秒數

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("=== LoginSuccess 頁面初始化 ===");

      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      const urlUsername = urlParams.get("username");
      const urlEmail = urlParams.get("email");

      if (urlToken) {
        authManager.setTokenInfo(
          { access_token: urlToken, token_type: "Bearer" },
          "line"
        );

        if (urlUsername) {
          authManager.setUserInfo({
            username: urlUsername,
            email: urlEmail || "",
            login_type: "line",
          });
        }

        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (!authManager.isAuthenticated()) {
        setTimeout(() => navigate("/login", { replace: true }), 2000);
        return;
      }
    };

    initializeAuth();

    // 設定倒數計時器
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/dashboard", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleContinue = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">登入成功！</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">您已成功透過 LINE 登入系統</p>
          <p className="text-sm text-gray-500">
            {countdown > 0
              ? `${countdown} 秒後將自動跳轉到主頁面...`
              : "正在跳轉..."}
          </p>
          <Button
            onClick={handleContinue}
            className="w-full bg-[#F4CD41] text-[#1a1a40] font-bold rounded-[5px] text-[16px] hover:bg-[#e6bc00]"
          >
            立即進入
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginSuccess;