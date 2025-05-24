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
  username?: string;
  isLineUser?: boolean;
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
      
      try {
        // 如果是從登入頁面直接重定向過來的
        if (directLoginUser) {
          setUser({ 
            display_name: directLoginUser, 
            username: directLoginUser,
            isLineUser: false
          });
          setLoading(false);
          return;
        }

        // 優先處理 URL 中的 token（來自 LINE 登入回調）
        if (token) {
          console.log('處理 URL 中的 token:', token);
          
          // 將 token 儲存到 localStorage
          AuthService.setToken(token);
          
          try {
            // 從 token 中解析登入類型
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const tokenLoginType = tokenData.login_type;
            
            console.log('Token 登入類型:', tokenLoginType);
            
            if (tokenLoginType === 'line') {
              // LINE登入驗證流程
              const lineLoginService = LineLoginService.getInstance();
              const response = await lineLoginService.verifyToken(token);
              
              if (response.error) {
                throw new Error(response.error);
              }
              
              console.log('LINE 驗證成功:', response);
              setUser({
                ...response,
                isLineUser: true
              } as User);
              
              // 清除 URL 參數，避免重複處理
              navigate('/index2', { replace: true });
              
            } else {
              // 一般帳號驗證
              await checkLoginStatus();
            }
          } catch (tokenError) {
            console.error('Token 解析或驗證失敗:', tokenError);
            setError('Token 驗證失敗，請重新登入');
            AuthService.removeToken();
            navigate('/login');
          }
          
        } else {
          // 檢查是否有已存儲的 token
          const storedToken = AuthService.getToken();
          
          if (storedToken) {
            console.log('使用已存儲的 token 進行驗證');
            
            try {
              // 從已存儲的 token 判斷登入類型
              const tokenData = JSON.parse(atob(storedToken.split('.')[1]));
              const tokenLoginType = tokenData.login_type;
              
              if (tokenLoginType === 'line') {
                // LINE登入驗證流程
                const lineLoginService = LineLoginService.getInstance();
                const response = await lineLoginService.verifyToken(storedToken);
                
                if (response.error) {
                  throw new Error(response.error);
                }
                
                setUser({
                  ...response,
                  isLineUser: true
                } as User);
              } else {
                // 一般帳號驗證
                await checkLoginStatus();
              }
            } catch (error) {
              console.error('已存儲 token 驗證失敗:', error);
              AuthService.removeToken();
              setError('登入狀態已過期，請重新登入');
              navigate('/login');
            }
          } else if (displayName) {
            // 回退方案：使用 displayName 參數
            setUser({ 
              display_name: displayName,
              isLineUser: false
            });
          } else {
            setError('請先登入');
            navigate('/login');
          }
        }
        
      } catch (error) {
        console.error('驗證錯誤:', error);
        setError('驗證失敗，請重新登入');
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
