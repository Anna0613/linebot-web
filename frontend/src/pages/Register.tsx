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

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

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
      setLoading(true);
      verifyToken(token).then((user) => {
        if (user && user.display_name) {
          console.log('LINE 使用者資料:', user);
          localStorage.setItem('line_token', token);
          localStorage.setItem('username', user.display_name);
          localStorage.setItem('email', user.email || '');
          showAlert("註冊成功！", "success");
          navigate('/index2');
        } else {
          showAlert("LINE 驗證失敗：未取得有效的使用者資料", "error");
          setLoading(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, agreeTerms: checked }));
  };

  const validateForm = () => {
    const { fullName, email, password, confirmPassword, agreeTerms } = formData;

    if (!fullName || !email || !password || !confirmPassword) {
      showAlert("請填寫所有必填欄位", "error");
      return false;
    }

    if (fullName.length < 2) {
      showAlert("使用者名稱至少需要2個字元", "error");
      return false;
    }

    if (password.length < 8) {
      showAlert("密碼長度至少需要8位", "error");
      return false;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
      showAlert("密碼需要包含至少一個字母和一個數字", "error");
      return false;
    }

    if (password !== confirmPassword) {
      showAlert("確認密碼與密碼不符", "error");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert("請輸入有效的電子郵件地址", "error");
      return false;
    }

    if (!agreeTerms) {
      showAlert("請閱讀並同意服務條款與隱私權政策", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const { fullName, email, password } = formData;

    try {
      const response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.REGISTER), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fullName, email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = "註冊失敗";
        
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
            errorMessage = errorData.message || "註冊失敗，請稍後再試";
        }
        
        throw new Error(errorMessage);
      }

      const resData = await response.json();
      showAlert("註冊成功！請檢查電子郵件以完成驗證", "success");
      localStorage.setItem("username", fullName);
      localStorage.setItem("email", email);
      setTimeout(() => navigate("/index2"), 2000);
    } catch (error: any) {
      console.error("註冊錯誤:", error);
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
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold tracking-tight">註冊</h2>
          </div>

          <div className="glassmorphism p-6 xs:p-7 sm:p-8 rounded-2xl shadow-glass-sm fade-in-element mx-auto" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col items-center space-y-3 xs:space-y-4 mb-5 xs:mb-6 max-w-[280px] sm:max-w-full mx-auto">
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

            <form className="space-y-4 xs:space-y-5 sm:space-y-6 max-w-[280px] sm:max-w-full mx-auto" onSubmit={handleSubmit}>
              <div className="space-y-1.5 w-full">
                <Label htmlFor="fullName">使用者名稱：</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="至少2個字元"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm sm:text-base">電子郵件：</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm sm:text-base">密碼：</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="至少8位，含字母和數字"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm sm:text-base">確認密碼：</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="請再次輸入密碼"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11 text-base"
                />
              </div>

              <div className="flex items-start space-x-2 mt-2 max-w-[280px] sm:max-w-full mx-auto">
                <Checkbox
                  id="agree-terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={handleCheckboxChange}
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
                className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11 relative transition-all duration-200"
              >
                {loading ? '載入中...' : '註冊'}
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
