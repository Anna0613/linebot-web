import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LanguageToggle from './LanguageToggle';

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

          <Link to="/" className="flex items-center space-x-3">
            <img src="/專題圖片/Botfly.svg" alt="Logo" className="h-12 w-auto" />
            <h6 className="text-[28px] font-bold pl-4 text-[#1a1a40] tracking-wide mt-1">BOTFLY</h6>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="outline" size="sm" className="w-full rounded-full custom-signin hover:bg-[#A0A0A0]">
                SIGN IN
              </Button>
            </Link>
            <Link to="/register">
              <Button className="w-full rounded-full custom-joinus hover:bg-[#e6bc00]">
                JOIN US
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden text-foreground focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-border">
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
              <div className="pt-4 flex flex-col space-y-3">
                <LanguageToggle className="self-start" />
                <Link to="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full">
                    SIGN IN
                  </Button>
                </Link>
                <Link to="/register" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-full bg-line hover:bg-line-dark">
                    JOIN US
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <div
        id="backToTop"
        className="back-to-top fixed hidden right-5 bottom-20 w-12 h-12 bg-[#919191] text-center rounded-full cursor-pointer z-[1001] items-center justify-center hover:bg-[#575757] hover:scale-110"
        onClick={scrollToTop}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-white">
          <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
        </svg>
      </div>

      <a
        href="https://line.me/ti/p/OQV3UIgmr7"
        target="_blank"
        className="fixed right-5 bottom-5 z-[1001]"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center hover:scale-110 transition">
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
