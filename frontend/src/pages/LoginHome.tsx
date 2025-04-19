import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Footer from '../components/Index/Footer';
import Navbar2 from '../components/LoginHome/Navbar2';
import HomeBotfly from '../components/LoginHome/HomeBotfly';

interface User {
  line_id: string;
  display_name: string;
  picture_url: string;
}

const LoginHome = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const displayName = searchParams.get('display_name');

    if (token) {
      // 儲存 token 以便跨頁面使用
      localStorage.setItem('auth_token', token);
      verifyToken(token).then((userData) => {
        if (userData) {
          setUser(userData);
        }
      }).catch((err) => {
        setError('Token 驗證失敗');
        console.error(err);
        navigate('/line-login'); // 驗證失敗時重定向
      });
    } else if (displayName) {
      setUser({ line_id: '', display_name: displayName, picture_url: '' });
    } else {
      // 檢查 localStorage 是否有 token
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        verifyToken(storedToken).then((userData) => {
          if (userData) {
            setUser(userData);
          }
        }).catch((err) => {
          console.error('Stored token verification failed:', err);
          localStorage.removeItem('auth_token');
          navigate('/line-login');
        });
      } else {
        navigate('/line-login'); // 無 token 時重定向
      }
    }
  }, [searchParams, navigate]);

  const verifyToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch('https://line-login.jkl921102.org/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Token 驗證失敗');
      return await response.json();
    } catch (error) {
      console.error('驗證 token 錯誤:', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar2 user={user} />
      <div className="mt-40 mb-20">
        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : (
          <HomeBotfly user={user} />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default LoginHome;