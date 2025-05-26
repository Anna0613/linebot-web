import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { API_CONFIG, getApiUrl } from '../../config/apiConfig';

interface LINELoginButtonProps {
  onLogin?: () => void;
}

const LINELoginButton: React.FC<LINELoginButtonProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.login_url) {
        throw new Error('Invalid response: login_url missing');
      }
      console.log('LINE login URL:', data.login_url); // 調試用
      window.location.href = data.login_url;
    } catch (error: any) {
      console.error('Error initiating LINE login:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to initiate LINE login. Please try again.',
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      disabled={loading}
      className="bg-green-500 hover:bg-green-600 text-white"
    >
      {loading ? 'Loading...' : 'Login with LINE'}
    </Button>
  );
};

export default LINELoginButton;
