import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

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
          console.log("LINE 登入成功", user);
          localStorage.setItem("line_token", token);
          localStorage.setItem("username", user.display_name);
          localStorage.setItem("email", user.email || '');
          navigate("/index2");
        } else {
          alert("LINE 登入驗證失敗！");
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
  const nativeFetch = window.fetch.bind(window);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!username || !password) {
      alert("請輸入使用者名稱和密碼！");
      return;
    }
  
    const data = { username, password };
  
    try {
      const response = await nativeFetch("https://login-api.jkl921102.org/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("登入失敗：" + errorData.error);
      }
  
      const resData = await response.json();
      localStorage.setItem("username", username);
      localStorage.setItem("email", resData.email || "");
  
      alert("登入成功！");
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
            <h2 className="text-3xl font-bold">登入</h2>
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

            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-1">
                <Label htmlFor="username">使用者名稱：</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">密碼：</Label>
                  <Link
                    to="/forgetthepassword"
                    className="text-sm text-primary hover:text-primary/80 hover-underline"
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
                  className="rounded-lg h-11"
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
                  <Label htmlFor="remember-me" className="text-sm font-normal">
                    記住帳號
                  </Label>
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11">
                登入
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">沒有帳號?</span>{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 font-medium hover-underline">
                註冊
              </Link>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-muted-foreground fade-in-element" style={{ animationDelay: '0.3s' }}>
            我已閱讀並同意{' '}
            <Link to="#" className="underline hover:text-primary">
              服務條款
            </Link>{' '}
            及{' '}
            <Link to="#" className="underline hover:text-primary">
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
