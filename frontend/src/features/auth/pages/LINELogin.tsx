import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LINELoginButton from "../components/LINELoginButton";
// Removed unused Card components
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import AuthFormLayout from "../components/AuthFormLayout";
// import { API_CONFIG, getApiUrl } from "@/config/apiConfig";

interface User {
  line_id: string;
  display_name: string;
  picture_url: string;
}

const LINELogin: React.FC = () => {
  const [user, _setUser] = useState<User | null>(null);
  const [error, _setError] = useState<string | null>(null);
  const [loading, _setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 新流程：不再從 URL 讀取 token；由後端回調直接設置 Cookie。
    // 這裡僅在需要時引導使用者前往 LINE 授權頁。
    const check = async () => {
      try {
        const { API_CONFIG, getApiUrl } = await import('@/config/apiConfig');
        const resp = await fetch(
          getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN),
          { method: 'GET', credentials: 'include' }
        );
        const data = await resp.json();
        if (data?.authenticated) {
          navigate('/dashboard', { replace: true });
        }
      } catch (_err) {
        // ignore errors during initial login status check
        console.debug('LINE login pre-check failed');
      }
    };
    check();
  }, [navigate]);

  return (
    <AuthFormLayout title="使用 LINE 登入" description="透過 LINE 帳號快速進入工作台。">
      {loading && <Loader fullPage />}
      <div className="flex flex-col items-center">
        {user ? (
          <div className="text-center">
            <Avatar className="mx-auto mb-4 h-24 w-24">
              <AvatarImage src={user.picture_url} alt={user.display_name} />
              <AvatarFallback>{user.display_name[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold text-slate-950">{user.display_name}</h2>
            <p className="mt-1 text-sm text-slate-500">正在帶你回工作台。</p>
          </div>
        ) : error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        ) : (
          <LINELoginButton onLogin={() => {}} />
        )}
      </div>
    </AuthFormLayout>
  );
};

export default LINELogin;
