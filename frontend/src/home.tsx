import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// 使用 React.lazy 進行代碼分割和懶載入
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgetThePassword = lazy(() => import("./pages/ForgetThePassword"));
const Register = lazy(() => import("./pages/Register"));
const LINELogin = lazy(() => import("./pages/LINELogin"));
const LoginSuccess = lazy(() => import("./pages/LoginSuccess"));
const LoginError = lazy(() => import("./pages/LoginError"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const EmailVerificationPending = lazy(() => import("./pages/EmailVerificationPending"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AddBotPage = lazy(() => import("./pages/AddBotPage"));
const BotEditorPage = lazy(() => import("./pages/BotEditorPage"));
const HowToEstablish = lazy(() => import("./pages/HowToEstablish"));
const Setting = lazy(() => import("./pages/Setting"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Editbot = lazy(() => import("./pages/Editbot"));
const About = lazy(() => import("./pages/About"));
const Language = lazy(() => import("./pages/Language"));
const Suggest = lazy(() => import("./pages/Suggest"));
const VisualBotEditorPage = lazy(() => import("./pages/VisualBotEditorPage"));

// 優化的 QueryClient 配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分鐘
      gcTime: 10 * 60 * 1000, // 10分鐘 (原 cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 載入指示器組件
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600">載入中...</div>
    </div>
  </div>
);

const App = () => {

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
          <Suspense fallback={<LoadingFallback />}>
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
              <Route path="/how-to-establish" element={<HowToEstablish />} />

              {/* 向後兼容的舊路由 */}
              <Route path="/dashboard-legacy" element={<DashboardPage />} />
              <Route path="/add server" element={<AddBotPage />} />
              <Route path="/add-server" element={<AddBotPage />} />
              <Route path="/block" element={<BotEditorPage />} />
              <Route path="/how to establish" element={<HowToEstablish />} />

              <Route path="/setting" element={<Setting />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/email-verification" element={<EmailVerification />} />
              <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/editbot" element={<Editbot />} />
              <Route path="/about" element={<About />} />
              <Route path="/language" element={<Language />} />
              <Route path="/suggest" element={<Suggest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
