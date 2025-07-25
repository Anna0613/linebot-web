import { useState, useEffect } from 'react';
import Footer from '../components/Index/Footer';
import Navbar from '../components/Index/Navbar';
import Navbar2 from '../components/LoginHome/Navbar2';
import { AuthService } from '../services/auth';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

// 定義 User 介面
interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  avatar?: string;
  isLineUser?: boolean;
}

const About = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authenticated = AuthService.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // 獲取用戶資訊
          const token = AuthService.getToken();
          if (token) {
            try {
              const response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN), {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                  setUser({ 
                    display_name: data.user.username, 
                    username: data.user.username,
                    email: data.user.email || '',
                    isLineUser: false
                  });
                }
              }
            } catch (error) {
              console.error('獲取用戶資訊失敗:', error);
            }
          }
        }
      } catch (error) {
        console.error('檢查認證狀態失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDFA] flex items-center justify-center">
        <div className="text-[#1a1a40] text-lg">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDFA]">
      {isAuthenticated ? <Navbar2 user={user} /> : <Navbar />}
      {/* 主要內容區域 */}
      <div className="pt-32 pb-16 px-6">
        {/* 標題區域 */}
        <div className="text-center mb-16 fade-in-element">
          <h1 className="text-[#1a1a40] text-[36px] sm:text-[42px] font-bold mb-4 leading-tight tracking-wide">關於本網站</h1>
          <p className="text-[#5A2C1D] text-xl max-w-4xl mx-auto leading-relaxed">了解 LineBot Web 平台的設計理念與功能特色</p>
        </div>

        {/* 平台簡介區域 */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12 border-l-4 border-[#8ECAE6]">
            <h2 className="text-[#383A45] text-[32px] font-bold mb-8">平台簡介</h2>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-[#5A2C1D] text-lg leading-relaxed">
                  本網站旨在協助使用者快速建立與設計 LINE Bot，無需撰寫複雜程式碼，即可透過圖形化介面完成機器人邏輯設計。
                </p>
                <p className="text-[#5A2C1D] text-lg leading-relaxed">
                  使用者可以透過簡單的步驟輸入必要資訊（如 Channel access token 和 Channel secret），接著拖拉元件設計回應流程，最後部署上線。
                </p>
                <p className="text-[#5A2C1D] text-lg leading-relaxed">
                  我們的目標是降低技術門檻，讓更多人能發揮創意並建立屬於自己的聊天機器人。
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#FFF7E0] to-[#F9F7F3] rounded-lg p-8 text-center">
                <div className="w-24 h-24 bg-[#F4A261] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-[#383A45] text-xl font-bold mb-3">視覺化開發</h3>
                <p className="text-[#5A2C1D]">拖拉元件，快速建立對話流程</p>
              </div>
            </div>
          </div>
        </div>

        {/* 功能特色區域 */}
        <div className="max-w-7xl mx-auto mb-20">
          <h2 className="text-[#383A45] text-[32px] font-bold text-center mb-12">功能特色</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center border-t-4 border-[#F4A261]">
              <div className="w-16 h-16 bg-[#F4A261] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-[#383A45] font-bold text-xl mb-4">簡單易用</h3>
              <p className="text-[#5A2C1D] leading-relaxed">直觀的圖形化介面，無需程式設計背景即可快速上手</p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center border-t-4 border-[#2A9D8F]">
              <div className="w-16 h-16 bg-[#2A9D8F] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
              </div>
              <h3 className="text-[#383A45] font-bold text-xl mb-4">功能豐富</h3>
              <p className="text-[#5A2C1D] leading-relaxed">支援多種互動元件，滿足不同類型機器人的需求</p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center border-t-4 border-[#8ECAE6]">
              <div className="w-16 h-16 bg-[#8ECAE6] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-[#383A45] font-bold text-xl mb-4">快速部署</h3>
              <p className="text-[#5A2C1D] leading-relaxed">一鍵部署功能，讓您的機器人立即上線服務</p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center border-t-4 border-[#CDB4DB]">
              <div className="w-16 h-16 bg-[#CDB4DB] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                </svg>
              </div>
              <h3 className="text-[#383A45] font-bold text-xl mb-4">數據分析</h3>
              <p className="text-[#5A2C1D] leading-relaxed">提供詳細的使用統計，幫助您優化機器人表現</p>
            </div>
          </div>
        </div>

        {/* 應用場景區域 */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="bg-gradient-to-r from-[#FFF7E0] to-[#F9F7F3] rounded-lg p-12">
            <h2 className="text-[#383A45] text-[32px] font-bold text-center mb-12">應用場景</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-[#A0D6B4] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-[#383A45] font-bold text-xl mb-4">教育領域</h3>
                <p className="text-[#5A2C1D] leading-relaxed">建立智能教學助手，提供課程諮詢、作業提醒等服務</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-[#FFD59E] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-[#5A2C1D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <h3 className="text-[#383A45] font-bold text-xl mb-4">行銷推廣</h3>
                <p className="text-[#5A2C1D] leading-relaxed">設計互動式行銷機器人，增加品牌曝光與客戶參與度</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-[#8ECAE6] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-[#383A45] font-bold text-xl mb-4">客戶服務</h3>
                <p className="text-[#5A2C1D] leading-relaxed">建立自動化客服系統，24小時回應客戶問題</p>
              </div>
            </div>
          </div>
        </div>

        {/* 行動呼籲區域 */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-12">
            <h2 className="text-[#383A45] text-[28px] font-bold mb-6">準備開始建立您的 LINE Bot 嗎？</h2>
            <p className="text-[#5A2C1D] text-lg mb-8 leading-relaxed">
              現在就開始您的 LINE Bot 開發之旅，體驗最直觀的機器人設計平台
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={() => window.location.href = '/how%20to%20establish'}
                className="px-8 py-4 bg-[#A0D6B4] text-white font-bold rounded-lg shadow-lg hover:brightness-90 hover:shadow-xl transition-all duration-200 text-lg"
              >
                查看建立教學
              </button>
              <button 
                onClick={() => window.location.href = '/add%20server'}
                className="px-8 py-4 bg-[#FFD59E] text-[#5A2C1D] font-bold rounded-lg shadow-lg hover:brightness-90 hover:shadow-xl transition-all duration-200 text-lg"
              >
                開始建立 Bot
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;