import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { API_CONFIG, getApiUrl } from "@/config/apiConfig";

interface LINELoginButtonProps {
  onLogin?: () => void | Promise<void>;
  disabled?: boolean;
}

const LINELoginButton: React.FC<LINELoginButtonProps> = ({ onLogin, disabled }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (onLogin) {
        await onLogin();
        return;
      }

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
        title: "LINE 登入失敗",
        description:
          error instanceof Error
            ? error.message
            : "無法開啟 LINE 登入，請稍後再試。",
      });
    } finally {
      // 若已成功導向至 LINE，這段不會影響體驗；若失敗則解除 loading
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      disabled={disabled || loading}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-transparent bg-[#06C755] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,199,85,0.18)] transition-colors hover:bg-[#05b04a] disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader size="sm" />
          登入中...
        </>
      ) : (
        <>
          <span className="rounded-[6px] bg-white px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#06C755]">
            LINE
          </span>
          使用 LINE 登入
        </>
      )}
    </Button>
  );
};

export default LINELoginButton;
