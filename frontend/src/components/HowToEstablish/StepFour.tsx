import React from "react";
import { Link } from "react-router-dom";
import { Key, Copy, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const StepFour = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#F8F6F3] to-[#FFFDFA] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-12 sm:top-20 left-0 w-60 h-60 sm:w-80 sm:h-80 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-12 sm:bottom-20 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-accent/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Image Section */}
          <div className="order-1 relative fade-in-element">
            <div className="relative">
              <div className="glassmorphism p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-glass-lg">
                <div className="space-y-3 sm:space-y-4">
                  <img
                    src="/images/p7.png"
                    alt="LINE Channel secret 設定頁面"
                    className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                  <img
                    src="/images/p8.png"
                    alt="Channel access token 設定頁面"
                    className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>

                {/* Highlight indicators - 在手機版縮小 */}
                <div className="hidden sm:block absolute top-12 md:top-16 right-6 md:right-8 w-16 h-8 md:w-20 md:h-10 border-2 border-red-500 rounded-full opacity-75 animate-pulse"></div>
                <div className="hidden sm:block absolute bottom-16 md:bottom-20 right-8 md:right-12 w-24 h-12 md:w-36 md:h-18 border-2 border-red-500 rounded-full opacity-75 animate-pulse"></div>
              </div>

              {/* Floating elements - 在手機版縮小 */}
              <div className="absolute -top-3 -left-3 sm:-top-6 sm:-left-6 w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full animate-float"></div>
              <div
                className="absolute -bottom-3 -right-3 sm:-bottom-6 sm:-right-6 w-6 h-6 sm:w-8 sm:h-8 bg-accent/20 rounded-full animate-float"
                style={{ animationDelay: "1.5s" }}
              ></div>
            </div>
          </div>

          {/* Content Section */}
          <div
            className="order-2 space-y-6 sm:space-y-8 fade-in-element"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm">
                <span>第四步</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                取得 <span className="text-gradient">API 金鑰</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                取得 Channel secret 和 Channel access token，這兩個金鑰是您的
                LINE Bot 與 LINE 平台通訊的重要憑證。
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/50 shadow-glass">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
                  操作步驟：
                </h3>

                {/* Channel Secret */}
                <div className="mb-6">
                  <h4 className="text-base sm:text-lg font-medium text-foreground mb-3 flex items-center">
                    <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                    取得 Channel Secret
                  </h4>
                  <ul className="space-y-2 ml-6 sm:ml-7">
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          1
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        進入 Basic settings 頁面
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          2
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        往下滑找到 Channel secret 欄位
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          3
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        複製 Channel secret 值
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Channel Access Token */}
                <div>
                  <h4 className="text-base sm:text-lg font-medium text-foreground mb-3 flex items-center">
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />
                    取得 Channel Access Token
                  </h4>
                  <ul className="space-y-2 ml-6 sm:ml-7">
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">1</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        前往 Messaging API settings 頁面
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">2</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        找到 Channel access token 區塊
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">3</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        點擊「Issue」按鈕產生 token
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">4</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        複製產生的 access token
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50/50 rounded-xl p-4 border border-red-200/50">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-white font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-1 text-sm sm:text-base">
                      重要提醒
                    </h4>
                    <p className="text-xs sm:text-sm text-red-700">
                      請妥善保管這兩個金鑰，不要公開分享。這些是您的 LINE Bot
                      身份驗證憑證。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50/50 rounded-xl p-4 border border-green-200/50">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1 text-sm sm:text-base">
                      下一步
                    </h4>
                    <p className="text-xs sm:text-sm text-green-700">
                      取得金鑰後，將它們貼到我們的網站中，就可以開始設定您的
                      LINE Bot 伺服器了。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/bots/create" className="inline-flex w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full bg-[#F4CD41] hover:bg-[#e6bc00] text-foreground rounded-full shadow-lg hover:shadow-xl transition-all group text-sm sm:text-base"
                  >
                    開始設定伺服器
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full text-sm sm:text-base"
                >
                  查看範例設定
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepFour;
