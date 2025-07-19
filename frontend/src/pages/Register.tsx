import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import "@/components/ui/loader.css";
import { LineLoginService } from '../services/lineLogin';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyLineLogin(token);
    }
  }, [searchParams]);

  const verifyLineLogin = async (token: string) => {
    try {
      const lineLoginService = LineLoginService.getInstance();
      const result = await lineLoginService.verifyToken(token);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.display_name) {
        localStorage.setItem("line_token", token);
        localStorage.setItem("username", result.display_name);
        if (result.email) {
          localStorage.setItem("email", result.email);
        }
        toast({
          title: "註冊成功！",
          description: "歡迎加入我們",
        });
        navigate("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "驗證失敗",
          description: "LINE 驗證失敗：未取得有效的使用者資料",
        });
      }
    } catch (error) {
      console.error('LINE登入驗證失敗:', error);
      toast({
        variant: "destructive",
        title: "登入失敗",
        description: "LINE 登入失敗，請稍後再試",
      });
    }
  };

  const handleLINELogin = async () => {
    setLoading(true);
    try {
      const lineLoginService = LineLoginService.getInstance();
      const result = await lineLoginService.getLoginUrl();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.login_url) {
        throw new Error("登入連結取得失敗");
      }

      window.location.href = result.login_url;
    } catch (error) {
      console.error("LINE login error:", error);
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!username || !password || !confirmPassword || !email) {
      toast({
        variant: "destructive",
        title: "輸入錯誤",
        description: "請填寫所有必填欄位",
      });
      return false;
    }

    if (username.length < 2) {
      toast({
        variant: "destructive",
        title: "輸入錯誤",
        description: "使用者名稱至少需要2個字元",
      });
      return false;
    }

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "密碼錯誤",
        description: "密碼長度至少需要8位",
      });
      return false;
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      toast({
        variant: "destructive",
        title: "密碼錯誤",
        description: "密碼需要包含至少一個字母和一個數字",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "密碼錯誤",
        description: "確認密碼與密碼不符",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "電子郵件錯誤",
        description: "請輸入有效的電子郵件地址",
      });
      return false;
    }

    if (!agreeToTerms) {
      toast({
        variant: "destructive",
        title: "條款同意",
        description: "請閱讀並同意服務條款與隱私權政策",
      });
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.REGISTER), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage;
        
        if (response.status === 409) {
          errorMessage = "此帳號或電子郵件已被註冊";
        } else {
          switch (errorData.error) {
            case "USERNAME_EXISTS":
              errorMessage = "此使用者名稱已被使用";
              break;
            case "EMAIL_EXISTS":
              errorMessage = "此電子郵件已被註冊";
              break;
            case "INVALID_USERNAME":
              errorMessage = "使用者名稱格式不正確";
              break;
            case "INVALID_EMAIL":
              errorMessage = "電子郵件格式不正確";
              break;
            case "INVALID_PASSWORD":
              errorMessage = "密碼格式不正確";
              break;
            default:
              errorMessage = errorData.error || errorData.message || "註冊失敗，請稍後再試";
          }
        }
        
        throw new Error(errorMessage);
      }

      const resData = await response.json();
      toast({
        title: "註冊成功！",
        description: "請檢查電子郵件以完成驗證",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("註冊錯誤:", error);
      toast({
        variant: "destructive",
        title: "註冊失敗",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAgreeToTermsChange = (checked: boolean | "indeterminate") => {
    setAgreeToTerms(checked === true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {loading && <Loader fullPage />}

      <div className="flex-1 flex items-center justify-center py-6 xs:py-8 sm:py-12 px-3 sm:px-6 lg:px-8 mt-14 sm:mt-16 md:mt-20">
        <div className="w-full max-w-[88%] xs:max-w-[85%] sm:max-w-md">
          <div className="text-center mb-4 xs:mb-6 sm:mb-10 fade-in-element">
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold tracking-tight">註冊</h2>
          </div>

          <div className="glassmorphism p-6 xs:p-7 sm:p-8 rounded-2xl shadow-glass-sm fade-in-element mx-auto" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col items-center space-y-3 xs:space-y-4 mb-5 xs:mb-6 max-w-[280px] sm:max-w-full mx-auto">
              <Button
                onClick={handleLINELogin}
                disabled={loading}
                className="w-full rounded-full bg-[#06C755] hover:bg-[#06C755]/90 text-white text-xs xs:text-sm sm:text-base font-semibold h-10 xs:h-11 sm:h-12 relative transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <img src="/assets/images/line-logo.svg" alt="LINE" className="w-5 h-5" />
                {loading ? (
                  <span className="flex items-center gap-2">
                    載入中
                    <span className="loading loading-dots loading-sm"></span>
                  </span>
                ) : (
                  'LINE 註冊'
                )}
              </Button>
              <div className="flex items-center w-full max-w-[280px] sm:max-w-full mx-auto">
                <hr className="flex-grow border-gray-300" />
                <span className="mx-2 xs:mx-3 text-gray-500 text-xs xs:text-sm">或以帳號繼續</span>
                <hr className="flex-grow border-gray-300" />
              </div>
            </div>

            <form className="space-y-4 xs:space-y-5 sm:space-y-6 max-w-[280px] sm:max-w-full mx-auto" onSubmit={handleRegister}>
              <div className="space-y-1.5 w-full">
                <Label htmlFor="username">使用者名稱：</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="至少2個字元"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base focus:ring-2 focus:ring-[#F4CD41] focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm sm:text-base">電子郵件：</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base focus:ring-2 focus:ring-[#F4CD41] focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm sm:text-base">密碼：</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="至少8位，含字母和數字"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base focus:ring-2 focus:ring-[#F4CD41] focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm sm:text-base">確認密碼：</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="請再次輸入密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base focus:ring-2 focus:ring-[#F4CD41] focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="flex items-start space-x-2 mt-2 max-w-[280px] sm:max-w-full mx-auto">
                <Checkbox
                  id="agree-terms"
                  checked={agreeToTerms}
                  onCheckedChange={handleAgreeToTermsChange}
                  required
                />
                <Label htmlFor="agree-terms" className="text-xs sm:text-sm font-normal leading-tight">
                  我已閱讀並同意{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline transition-colors">服務條款</Link> 及{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline transition-colors">隱私權政策</Link>
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11 relative transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    載入中
                    <span className="loading loading-dots loading-sm"></span>
                  </span>
                ) : (
                  '註冊'
                )}
              </Button>
            </form>

            <div className="mt-4 xs:mt-5 sm:mt-6 text-center text-xs xs:text-sm">
              <span className="text-muted-foreground">已有帳號? </span>
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium hover-underline transition-colors">登入</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
