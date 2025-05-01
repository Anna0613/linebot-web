import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import { CustomAlert } from "@/components/ui/custom-alert";
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Alert state
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'error' as 'success' | 'error' | 'info'
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
  };

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Token verification failed');
      return await response.json();
    } catch (error) {
      console.error('Token 驗證失敗:', error);
      return null;
    }
  };

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token).then((user) => {
        if (user && user.display_name) {
          console.log("LINE 登入成功", user);
          localStorage.setItem("line_token", token);
          localStorage.setItem("username", user.display_name);
          localStorage.setItem("email", user.email || '');
          showAlert("登入成功！", "success");
          navigate("/index2");
        } else {
          showAlert("LINE 登入驗證失敗，請重試", "error");
        }
      });
    }
  }, [searchParams]);

  const handleLINELogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN));
      const data = await response.json();
      if (!data.login_url) throw new Error("登入連結取得失敗");
      window.location.href = data.login_url;
    } catch (error) {
      console.error("LINE login error:", error);
      showAlert("LINE 登入失敗，請稍後再試", "error");
      setLoading(false);
    }
  };
  
  const nativeFetch = window.fetch.bind(window);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    if (!username || !password) {
      showAlert("請輸入使用者名稱和密碼", "error");
      setLoading(false);
      return;
    }
  
    const data = { username, password };
  
    try {
      const response = await nativeFetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGIN), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = "登入失敗";
        
        // 根據不同錯誤類型顯示不同信息
        switch (errorData.error) {
          case "INVALID_PASSWORD":
            errorMessage = "密碼錯誤，請重新輸入";
            break;
          case "USER_NOT_FOUND":
            errorMessage = "找不到此使用者，請確認帳號是否正確";
            break;
          case "EMAIL_NOT_VERIFIED":
            errorMessage = "請先完成電子郵件驗證";
            break;
          case "ACCOUNT_LOCKED":
            errorMessage = "帳號已被鎖定，請聯繫客服";
            break;
          default:
            errorMessage = errorData.message || "登入失敗，請稍後再試";
        }
        
        throw new Error(errorMessage);
      }
  
      const resData = await response.json();
      localStorage.setItem("username", username);
      localStorage.setItem("email", resData.email || "");
  
      showAlert("登入成功！", "success");
      navigate("/index2");
    } catch (error: any) {
      console.error("錯誤:", error);
      showAlert(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {loading && <Loader fullPage />}
      <CustomAlert 
        isOpen={alert.show}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert(prev => ({ ...prev, show: false }))}
      />

      <div className="flex-1 flex items-center justify-center py-6 xs:py-8 sm:py-12 px-3 sm:px-6 lg:px-8 mt-14 sm:mt-16 md:mt-20">
        <div className="w-full max-w-[88%] xs:max-w-[85%] sm:max-w-md">
          <div className="text-center mb-4 xs:mb-6 sm:mb-10 fade-in-element">
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold tracking-tight">登入</h2>
          </div>

          <div className="glassmorphism p-6 xs:p-7 sm:p-8 rounded-2xl shadow-glass-sm fade-in-element mx-auto" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col items-center space-y-3 xs:space-y-4 mb-5 xs:mb-6">
              <Button
                onClick={handleLINELogin}
                disabled={loading}
                className="w-full rounded-full bg-green-500 hover:bg-green-600 text-white text-xs xs:text-sm sm:text-base font-semibold h-10 xs:h-11 sm:h-12 relative transition-all duration-200"
              >
                {loading ? '載入中...' : 'LINE 登入'}
              </Button>
              <div className="flex items-center w-full max-w-[280px] sm:max-w-full mx-auto">
                <hr className="flex-grow border-gray-300" />
                <span className="mx-2 xs:mx-3 text-gray-500 text-xs xs:text-sm">或以帳號繼續</span>
                <hr className="flex-grow border-gray-300" />
              </div>
            </div>

            <form className="space-y-4 xs:space-y-5 sm:space-y-6 max-w-[280px] sm:max-w-full mx-auto" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm sm:text-base">使用者名稱：</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm sm:text-base">密碼：</Label>
                  <Link
                    to="/forgetthepassword"
                    className="text-[10px] xs:text-xs sm:text-sm text-primary hover:text-primary/80 hover-underline transition-colors"
                  >
                    忘記密碼？
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                  />
                  <Label htmlFor="remember-me" className="text-xs xs:text-sm font-normal">
                    記住帳號
                  </Label>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11 relative transition-all duration-200"
              >
                {loading ? '載入中...' : '登入'}
              </Button>
            </form>

            <div className="mt-4 xs:mt-5 sm:mt-6 text-center text-xs xs:text-sm">
              <span className="text-muted-foreground">沒有帳號?</span>{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 font-medium hover-underline transition-colors">
                註冊
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] xs:text-xs sm:text-sm text-muted-foreground fade-in-element max-w-[280px] sm:max-w-full mx-auto" style={{ animationDelay: '0.3s' }}>
            我已閱讀並同意{' '}
            <Link to="#" className="underline hover:text-primary transition-colors">
              服務條款
            </Link>{' '}
            及{' '}
            <Link to="#" className="underline hover:text-primary transition-colors">
              隱私權政策
            </Link>
            .
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
