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
import { API_CONFIG, getApiUrl } from "../config/apiConfig";

const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3); // 倒數秒數

  useEffect(() => {
    const checkSession = async () => {
      try {
        const resp = await fetch(
          getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN),
          { method: 'GET', credentials: 'include' }
        );
        const data = await resp.json();
        if (!data?.authenticated) {
          setTimeout(() => navigate("/login", { replace: true }), 1500);
        }
      } catch (_e) {
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    };

    checkSession();

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-[#425B4F]" />
          </div>
          <CardTitle className="text-2xl text-[#425B4F]">登入成功！</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">您已成功登入</p>
          <p className="text-sm text-muted-foreground">
            {countdown > 0
              ? `${countdown} 秒後將自動跳轉到主頁面...`
              : "正在跳轉..."}
          </p>
          <Button
            onClick={handleContinue}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold rounded-[5px] text-[16px] hover:bg-[hsl(var(--line-green-hover))]"
          >
            立即進入
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginSuccess;
