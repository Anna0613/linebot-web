import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { initializeCacheEventHandler } from "@/utils/cacheEventHandler";
import { authOptimizer } from "@/utils/authOptimizer";
import { queryClient } from "@/hooks/useReactQuery";

// 使用 React.lazy 進行代碼分割和懶載入，按優先級分組
// 高優先級 - 首頁和登入相關（用戶最可能訪問）
const HomePage = lazy(() => import("./features/home/pages/HomePage"));
const LoginPage = lazy(() => import("./features/auth/pages/LoginPage"));
const DashboardPage = lazy(() => import("./features/dashboard/pages/DashboardPage"));

// 中優先級 - 認證流程
const ForgetThePassword = lazy(() => import("./features/auth/pages/ForgetThePassword"));
const Register = lazy(() => import("./features/auth/pages/Register"));
const LINELogin = lazy(() => import("./features/auth/pages/LINELogin"));
const LoginSuccess = lazy(() => import("./features/auth/pages/LoginSuccess"));
const LoginError = lazy(() => import("./features/auth/pages/LoginError"));
const EmailVerification = lazy(() => import("./features/auth/pages/EmailVerification"));
const EmailVerificationPending = lazy(() => import("./features/auth/pages/EmailVerificationPending"));
const ResetPassword = lazy(() => import("./features/auth/pages/ResetPassword"));

// 低優先級 - Bot 管理功能（需要登入後才能訪問）
const AddBotPage = lazy(() =>
  import("./features/bots/pages/AddBotPage").then(module => ({ default: module.default }))
);
const BotEditorPage = lazy(() =>
  import("./features/bots/pages/BotEditorPage").then(module => ({ default: module.default }))
);
const VisualBotEditorPage = lazy(() =>
  import("./features/visual-editor/pages/VisualBotEditorPage").then(module => ({ default: module.default }))
);
const BotManagementPage = lazy(() =>
  import("./features/bot-management/pages/BotManagementPage").then(module => ({ default: module.default }))
);
const RichMenuManagementPage = lazy(() =>
  import("./features/rich-menu/pages/RichMenuManagementPage").then(module => ({ default: module.default }))
);

// 最低優先級 - 輔助頁面
const HowToEstablish = lazy(() => import("./features/how-to-establish/pages/HowToEstablish"));
const Setting = lazy(() => import("./features/settings/pages/Setting"));
const About = lazy(() => import("./features/support/pages/About"));
const Language = lazy(() => import("./features/support/pages/Language"));
const Suggest = lazy(() => import("./features/support/pages/Suggest"));
const LegalPage = lazy(() => import("./features/support/pages/LegalPage"));
const NotFound = lazy(() => import("./features/support/pages/NotFound"));

// 測試頁面



// 使用優化的 QueryClient 配置（從 useReactQuery 導入）

// 路由組件
// 不使用 AnimatePresence 包裹 Routes，避免導航欄閃爍
// 動畫效果由各頁面內的 PageContentWrapper 處理
const AnimatedRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgetthepassword" element={<ForgetThePassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/line-login" element={<LINELogin />} />
      <Route path="/login-success" element={<LoginSuccess />} />
      <Route path="/login-error" element={<LoginError />} />

      {/* 新的語義化路由 */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/bots/create" element={<AddBotPage />} />
      <Route path="/bots/editor" element={<BotEditorPage />} />
      <Route path="/bots/visual-editor" element={<VisualBotEditorPage />} />
      <Route path="/bots/management" element={<BotManagementPage />} />
      <Route path="/bots/management/richmenu" element={<RichMenuManagementPage />} />
      <Route path="/how-to-establish" element={<HowToEstablish />} />

      <Route path="/setting" element={<Setting />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/email-verification" element={<EmailVerification />} />
      <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* 移除所有舊路由，僅保留新語義化路由 */}
      <Route path="/about" element={<About />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage />} />
      <Route path="/language" element={<Language />} />
      <Route path="/suggest" element={<Suggest />} />

      {/* 測試頁面 */}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // 初始化快取事件處理器和認證優化器
  useEffect(() => {
    initializeCacheEventHandler();
    console.debug('應用程式啟動，快取事件處理器已初始化');

    // 預熱認證狀態
    authOptimizer.preloadAuthStatus();
    console.debug('認證狀態預熱完成');

    // 註冊 Service Worker
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker 註冊成功:', registration);

          // 檢查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 有新版本可用
                  console.log('新版本可用，建議重新載入頁面');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker 註冊失敗:', error);
        });
    }

    return () => {
      // 組件卸載時清理（雖然 App 組件通常不會卸載）
      console.debug('應用程式關閉，清理優化器');
      authOptimizer.reset();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={null}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
