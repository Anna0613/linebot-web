import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

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

    // 驗證
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

    // 準備資料
    const data = {
      username: fullName,
      email,
      password,
    };

    try {
      const response = await fetch("https://login-api.jkl921102.org/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "註冊失敗，請稍後重試。");
      }

      const resData = await response.json();
      console.log("註冊成功:", resData);
      alert("註冊成功！");
      localStorage.setItem("email", email);
      localStorage.setItem("username", fullName);

      // 導向登入頁
      navigate("/index2");
    } catch (error: any) {
      console.error("錯誤:", error);
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
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline">
                    服務條款
                  </Link>{' '}
                  及{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline">
                    隱私權政策
                  </Link>
                </Label>
              </div>
              
              <Button type="submit" className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11">
                註冊
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">已有帳號? </span>
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium hover-underline">
                登入
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Register;
