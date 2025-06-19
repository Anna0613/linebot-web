import AddServerPage from '../components/AddServer/AddServerPage';
import Navbar2 from '../components/LoginHome/Navbar2';
import Footer2 from '../components/LoginHome/Footer2';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string; // 新增以支援帳號密碼登入
}

const AddServer = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const token = searchParams.get('token');
      const displayName = searchParams.get('display_name');
    
      const verify = async () => {
        setIsLoading(true);
        if (token) {
          localStorage.setItem('auth_token', token);
          const userData = await verifyLineToken(token);
          if (userData) {
            setUser(userData);
            setIsLoading(false);
          } else {
            setError('LINE Token 驗證失敗');
            navigate('/line-login');
          }
        } else if (displayName) {
          setUser({ display_name: displayName });
          setIsLoading(false);
        } else {
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken) {
            const userData = await verifyLineToken(storedToken);
            if (userData) {
              setUser(userData);
              setIsLoading(false);
            } else {
              setTimeout(() => {
                checkLoginStatus();
              }, 3000); // 延遲 3 秒
            }
          } else {
            setTimeout(() => {
              checkLoginStatus();
            }, 3000); // 延遲 3 秒
          }
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
          
          // 檢查新的 API 回應格式 (authenticated + user)
          if (data.authenticated && data.user) {
            setUser({ 
              display_name: data.user.username, 
              username: data.user.username 
            });
          }
          // 相容舊格式：檢查 data.message 是否存在且格式正確
          else if (data.message && typeof data.message === 'string') {
            const messagePattern = /User (.+?) is logged in/;
            const match = data.message.match(messagePattern);
            
            if (match && match[1]) {
              const username = match[1];
              setUser({ display_name: username, username });
            } else {
              throw new Error('無法從回應中解析用戶名稱');
            }
          } else {
            throw new Error('無效的 API 回應格式');
          }
        } else {
          const errorData = await response.json();
          console.error('check_login error:', errorData);
          setError('請先登入');
          navigate('/login');
        }
        setIsLoading(false);
      } catch (error) {
        console.error('檢查登入狀態錯誤:', error);
        setError('請先登入');
        navigate('/login');
        setIsLoading(false);
      }
    };

    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#FFFDFA] flex items-center justify-center">
          <div className="text-[#5A2C1D] text-lg loading-pulse">載入中...</div>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-[#FFFDFA]">
      <Navbar2 user={user} />
      <main className="flex-1">
        <div className="pt-16 md:pt-20 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            <AddServerPage />
          </div>
        </div>
      </main>
      <Footer2 />
    </div>
  );
};

export default AddServer;