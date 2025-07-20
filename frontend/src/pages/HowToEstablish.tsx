import { useState, useEffect, useCallback, useMemo } from "react";
import StepOne from "../components/HowToEstablish/StepOne";
import StepTwo from "../components/HowToEstablish/StepTwo";
import StepThree from "../components/HowToEstablish/StepThree";
import StepFour from "../components/HowToEstablish/StepFour";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { ChevronRight, CheckCircle, Circle } from "lucide-react";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string; // 新增以支援帳號密碼登入
}

const HowToEstablish = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  // 使用統一身份驗證Hook
  const { user: authUser, loading: authLoading, error: authError } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });

  const steps = useMemo(
    () => [
      { id: 1, title: "註冊 LINE Developer", completed: false },
      { id: 2, title: "建立 Provider", completed: false },
      { id: 3, title: "建立 Channel", completed: false },
      { id: 4, title: "取得 API 金鑰", completed: false },
    ],
    []
  );

  useEffect(() => {
    const token = searchParams.get("token");
    const displayName = searchParams.get("display_name");

    const verify = async () => {
      setLoading(true);
      if (token) {
        localStorage.setItem("auth_token", token);
        const userData = await verifyLineToken(token);
        if (userData) {
          setUser(userData);
          setLoading(false);
        } else {
          setError("LINE Token 驗證失敗");
          navigate("/line-login");
        }
      } else if (displayName) {
        setUser({ display_name: displayName });
        setLoading(false);
      } else {
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          const userData = await verifyLineToken(storedToken);
          if (userData) {
            setUser(userData);
            setLoading(false);
          } else {
            setTimeout(() => {
              checkLoginStatus();
            }, 3000); // 延遲 3 秒
          }
        } else {
          setTimeout(() => {
            checkLoginStatus();
          }, 3000); // 延遲 3 秒
        }
      }
    };

    verify();
  }, [searchParams, navigate, checkLoginStatus]);

  // Intersection Observer for step tracking
  useEffect(() => {
    const observers = steps.map((step, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setCurrentStep(index + 1);
            }
          });
        },
        { threshold: 0.5 }
      );

      const element = document.getElementById(`step-${step.id}`);
      if (element) {
        observer.observe(element);
      }

      return observer;
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [steps]);

  const verifyLineToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(
        getApiUrl(
          API_CONFIG.LINE_LOGIN.BASE_URL,
          API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      if (!response.ok) throw new Error("Token 驗證失敗");
      return await response.json();
    } catch (error) {
      console.error("驗證 LINE token 錯誤:", error);
      return null;
    }
  };

  const nativeFetch = window.fetch.bind(window); // 保存原生 fetch

  const checkLoginStatus = useCallback(async () => {
    try {
      const response = await nativeFetch(
        getApiUrl(
          API_CONFIG.AUTH.BASE_URL,
          API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN
        ),
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(localStorage.getItem("auth_token") && {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // 檢查新的 API 回應格式 (authenticated + user)
        if (data.authenticated && data.user) {
          setUser({
            display_name: data.user.username,
            username: data.user.username,
          });
        } else if (data.authenticated === false) {
          // 明確處理未登入情況
          console.log("用戶未登入，重定向到登入頁面");
          setError("請先登入以查看此頁面");
          navigate("/login");
          return;
        }
        // 相容舊格式：檢查 data.message 是否存在且格式正確
        else if (data.message && typeof data.message === "string") {
          const messagePattern = /User (.+?) is logged in/;
          const match = data.message.match(messagePattern);

          if (match && match[1]) {
            const username = match[1];
            setUser({ display_name: username, username });
          } else {
            throw new Error("無法從回應中解析用戶名稱");
          }
        } else {
          throw new Error("無效的 API 回應格式");
        }
      } else {
        const errorData = await response.json();
        console.error("check_login error:", errorData);
        setError("請先登入");
        navigate("/login");
      }
      setLoading(false);
    } catch (error) {
      console.error("檢查登入狀態錯誤:", error);
      setError("請先登入");
      navigate("/login");
      setLoading(false);
    }
  }, [navigate, setUser, setError, setLoading, nativeFetch]);

  const scrollToStep = (stepId: number) => {
    const element = document.getElementById(`step-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDFA] flex items-center justify-center">
        <div className="text-[#5A2C1D] text-lg loading-pulse">
          載入教學內容...
        </div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <StepOne onNext={nextStep} />;
      case 2:
        return <StepTwo onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <StepThree onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <StepFour onPrev={prevStep} />;
      default:
        return <StepOne onNext={nextStep} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFA]">
      <DashboardNavbar user={user} />

      {/* 主要內容區域 */}
      <div className="pt-14 sm:pt-16 md:pt-20 pb-12 sm:pb-16 px-4 sm:px-6">
        {/* 標題區域 */}
        <div className="text-center mb-8 sm:mb-12 fade-in-element">
          <h1 className="text-[#1a1a40] text-2xl sm:text-3xl md:text-[36px] lg:text-[42px] font-bold mb-3 sm:mb-4 leading-tight tracking-wide px-2">
            LINE Bot 建立教學
          </h1>
          <p className="text-[#5A2C1D] text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-4">
            跟著我們的詳細步驟，輕鬆建立您的第一個 LINE Bot
          </p>
        </div>

        {/* 進度指示器 */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-[#F4A261]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-[#383A45] text-lg sm:text-xl font-bold text-center sm:text-left">
                教學進度
              </h2>
              <span className="text-[#5A2C1D] font-medium text-sm sm:text-base text-center sm:text-right">
                第 {currentStep} 步，共 4 步
              </span>
            </div>

            {/* 桌面版進度指示器 */}
            <div className="hidden sm:grid sm:grid-cols-4 gap-3 md:gap-4">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => goToStep(step)}
                  className={`p-3 md:p-4 rounded-lg text-center transition-all duration-200 ${
                    step === currentStep
                      ? "bg-[#F4A261] text-white shadow-lg transform scale-105"
                      : step < currentStep
                        ? "bg-[#A0D6B4] text-white hover:shadow-md"
                        : "bg-gray-100 text-[#5A2C1D] hover:bg-gray-200"
                  }`}
                >
                  <div className="font-bold text-base md:text-lg mb-1">
                    步驟 {step}
                  </div>
                  <div className="text-xs md:text-sm">
                    {step === 1 && "建立頻道"}
                    {step === 2 && "設定 Webhook"}
                    {step === 3 && "取得金鑰"}
                    {step === 4 && "完成設定"}
                  </div>
                </button>
              ))}
            </div>

            {/* 手機版進度指示器 */}
            <div className="sm:hidden space-y-3">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => goToStep(step)}
                  className={`w-full p-3 rounded-lg text-left transition-all duration-200 flex items-center justify-between ${
                    step === currentStep
                      ? "bg-[#F4A261] text-white shadow-lg"
                      : step < currentStep
                        ? "bg-[#A0D6B4] text-white"
                        : "bg-gray-100 text-[#5A2C1D] hover:bg-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="font-bold text-lg">步驟 {step}</div>
                    <div className="text-sm">
                      {step === 1 && "建立頻道"}
                      {step === 2 && "設定 Webhook"}
                      {step === 3 && "取得金鑰"}
                      {step === 4 && "完成設定"}
                    </div>
                  </div>
                  {step === currentStep && (
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  )}
                  {step < currentStep && (
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 進度條 */}
            <div className="mt-4 sm:mt-6">
              <div className="bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#F4A261] to-[#A0D6B4] h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 步驟內容區域 */}
        <div className="max-w-5xl mx-auto">{renderCurrentStep()}</div>

        {/* 行動呼籲區域 */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto mt-12 sm:mt-16">
            <div className="bg-gradient-to-r from-[#8ECAE6] to-[#A0D6B4] rounded-lg shadow-lg p-6 sm:p-8 md:p-12 text-white text-center">
              <h2 className="text-white text-xl sm:text-2xl md:text-[28px] font-bold mb-4 sm:mb-6">
                恭喜！您已完成所有設定
              </h2>
              <p className="text-white/90 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto">
                現在您可以開始建立您的第一個 LINE Bot 了
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md mx-auto">
                <button
                  onClick={() => (window.location.href = "/add%20server")}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-[#383A45] font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-base sm:text-lg"
                >
                  立即建立 Bot
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-[#FFD59E] text-[#5A2C1D] font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-base sm:text-lg"
                >
                  重新查看教學
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DashboardFooter />
    </div>
  );
};

export default HowToEstablish;
