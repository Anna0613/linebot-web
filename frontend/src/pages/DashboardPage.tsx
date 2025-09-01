import React, { useEffect, memo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import DashboardFooter from "../components/layout/DashboardFooter";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import HomeBotfly from "../components/features/dashboard/HomeBotfly";
import TokenExpiryWarning from "../components/auth/TokenExpiryWarning";
import { Loader } from "@/components/ui/loader";
import "@/components/ui/loader.css";
// import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";

interface _User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  isLineUser?: boolean;
}

const DashboardPage = memo(() => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const _location = useLocation();

  // 使用統一認證Hook，具備自動保護功能
  const { user, loading, error, handleLineLogin } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });


  // 處理LINE登入回調
  useEffect(() => {
    const token = searchParams.get("token");
    const displayName = searchParams.get("display_name");
    
    if (token && displayName) {
      handleLineLogin(token).then(() => {
        // 清理URL參數
        navigate('/dashboard', { replace: true });
      });
    }
  }, [searchParams, handleLineLogin, navigate]);


  // 處理錯誤狀態顯示
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">認證錯誤</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // 加載狀態顯示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar user={user} />
      <div className="pt-24 md:pt-28 mb-20">
        <HomeBotfly user={user} />

      </div>
      <DashboardFooter />

      {/* Token 過期警告 */}
      <TokenExpiryWarning
        onExtendSession={() => {
          // 會話延長成功後的處理
          console.log('會話已延長');
        }}
        onLogout={() => {
          // 登出處理
          navigate('/login', { replace: true });
        }}
      />
    </div>
  );
});

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;
