import React, { useEffect, useState, useCallback, memo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import DashboardFooter from "../components/layout/DashboardFooter";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import HomeBotfly from "../components/features/dashboard/HomeBotfly";
import { Loader } from "@/components/ui/loader";
import "@/components/ui/loader.css";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  isLineUser?: boolean;
}

const DashboardPage = memo(() => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 使用統一認證Hook，具備自動保護功能
  const { user, loading, error, handleLineLogin } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });

  // 啟用性能監控
  const { 
    measureRender, 
    measureAsync, 
    withCache, 
    performanceGrade,
    triggerOptimization 
  } = usePerformanceMonitor({
    componentName: 'DashboardPage',
    enableRealTime: process.env.NODE_ENV === 'development',
    autoOptimize: true
  });

  // 處理LINE登入回調 - 使用性能測量
  useEffect(() => {
    const token = searchParams.get("token");
    const displayName = searchParams.get("display_name");
    
    if (token && displayName) {
      measureAsync(
        () => handleLineLogin(token),
        'line-login-callback'
      ).then(() => {
        // 清理URL參數
        navigate('/dashboard', { replace: true });
      });
    }
  }, [searchParams, handleLineLogin, navigate, measureAsync]);

  // 組件渲染性能測量
  useEffect(() => {
    const cleanup = measureRender();
    return cleanup;
  }, [measureRender]);

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
      <div className="mt-40 mb-20">
        <HomeBotfly user={user} />
        
        {/* 開發環境顯示性能資訊 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-20 left-4 bg-white border rounded p-2 text-xs shadow-lg">
            <div>性能等級: <span className={`font-bold text-${performanceGrade.color}-600`}>
              {performanceGrade.grade}
            </span></div>
            <button 
              onClick={triggerOptimization}
              className="mt-1 px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              優化
            </button>
          </div>
        )}
      </div>
      <DashboardFooter />
    </div>
  );
});

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;
