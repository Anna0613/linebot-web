import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AuthService } from '../services/auth';

const AuthDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkAuth = () => {
    addLog('開始認證檢查...');
    
    // 檢查 localStorage
    const localToken = AuthService.getToken();
    addLog(`localStorage token: ${localToken ? '存在' : '不存在'}`);
    
    // 檢查 cookie
    const cookieToken = AuthService.getTokenFromCookie();
    addLog(`cookie token: ${cookieToken ? '存在' : '不存在'}`);
    
    // 檢查認證狀態
    const isAuth = AuthService.isAuthenticated();
    addLog(`認證狀態: ${isAuth ? '已認證' : '未認證'}`);
    
    // 檢查用戶資料
    const user = AuthService.getUser();
    addLog(`用戶資料: ${user ? JSON.stringify(user) : '無'}`);
    
    // 手動解析 token
    const token = localToken || cookieToken;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isValid = payload.exp * 1000 > Date.now();
        addLog(`Token 用戶: ${payload.sub}`);
        addLog(`Token 類型: ${payload.login_type}`);
        addLog(`Token 過期: ${new Date(payload.exp * 1000).toLocaleString()}`);
        addLog(`Token 有效: ${isValid ? '是' : '否'}`);
      } catch (e) {
        addLog(`Token 解析失敗: ${e}`);
      }
    }
    
    setDebugInfo({
      localStorage: {
        token: localToken,
        username: localStorage.getItem('username'),
        email: localStorage.getItem('email')
      },
      cookie: {
        token: cookieToken,
        allCookies: document.cookie
      },
      authService: {
        isAuthenticated: isAuth,
        user: user
      }
    });
  };

  const testCheckLogin = async () => {
    addLog('測試 /check-login API...');
    
    try {
      const token = AuthService.getToken() || AuthService.getTokenFromCookie();
      const response = await fetch(`${import.meta.env.VITE_UNIFIED_API_URL || 'http://localhost:8000'}/api/v1/auth/check-login`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      const data = await response.json();
      addLog(`API 響應狀態: ${response.status}`);
      addLog(`API 響應內容: ${JSON.stringify(data)}`);
      
    } catch (error) {
      addLog(`API 請求失敗: ${error}`);
    }
  };

  const testBackendCookie = async () => {
    addLog('測試後端 Cookie 設定中...');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_UNIFIED_API_URL || 'http://localhost:8000'}/api/v1/auth/test-cookie`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      addLog(`Cookie 測試響應: ${response.status}`);
      addLog(`Cookie 設定: ${JSON.stringify(data.cookie_settings)}`);
      
      // 等待一秒後重新檢查
      setTimeout(checkAuth, 1000);
      
    } catch (error) {
      addLog(`Cookie 測試失敗: ${error}`);
    }
  };

  const clearAuth = () => {
    AuthService.clearAuth();
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    addLog('已清除所有認證資料');
    checkAuth();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>認證狀態調試工具</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2 flex-wrap gap-2">
              <Button onClick={checkAuth}>檢查認證狀態</Button>
              <Button onClick={testCheckLogin}>測試 Check Login API</Button>
              <Button onClick={testBackendCookie}>測試後端 Cookie</Button>
              <Button onClick={clearAuth} variant="destructive">清除認證資料</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>調試資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作日誌</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthDebug; 