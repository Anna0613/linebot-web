import React from "react";
import { Link } from "react-router-dom";
import { Key, Copy, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectImage } from "@/components/ui/ResponsiveImage";

const StepFour = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-secondary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-12 sm:top-20 left-0 w-60 h-60 sm:w-80 sm:h-80 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-12 sm:bottom-20 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-accent/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 equal-columns">
          {/* Image Section */}
          <div className="order-1 relative fade-in-element">
            <div className="relative">
              <div className="glassmorphism p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-glass-lg">
                <div className="space-y-3 sm:space-y-4">
                  <ProjectImage
                    projectNumber={7}
                    alt="Rich Menu 管理頁面"
                    className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                  <ProjectImage
                    projectNumber={8}
                    alt="Bot 管理儀表板"
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
                測試與<span className="text-gradient">上線</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                設定 Webhook URL，測試 Bot 功能，並透過管理儀表板監控使用者互動與數據分析。
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
                  操作步驟：
                </h3>

                {/* 設定 Webhook */}
                <div className="mb-6">
                  <h4 className="text-base sm:text-lg font-medium text-foreground mb-3 flex items-center">
                    <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                    設定 Webhook URL
                  </h4>
                  <ul className="space-y-2 ml-6 sm:ml-7">
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          1
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        前往 LINE Developers 的 Messaging API 設定頁面
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          2
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        在 Webhook URL 欄位填入您的伺服器網址
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          3
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        啟用 Webhook 並驗證連線
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 測試與監控 */}
                <div>
                  <h4 className="text-base sm:text-lg font-medium text-foreground mb-3 flex items-center">
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-accent" />
                    測試與監控
                  </h4>
                  <ul className="space-y-2 ml-6 sm:ml-7">
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">1</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        使用 LINE 掃描 QR Code 加入您的 Bot
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">2</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        傳送訊息測試 Bot 的回應功能
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-accent">3</span>
                      </div>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        前往管理中心查看即時數據和使用者互動
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-secondary rounded-xl p-4 border border-border">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-white font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                      重要提醒
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      確保您的伺服器已正確部署並可從外部訪問，Webhook URL 必須使用 HTTPS 協定。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary rounded-xl p-4 border border-border">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                      完成設定
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      恭喜！您的 LINE Bot 已經準備就緒。前往管理中心查看即時數據和使用者互動分析。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/bots/management" className="inline-flex w-full sm:w-auto">
                  <Button
                    size="lg"
                  className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--line-green-hover))] text-[hsl(var(--primary-foreground))] rounded-full shadow-lg hover:shadow-xl transition-all group text-sm sm:text-base"
                  >
                    前往管理中心
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </Link>
                <a
                  href="https://developers.line.biz/zh-hant/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto rounded-full text-sm sm:text-base"
                  >
                    LINE Developers
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepFour;
