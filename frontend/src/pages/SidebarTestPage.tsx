import React, { useState } from "react";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";

// 模擬用戶數據
const mockUser = {
  line_id: "test123",
  display_name: "測試用戶",
  picture_url: "https://via.placeholder.com/40",
  username: "testuser",
  isLineUser: true,
};

const SidebarTestPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 切換暗黑模式
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark', !isDarkMode);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col bg-background">
        <DashboardNavbar user={mockUser} />
        <main id="main" role="main" className="pt-24 md:pt-28 mb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 測試說明 */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">
                側邊欄視覺分隔效果測試
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                這個頁面用於測試登入後儀表板的側邊欄視覺分隔效果
              </p>
              
              {/* 暗黑模式切換按鈕 */}
              <button
                onClick={toggleDarkMode}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                切換到 {isDarkMode ? '淺色' : '暗黑'} 模式
              </button>
            </div>

            {/* 測試指引 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="web3-dashboard-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-web3-cyan">
                  測試步驟
                </h3>
                <ol className="space-y-2 text-sm">
                  <li>1. 點擊左上角的漢堡選單按鈕</li>
                  <li>2. 觀察側邊欄的視覺分隔效果</li>
                  <li>3. 在暗黑模式下檢查邊框和陰影</li>
                  <li>4. 測試選單項目的懸停效果</li>
                  <li>5. 確認響應式設計在手機版的表現</li>
                </ol>
              </div>

              <div className="web3-dashboard-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-web3-purple">
                  改善項目
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ 暗黑模式下的邊框增強</li>
                  <li>✅ 背景模糊和透明度效果</li>
                  <li>✅ 霓虹色彩邊框和陰影</li>
                  <li>✅ 選單項目懸停動畫</li>
                  <li>✅ 左側漸變指示線</li>
                  <li>✅ 響應式設計優化</li>
                </ul>
              </div>
            </div>

            {/* 當前模式顯示 */}
            <div className="text-center">
              <div className={`inline-block px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-web3-cyan/10 text-web3-cyan border border-web3-cyan/30' 
                  : 'bg-gray-100 text-gray-800 border border-gray-300'
              }`}>
                當前模式: {isDarkMode ? '暗黑模式' : '淺色模式'}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarTestPage;
