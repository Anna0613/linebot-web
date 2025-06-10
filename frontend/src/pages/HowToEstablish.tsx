import StepOne from '../components/HowToEstablish/StepOne';
import StepTwo from '../components/HowToEstablish/StepTwo';
import StepThree from '../components/HowToEstablish/StepThree';
import StepFour from '../components/HowToEstablish/StepFour';
import Navbar2 from '../components/LoginHome/Navbar2';
import Footer2 from '../components/LoginHome/Footer2';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';
import { ChevronRight, CheckCircle, Circle } from 'lucide-react';
import { useAuthGuard } from '../hooks/useAuthGuard';

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

  // 使用身份驗證保護Hook
  useAuthGuard({
    requireAuth: true,
    preventBackToLogin: true,
    redirectTo: '/login'
  });

  const steps = [
    { id: 1, title: '註冊 LINE Developer', completed: false },
    { id: 2, title: '建立 Provider', completed: false },
    { id: 3, title: '建立 Channel', completed: false },
    { id: 4, title: '取得 API 金鑰', completed: false },
  ];

  useEffect(() => {
    const token = searchParams.get('token');
    const displayName = searchParams.get('display_name');
  
    const verify = async () => {
      setLoading(true);
      if (token) {
        localStorage.setItem('auth_token', token);
        const userData = await verifyLineToken(token);
        if (userData) {
          setUser(userData);
          setLoading(false);
        } else {
          setError('LINE Token 驗證失敗');
          navigate('/line-login');
        }
      } else if (displayName) {
        setUser({ display_name: displayName });
        setLoading(false);
      } else {
        const storedToken = localStorage.getItem('auth_token');
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
  }, [searchParams, navigate]);

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
  }, []);

  const verifyLineToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Token 驗證失敗');
      return await response.json();
    } catch (error) {
      console.error('驗證 LINE token 錯誤:', error);
      return null;
    }
  };

  const nativeFetch = window.fetch.bind(window); // 保存原生 fetch

  const checkLoginStatus = async () => {
    try {
      const response = await nativeFetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const username = data.message.split('User ')[1].split(' is logged in')[0];
        setUser({ display_name: username, username });
      } else {
        const errorData = await response.json();
        console.error('check_login error:', errorData);
        setError('請先登入');
        navigate('/login');
      }
      setLoading(false);
    } catch (error) {
      console.error('檢查登入狀態錯誤:', error);
      setError('請先登入');
      navigate('/login');
      setLoading(false);
    }
  };

  const scrollToStep = (stepId: number) => {
    const element = document.getElementById(`step-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFFDFA] to-[#F8F6F3]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FFFDFA] to-[#F8F6F3]">
      <Navbar2 user={user}/>
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center fade-in-element">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            如何建立您的 <span className="text-gradient">LINE Bot</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            只需四個簡單步驟，您就能在 LINE Developers 平台上成功建立您的機器人應用程式
          </p>
          
          {/* Progress Indicator */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-glass max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div 
                    className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                      currentStep >= step.id ? 'opacity-100' : 'opacity-50'
                    }`}
                    onClick={() => scrollToStep(step.id)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                      currentStep > step.id 
                        ? 'bg-line text-white shadow-lg' 
                        : currentStep === step.id 
                        ? 'bg-primary text-white shadow-lg scale-110' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <span className="font-semibold">{step.id}</span>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${
                      currentStep > step.id ? 'bg-line' : 'bg-gray-200'
                    }`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Steps Content */}
      <main className="flex flex-col">
        <div id="step-1">
          <StepOne />
        </div>
        <div id="step-2">
          <StepTwo />
        </div>
        <div id="step-3">
          <StepThree />
        </div>
        <div id="step-4">
          <StepFour />
        </div>
      </main>

      {/* Call to Action Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary/10 to-line/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            準備好開始建立您的 LINE Bot 了嗎？
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            完成以上步驟後，您就可以使用我們的平台輕鬆建立和管理您的 LINE Bot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToStep(1)}
              className="inline-flex items-center px-8 py-3 bg-white text-foreground rounded-full shadow-lg hover:shadow-xl transition-all font-medium"
            >
              重新開始教學
              <ChevronRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <Footer2 />
    </div>
  );
};

export default HowToEstablish;

