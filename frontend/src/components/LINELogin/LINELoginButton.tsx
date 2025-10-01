import React, { useState } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { API_CONFIG, getApiUrl } from "../../config/apiConfig";

interface LINELoginButtonProps {
  onLogin?: () => void;
}

const LINELoginButton: React.FC<LINELoginButtonProps> = ({ onLogin: _onLogin }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        getApiUrl(
          API_CONFIG.LINE_LOGIN.BASE_URL,
          API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN
        ),
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        // 嘗試讀取錯誤訊息以提供更友善提示
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const text = await response.text();
          if (text) msg = `${msg} - ${text}`;
        } catch {
          // Intentionally ignore: response body may be empty or non-text
        }
        throw new Error(msg);
      }
      const data = await response.json();
      if (!data.login_url) {
        throw new Error("Invalid response: login_url missing");
      }
      console.log("LINE login URL:", data.login_url); // 調試用
      window.location.href = data.login_url;
    } catch (error: unknown) {
      console.error("Error occurred:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate LINE login. Please try again.",
      });
    } finally {
      // 若已成功導向至 LINE，這段不會影響體驗；若失敗則解除 loading
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      disabled={loading}
      className="bg-green-500 hover:bg-green-600 text-white"
    >
      {loading ? "Loading..." : "Login with LINE"}
    </Button>
  );
};

export default LINELoginButton;
