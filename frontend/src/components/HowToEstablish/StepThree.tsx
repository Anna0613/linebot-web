import React from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectImage } from "@/components/ui/ResponsiveImage";

const StepThree = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-secondary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-line/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-60 h-60 sm:w-80 sm:h-80 bg-primary/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Content Section */}
          <div className="order-2 lg:order-1 space-y-6 sm:space-y-8 fade-in-element">
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-line/10 rounded-full text-line font-medium text-sm">
                <span>第三步</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                建立 <span className="text-gradient">Channel</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Channel 是您 LINE Bot 的核心，透過 Messaging API channel
                讓您的機器人與用戶互動。
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
                  操作步驟：
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">1</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      在Provider頁面中選擇「Channels」
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">2</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      點選「Create a Messaging API channel」
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">3</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      填寫頻道資訊並選擇地區與類別
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">4</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      同意條款並點擊「Create」
                    </span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-secondary rounded-xl p-4 border border-border">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">✓</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                        必填欄位
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        頻道名稱、描述、地區、應用類別都是必填項目
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary rounded-xl p-4 border border-border">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                        注意事項
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        頻道名稱建立後可以修改，但建議使用易識別的名稱
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-line hover:bg-line-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all group text-sm sm:text-base"
                >
                  <MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                  建立 Channel
                </Button>
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

          {/* Image Section */}
          <div
            className="order-1 lg:order-2 relative fade-in-element"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative">
              <div className="glassmorphism p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-glass-lg">
                <div className="space-y-3 sm:space-y-4">
                  <ProjectImage
                    projectNumber={5}
                    alt="LINE Channel 建立頁面"
                    className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                  <ProjectImage
                    projectNumber={6}
                    alt="Channel 設定表單"
                    className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>

                {/* Highlight indicators - 在手機版隱藏 */}
                <div className="hidden sm:block absolute top-1/2 right-4 w-24 h-12 md:w-36 md:h-18 border-2 border-red-500 rounded-full opacity-75 animate-pulse transform -translate-y-1/2"></div>
              </div>

              {/* Floating elements - 在手機版縮小 */}
              <div className="absolute -top-2 -left-2 sm:-top-4 sm:-left-4 w-6 h-6 sm:w-8 sm:h-8 bg-line/20 rounded-full animate-float"></div>
              <div
                className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 w-8 h-8 sm:w-12 sm:h-12 bg-primary/20 rounded-full animate-float"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepThree;
