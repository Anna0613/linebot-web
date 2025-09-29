import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageToggle from "../LanguageToggle/LanguageToggle";
// Removed animate.css to reduce unused CSS; use local animations
import { API_CONFIG, getApiUrl } from "../../config/apiConfig";
import { useUnifiedAuth } from "../../hooks/useUnifiedAuth";
import QuickActions from "@/components/common/QuickActions";

// 定義 User 介面
interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  avatar?: string;
  isLineUser?: boolean;
}

interface DashboardNavbarProps {
  user: User | null;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ user }) => {
  const [_isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const _navigate = useNavigate();
  const { logout } = useUnifiedAuth();

  // 載入用戶頭像
  const loadUserAvatar = useCallback(async () => {
    if (user && !user.isLineUser && !user.picture_url) {
      try {
        // 動態載入，避免首屏引入大型 API 客戶端
        const { apiClient } = await import("../../services/UnifiedApiClient");
        const response = await apiClient.getAvatar();
        if (response.status === 200 && response.data?.avatar) {
          setUserImage(response.data.avatar);
        }
      } catch (error) {
        console.warn("無法載入用戶頭像:", error);
        // 頭像載入失敗是非關鍵錯誤，不影響主要功能
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.isLineUser && user?.picture_url) {
      // LINE 用戶使用 picture_url
      setUserImage(user.picture_url);
    } else if (user?.avatar) {
      // 有自訂 avatar 資料的用戶
      setUserImage(user.avatar);
    } else if (user && !user.isLineUser) {
      // 非 LINE 用戶，從後端載入頭像
      loadUserAvatar();
    } else {
      setUserImage(null);
    }
  }, [user, loadUserAvatar]);

  // 監聽自定義事件來更新頭像
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      setUserImage(event.detail.avatar);
    };

    window.addEventListener(
      "avatarUpdated",
      handleAvatarUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "avatarUpdated",
        handleAvatarUpdate as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleDropdown = () => setShowDropdown(!showDropdown);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setUserImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Ignore localStorage errors
    }
  };
  // 初始化主題：localStorage 優先，否則尊重系統偏好
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const dark = saved ? saved === 'dark' : prefersDark;
      setIsDarkMode(dark);
      document.documentElement.classList.toggle('dark', dark);
    } catch {
      // 靜默失敗
    }
  }, []);
  const handleLogout = async () => {
    try {
      // 清除後端設置的 HTTP-only cookie
      await fetch(
        getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGOUT),
        {
          method: "POST",
          credentials: "include",
        }
      );
      // 使用統一認證管理器登出
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error("Error occurred:", error);
      // 即使後端請求失敗，也要清除前端的認證資料
      await logout();
      setShowDropdown(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 web3-glass-card border-b border-border dark:border-web3-cyan/20`}
      >
        <div className="w-full px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* 左側：漢堡選單和Logo */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              className="text-foreground p-1 hover:bg-secondary rounded-md transition-colors"
              onClick={toggleMobileMenu}
              aria-label="開啟選單"
            >
              <Menu size={24} className="sm:hidden" />
              <Menu size={28} className="hidden sm:block" />
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 sm:gap-3 z-10 min-w-0"
            >
              <picture>
                <source srcSet="/assets/images/webp/LOGO.webp" type="image/webp" />
                <img
                  src="/assets/images/origin/LOGO.png"
                  alt="Logo"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  width="48" height="48"
                  className="block h-8 sm:h-10 md:h-12 w-auto flex-shrink-0 object-contain align-middle"
                />
              </picture>
              <h6 className="m-0 leading-none flex items-center text-lg sm:text-xl md:text-[28px] font-bold neon-text-gradient tracking-wide truncate translate-y-[1px]">
                <span className="hidden lg:inline">LINE Bot 製作輔助系統</span>
                <span className="lg:hidden">LINE Bot 系統</span>
              </h6>
            </Link>
          </div>

          {/* 右側：桌面版按鈕和用戶資訊 */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4 flex-shrink-0">
            <div className="hidden lg:block">
              <LanguageToggle />
            </div>
            <Link to="/how-to-establish">
              <div className="circle-question p-2 hover:bg-secondary rounded-full transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  className="w-4 h-4 fill-[#454658]"
                >
                  <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm169.8-90.7c7.9-22.3 29.1-37.3 52.8-37.3l58.3 0c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24l0-13.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1l-58.3 0c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
                </svg>
              </div>
            </Link>
            <Link to="/bots/create">
              <Button className="web3-button font-bold rounded-[5px] text-sm lg:text-[16px] px-3 lg:px-4 h-8 lg:h-10">
                建立 LINE Bot
              </Button>
            </Link>

            {/* 用戶頭像下拉選單 */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center justify-center h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gray-200 overflow-hidden hover:ring-2 hover:ring-[hsl(var(--primary))] transition-all"
              >
                {userImage ? (
                  <img
                    src={userImage}
                    alt="User"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    className="h-5 w-5 lg:h-6 lg:w-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
                  </svg>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-[240px] lg:w-[260px] bg-card text-card-foreground border border-border shadow-xl rounded-lg z-50 p-4">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="absolute top-2 right-2 text-muted-foreground text-xl hover:bg-secondary rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                  <div
                    className="flex flex-col items-center cursor-pointer mb-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {userImage ? (
                      <img
                        src={userImage}
                        alt="User Detail"
                        className="w-14 h-14 lg:w-16 lg:h-16 rounded-full mb-2 object-cover"
                      />
                    ) : (
                      <svg
                        className="w-14 h-14 lg:w-16 lg:h-16 text-gray-400 mb-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                    <span className="font-medium text-sm lg:text-base">
                      {user?.display_name || user?.username || "未登入"}
                    </span>
                    <small className="text-muted-foreground text-xs lg:text-sm">
                      {user?.line_id || user?.username || ""}
                    </small>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>

                  <nav className="space-y-2 text-sm text-foreground">
                    <hr className="my-2 border-border" />
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary text-[16px] w-full text-left"
                    >
                      {isDarkMode ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 384 512"
                          className="w-6 h-6 fill-[#454658]"
                        >
                          <path d="M144.7 98.7c-21 34.1-33.1 74.3-33.1 117.3c0 98 62.8 181.4 150.4 211.7c-12.4 2.8-25.3 4.3-38.6 4.3C126.6 432 48 353.3 48 256c0-68.9 39.4-128.4 96.8-157.3zm62.1-66C91.1 41.2 0 137.9 0 256C0 379.7 100 480 223.5 480c47.8 0 92-15 128.4-40.6c1.9-1.3 3.7-2.7 5.5-4c4.8-3.6 9.4-7.4 13.9-11.4c2.7-2.4 5.3-4.8 7.9-7.3c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-3.7 .6-7.4 1.2-11.1 1.6c-5 .5-10.1 .9-15.3 1c-1.2 0-2.5 0-3.7 0l-.3 0c-96.8-.2-175.2-78.9-175.2-176c0-54.8 24.9-103.7 64.1-136c1-.9 2.1-1.7 3.2-2.6c4-3.2 8.2-6.2 12.5-9c3.1-2 6.3-4 9.6-5.8c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-3.6-.3-7.1-.5-10.7-.6c-2.7-.1-5.5-.1-8.2-.1c-3.3 0-6.5 .1-9.8 .2c-2.3 .1-4.6 .2-6.9 .4z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                          className="w-6 h-6 fill-[#454658]"
                        >
                          <path d="M375.7 19.7c-1.5-8-6.9-14.7-14.4-17.8s-16.1-2.2-22.8 2.4L256 61.1 173.5 4.2c-6.7-4.6-15.3-5.5-22.8-2.4s-12.9 9.8-14.4 17.8l-18.1 98.5L19.7 136.3c-8 1.5-14.7 6.9-17.8 14.4s-2.2 16.1 2.4 22.8L61.1 256 4.2 338.5c-4.6 6.7-5.5 15.3-2.4 22.8s9.8 13 17.8 14.4l98.5 18.1 18.1 98.5c1.5 8 6.9 14.7 14.4 17.8s16.1 2.2 22.8-2.4L256 450.9l82.5 56.9c6.7 4.6 15.3 5.5 22.8 2.4s12.9-9.8 14.4-17.8l18.1-98.5 98.5-18.1c8-1.5 14.7-6.9 17.8-14.4s2.2-16.1-2.4-22.8L450.9 256l56.9-82.5c4.6-6.7 5.5-15.3 2.4-22.8s-9.8-12.9-17.8-14.4l-98.5-18.1L375.7 19.7zM269.6 110l65.6-45.2 14.4 78.3c1.8 9.8 9.5 17.5 19.3 19.3l78.3 14.4L402 242.4c-5.7 8.2-5.7 19 0 27.2l45.2 65.6-78.3 14.4c-9.8 1.8-17.5 9.5-19.3 19.3l-14.4 78.3L269.6 402c-8.2-5.7-19-5.7-27.2 0l-65.6 45.2-14.4-78.3c-1.8-9.8-9.5-17.5-19.3-19.3L64.8 335.2 110 269.6c5.7-8.2 5.7-19 0-27.2L64.8 176.8l78.3-14.4c9.8-1.8 17.5-9.5 19.3-19.3l14.4-78.3L242.4 110c8.2 5.7 19 5.7 27.2 0zM256 368a112 112 0 1 0 0-224 112 112 0 1 0 0 224zM192 256a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z" />
                        </svg>
                      )}
                      <span>{isDarkMode ? "深色模式" : "淺色模式"}</span>
                    </button>

                    {/* 只有登入用戶才顯示設定 */}
                    {user && (
                      <Link
                        to="/setting"
                        className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary text-[16px]"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                          className="w-6 h-6 fill-[#454658]"
                        >
                          <path
                            fill="#454658"
                            d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"
                          />
                        </svg>
                        設定
                      </Link>
                    )}

                    <Link
                      to="/language"
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary text-[16px]"
                    >
                      <img
                        src="/images/language setting.svg"
                        alt="Logo"
                        className="w-6 h-6 fill-[#454658]"
                      />
                      語言
                    </Link>
                    <Link
                      to="/suggest"
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary text-[16px]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        className="w-6 h-6 fill-[#454658]"
                      >
                        <path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z" />
                      </svg>
                      建議
                    </Link>
                    <hr className="my-2 border-border" />

                    {/* 根據登入狀態顯示不同選項 */}
                    {user ? (
                      <Link
                        to="/"
                        className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary font-bold text-red-600 text-[16px]"
                        onClick={handleLogout}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                          className="w-6 h-6 fill-[#454658]"
                        >
                          <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                        </svg>
                        登出
                      </Link>
                    ) : (
                      <div className="space-y-2">
                        <Link
                          to="/login"
                          className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary text-[16px]"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512"
                            className="w-6 h-6 fill-[#454658]"
                          >
                            <path d="M217.9 105.9L340.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L217.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1L32 320c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9z" />
                          </svg>
                          登入
                        </Link>
                        <Link
                          to="/register"
                          className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-secondary text-[16px]"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 512"
                            className="w-6 h-6 fill-[#454658]"
                          >
                            <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3zM504 312l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
                          </svg>
                          註冊
                        </Link>
                      </div>
                    )}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global overlay and sidebar (outside header to avoid fixed containing block issues) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={toggleMobileMenu}
        />
      )}
      <div
        className={`mobile-menu-sidebar fixed top-0 left-0 h-full w-64 text-card-foreground z-[60] p-6 ${mobileMenuOpen ? "animate-slide-in-left" : "hidden"}`}
      >
        <div className="flex justify-end">
          <button
            onClick={toggleMobileMenu}
            className="text-2xl text-foreground hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan rounded-md p-2 transition-all duration-300"
          >
            <X />
          </button>
        </div>
        <ul className="mt-8 space-y-4 text-foreground text-lg">
            {/* 根據登入狀態顯示不同的選單項目 */}
            {user ? (
              <>
                <li>
                  <Link
                    to="/dashboard"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    首頁
                  </Link>
                </li>
                <li>
                  <Link
                    to="/how-to-establish"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    如何建立LINE Bot
                  </Link>
                </li>
                <li>
                  <Link
                    to="/bots/create"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    建立LINE Bot
                  </Link>
                </li>
                <li>
                  <Link
                    to="/bots/management"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    LINE Bot 管理
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    關於
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    首頁
                  </Link>
                </li>
                <li>
                  <Link
                    to="/how-to-establish"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    建立教學
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    關於
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    登入
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    onClick={toggleMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary dark:hover:bg-web3-cyan/10 dark:hover:text-web3-cyan transition-all duration-300 relative"
                  >
                    註冊
                  </Link>
                </li>
              </>
            )}
        </ul>
      </div>

      <QuickActions />
    </>
  );
};

export default DashboardNavbar;
