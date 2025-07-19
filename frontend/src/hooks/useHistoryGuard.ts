import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface UseHistoryGuardOptions {
  preventBack?: boolean;
  replaceHistory?: boolean;
  allowedBackPaths?: string[];
  fallbackPath?: string;
}

export const useHistoryGuard = (options: UseHistoryGuardOptions = {}) => {
  const {
    preventBack = false,
    replaceHistory = false,
    allowedBackPaths = [],
    fallbackPath = "/",
  } = options;

  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = window.location.pathname;

    if (replaceHistory) {
      // 替換當前歷史記錄，清除之前的記錄
      window.history.replaceState(null, "", currentPath);
    }

    if (preventBack) {
      // 添加當前頁面到歷史記錄中
      window.history.pushState(null, "", currentPath);

      const handlePopState = (event: PopStateEvent) => {
        event.preventDefault();

        // 檢查是否允許返回到特定路徑
        const previousPath = document.referrer;
        const isAllowedPath = allowedBackPaths.some((path) =>
          previousPath.includes(path)
        );

        if (isAllowedPath) {
          // 允許返回
          return;
        }

        // 阻止返回，停留在當前頁面或重定向到指定頁面
        if (fallbackPath !== currentPath) {
          navigate(fallbackPath, { replace: true });
        } else {
          // 如果當前頁面就是fallback頁面，保持在當前位置
          window.history.pushState(null, "", currentPath);
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [navigate, preventBack, replaceHistory, allowedBackPaths, fallbackPath]);

  const clearHistory = () => {
    const currentPath = window.location.pathname;
    window.history.replaceState(null, "", currentPath);
  };

  const resetHistoryTo = (path: string) => {
    window.history.replaceState(null, "", path);
    if (path !== window.location.pathname) {
      navigate(path, { replace: true });
    }
  };

  return {
    clearHistory,
    resetHistoryTo,
  };
};
