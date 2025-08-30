import { useState, useEffect } from "react";
// import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validateForm = () => {
    if (!password) {
      toast({
        variant: "destructive",
        title: "輸入錯誤",
        description: "請輸入新密碼",
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

    return true;
  };

  useEffect(() => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "連結無效",
        description: "無效的重設連結",
      });
      navigate("/login");
    }
  }, [token, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        getApiUrl(
          API_CONFIG.AUTH.BASE_URL,
          API_CONFIG.AUTH.ENDPOINTS.RESET_PASSWORD(token!)
        ),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ new_password: password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "密碼重設失敗，請重試");
      }

      toast({
        title: "重設成功",
        description: "密碼重設成功！",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (_error: unknown) {
      console.error("Error occurred:", _error);
      toast({
        variant: "destructive",
        title: "重設失敗",
        description: "重設密碼時發生錯誤，請稍後再試",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {loading && <Loader fullPage />}

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28 pb-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">重設密碼</h2>
            <p className="text-sm text-muted-foreground mt-2">
              請輸入您的新密碼
            </p>
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
                <p className="text-sm text-gray-500">
                  密碼至少需要8位，包含字母和數字
                </p>
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
                className="w-full rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold hover:bg-[hsl(var(--line-green-hover))] h-11"
              >
                {loading ? "處理中..." : "重設密碼"}
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
