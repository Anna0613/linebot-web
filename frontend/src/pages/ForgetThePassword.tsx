import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

const ForgetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const validateEmail = (email: string) => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "輸入錯誤",
        description: "請輸入電子郵件地址",
      });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "格式錯誤",
        description: "請輸入有效的電子郵件地址",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.FORGOT_PASSWORD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage;
        switch (data.error) {
          case "EMAIL_NOT_FOUND":
            errorMessage = "此電子郵件地址未註冊";
            break;
          case "INVALID_EMAIL":
            errorMessage = "電子郵件格式不正確";
            break;
          case "RATE_LIMIT_EXCEEDED":
            errorMessage = "請求過於頻繁，請稍後再試";
            break;
          case "EMAIL_SEND_FAILED":
            errorMessage = "郵件發送失敗，請稍後再試";
            break;
          default:
            errorMessage = data.error || data.message || "發送重設連結失敗，請稍後再試";
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "郵件已發送",
        description: "重設連結已寄出，請檢查您的信箱",
      });
      setEmail('');
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      console.error("忘記密碼錯誤:", error);
      toast({
        variant: "destructive",
        title: "發送失敗",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {loading && <Loader fullPage />}

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mt-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 fade-in-element">
            <h2 className="text-3xl font-bold">忘記密碼</h2>
            <p className="text-sm text-muted-foreground mt-2">請輸入您的電子郵件地址以重設密碼</p>
          </div>

          <div className="glassmorphism p-8 fade-in-element" style={{ animationDelay: '0.2s' }}>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="email">電子郵件：</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11"
              >
                {loading ? '載入中...' : '寄送重設連結'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-primary hover:text-primary/80 hover-underline">
                返回登入頁面
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForgetPassword;
