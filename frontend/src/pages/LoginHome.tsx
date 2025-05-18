import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Footer2 from '../components/LoginHome/Footer2';
import Navbar2 from '../components/LoginHome/Navbar2';
import HomeBotfly from '../components/LoginHome/HomeBotfly';
import { Loader } from "@/components/ui/loader";
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from '../config/apiConfig';
import { AuthService } from '../services/auth';
import { LineLoginService } from '../services/lineLogin';

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string; // 新增以支援帳號密碼登入
}

const LoginHome = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    const displayName = searchParams.get('display_name');
    const loginType = searchParams.get('login_type');
    
    // 檢查 location.state 是否存在並包含 directLogin 標記
    const stateData = location.state as { username?: string; directLogin?: boolean } | null;
    const directLoginUser = stateData?.directLogin ? stateData.username : null;
  
    const verify = async () => {
      setLoading(true);
      
      // 如果是從登入頁面直接重定向過來的
      if (directLoginUser) {
        setUser({ display_name: directLoginUser, username: directLoginUser });
        setLoading(false);
        return;
      }
      
      try {
        // 使用 AuthService 獲取 token，而不是直接從 localStorage 獲取
        const storedToken = token || AuthService.getToken();
        if (!storedToken) {
          setError('請先登入');
          navigate('/login');
          return;
        }
        
        if (loginType === 'line') {
          // LINE登入驗證流程，使用帶有重試機制的方法
          const lineLoginService = LineLoginService.getInstance();
          try {
            const response = await lineLoginService.verifyToken(storedToken);
            if (response.error) {
              throw new Error(response.error);
            }
            
            setUser(response as User);
            // 使用 AuthService 保存 token
            AuthService.setToken(storedToken);
          } catch (err) {
            console.error('LINE Token 驗證失敗:', err);
            setError('LINE Token 驗證失敗');
            AuthService.removeToken();
            navigate('/line-login');
          }
        } else if (displayName) {
          setUser({ display_name: displayName });
        } else {
          // 一般帳號登入流程或檢查已存在的登入狀態
          // 使用 AuthService 保存 token
          AuthService.setToken(storedToken);
          await checkLoginStatus();
        }
      } catch (error) {
        console.error('驗證錯誤:', error);
        setError('驗證失敗');
        // 錯誤時清除 token
        AuthService.removeToken();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
  
    verify();
  }, [searchParams, navigate, location.state]);

  const verifyLineToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Token 驗證失敗');
      return await response.json();
    } catch (error) {
      console.error('驗證 LINE token 錯誤:', error);
      return null;
    }
  };
  const nativeFetch = window.fetch.bind(window); // 保存原生 fetch

  const checkLoginStatus = async () => {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const username = data.message.split('User ')[1].split(' is logged in')[0];
        setUser({ display_name: username, username });
      } else {
        const errorData = await response.json();
        console.error('check_login error:', errorData);
        setError('請先登入');
        navigate('/login');
      }
      setLoading(false);
    } catch (error) {
      console.error('檢查登入狀態錯誤:', error);
      setError('請先登入');
      navigate('/login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar2 user={user} />
      <div className="mt-40 mb-20">
        {loading ? (
          <div className="flex justify-center">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : (
          <HomeBotfly user={user} />
        )}
      </div>
      <Footer2 />
    </div>
  );
};

export default LoginHome;
