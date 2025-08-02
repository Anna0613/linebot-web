import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";

const EmailVerificationPending = () => {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    // 這裡需要用戶提供郵箱地址，或者從註冊流程中傳遞
    // 暫時先提示用戶聯繫客服
    setResendMessage("如需重新發送驗證郵件，請聯繫客服或重新註冊。");
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28 pb-12">
        <div className="max-w-md w-full">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                <Mail className="w-12 h-12 text-blue-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                註冊成功！
              </h2>
              
              <div className="text-center space-y-4 mb-8">
                <p className="text-gray-600">
                  我們已經向您的電子郵件地址發送了驗證連結。
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">請檢查您的郵箱：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>查看收件匣中的驗證郵件</li>
                        <li>如果沒看到，請檢查垃圾郵件資料夾</li>
                        <li>點擊郵件中的驗證連結完成註冊</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500">
                  驗證連結將在 24 小時後失效
                </p>
              </div>

              {resendMessage && (
                <div className={`mb-6 p-4 rounded-lg text-center ${
                  resendSuccess 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}>
                  <p className="text-sm">{resendMessage}</p>
                </div>
              )}

              <div className="space-y-4 w-full">
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="w-full bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 border"
                  variant="outline"
                >
                  {isResending ? (
                    <>
                      <Loader size="sm" className="mr-2" />
                      發送中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新發送驗證郵件
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleLoginRedirect}
                  className="w-full bg-[#F4CD41] text-[#1a1a40] font-bold hover:bg-[#e6bc00]"
                >
                  我稍後再驗證，先去登入
                </Button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  如果您遇到任何問題，請聯繫我們的客服團隊
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EmailVerificationPending;