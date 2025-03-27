import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LanguageToggle from './LanguageToggle';

const Navbar2 = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsername(localStorage.getItem("username"));
    setEmail(localStorage.getItem("email"));
  }, []);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const closeDropdown = () => setShowDropdown(false);

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

  return (
    <header
    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
    bg-white ${isScrolled ? 'bg-opacity-90 backdrop-blur-md shadow-sm' : 'bg-opacity-100'}`}>

        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
        <Link to="/index2" className="flex items-center space-x-3">
        <img src="/專題圖片/Botfly.svg" alt="Logo" className="h-12 w-auto" />
        <h6 className="text-2xl font-bold pl-4 text-[#1a1a40] tracking-wide mt-1">BOTFLY</h6>
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          <LanguageToggle />
          <Link to="/block">
            <Button className="bg-[#F4CD41] text-[#1a1a40] text-black font-bold rounded-[5px]">建立設計</Button>
          </Link>
          <button onClick={toggleDropdown} className="relative">
            {userImage ? (
              <img src={userImage} alt="User" className="h-10 w-10 rounded-full" />
            ) : (
              <svg className="h-10 w-10 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
              </svg>
            )}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border shadow-md z-50 rounded-lg p-4">
                <button onClick={closeDropdown} className="absolute top-2 right-2 text-gray-600">&times;</button>
                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer mb-4">
                  <div className="flex flex-col items-center">
                    {userImage ? (
                      <img src={userImage} alt="User Detail" className="w-16 h-16 rounded-full mb-2" />
                    ) : (
                      <svg className="w-16 h-16 text-gray-400 mb-2" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                    <span>{username || "未登入"}</span>
                    <small>{email || "未登入"}</small>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                <nav className="space-y-2 text-sm">
                  <Link to="/how to establish" className="block">如何建立機器人</Link>
                  <Link to="/add server" className="block">建立機器人</Link>
                  <Link to="/block" className="block">開始建立機器人</Link>
                  <Link to="/about" className="block">關於</Link>
                  <Link to="/describe" className="block">介紹</Link>
                  <Link to="/how to use" className="block">操作說明</Link>
                  <Link to="#" className="block">設定</Link>
                  <Link to="#" className="block">語言</Link>
                  <Link to="#" className="block">建議</Link>
                  <Link to="#" className="block">隱私權政策</Link>
                  <Link to="/" className="block font-bold text-red-600">登出</Link>
                </nav>
              </div>
            )}
          </button>
        </div>

        <button className="md:hidden text-foreground focus:outline-none" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
            <div className="pt-4 flex flex-col space-y-3">
              <LanguageToggle className="self-start" />
              <Link to="/block">
                <Button className="bg-yellow-400 text-black font-bold w-full rounded-full">建立設計</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar2;
