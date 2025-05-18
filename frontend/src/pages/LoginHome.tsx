import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Footer2 from '../components/LoginHome/Footer2';
import Navbar2 from '../components/LoginHome/Navbar2';
import HomeBotfly from '../components/LoginHome/HomeBotfly';
import { Loader } from "@/components/ui/loader";
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string; // 新增以支援帳號密碼登入
}

const LoginHome = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    const displayName = searchParams.get('display_name');
    const loginType = searchParams.get('login_type');
  
    const verify = async () => {
      setLoading(true);
      try {
        if (token && loginType === 'line') {
          // LINE登入驗證流程
          localStorage.setItem('auth_token', token);
          const userData = await verifyLineToken(token);
          if (userData) {
            setUser(userData);
          } else {
            setError('LINE Token 驗證失敗');
            navigate('/line-login');
          }
        } else if (token) {
          // 一般帳號登入流程
          localStorage.setItem('auth_token', token);
          await checkLoginStatus();
        } else if (displayName) {
          setUser({ display_name: displayName });
        } else {
          // 檢查已存在的登入狀態
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken) {
            await checkLoginStatus();
          } else {
            setError('請先登入');
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('驗證錯誤:', error);
        setError('驗證失敗');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
  
    verify();
  }, [searchParams, navigate]);
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
      const response = await nativeFetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
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
