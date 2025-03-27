
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
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header
    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
    bg-white ${isScrolled ? 'bg-opacity-90 backdrop-blur-md shadow-sm' : 'bg-opacity-100'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
        <img src="/專題圖片/Botfly.svg" alt="Logo" className="h-12 w-auto" />
        <h6 className="text-2xl font-bold pl-4 text-[#1a1a40] tracking-wide mt-1">BOTFLY</h6>
        </Link>

        {/* Language Toggle & Auth Buttons (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          <LanguageToggle />
          <Link to="/login">
            <Button  variant="outline" size="sm" className="w-full rounded-full custom-signin">
              SIGN IN
            </Button>
          </Link>
          <Link to="/register">
            <Button className="w-full rounded-full custom-joinus">
              JOIN US
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-foreground focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
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
  );
};

export default Navbar;
