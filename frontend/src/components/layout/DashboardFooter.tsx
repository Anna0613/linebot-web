import { Link } from "react-router-dom";
import LanguageToggle from "../LanguageToggle/LanguageToggle";

const DashboardFooter = () => {
  return (
    <footer
      id="contact"
      className="bg-secondary pt-12 sm:pt-16 pb-6 sm:pb-8 mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* 主要內容區域 */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-8 sm:gap-12 lg:gap-[120px] mb-8 sm:mb-12">
          {/* 品牌資訊區域 */}
          <div className="space-y-4 text-center md:text-left">
            <span className="text-xl sm:text-2xl font-bold text-[#0B346E] block">
              LINE Bot 製作輔助系統
            </span>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm leading-relaxed">
                非常適合需要使用LINE Bot做為行銷工具的商家，
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                或者想修改原有LINE Bot的功能卻因為不會打程式碼而無法修改的人。
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-4 pt-4 sm:pt-8">
              <LanguageToggle />
            </div>
          </div>

          {/* 快速連結區域 */}
          <div className="w-full flex flex-col text-center md:text-left">
            <h3 className="font-medium text-lg mb-4 text-[#0B346E]">
              快速連結
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1"
                >
                  首頁
                </Link>
              </li>
              <li>
                <Link
                  to="/how-to-establish"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1"
                >
                  如何建立LINE Bot
                </Link>
              </li>
              <li>
                <Link
                  to="/bots/create"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1"
                >
                  建立LINE Bot
                </Link>
              </li>
              <li>
                <Link
                  to="/bots/editor"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1"
                >
                  開始設計LINE Bot
                </Link>
              </li>
              <li>
                <Link
                  to="/bots/management"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1"
                >
                  管理LINE Bot
                </Link>
              </li>
            </ul>
          </div>

          {/* 聯絡資訊區域 */}
          <div className="w-full flex flex-col text-center md:text-left">
            <h3 className="font-medium text-lg mb-4 text-[#0B346E]">
              聯絡我們
            </h3>
            <ul className="space-y-2">
              <li className="text-muted-foreground text-sm py-1">
                Taoyuan, Taiwan
              </li>
              <li>
                <a
                  href="mailto:info@mail.mcu.edu.tw"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1 break-all"
                >
                  info@mail.mcu.edu.tw
                </a>
              </li>
              <li>
                <a
                  href="tel:03-350-7001"
                  className="text-muted-foreground hover:text-[#0B346E] transition-colors text-sm block py-1"
                >
                  03-350-7001
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 版權和社交媒體區域 */}
        <div className="border-t border-gray-200 pt-6 sm:pt-8">
          <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
            {/* 版權資訊 */}
            <p className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} 銘傳大學 Ming Chuan University
            </p>

            {/* 社交媒體連結 */}
            <div className="flex justify-center md:justify-end space-x-4 sm:space-x-6 items-center">
              <a
                href="https://www.facebook.com/MCU1957"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/20 rounded-full"
                aria-label="Facebook"
              >
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 448 512"
                  fill="currentColor"
                >
                  <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64h98.2V334.2H109.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H255V480H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z" />
                </svg>
              </a>

              <a
                href="https://www.instagram.com/mcu1957/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/20 rounded-full"
                aria-label="Instagram"
              >
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 448 512"
                  fill="currentColor"
                >
                  <path d="M224.1 141c-63.6 0-115.1 51.5-115.1 115.1S160.5 371.2 224.1 371.2 339.2 319.7 339.2 256 287.7 141 224.1 141zm0 189.6c-41.2 0-74.5-33.3-74.5-74.5s33.3-74.5 74.5-74.5 74.5 33.3 74.5 74.5-33.3 74.5-74.5 74.5zm146.4-194.3c0 14.9-12 26.9-26.9 26.9s-26.9-12-26.9-26.9 12-26.9 26.9-26.9 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.3-9.9-66.7-36.2-93s-57.6-34.5-93-36.2c-36.6-2.1-146.6-2.1-183.1 0-35.3 1.7-66.7 9.9-93 36.2S1.6 118.4 0 153.7c-2.1 36.6-2.1 146.6 0 183.1 1.7 35.3 9.9 66.7 36.2 93s57.6 34.5 93 36.2c36.6 2.1 146.6 2.1 183.1 0 35.3-1.7 66.7-9.9 93-36.2s34.5-57.6 36.2-93c2.1-36.6 2.1-146.6 0-183.1zM398.8 388c-7.8 19.7-22.9 34.8-42.6 42.6-29.5 11.7-99.4 9-132.1 9s-102.7 2.6-132.1-9c-19.7-7.8-34.8-22.9-42.6-42.6-11.7-29.5-9-99.4-9-132.1s-2.6-102.7 9-132.1c7.8-19.7 22.9-34.8 42.6-42.6 29.5-11.7 99.4-9 132.1-9s102.7-2.6 132.1 9c19.7 7.8 34.8 22.9 42.6 42.6 11.7 29.5 9 99.4 9 132.1s2.6 102.7-9 132.1z" />
                </svg>
              </a>

              <a
                href="https://www.youtube.com/mcu1957"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/20 rounded-full"
                aria-label="YouTube"
              >
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 576 512"
                  fill="currentColor"
                >
                  <path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zM232.2 337.6V174.4l142.8 81.6-142.8 81.6z" />
                </svg>
              </a>

              <a
                href="https://www.weibo.com/welcomemcu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/20 rounded-full"
                aria-label="weibo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="currentColor"
                >
                  <path d="M407 177.6c7.6-24-13.4-46.8-37.4-41.7-22 4.8-28.8-28.1-7.1-32.8 50.1-10.9 92.3 37.1 76.5 84.8-6.8 21.2-38.8 10.8-32-10.3zM214.8 446.7C108.5 446.7 0 395.3 0 310.4c0-44.3 28-95.4 76.3-143.7C176 67 279.5 65.8 249.9 161c-4 13.1 12.3 5.7 12.3 6 79.5-33.6 140.5-16.8 114 51.4-3.7 9.4 1.1 10.9 8.3 13.1 135.7 42.3 34.8 215.2-169.7 215.2zm143.7-146.3c-5.4-55.7-78.5-94-163.4-85.7-84.8 8.6-148.8 60.3-143.4 116s78.5 94 163.4 85.7c84.8-8.6 148.8-60.3 143.4-116zM347.9 35.1c-25.9 5.6-16.8 43.7 8.3 38.3 72.3-15.2 134.8 52.8 111.7 124-7.4 24.2 29.1 37 37.4 12 31.9-99.8-55.1-195.9-157.4-174.3zm-78.5 311c-17.1 38.8-66.8 60-109.1 46.3-40.8-13.1-58-53.4-40.3-89.7 17.7-35.4 63.1-55.4 103.4-45.1 42 10.8 63.1 50.2 46 88.5zm-86.3-30c-12.9-5.4-30 .3-38 12.9-8.3 12.9-4.3 28 8.6 34 13.1 6 30.8 .3 39.1-12.9 8-13.1 3.7-28.3-9.7-34zm32.6-13.4c-5.1-1.7-11.4 .6-14.3 5.4-2.9 5.1-1.4 10.6 3.7 12.9 5.1 2 11.7-.3 14.6-5.4 2.8-5.2 1.1-10.9-4-12.9z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
