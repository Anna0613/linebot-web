import { useState, useEffect, useMemo } from "react";
import StepOne from "../components/HowToEstablish/StepOne";
import StepTwo from "../components/HowToEstablish/StepTwo";
import StepThree from "../components/HowToEstablish/StepThree";
import StepFour from "../components/HowToEstablish/StepFour";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useNavigate } from "react-router-dom";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";

const ACCENT = "#3D5A80";   
const ACCENT_LT = "#98C1D9"; 

const HowToEstablish = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // 使用統一身份驗證Hook - 不強制要求登入
  const { user, loading, isAuthenticated } = useUnifiedAuth({
    requireAuth: false, // 允許未登入用戶訪問
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[#5A2C1D] text-lg">
          載入中...
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
    <div className="min-h-screen bg-background">
      {/* 根據登入狀態顯示不同的導航欄 */}
      {isAuthenticated ? <DashboardNavbar user={user} /> : <Navbar />}

      {/* 主要內容區域 */}
      <div className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">

        <div className="text-center mb-8 sm:mb-12 fade-in-element">
          <h1 className="text-foreground text-2xl sm:text-3xl md:text-[36px] lg:text-[42px] font-bold mb-3 sm:mb-4 leading-tight tracking-wide px-2">
            LINE Bot 建立教學
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-4">
            跟著我們的詳細步驟，輕鬆建立您的第一個 LINE Bot
          </p>
        </div>

        {/* 進度指示器 */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="bg-card rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-[hsl(var(--primary))]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-[#383A45] text-lg sm:text-xl font-bold text-center sm:text-left">
                教學進度
              </h2>
              <span className="text-muted-foreground font-medium text-sm sm:text-base text-center sm:text-right">
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
                      ? "bg-[hsl(var(--primary))] text-white shadow-lg transform scale-105"
                      : step < currentStep
                        ? "bg-[hsl(var(--line-green))]/30 text-foreground hover:shadow-md"
                        : "bg-secondary text-muted-foreground hover:bg-gray-200"
                  }`}
                  style={
                    step === currentStep
                      ? { backgroundColor: ACCENT }
                      : step < currentStep
                      ? { backgroundColor: ACCENT_LT }
                      : {}
                  }
                >
                  <div className="font-bold text-base md:text-lg mb-1">步驟 {step}</div>
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
                      ? "bg-[hsl(var(--primary))] text-white shadow-lg"
                      : step < currentStep
                        ? "bg-[hsl(var(--line-green))]/30 text-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-gray-200"
                  }`}
                  style={
                    step === currentStep
                      ? { backgroundColor: ACCENT }
                      : step < currentStep
                      ? { backgroundColor: ACCENT_LT }
                      : {}
                  }
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
                  {step === currentStep && <div className="w-3 h-3 bg-white rounded-full"></div>}
                  {step < currentStep && (
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
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
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(currentStep / 4) * 100}%`,
                    background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_LT} 100%)`,
                  }}
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
            <div className="bg-[hsl(var(--primary))] rounded-lg shadow-lg p-6 sm:p-8 md:p-12 text-white text-center">
              <h2 className="text-white text-xl sm:text-2xl md:text-[28px] font-bold mb-4 sm:mb-6">
                恭喜！您已完成所有設定
              </h2>
              <p className="text-white text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto">
                現在您可以開始建立您的第一個 LINE Bot 了
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md mx-auto">

                <button
                  onClick={() => navigate("/bots/create")}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-[#383A45] font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-base sm:text-lg"
                >
                  立即建立 Bot
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-secondary text-foreground font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-base sm:text-lg"
                >
                  重新查看教學
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default HowToEstablish;