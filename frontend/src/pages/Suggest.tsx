import Footer from "../components/layout/Footer";

const Suggest = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* 主要內容區域 */}
      <div className="pt-20 pb-16 px-6">
        {/* 標題區域 */}
        <div className="text-center mb-16">
          <h1 className="text-foreground text-[36px] sm:text-[42px] font-bold mb-4 leading-tight tracking-wide">
            意見回饋
          </h1>
          <p className="text-muted-foreground text-xl max-w-4xl mx-auto leading-relaxed">
            我們重視您的寶貴意見，幫助我們改善服務
          </p>
        </div>

        {/* 回饋表單區域 */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12">
            <form className="space-y-8">
              {/* 意見類型 */}
              <div>
                <label className="block text-foreground text-lg font-bold mb-4">
                  意見類型
                </label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--line-green-soft))] transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🐛</div>
                      <p className="text-foreground font-medium">錯誤回報</p>
                    </div>
                  </div>
                  <div className="p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--line-green-soft))] transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">💡</div>
                      <p className="text-foreground font-medium">功能建議</p>
                    </div>
                  </div>
                  <div className="p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--line-green-soft))] transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-2">💬</div>
                      <p className="text-foreground font-medium">一般意見</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 意見內容 */}
              <div>
                <label className="block text-foreground text-lg font-bold mb-3">
                  意見內容
                </label>
                <textarea
                  placeholder="請詳細描述您的意見或建議..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] outline-none transition-colors text-foreground/80 resize-none"
                />
              </div>

              {/* 聯絡資訊 */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-foreground text-lg font-bold mb-3">
                    您的姓名（選填）
                  </label>
                  <input
                    type="text"
                    placeholder="請輸入您的姓名"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] outline-none transition-colors text-foreground/80"
                  />
                </div>
                <div>
                  <label className="block text-foreground text-lg font-bold mb-3">
                    Email（選填）
                  </label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] outline-none transition-colors text-foreground/80"
                  />
                </div>
              </div>

              {/* 提交按鈕 */}
              <div className="text-center">
                <button
                  type="submit"
                  className="px-12 py-4 bg-[hsl(var(--primary))] text-white font-bold rounded-lg shadow-lg hover:brightness-95 hover:shadow-xl transition-all duration-200 text-lg"
                >
                  送出意見
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 聯絡方式區域 */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-secondary rounded-lg p-8">
            <h2 className="text-foreground text-[24px] font-bold text-center mb-8">
              其他聯絡方式
            </h2>
            <div className="grid md:grid-cols-2 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-foreground font-bold text-lg mb-2">
                  Email 聯絡
                </h3>
                <p className="text-muted-foreground">support@linebotweb.com</p>
              </div>

              <div>
                <div className="w-16 h-16 bg-[#00C300] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <h3 className="text-foreground font-bold text-lg mb-2">
                  LINE 官方帳號
                </h3>
                <p className="text-muted-foreground">@linebotweb</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Suggest;
