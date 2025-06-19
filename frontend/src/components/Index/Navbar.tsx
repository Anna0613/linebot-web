import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LanguageToggle from '../LanguageToggle/LanguageToggle';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const backToTop = document.getElementById("backToTop");
      if (backToTop) {
        if (window.scrollY > 300) {
          backToTop.style.display = "flex";
        } else {
          backToTop.style.display = "none";
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${isScrolled ? 'bg-opacity-90 backdrop-blur-md shadow-sm' : 'bg-opacity-100'}`}
      >
        <div className="w-full px-6 flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-4">
            <button className="text-[#1a1a40]" onClick={toggleMobileMenu}>
              <Menu size={28} />
            </button>
            <Link to="/" className="flex items-center space-x-3 z-10 ml-2">
              <img src="/專題圖片/logo.svg" alt="Logo" className="h-12 w-auto" />
              <h6 className="text-[28px] font-bold pl-4 text-[#1a1a40] tracking-wide mt-1">LINE Bot 製作輔助系統</h6>
            </Link>
          </div>

          <div className="hidden sm:flex items-center space-x-2 sm:space-x-4">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="outline" size="sm" className="rounded-full custom-signin hover:bg-[#A0A0A0] text-xs sm:text-sm px-2 sm:px-4">
                登入
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="rounded-full custom-joinus hover:bg-[#e6bc00] text-xs sm:text-sm px-2 sm:px-4">
                立即加入
              </Button>
            </Link>
          </div>
          
          <button
            className="sm:hidden p-2"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>

        </div>

        <div 
          className={`sm:hidden bg-white border-t border-border fixed w-full top-14 left-0 right-0 transform transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-y-0 opacity-100 shadow-lg' : '-translate-y-full opacity-0'
          } z-40`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
            <div className="pt-2 flex flex-col space-y-2">
              <LanguageToggle />
              <Link to="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-full text-sm">
                  登入
                </Button>
              </Link>
              <Link to="/register" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full rounded-full bg-line hover:bg-line-dark text-sm">
                  立即加入
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 側邊選單遮罩 */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={toggleMobileMenu} />
        )}
        
        {/* 側邊選單 */}
        <div className={`fixed top-0 left-0 h-full w-64 bg-white z-50 shadow-lg p-6 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-end">
            <button onClick={toggleMobileMenu} className="text-2xl text-gray-700">
              <X />
            </button>
          </div>
          <ul className="mt-8 space-y-4 text-[#1a1a40] text-lg">
            <li>
              <Link to="/" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">
                首頁
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">
                關於
              </Link>
            </li>
            <li>
              <Link to="/login" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">
                登入
              </Link>
            </li>
            <li>
              <Link to="/register" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">
                註冊
              </Link>
            </li>
          </ul>
        </div>
      </header>

      <div
        id="backToTop"
        className="back-to-top fixed hidden right-3 sm:right-4 lg:right-5 bottom-20 sm:bottom-24 lg:bottom-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-[#919191] text-center rounded-full cursor-pointer z-[1001] items-center justify-center hover:bg-[#575757] hover:scale-110 transition-all duration-300"
        onClick={scrollToTop}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5 sm:w-6 sm:h-6 fill-white">
          <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
        </svg>
      </div>

      <a
        href="https://line.me/ti/p/OQV3UIgmr7"
        target="_blank"
        className="fixed right-3 sm:right-4 lg:right-5 bottom-4 sm:bottom-6 lg:bottom-5 z-[1001]"
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300">
          <img
            src="/專題圖片/line-logo.svg"
            alt="Line icon"
            className="w-full h-full object-cover"
          />
        </div>
      </a>
    </>
  );
};

export default Navbar;
