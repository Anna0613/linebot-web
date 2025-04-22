import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { CustomAlert } from "@/components/ui/custom-alert";
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';
import "@/components/ui/loader.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Alert state
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
  };

  const validatePassword = () => {
    if (!password) {
      showAlert("請輸入新密碼", "error");
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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      showAlert("無效的重設連結", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`https://login-api.jkl921102.org/reset_password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("密碼重設成功！", "success");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        showAlert(data.error || "密碼重設失敗，請重試", "error");
      }
    } catch (error) {
      console.error('重設密碼錯誤:', error);
      showAlert("重設密碼時發生錯誤，請稍後再試", "error");
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

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">重設密碼</h2>
            <p className="text-sm text-muted-foreground mt-2">請輸入您的新密碼</p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">新密碼：</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-11"
                />
                <p className="text-sm text-gray-500">密碼至少需要8位，包含字母和數字</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">確認密碼：</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="rounded-lg h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#F4CD41] text-[#1a1a40] font-bold hover:bg-[#e6bc00] h-11"
              >
                {loading ? '處理中...' : '重設密碼'}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
