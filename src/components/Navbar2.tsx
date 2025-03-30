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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${isScrolled ? 'bg-opacity-90 backdrop-blur-md shadow-sm' : 'bg-opacity-100'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        <div className="flex items-center gap-4">
          <button className="text-[#1a1a40]" onClick={toggleMobileMenu}>
            <Menu size={28} />
          </button>
          <Link to="/index2" className="flex items-center space-x-3 z-10">
            <img src="/專題圖片/Botfly.svg" alt="Logo" className="h-12 w-auto" />
            <h6 className="text-[28px] font-bold pl-4 text-[#1a1a40] tracking-wide mt-1">BOTFLY</h6>
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <LanguageToggle />

          <Link to="/how to use">
            <div className="circle-question">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 fill-[#454658]">
                <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm169.8-90.7c7.9-22.3 29.1-37.3 52.8-37.3l58.3 0c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24l0-13.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1l-58.3 0c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
              </svg>
            </div>
          </Link>

          <Link to="/block">
            <Button className="bg-[#F4CD41] text-[#1a1a40] text-black font-bold rounded-[5px] text-[16px]">建立設計</Button>
          </Link>

          <div className="relative">
            <button onClick={toggleDropdown} className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
              {userImage ? (
                <img src={userImage} alt="User" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-6 w-6 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
                </svg>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-56 bg-white border shadow-xl rounded-lg z-50 p-4">
                <button onClick={closeDropdown} className="absolute top-2 right-2 text-gray-500 text-xl">&times;</button>

                <div className="flex flex-col items-center cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                  {userImage ? (
                    <img src={userImage} alt="User Detail" className="w-16 h-16 rounded-full mb-2 object-cover" />
                  ) : (
                    <svg className="w-16 h-16 text-gray-400 mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                  <span className="font-medium">{username || "未登入"}</span>
                  <small className="text-gray-500">{email || "未登入"}</small>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <nav className="space-y-2 text-sm text-[#1a1a40]">
                <hr className="my-2 border-gray-300" />

                <Link to="/setting" className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-gray-100 text-[16px]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-[#454658]">
                    <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z" />
                  </svg>
                  設定
                </Link>

                <Link to="/language" className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-gray-100 text-[16px]">
                <img src="/專題圖片/language setting.svg" alt="Logo" className="h-6 w-auto" />
                  語言
                </Link>

                <Link to="/suggest" className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-gray-100 text-[16px]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-[#454658]">
                  <path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z" />
                  </svg>
                  建議
                </Link>

                <Link to="/privacy" className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-gray-100 text-[16px]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-[#454658]">
                  <path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0zm0 66.8l0 378.1C394 378 431.1 230.1 432 141.4L256 66.8s0 0 0 0z" />
                  </svg>
                  隱私權政策
                </Link>

                <hr className="my-2 border-gray-300" />

                <Link to="/" className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-gray-100 font-bold text-red-600 text-[16px]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-[#454658]">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                  </svg>
                  登出
                </Link>
              </nav> 
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={toggleMobileMenu}
          />

          <div className="fixed top-0 left-0 h-full w-64 bg-white z-50 shadow-lg p-6 
            transition-transform duration-500 ease-in-out transform 
            translate-x-0">
            <div className="flex justify-end">
              <button onClick={toggleMobileMenu} className="text-2xl text-gray-700">
                <X />
              </button>
            </div>

            <ul className="mt-8 space-y-4 text-[#1a1a40] text-lg">
              <li><Link to="/index2" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">首頁</Link></li>
              <li><Link to="/how to establish" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">如何建立機器人</Link></li>
              <li><Link to="/add server" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">建立機器人</Link></li>
              <li><Link to="/block" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">開始建立機器人</Link></li>
              <li><Link to="/about" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">關於</Link></li>
              <li><Link to="/describe" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">介紹</Link></li>
              <li><Link to="/how to use" onClick={toggleMobileMenu} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100">操作說明</Link></li>
            </ul>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar2;
