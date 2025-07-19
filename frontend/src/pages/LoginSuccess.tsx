import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle } from "lucide-react";
import { AuthService } from "../services/auth";

const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("=== LoginSuccess 頁面初始化 ===");

      // 檢查 URL 參數中的 token
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      const urlUsername = urlParams.get("username");
      const urlEmail = urlParams.get("email");
      const urlLoginType = urlParams.get("login_type");

      console.log("URL 參數:", {
        token: urlToken ? "存在" : "不存在",
        username: urlUsername,
        email: urlEmail,
        loginType: urlLoginType,
      });

      if (urlToken) {
        // 保存 token 和用戶資料
        console.log("從 URL 參數獲取 token，保存到 localStorage");
        AuthService.setToken(urlToken);

        if (urlUsername) {
          AuthService.setUser({
            username: urlUsername,
            email: urlEmail || "",
          });
          console.log("用戶資料已保存");
        }

        // 清除 URL 參數（安全考量）
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }

      // 檢查認證狀態
      const isAuthenticated = AuthService.isAuthenticated();
      console.log("認證狀態:", isAuthenticated);

      if (!isAuthenticated) {
        console.log("認證失敗，重導向到登入頁面");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
        return;
      }

      // 驗證用戶資料
      const currentUser = AuthService.getUser();
      console.log("當前用戶資料:", currentUser);

      console.log("認證成功，3秒後跳轉到主頁面");
    };

    initializeAuth();

    // 設定自動跳轉定時器
    const timer = setTimeout(() => {
      console.log("自動跳轉到主頁面");
      navigate("/dashboard", { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
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
          <p className="text-sm text-gray-500">3 秒後將自動跳轉到主頁面...</p>
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
