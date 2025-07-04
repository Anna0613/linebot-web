import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from '../../services/api';

// 定義 User 介面
interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  avatar?: string;
  isLineUser?: boolean;
}

interface HomeBotflyProps {
  user: User | null;
}

const HomeBotfly: React.FC<HomeBotflyProps> = ({ user }) => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const apiClient = ApiClient.getInstance();

  // 載入用戶頭像
  const loadUserAvatar = async () => {
    if (user && !user.isLineUser && !user.picture_url) {
      try {
        const response = await apiClient.getAvatar();
        if (response.status === 200 && response.data?.avatar) {
          setUserImage(response.data.avatar);
        }
      } catch (error) {
        console.error('載入頭像失敗:', error);
      }
    }
  };

  useEffect(() => {
    if (user?.picture_url) {
      // LINE 用戶或有 picture_url 的用戶
      setUserImage(user.picture_url);
    } else if (user?.avatar) {
      // 有 avatar 資料的用戶
      setUserImage(user.avatar);
    } else if (user && !user.isLineUser) {
      // 非 LINE 用戶，從後端載入頭像
      loadUserAvatar();
    } else {
      setUserImage(null);
    }
  }, [user]);

  // 監聽自定義事件來更新頭像
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      setUserImage(event.detail.avatar);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
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
      <main className="flex-1 pt-0 px-4 md:px-8 pb-0 flex justify-center items-center flex-wrap bg-[#FFFDFA]">
        {/* 顯示用戶歡迎訊息 */}
        {user && (
          <div className="w-full text-center mt-[-20px] mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a40]">歡迎，{user.display_name}！</h2>
            {userImage || user?.picture_url ? (
              <img
                src={userImage || user?.picture_url}
                alt={user.display_name}
                className="w-16 h-16 rounded-full mx-auto mt-4"
              />
            ) : (
              <svg className="w-16 h-16 text-gray-400 mx-auto mt-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto md:max-w-none md:flex md:flex-wrap md:justify-center md:gap-x-10 md:gap-y-8">
          {[
            {
              link: "/how to establish",
              img: "/專題圖片/how to establish.svg",
              title: "如何建立LINE Bot",
              desc: ["快速了解機器人建立流程", "從零開始的完整指南"],
            },
            {
              link: "/add server",
              img: "/專題圖片/add server.svg",
              title: "建立LINE Bot",
              desc: ["連接數據來源創建機器人", "整合您的資料庫與API"],
            },
            {
              link: "/block",
              img: "/專題圖片/block.svg",
              title: "開始設計LINE Bot",
              desc: ["自定義機器人對話與功能", "設計智能回應邏輯"],
            },
            {
              link: "/editbot",
              img: "/專題圖片/editbot.svg",
              title: "LINE Bot 管理",
              desc: ["更新與優化現有機器人", "增強機器人效能與體驗"],
            },
          ].map(({ link, img, title, desc }) => (
            <Link to={link} key={title}>
              <div className="group relative w-full h-[180px] md:w-[300px] md:h-[400px] rounded-[8px] overflow-hidden hover:scale-105 transition duration-300 cursor-pointer shadow-md">
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-0"
                />
                <div className="absolute inset-0 bg-[#f2f2f2]/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2 md:px-4 text-center">
                  <h3 className="text-[14px] md:text-[22px] font-bold text-[#1a1a40] mb-1 md:mb-3">{title}</h3>
                  <div className="text-[11px] md:text-[17px] text-[#1a1a40] leading-relaxed space-y-0.5 md:space-y-1">
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