import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useBotManagement } from '../../hooks/useBotManagement';
import ToastNotification from '../ui/ToastNotification';

const AddServerPage = () => {
  const { createBot, isLoading, error, setError, clearError } = useBotManagement();
  const [formData, setFormData] = useState({
    serverName: '',
    accessToken: '',
    channelSecret: ''
  });
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除相關的錯誤訊息
    if (error) {
      clearError();
    }
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'serverName':
        if (!value.trim()) {
          return '請輸入 LINE Bot 名稱';
        }
        if (value.trim().length < 2) {
          return 'Bot 名稱至少需要 2 個字符';
        }
        if (value.trim().length > 50) {
          return 'Bot 名稱不能超過 50 個字符';
        }
        if (!/^[a-zA-Z0-9\u4e00-\u9fff\-_\s]+$/.test(value.trim())) {
          return 'Bot 名稱只能包含中英文、數字、空格、連字號和底線';
        }
        return '';
        
      case 'accessToken':
        if (!value.trim()) {
          return '請輸入 Channel Access Token';
        }
        if (value.trim().length < 10) {
          return 'Channel Access Token 長度不正確';
        }
        return '';
        
      case 'channelSecret':
        if (!value.trim()) {
          return '請輸入 Channel Secret';
        }
        if (value.trim().length < 10) {
          return 'Channel Secret 長度不正確';
        }
        return '';
        
      default:
        return '';
    }
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        errors[key] = error;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return '請修正表單中的錯誤';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      // 顯示錯誤 Toast
      setToastMessage(validationError);
      setToastType('error');
      setShowToast(true);
      return;
    }

    // 準備提交給 puzzleAPI 的數據
    const botData = {
      name: formData.serverName,
      channel_token: formData.accessToken,
      channel_secret: formData.channelSecret
    };

    // 調用 hook 中的 createBot 方法
    const createdBot = await createBot(botData);
    
    if (createdBot) {
      console.log('Bot 創建成功:', createdBot);
      
      // 顯示成功訊息
      setSuccess(true);
      setToastMessage(`LINE Bot "${createdBot.name}" 創建成功！`);
      setToastType('success');
      setShowToast(true);
      
      // 2秒後跳轉到區塊設定頁面
      setTimeout(() => {
        window.location.href = `/block?botId=${createdBot.id}&botName=${encodeURIComponent(createdBot.name)}`;
      }, 2000);
    } else if (error) {
      // 顯示錯誤 Toast (如果有錯誤且沒有創建成功)
      setToastMessage(error);
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleCancel = () => {
    window.history.back(); // 返回上一頁
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

        {/* 成功訊息 */}
        {success && (
          <div className="max-w-2xl mx-auto mb-6 fade-in-element">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-green-800">
                  <p className="font-medium">LINE Bot 創建成功！</p>
                  <p className="text-sm">正在跳轉到區塊設定頁面...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 fade-in-element">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-red-800 font-medium mb-1">創建失敗</h3>
                  <p className="text-red-700 text-sm mb-3">{error}</p>
                  
                  {/* 根據錯誤類型提供解決建議 */}
                  {error.includes('名稱已被使用') && (
                    <div className="text-red-600 text-xs bg-red-100 rounded p-2">
                      <p className="font-medium mb-1">💡 解決建議：</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>請嘗試其他名稱，例如：{formData.serverName}-v2、{formData.serverName}-new</li>
                        <li>或者到管理頁面查看並刪除不需要的舊 Bot</li>
                      </ul>
                    </div>
                  )}
                  
                  {error.includes('最多只能創建 3 個') && (
                    <div className="text-red-600 text-xs bg-red-100 rounded p-2">
                      <p className="font-medium mb-1">💡 解決建議：</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>請先到管理頁面刪除不需要的 Bot</li>
                        <li>每個帳戶最多只能同時擁有 3 個 Bot</li>
                      </ul>
                    </div>
                  )}
                  
                  {error.includes('登入已過期') && (
                    <div className="text-red-600 text-xs bg-red-100 rounded p-2">
                      <p className="font-medium mb-1">💡 解決建議：</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>請重新登入您的帳戶</li>
                        <li>登入後回到此頁面重新創建 Bot</li>
                      </ul>
                    </div>
                  )}
                  
                  {error.includes('網路') && (
                    <div className="text-red-600 text-xs bg-red-100 rounded p-2">
                      <p className="font-medium mb-1">💡 解決建議：</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>請檢查您的網路連線</li>
                        <li>確認防火牆沒有阻擋連線</li>
                        <li>稍後再重試</li>
                      </ul>
                    </div>
                  )}
                  
                  {error.includes('伺服器') && (
                    <div className="text-red-600 text-xs bg-red-100 rounded p-2">
                      <p className="font-medium mb-1">💡 解決建議：</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>伺服器暫時繁忙，請稍後再試</li>
                        <li>如果問題持續，請聯繫管理員</li>
                      </ul>
                    </div>
                  )}
                  
                  {error.includes('格式不正確') && (
                    <div className="text-red-600 text-xs bg-red-100 rounded p-2">
                      <p className="font-medium mb-1">💡 解決建議：</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>請檢查 Channel Access Token 和 Channel Secret 是否正確</li>
                        <li>確認沒有多餘的空格或特殊字符</li>
                        <li>Token 和 Secret 可從 LINE Developers Console 重新複製</li>
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* 關閉按鈕 */}
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600 transition-colors ml-2"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

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
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                onBlur={handleFieldBlur}
                placeholder="請輸入您的 LINE Bot 名稱"
                className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 text-base ${
                  fieldErrors.serverName 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400' 
                    : 'border-gray-300 focus:ring-2 focus:ring-[#F4CD41] focus:border-[#F4CD41]'
                }`}
                disabled={isLoading}
                required
              />
              {fieldErrors.serverName && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.serverName}</p>
              )}
            </div>

            {/* Channel Access Token */}
            <div className="space-y-3">
              <label htmlFor="accessToken" className="flex items-center text-[#1a1a40] text-lg font-bold">
                <svg className="w-5 h-5 mr-2 text-[#F4CD41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1 1 21 9z" />
                </svg>
                輸入 Channel access token：
              </label>
              <input
                type="password"
                id="accessToken"
                name="accessToken"
                value={formData.accessToken}
                onChange={handleInputChange}
                onBlur={handleFieldBlur}
                placeholder="請輸入 Channel access token"
                className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 text-base ${
                  fieldErrors.accessToken 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400' 
                    : 'border-gray-300 focus:ring-2 focus:ring-[#F4CD41] focus:border-[#F4CD41]'
                }`}
                disabled={isLoading}
                required
              />
              <p className="text-sm text-gray-500 flex items-center mt-2">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                可在 LINE Developers Console 中取得
              </p>
              {fieldErrors.accessToken && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.accessToken}</p>
              )}
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
                onBlur={handleFieldBlur}
                placeholder="請輸入 Channel secret"
                className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 text-base ${
                  fieldErrors.channelSecret 
                    ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400' 
                    : 'border-gray-300 focus:ring-2 focus:ring-[#F4CD41] focus:border-[#F4CD41]'
                }`}
                disabled={isLoading}
                required
              />
              <p className="text-sm text-gray-500 flex items-center mt-2">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                用於驗證 webhook 請求的安全性
              </p>
              {fieldErrors.channelSecret && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.channelSecret}</p>
              )}
            </div>

            {/* 按鈕區域 */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-50 transition-all duration-200 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading || success}
                className="flex-1 px-6 py-3 bg-[#F4CD41] text-[#1a1a40] rounded-full font-bold hover:bg-[#e6bc00] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-center flex items-center justify-center h-11 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-[#1a1a40]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    創建中...
                  </>
                ) : success ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    已創建
                  </>
                ) : (
                  <>
                    <span>創建 Bot</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
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
      {showToast && (
        <ToastNotification
          message={toastMessage}
          type={toastType}
          visible={showToast}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default AddServerPage;
