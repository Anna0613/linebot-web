import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // 加入 useNavigate
import LINELoginButton from '../components/LINELogin/LINELoginButton';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';


interface User {
  line_id: string;
  display_name: string;
  picture_url: string;
}

const LINELogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // 加這行

  useEffect(() => {
    const token = searchParams.get('token');
    const displayName = searchParams.get('display_name');

    if (token) {
      // 儲存 token 到 localStorage
      localStorage.setItem('line_token', token);
      verifyToken(token).then((userData) => {
        if (userData) {
          setUser(userData);
          navigate('/index2'); // 登入成功後導到首頁（你要的那一頁）
        }
      }).catch((err) => {
        setError('Failed to verify token');
        console.error(err);
      });
    } else if (displayName) {
      setUser({ line_id: '', display_name: displayName, picture_url: '' });
    }
  }, [searchParams]);

  const verifyToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch('https://line-login.jkl921102.org/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Token verification failed');
      return await response.json();
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>LINE Login</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {user ? (
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user.picture_url} alt={user.display_name} />
                <AvatarFallback>{user.display_name[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{user.display_name}</h2>
              <p className="text-gray-600">Welcome back!</p>
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <LINELoginButton onLogin={() => {}} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LINELogin;