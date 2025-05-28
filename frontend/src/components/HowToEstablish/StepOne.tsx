import React from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const StepOne = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-[#FFFDFA] to-[#F8F6F3] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-line/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Content Section */}
          <div className="order-2 lg:order-1 space-y-8 fade-in-element">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm">
                <span>第一步</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                註冊並登入<br />
                <span className="text-gradient">LINE Developer</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                開始建立您的LINE Bot之前，需要先在LINE Developers網站建立開發者帳號。
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
                    <span className="text-muted-foreground">前往LINE Developers網站</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">2</span>
                    </div>
                    <span className="text-muted-foreground">使用LINE帳號登入或註冊新帳號</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">3</span>
                    </div>
                    <span className="text-muted-foreground">同意開發者條款並完成驗證</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://developers.line.biz/zh-hant/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="lg" className="bg-line hover:bg-line-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all group">
                    前往 LINE Developers
                    <ExternalLink className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </a>
                <Button variant="outline" size="lg" className="rounded-full">
                  查看詳細教學
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
                    src="/專題圖片/p1.png"
                    alt="LINE Developers 登入頁面"
                    className="w-full rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                  <img
                    src="/專題圖片/p2.png"
                    alt="LINE Developers 註冊流程"
                    className="w-full rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>
                
                {/* Highlight indicators */}
                <div className="absolute top-8 right-8 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute top-8 right-14 w-20 h-12 border-2 border-red-500 rounded-full opacity-75 animate-pulse"></div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary/20 rounded-full animate-float"></div>
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-line/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepOne;
