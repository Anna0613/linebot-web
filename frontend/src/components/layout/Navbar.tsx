import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageToggle from "../LanguageToggle/LanguageToggle";
import QuickActions from "@/components/common/QuickActions";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b border-white/60 transition-all duration-300 ${
          isScrolled
            ? "bg-white/78 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
            : "bg-white/62 backdrop-blur-xl"
        }`}
      >
        <div className="w-full px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* 左側：漢堡選單和Logo */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              className="rounded-[14px] p-2 text-slate-700 transition-colors hover:bg-emerald-50"
              onClick={toggleMobileMenu}
              aria-label="開啟選單"
            >
              <Menu size={24} className="sm:hidden" />
              <Menu size={28} className="hidden sm:block" />
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 z-10 min-w-0"
            >
              <picture>
                <source
                  srcSet="/assets/images/webp/LOGO.webp"
                  type="image/webp"
                />
                <img
                  src="/assets/images/origin/LOGO.png"
                  alt="Logo"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  width="48"
                  height="48"
                  className="block h-8 sm:h-10 md:h-12 w-auto flex-shrink-0 object-contain"
                />
              </picture>
              <h6 className="m-0 truncate text-lg font-semibold leading-none tracking-[-0.01em] text-slate-950 sm:text-xl md:text-[28px]">
                <span className="hidden lg:inline">LINE Bot 製作輔助系統</span>
                <span className="lg:hidden">LINE Bot 系統</span>
              </h6>
            </Link>
          </div>

          {/* 右側：桌面版按鈕和手機版登入/註冊按鈕 */}
          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            <div className="hidden md:block">
              <div className="flex h-10 items-center rounded-[14px] border border-white/70 bg-white/70 px-2 shadow-sm">
                <LanguageToggle className="h-8 min-w-8 text-sm" />
              </div>
            </div>
            {/* 桌面版按鈕 */}
            <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-[14px] border-emerald-100 bg-white/70 px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white md:h-10 md:text-sm"
                >
                  登入
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="h-9 rounded-[14px] bg-[#16a34a] px-4 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803d] md:h-10 md:text-sm"
                >
                  立即加入
                </Button>
              </Link>
            </div>
            {/* 手機版登入/註冊按鈕 */}
            <div className="sm:hidden flex items-center space-x-1">
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-[12px] border-emerald-100 bg-white/70 px-3 text-xs font-semibold text-slate-700"
                >
                  登入
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="h-8 rounded-[12px] bg-[#16a34a] px-3 text-xs font-semibold text-white hover:bg-[#15803d]"
                >
                  註冊
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 手機版下拉選單 */}
        <div
          className={`mobile-menu-dropdown fixed left-0 right-0 top-14 w-full transform border-t border-white/70 bg-white/88 text-slate-800 backdrop-blur-2xl transition-all duration-300 ease-in-out sm:hidden ${
            mobileMenuOpen
              ? "translate-y-0 opacity-100 shadow-lg"
              : "-translate-y-full opacity-0"
          } z-40`}
        >
          <div className="px-4 py-4 space-y-3">
            <div className="pb-2 border-b border-border/60">
              <LanguageToggle />
            </div>
            <div className="space-y-2">
              <Link
                to="/login"
                className="block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="outline"
                  className="h-11 w-full justify-start rounded-[14px] border-emerald-100 bg-white/70 text-sm font-semibold text-slate-700"
                >
                  登入
                </Button>
              </Link>
              <Link
                to="/register"
                className="block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="h-11 w-full justify-start rounded-[14px] bg-[#16a34a] text-sm font-semibold text-white hover:bg-[#15803d]">
                  立即加入
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 側邊選單遮罩 */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          />
        )}
        <div
          className={`mobile-menu-sidebar fixed left-0 top-0 z-40 h-full w-72 border-r border-white/70 bg-white/82 p-6 text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${mobileMenuOpen ? "animate-slide-in-left" : "hidden"}`}
        >
          <div className="flex justify-end">
            <button
              onClick={toggleMobileMenu}
              className="rounded-full bg-white/80 p-2 text-2xl text-slate-700 shadow-sm transition-colors hover:bg-emerald-50"
            >
              <X />
            </button>
          </div>
          <ul className="mt-8 space-y-2 text-base text-slate-700">
            <li>
              <Link
                to="/"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3 transition-colors hover:bg-emerald-50 hover:text-[#166534]"
              >
                首頁
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3 transition-colors hover:bg-emerald-50 hover:text-[#166534]"
              >
                關於
              </Link>
            </li>
            <li>
              <Link
                to="/how-to-establish"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3 transition-colors hover:bg-emerald-50 hover:text-[#166534]"
              >
                建立教學
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3 transition-colors hover:bg-emerald-50 hover:text-[#166534]"
              >
                登入
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3 transition-colors hover:bg-emerald-50 hover:text-[#166534]"
              >
                註冊
              </Link>
            </li>
          </ul>
        </div>
      </header>

      <QuickActions />
    </>
  );
};

export default Navbar;
