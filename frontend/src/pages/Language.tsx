import Footer from "../components/layout/Footer";

const Language = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* 主要內容區域 */}
      <div className="pt-20 pb-16 px-6">
        {/* 標題區域 */}
        <div className="text-center mb-16">
          <h1 className="text-foreground text-[36px] sm:text-[42px] font-bold mb-4 leading-tight tracking-wide">
            語言設定
          </h1>
          <p className="text-[#5A2C1D] text-xl max-w-4xl mx-auto leading-relaxed">
            選擇您偏好的語言介面
          </p>
        </div>

        {/* 語言選項區域 */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12">
            <h2 className="text-[#383A45] text-[24px] font-bold mb-8 text-center">
              選擇語言
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border-2 border-[#8ECAE6] rounded-lg cursor-pointer hover:bg-[#8ECAE6]/10 transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-4">🇹🇼</div>
                  <h3 className="text-foreground font-bold text-xl mb-2">
                    繁體中文
                  </h3>
                  <p className="text-[#5A2C1D]">Traditional Chinese</p>
                </div>
              </div>

              <div className="p-6 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-4">🇺🇸</div>
                  <h3 className="text-[#383A45] font-bold text-xl mb-2">
                    English
                  </h3>
                  <p className="text-muted-foreground">English (US)</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-muted-foreground text-sm">更多語言選項即將推出</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Language;
