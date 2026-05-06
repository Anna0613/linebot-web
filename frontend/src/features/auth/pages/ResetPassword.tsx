import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import AuthFormLayout from "../components/AuthFormLayout";
import { API_CONFIG, getApiUrl } from "@/config/apiConfig";

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
        description: "密碼長度至少需要 8 個字元",
      });
      return false;
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      toast({
        variant: "destructive",
        title: "密碼錯誤",
        description: "密碼需要包含至少一個字母與一個數字",
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
        description: "密碼已更新，請使用新密碼登入。",
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
    <AuthFormLayout title="設定新密碼" description="輸入新的密碼，完成後就能重新登入工作台。">
      {loading && <Loader fullPage />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700">
            新密碼
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="至少 8 個字元"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="app-input"
          />
          <p className="text-sm leading-6 text-slate-500">
            密碼需包含至少一個字母與一個數字。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700">
            確認密碼
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="再次輸入新密碼"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="app-input"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="app-primary-button w-full"
        >
          {loading ? (
            <>
              <Loader size="sm" />
              處理中
            </>
          ) : (
            "更新密碼"
          )}
        </Button>
      </form>
    </AuthFormLayout>
  );
};

export default ResetPassword;
