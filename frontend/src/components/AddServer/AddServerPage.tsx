import { Link } from 'react-router-dom';
import { useState } from 'react';

const AddServerPage = () => {
  const [formData, setFormData] = useState({
    serverName: '',
    accessToken: '',
    channelSecret: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-[#FFFDFA] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題區域 */}
        <div className="text-center mb-8 fade-in-element">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F4CD41] rounded-full mb-4 shadow-lg">
            <svg className="w-8 h-8 text-[#1a1a40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-[#1a1a40] text-3xl sm:text-4xl font-bold mb-3">建立 LINE Bot</h1>
          <p className="text-gray-600 text-lg">設定您的 LINE Bot 基本資訊，開始打造智能對話體驗</p>
        </div>

        {/* 主要表單卡片 */}
        <div className="glassmorphism rounded-2xl shadow-glass-lg overflow-hidden fade-in-element max-w-2xl mx-auto" style={{ animationDelay: '0.2s' }}>
          {/* 卡片頭部 */}
          <div className="bg-[#DFECF4] px-8 py-6 border-b border-gray-100">
            <h2 className="text-[#1a1a40] text-xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Bot 設定
            </h2>
          </div>

          {/* 表單內容 */}
          <form className="p-8 space-y-6">
            {/* LINE Bot 名稱 */}
            <div className="space-y-3">
              <label htmlFor="serverName" className="flex items-center text-[#1a1a40] text-lg font-bold">
                <svg className="w-5 h-5 mr-2 text-[#F4CD41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                LINE Bot 名稱：
              </label>
              <input
                type="text"
                id="serverName"
                name="serverName"
                value={formData.serverName}
                onChange={handleInputChange}
                placeholder="請輸入您的 LINE Bot 名稱"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F4CD41] focus:border-[#F4CD41] transition-all duration-200 text-base"
              />
            </div>

            {/* Channel Access Token */}
            <div className="space-y-3">
              <label htmlFor="accessToken" className="flex items-center text-[#1a1a40] text-lg font-bold">
                <svg className="w-5 h-5 mr-2 text-[#F4CD41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                </svg>
                輸入 Channel access token：
              </label>
              <input
                type="password"
                id="accessToken"
                name="accessToken"
                value={formData.accessToken}
                onChange={handleInputChange}
                placeholder="請輸入 Channel access token"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F4CD41] focus:border-[#F4CD41] transition-all duration-200 text-base"
              />
              <p className="text-sm text-gray-500 flex items-center mt-2">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                可在 LINE Developers Console 中取得
              </p>
            </div>

            {/* Channel Secret */}
            <div className="space-y-3">
              <label htmlFor="channelSecret" className="flex items-center text-[#1a1a40] text-lg font-bold">
                <svg className="w-5 h-5 mr-2 text-[#F4CD41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                輸入 Channel secret：
              </label>
              <input
                type="password"
                id="channelSecret"
                name="channelSecret"
                value={formData.channelSecret}
                onChange={handleInputChange}
                placeholder="請輸入 Channel secret"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F4CD41] focus:border-[#F4CD41] transition-all duration-200 text-base"
              />
              <p className="text-sm text-gray-500 flex items-center mt-2">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                用於驗證 webhook 請求的安全性
              </p>
            </div>

            {/* 按鈕區域 */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                type="button"
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-50 transition-all duration-200 h-11"
              >
                取消
              </button>
              <Link
                to="/block"
                className="flex-1 px-6 py-3 bg-[#F4CD41] text-[#1a1a40] rounded-full font-bold hover:bg-[#e6bc00] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-center flex items-center justify-center h-11"
              >
                <span>繼續設定</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </form>
        </div>

        {/* 幫助資訊卡片 */}
        <div className="mt-8 glassmorphism rounded-xl p-6 fade-in-element max-w-2xl mx-auto" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-lg font-bold text-[#1a1a40] mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#F4CD41]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            需要幫助？
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start">
              <span className="text-[#F4CD41] mr-2">•</span>
              Channel Access Token 和 Channel Secret 可以在{' '}
              <a 
                href="https://developers.line.biz/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#1a1a40] underline hover:text-[#F4CD41] transition-colors ml-1"
              >
                LINE Developers Console
              </a>
              {' '}中取得
            </p>
            <p className="flex items-start">
              <span className="text-[#F4CD41] mr-2">•</span>
              確保您已經建立了 Messaging API 頻道
            </p>
            <p className="flex items-start">
              <span className="text-[#F4CD41] mr-2">•</span>
              如果遇到問題，請參考我們的{' '}
              <Link 
                to="/how%20to%20establish" 
                className="text-[#1a1a40] underline hover:text-[#F4CD41] transition-colors"
              >
                建立教學
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddServerPage;
