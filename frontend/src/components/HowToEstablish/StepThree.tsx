import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const StepThree = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-[#FFFDFA] to-[#F8F6F3] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-line/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Content Section */}
          <div className="order-2 lg:order-1 space-y-8 fade-in-element">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-line/10 rounded-full text-line font-medium text-sm">
                <span>第三步</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                建立 <span className="text-gradient">Channel</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Channel 是您 LINE Bot 的核心，透過 Messaging API channel 讓您的機器人與用戶互動。
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-glass">
                <h3 className="text-xl font-semibold text-foreground mb-3">操作步驟：</h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">1</span>
                    </div>
                    <span className="text-muted-foreground">在Provider頁面中選擇「Channels」</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">2</span>
                    </div>
                    <span className="text-muted-foreground">點選「Create a Messaging API channel」</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">3</span>
                    </div>
                    <span className="text-muted-foreground">填寫頻道資訊並選擇地區與類別</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">4</span>
                    </div>
                    <span className="text-muted-foreground">同意條款並點擊「Create」</span>
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50/50 rounded-xl p-4 border border-green-200/50">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">必填欄位</h4>
                      <p className="text-sm text-green-700">頻道名稱、描述、地區、應用類別都是必填項目</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-200/50">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">注意事項</h4>
                      <p className="text-sm text-yellow-700">頻道名稱建立後可以修改，但建議使用易識別的名稱</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-line hover:bg-line-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all group">
                  <MessageSquare className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  建立 Channel
                </Button>
                <Button variant="outline" size="lg" className="rounded-full">
                  查看範例設定
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Section */}
          <div className="order-1 lg:order-2 relative fade-in-element" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              <div className="glassmorphism p-6 rounded-3xl shadow-glass-lg">
                <div className="space-y-4">
                  <img
                    src="/專題圖片/p5.png"
                    alt="LINE Channel 建立頁面"
                    className="w-full rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                  <img
                    src="/專題圖片/p6.png"
                    alt="Channel 設定表單"
                    className="w-full rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>
                
                {/* Highlight indicators */}
                <div className="absolute top-1/2 right-4 w-36 h-18 border-2 border-red-500 rounded-full opacity-75 animate-pulse transform -translate-y-1/2"></div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-line/20 rounded-full animate-float"></div>
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepThree;
