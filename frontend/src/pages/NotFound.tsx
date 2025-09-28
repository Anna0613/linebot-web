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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="web3-glass-card p-12 text-center web3-hover-glow">
        <h1 className="neon-text-gradient text-6xl font-bold mb-6">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Oops! Page not found</p>
        {isAuthenticated !== null && (
          <Button
            onClick={handleReturnHome}
            className="web3-primary-button px-8 py-3"
          >
            Return to Home
          </Button>
        )}
        {isAuthenticated === null && (
          <div className="text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default NotFound;
