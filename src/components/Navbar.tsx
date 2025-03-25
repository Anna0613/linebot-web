
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white bg-opacity-80 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-line bg-clip-text text-transparent">LINE Bot Creator</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-foreground hover:text-primary transition-colors hover-underline">
            Home
          </Link>
          <Link to="#features" className="text-foreground hover:text-primary transition-colors hover-underline">
            Features
          </Link>
          <Link to="#how-it-works" className="text-foreground hover:text-primary transition-colors hover-underline">
            How It Works
          </Link>
          <Link to="#demo" className="text-foreground hover:text-primary transition-colors hover-underline">
            Demo
          </Link>
          <Link to="#contact" className="text-foreground hover:text-primary transition-colors hover-underline">
            Contact
          </Link>
        </nav>

        {/* Language Toggle & Auth Buttons (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          <LanguageToggle />
          <Link to="/login">
            <Button variant="outline" size="sm" className="rounded-full">
              Log In
            </Button>
          </Link>
          <Link to="/register">
            <Button className="rounded-full bg-line hover:bg-line-dark">
              Get Started
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
            <Link 
              to="/" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="#features" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              to="#how-it-works" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link 
              to="#demo" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Demo
            </Link>
            <Link 
              to="#contact" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="pt-4 flex flex-col space-y-3">
              <LanguageToggle className="self-start" />
              <Link to="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-full">
                  Log In
                </Button>
              </Link>
              <Link to="/register" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full rounded-full bg-line hover:bg-line-dark">
                  Get Started
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
