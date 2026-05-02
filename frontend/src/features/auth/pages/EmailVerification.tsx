import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { CheckCircle, XCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
          setMessage("電子郵件驗證成功！");
        } else {
          setStatus("error");
          setMessage(data.message || "驗證失敗，請重試");
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
          <div className="flex flex-col items-center">
            <Loader fullPage={false} text="正在驗證您的電子郵件..." web3Style={true} />
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              驗證成功！
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              您的電子郵件已經成功驗證。
              <br />
              現在可以使用您的帳號登入了。
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="web3-primary-button px-8"
            >
              前往登入
            </Button>
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">驗證失敗</h2>
            <p className="text-muted-foreground text-center mb-4">
              {message}
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-2">💡 可能的解決方法：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>檢查您是否點擊了正確的驗證連結</li>
                  <li>驗證連結可能已經過期（24小時後失效）</li>
                  <li>如果連結已過期，您可以重新註冊</li>
                  <li>確認您的網路連線正常</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-4 w-full">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="rounded-full px-8 w-full"
              >
                重試
              </Button>
              <Button
                onClick={() => navigate("/register")}
                className="web3-button px-8 w-full"
              >
                重新註冊
              </Button>
              <Button
                onClick={() => navigate("/login")}
                className="web3-primary-button px-8 w-full"
              >
                返回登入頁面
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                如果問題持續存在，請聯繫我們的客服團隊尋求協助
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28 pb-12">
        <div className="max-w-md w-full">
          <div className="web3-glass-card p-8 web3-hover-glow">
            {renderContent()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EmailVerification;
