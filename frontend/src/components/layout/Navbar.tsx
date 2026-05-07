import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BotCraftBrand from "@/components/brand/BotCraftIdentity";
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
        className={`fixed left-0 right-0 top-0 z-50 border-b border-[var(--bc-line-2)] transition-all duration-300 ${
          isScrolled
            ? "bg-[color-mix(in_oklch,var(--bc-bg)_86%,transparent)] shadow-[0_18px_50px_rgba(24,22,40,0.06)] backdrop-blur-2xl"
            : "bg-[color-mix(in_oklch,var(--bc-bg)_72%,transparent)] backdrop-blur-xl"
        }`}
      >
        <div className="w-full px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16 md:h-20">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              className="rounded-[14px] p-2 text-[var(--bc-ink-2)] transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              onClick={toggleMobileMenu}
              aria-label="開啟選單"
            >
              <Menu size={24} className="sm:hidden" />
              <Menu size={28} className="hidden sm:block" />
            </button>
            <BotCraftBrand className="z-10 min-w-0" compact />
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            <div className="hidden md:block">
              <div className="flex h-10 items-center rounded-full border border-[var(--bc-line-2)] bg-white/70 px-2 shadow-sm">
                <LanguageToggle className="h-8 min-w-8 text-sm" />
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full border-[var(--bc-line)] bg-transparent px-4 text-xs font-medium text-[var(--bc-ink-2)] shadow-none hover:border-[var(--bc-ink)] hover:bg-transparent hover:text-[var(--bc-ink)] md:h-10 md:text-sm"
                >
                  登入
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="h-9 rounded-full bg-[var(--bc-ink)] px-4 text-xs font-medium text-[var(--bc-bg)] shadow-none hover:bg-[oklch(0.10_0.012_270)] md:h-10 md:text-sm"
                >
                  建立帳號
                </Button>
              </Link>
            </div>
            <div className="sm:hidden flex items-center space-x-1">
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-[var(--bc-line)] bg-transparent px-3 text-xs font-medium text-[var(--bc-ink-2)]"
                >
                  登入
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="h-8 rounded-full bg-[var(--bc-ink)] px-3 text-xs font-medium text-[var(--bc-bg)] hover:bg-[oklch(0.10_0.012_270)]"
                >
                  建立
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div
          className={`mobile-menu-dropdown fixed left-0 right-0 top-14 w-full transform border-t border-[var(--bc-line-2)] bg-[color-mix(in_oklch,var(--bc-bg)_90%,transparent)] text-[var(--bc-ink)] backdrop-blur-2xl transition-all duration-300 ease-in-out sm:hidden ${
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
                  className="h-11 w-full justify-start rounded-full border-[var(--bc-line)] bg-transparent text-sm font-medium text-[var(--bc-ink)]"
                >
                  登入
                </Button>
              </Link>
              <Link
                to="/register"
                className="block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="h-11 w-full justify-start rounded-full bg-[var(--bc-ink)] text-sm font-medium text-[var(--bc-bg)] hover:bg-[oklch(0.10_0.012_270)]">
                  建立帳號
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </header>

      <div
        onClick={toggleMobileMenu}
        aria-hidden={!mobileMenuOpen}
        className={`fixed inset-0 z-[55] bg-slate-950/25 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        aria-hidden={!mobileMenuOpen}
        className={`mobile-menu-sidebar fixed left-0 top-0 z-[60] h-full w-72 border-r border-[var(--bc-line-2)] bg-[color-mix(in_oklch,var(--bc-bg)_90%,transparent)] p-6 text-[var(--bc-ink)] shadow-[0_24px_80px_rgba(24,22,40,0.12)] backdrop-blur-2xl transform-gpu transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
          <div className="flex justify-end">
            <button
              onClick={toggleMobileMenu}
              className="rounded-full bg-white/80 p-2 text-2xl text-[var(--bc-ink-2)] shadow-sm transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              aria-label="關閉選單"
            >
              <X />
            </button>
          </div>
          <ul className="mt-8 space-y-2 text-base text-[var(--bc-ink-2)]">
            <li>
              <Link
                to="/"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3 transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              >
                首頁
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3 transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              >
                關於
              </Link>
            </li>
            <li>
              <Link
                to="/how-to-establish"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3 transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              >
                建立教學
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3 transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              >
                登入
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                onClick={toggleMobileMenu}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3 transition-colors hover:bg-[var(--bc-accent-soft)] hover:text-[var(--bc-accent-ink)]"
              >
                建立帳號
              </Link>
            </li>
        </ul>
      </div>

      <QuickActions />
    </>
  );
};

export default Navbar;
