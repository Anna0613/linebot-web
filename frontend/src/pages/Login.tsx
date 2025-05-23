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
import { LineLoginService } from '../services/lineLogin';
import { ApiClient } from '../services/api';
import { AuthService } from '../services/auth';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'error' as 'success' | 'error' | 'info'
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
  };

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
        showAlert("登入成功！", "success");
        navigate("/index2");
      } else {
        throw new Error("LINE 登入驗證失敗");
      }
    } catch (error) {
      console.error('LINE登入驗證失敗:', error);
      showAlert("LINE 登入驗證失敗，請重試", "error");
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
      showAlert("LINE 登入失敗，請稍後再試", "error");
      setLoading(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username || !password) {
      showAlert("請輸入使用者名稱和密碼", "error");
      setLoading(false);
      return;
    }

    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.login(username, password);

      if (response.error) {
        throw new Error(response.error);
      }

      // 打印檢查能否從 localStorage 獲取 token
      console.log('登入後檢查 token:', AuthService.getToken());

      // 確保我們獲取到了 token，嘗試從不同來源
      let token = AuthService.getToken();
      
      // 如果沒有從 AuthService 獲取到，直接從響應中獲取並設置
      if (!token && response.data && response.data.token) {
        AuthService.setToken(response.data.token);
        token = response.data.token;
        console.log('直接從響應設置 token');
      }

      if (!token) {
        console.error("找不到登入 token，將嘗試直接使用響應數據繼續");
        // 即使沒有 token，也嘗試繼續以響應數據驅動
        if (response.data && response.data.username) {
          showAlert("登入成功！", "success");
          setTimeout(() => {
            navigate("/index2", { 
              state: { 
                username: response.data.username, 
                directLogin: true,
                loginType: 'general'
              } 
            });
          }, 1000);
          return;
        } else {
          throw new Error("登入失敗，無法獲取 token 或用戶信息");
        }
      }

      showAlert("登入成功！", "success");
      
      // 確保使用 setTimeout 使警告訊息能被看到，然後再跳轉
      setTimeout(() => {
        navigate("/index2");
      }, 1000);
    } catch (error: any) {
      console.error("錯誤:", error);
      showAlert(error.message || "登入失敗，請重試", "error");
      // 清除可能存在的無效 token
      AuthService.removeToken();
    } finally {
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
                className="w-full rounded-full bg-[#06C755] hover:bg-[#06C755]/90 text-white text-xs xs:text-sm sm:text-base font-semibold h-10 xs:h-11 sm:h-12 relative transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <img src="/專題圖片/line-logo.svg" alt="LINE" className="w-5 h-5" />
                {loading ? (
                  <span className="flex items-center gap-2">
                    載入中
                    <span className="loading loading-dots loading-sm"></span>
                  </span>
                ) : (
                  'LINE 登入'
                )}
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
                  className="rounded-lg h-11 text-base focus:ring-2 focus:ring-[#F4CD41] focus:border-transparent transition-all duration-200"
                  placeholder="請輸入使用者名稱"
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
                  placeholder="請輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-11 text-base focus:ring-2 focus:ring-[#F4CD41] focus:border-transparent transition-all duration-200"
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
                className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11 relative transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    載入中
                    <span className="loading loading-dots loading-sm"></span>
                  </span>
                ) : (
                  '登入'
                )}
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
