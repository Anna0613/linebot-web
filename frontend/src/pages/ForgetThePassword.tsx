import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';

const ForgetPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert('請輸入您的電子郵件！');
      return;
    }

    try {
      const response = await fetch('https://login-api.jkl921102.org/forgot_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '發送失敗');
      }

      setMessage('重設連結已寄出，請至信箱查收！');
      setEmail('');
    } catch (error: any) {
      console.error('錯誤:', error);
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

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

              <Button type="submit" className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] text-base font-bold hover:bg-[#e6bc00] h-11">
                寄送重設連結
              </Button>

              {message && <p className="text-green-600 text-sm text-center">{message}</p>}
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
