import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authManager } from "../services/UnifiedAuthManager";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        {isAuthenticated !== null && (
          <Button
            onClick={handleReturnHome}
            className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold rounded-[5px] text-[16px] hover:bg-[hsl(var(--line-green-hover))] px-6 py-2"
          >
            Return to Home
          </Button>
        )}
        {isAuthenticated === null && (
          <div className="text-gray-500">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default NotFound;
