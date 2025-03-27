import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar2 from "../components/Navbar2";

const HomeBotfly = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    setUsername(storedUsername);
    setEmail(storedEmail);
  }, []);

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
    <div className="min-h-screen flex flex-col relative bg-white">
      <Navbar2 />
  
      {/* 把 mt-12 改成 mt-4 或 mt-2，讓整體往上靠 */}
      <main className="flex-1 px-4 md:px-8 mt-1 flex justify-center items-center flex-wrap">
        {/* 每個區塊加大 margin-right，讓箭頭與圖片距離更遠 */}
        <div className="flex items-center gap-8 md:gap-14 flex-wrap justify-center">
          {/* 第一步 */}
          <Link to="/how to establish">
            <img
              src="/專題圖片/1.svg"
              className="w-[300px] h-auto hover:scale-105 transition rounded-[5px]"
              alt="How To Establish"
            />
          </Link>
  
          {/* 箭頭 */}
          <div className="mx-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="w-14 h-14 fill-[#454658]"
            >
              <path d="M334.5 414c8.8 3.8 19 2 26-4.6l144-136c4.8-4.5 7.5-10.8 7.5-17.4s-2.7-12.9-7.5-17.4l-144-136c-7-6.6-17.2-8.4-26-4.6s-14.5 12.5-14.5 22v72H32c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32h288v72c0 9.6 5.7 18.2 14.5 22z" />
            </svg>
          </div>
  
          {/* 第二步 */}
          <Link to="/add server">
            <img
              src="/專題圖片/2.svg"
              className="w-[300px] h-auto hover:scale-105 transition rounded-[5px]"
              alt="Add Server"
            />
          </Link>
  
          {/* 箭頭 */}
          <div className="mx-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="w-14 h-14 fill-[#454658]"
            >
              <path d="M334.5 414c8.8 3.8 19 2 26-4.6l144-136c4.8-4.5 7.5-10.8 7.5-17.4s-2.7-12.9-7.5-17.4l-144-136c-7-6.6-17.2-8.4-26-4.6s-14.5 12.5-14.5 22v72H32c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32h288v72c0 9.6 5.7 18.2 14.5 22z" />
            </svg>
          </div>
  
          {/* 第三步 */}
          <Link to="/block">
            <img
              src="/專題圖片/3.svg"
              className="w-[300px] h-auto hover:scale-105 transition rounded-[5px]"
              alt="Block"
            />
          </Link>
        </div>
      </main>
    </div>
  );
  
};

export default HomeBotfly;
