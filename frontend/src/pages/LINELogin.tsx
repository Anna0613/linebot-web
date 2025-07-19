import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import LINELoginButton from "../components/LINELogin/LINELoginButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { AuthService } from "../services/auth";
import { LineLoginService } from "../services/lineLogin";

interface User {
  line_id: string;
  display_name: string;
  picture_url: string;
}

const LINELogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const displayName = searchParams.get("display_name");
    const linkingUserId = searchParams.get("linking_user_id");

    const handleLogin = async () => {
      if (!token) {
        if (displayName) {
          setUser({ line_id: "", display_name: displayName, picture_url: "" });
        }
        return;
      }

      try {
        setLoading(true);
        AuthService.setToken(token);
        const lineLoginService = LineLoginService.getInstance();

        // 如果是連接已有帳號的情況
        if (linkingUserId) {
          const response = await lineLoginService.getLoginUrl();
          if (response.error) {
            throw new Error(response.error);
          }
          if (response.login_url) {
            // 將連接資訊添加到URL
            const loginUrl = new URL(response.login_url);
            loginUrl.searchParams.append("linking_user_id", linkingUserId);
            loginUrl.searchParams.append("linking_token", token);
            window.location.href = loginUrl.toString();
          }
        } else {
          // 一般LINE登入流程
          const response = await lineLoginService.verifyToken(token);
          if (response.error) {
            throw new Error(response.error);
          }
          setUser(response as User);
          navigate("/dashboard");
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "驗證失敗");
        AuthService.removeToken();
      } finally {
        setLoading(false);
      }
    };

    handleLogin();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {loading && <Loader fullPage />}
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
