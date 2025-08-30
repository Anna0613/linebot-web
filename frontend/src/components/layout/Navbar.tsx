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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${isScrolled ? "bg-opacity-90 backdrop-blur-md shadow-sm" : "bg-opacity-100"}`}
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
              to="/"
              className="flex items-center space-x-2 sm:space-x-3 z-10 min-w-0"
            >
              <img
                src="/images/logo.svg"
                alt="Logo"
                className="h-8 sm:h-10 md:h-12 w-auto flex-shrink-0"
              />
              <h6 className="text-lg sm:text-xl md:text-[28px] font-bold text-foreground tracking-wide truncate">
                <span className="hidden lg:inline">LINE Bot 製作輔助系統</span>
                <span className="lg:hidden">LINE Bot 系統</span>
              </h6>
            </Link>
          </div>

          {/* 右側：桌面版按鈕 */}
          <div className="hidden sm:flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full custom-signin hover:bg-secondary text-xs md:text-sm px-3 md:px-4 h-8 md:h-10"
              >
                登入
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="sm"
                className="rounded-full custom-joinus hover:bg-[hsl(var(--line-green-hover))] text-xs md:text-sm px-3 md:px-4 h-8 md:h-10"
              >
                立即加入
              </Button>
            </Link>
          </div>

          {/* 手機版選單按鈕 */}
          <button
            className="sm:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
            onClick={toggleMobileMenu}
            aria-label="切換選單"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* 手機版下拉選單 */}
        <div
          className={`sm:hidden bg-white border-t border-gray-200 fixed w-full top-14 left-0 right-0 transform transition-all duration-300 ease-in-out ${
            mobileMenuOpen
              ? "translate-y-0 opacity-100 shadow-lg"
              : "-translate-y-full opacity-0"
          } z-40`}
        >
          <div className="px-4 py-4 space-y-3">
            <div className="pb-2 border-b border-gray-100">
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
                  className="w-full rounded-lg text-sm h-11 justify-start"
                >
                  登入
                </Button>
              </Link>
              <Link
                to="/register"
                className="block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full rounded-lg bg-line hover:bg-line-dark text-sm h-11 justify-start">
                  立即加入
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 側邊選單遮罩 */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-30"
            onClick={toggleMobileMenu}
          />
        )}

        {/* 側邊選單 */}
        <div
          className={`fixed top-0 left-0 h-full w-72 bg-white z-40 shadow-2xl p-6 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-[#1a1a40]">選單</h3>
            <button
              onClick={toggleMobileMenu}
              className="text-2xl text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors"
              aria-label="關閉選單"
            >
              <X />
            </button>
          </div>
          <nav className="space-y-2">
            <Link
              to="/"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-[#1a1a40] transition-colors"
            >
              <span className="text-lg">🏠</span>
              首頁
            </Link>
            <Link
              to="/about"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-[#1a1a40] transition-colors"
            >
              <span className="text-lg">ℹ️</span>
              關於
            </Link>
            <Link
              to="/login"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-[#1a1a40] transition-colors"
            >
              <span className="text-lg">🔑</span>
              登入
            </Link>
            <Link
              to="/register"
              onClick={toggleMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-[#1a1a40] transition-colors"
            >
              <span className="text-lg">📝</span>
              註冊
            </Link>
          </nav>
        </div>
      </header>

      <QuickActions />
    </>
  );
};

export default Navbar;
