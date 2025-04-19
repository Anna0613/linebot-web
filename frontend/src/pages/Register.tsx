import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';

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

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('https://line-login.jkl921102.org/api/verify-token', {
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
          console.log('LINE 使用者資料:', user);
          localStorage.setItem('line_token', token);
          localStorage.setItem('username', user.display_name);
          localStorage.setItem('email', user.email || '');
          navigate('/index2');
        } else {
          alert("登入驗證失敗：未取得有效的使用者資料！");
        }
      });
    }
  }, [searchParams]);

  const handleLINELogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://line-login.jkl921102.org/api/line-login`);
      const data = await response.json();
      if (!data.login_url) throw new Error("登入連結取得失敗");
      window.location.href = data.login_url;
    } catch (error) {
      console.error("LINE login error:", error);
      alert("LINE 登入失敗，請稍後再試");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { fullName, email, password, confirmPassword, agreeTerms } = formData;

    if (!fullName || !email || !password || !confirmPassword) {
      alert("請先輸入所有資料！");
      return;
    }

    if (password !== confirmPassword) {
      alert("請重新檢查密碼！");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("請輸入有效的電子郵件地址！");
      return;
    }

    if (!agreeTerms) {
      alert("請勾選同意服務條款與隱私政策！");
      return;
    }

    try {
      const response = await fetch("https://login-api.jkl921102.org/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fullName, email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "註冊失敗");
      }

      const resData = await response.json();
      alert("註冊成功！");
      localStorage.setItem("username", fullName);
      localStorage.setItem("email", email);
      navigate("/index2");
    } catch (error: any) {
      console.error("註冊錯誤:", error);
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mt-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 fade-in-element">
            <h2 className="text-3xl font-bold">註冊</h2>
          </div>

          <div className="glassmorphism p-8 fade-in-element" style={{ animationDelay: '0.2s' }}>

            <div className="flex flex-col items-center space-y-4 mb-6">
              <Button
                onClick={handleLINELogin}
                disabled={loading}
                className="w-full rounded-full bg-green-500 hover:bg-green-600 text-white text-base font-semibold h-11"
              >
                {loading ? '登入中...' : '以 LINE 繼續'}
              </Button>
              <div className="flex items-center w-full">
                <hr className="flex-grow border-gray-300" />
                <span className="mx-3 text-gray-500 text-sm">或</span>
                <hr className="flex-grow border-gray-300" />
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="fullName">使用者名稱：</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="ABC"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">電子郵件：</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">密碼：</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">確認密碼：</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agree-terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={handleCheckboxChange}
                  required
                />
                <Label htmlFor="agree-terms" className="text-sm font-normal leading-tight">
                  我已閱讀並同意{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline">服務條款</Link> 及{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline">隱私權政策</Link>
                </Label>
              </div>

              <Button type="submit" className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11">
                註冊
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">已有帳號? </span>
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium hover-underline">登入</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
