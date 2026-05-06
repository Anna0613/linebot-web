import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authManager } from "@/services/UnifiedAuthManager";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // 檢查用戶登入狀態
    const checkAuthStatus = () => {
      const authStatus = authManager.isAuthenticated();
      setIsAuthenticated(authStatus);
    };

    checkAuthStatus();
  }, [location.pathname]);

  const handleReturnHome = () => {
    if (isAuthenticated) {
      // 已登入用戶導向 /dashboard
      navigate("/dashboard");
    } else {
      // 未登入用戶導向首頁 /
      navigate("/");
    }
  };

  return (
    <div className="app-page-surface flex min-h-screen items-center justify-center px-4">
      <div className="app-panel max-w-md p-10 text-center sm:p-12">
        <h1 className="mb-4 text-6xl font-semibold tracking-normal text-slate-950">404</h1>
        <p className="mb-8 text-base leading-7 text-slate-600">
          找不到這個頁面。可能是連結已變更，或網址輸入錯誤。
        </p>
        {isAuthenticated !== null && (
          <Button
            onClick={handleReturnHome}
            className="app-primary-button px-8"
          >
            回到{isAuthenticated ? "工作台" : "首頁"}
          </Button>
        )}
        {isAuthenticated === null && (
          <Loader text="載入中..." />
        )}
      </div>
    </div>
  );
};

export default NotFound;
