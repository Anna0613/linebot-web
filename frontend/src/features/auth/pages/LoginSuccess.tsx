import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Removed unused Card components
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import AuthFormLayout from "../components/AuthFormLayout";
import { API_CONFIG, getApiUrl } from "@/config/apiConfig";

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
    <AuthFormLayout title="登入完成" description="正在帶你回到 LINE Bot 工作台。">
      <div className="flex flex-col items-center text-center">
        <div className="app-soft-icon mb-5 h-14 w-14">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {countdown > 0
            ? `${countdown} 秒後自動進入工作台。`
            : "正在前往工作台。"}
        </p>
        <Button
          onClick={handleContinue}
          className="app-primary-button mt-6 w-full"
        >
          進入工作台
        </Button>
      </div>
    </AuthFormLayout>
  );
};

export default LoginSuccess;
