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
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const token = searchParams.get('token');
      const displayName = searchParams.get('display_name');
    
      const verify = async () => {
        setLoading(true);
        if (token) {
          localStorage.setItem('auth_token', token);
          const userData = await verifyLineToken(token);
          if (userData) {
            setUser(userData);
            setLoading(false);
          } else {
            setError('LINE Token 驗證失敗');
            navigate('/line-login');
          }
        } else if (displayName) {
          setUser({ display_name: displayName });
          setLoading(false);
        } else {
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken) {
            const userData = await verifyLineToken(storedToken);
            if (userData) {
              setUser(userData);
              setLoading(false);
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
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar2 user={user} />
      <main className="pt-8 flex flex-col items-center">
        <AddServerPage />
      </main>
      <Footer2 />
    </div>
  );
};

export default AddServer;