import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar2 from "./Navbar2";

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
    <div className="flex flex-col relative bg-white">
  
      <Navbar2 /> 

      <main className="flex-1 pt-2 px-4 md:px-8 pb-0 flex justify-center items-center flex-wrap bg-[#FFFDFA]">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-8">
          {[
            {
              link: "/how to establish",
              img: "/專題圖片/how to establish.svg",
              title: "如何建立機器人",
              desc: ["快速了解機器人建立流程", "從零開始的完整指南"],
            },
            {
              link: "/add server",
              img: "/專題圖片/add server.svg",
              title: "建立機器人",
              desc: ["連接數據來源創建機器人", "整合您的資料庫與API"],
            },
            {
              link: "/block",
              img: "/專題圖片/block.svg",
              title: "開始設計機器人",
              desc: ["自定義機器人對話與功能", "設計智能回應邏輯"],
            },
            {
              link: "/editbot",
              img: "/專題圖片/editbot.svg",
              title: "修改機器人",
              desc: ["更新與優化現有機器人", "增強機器人效能與體驗"],
            },
          ].map(({ link, img, title, desc }) => (
            <Link to={link} key={title}>
              <div className="group relative w-[300px] h-[400px] rounded-[8px] overflow-hidden hover:scale-105 transition duration-300 cursor-pointer shadow-md">
                
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-0"
                />

                <div className="absolute inset-0 bg-[#f2f2f2]/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 text-center">
                  <h3 className="text-[22px] font-bold text-[#1a1a40] mb-3">{title}</h3>
                  <div className="text-[17px] text-[#1a1a40] leading-relaxed space-y-1">
                    {desc.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default HomeBotfly;
