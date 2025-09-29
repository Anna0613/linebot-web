import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LINELoginButton from "../components/LINELogin/LINELoginButton";
// Removed unused Card components
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import "@/components/ui/loader.css";
// import { API_CONFIG, getApiUrl } from "../config/apiConfig";

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
        const { API_CONFIG, getApiUrl } = await import('../config/apiConfig');
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      {loading && <Loader fullPage />}
      <div className="web3-glass-card w-full max-w-md p-8 web3-hover-glow">
        <div className="mb-6">
          <h2 className="neon-text-gradient text-2xl font-bold text-center">LINE Login</h2>
        </div>
        <div className="flex flex-col items-center">
          {user ? (
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user.picture_url} alt={user.display_name} />
                <AvatarFallback>{user.display_name[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-foreground">{user.display_name}</h2>
              <p className="text-muted-foreground">Welcome back!</p>
            </div>
          ) : error ? (
            <p className="text-web3-red">{error}</p>
          ) : (
            <LINELoginButton onLogin={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LINELogin;
