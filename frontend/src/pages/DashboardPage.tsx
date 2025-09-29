import React, { lazy, Suspense, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import HomeBotfly from "../components/features/dashboard/HomeBotfly";
const DashboardFooter = lazy(() => import("../components/layout/DashboardFooter"));
const OptimizedTokenExpiryWarning = lazy(() => import("../components/optimized/OptimizedTokenExpiryWarning"));
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
  const navigate = useNavigate();
  const _location = useLocation();

  // 使用統一認證Hook，具備自動保護功能
  const { user, loading, error } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });


  // 新流程：LINE 登入回調已於後端設定 Cookie，前端無需處理 token 參數


  // 處理錯誤狀態顯示
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="web3-glass-card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-web3-red mb-4">認證錯誤</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // 加載狀態顯示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="web3-loader-card p-8">
          <Loader fullPage={false} text="載入儀表板..." web3Style={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNavbar user={user} />
      <main id="main" role="main" className="pt-24 md:pt-28 mb-20">
        <HomeBotfly user={user} />
      </main>
      <Suspense fallback={null}>
        <DashboardFooter />
      </Suspense>

      {/* Token 過期警告 */}
      <Suspense fallback={null}>
        <OptimizedTokenExpiryWarning
          onExtendSession={() => {
            // 會話延長成功後的處理
            console.log('會話已延長');
          }}
          onLogout={() => {
            // 登出處理
            navigate('/login', { replace: true });
          }}
        />
      </Suspense>
    </div>
  );
});

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;
