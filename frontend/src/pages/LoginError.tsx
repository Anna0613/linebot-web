import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { XCircle, RefreshCw } from 'lucide-react';

const LoginError: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // 從 URL 參數取得錯誤訊息
    const error = searchParams.get('error');
    setErrorMessage(error || '未知錯誤');
  }, [searchParams]);

  const handleRetryLogin = () => {
    navigate('/login', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-600">登入失敗</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            LINE 登入過程中發生錯誤
          </p>
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">
                錯誤詳情：{errorMessage}
              </p>
            </div>
          )}
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleRetryLogin}
              className="w-full bg-[#F4CD41] text-[#1a1a40] font-bold rounded-[5px] text-[16px] hover:bg-[#e6bc00] flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重試登入</span>
            </Button>
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              返回首頁
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginError; 