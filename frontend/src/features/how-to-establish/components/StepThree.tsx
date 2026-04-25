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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 equal-columns">
          {/* Content Section */}
          <div className="order-2 lg:order-1 space-y-6 sm:space-y-8 fade-in-element">
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-line/10 rounded-full text-line font-medium text-sm">
                <span>第三步</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                設計 <span className="text-gradient">對話流程</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                使用視覺化編輯器設計您的 Bot 對話邏輯、Flex 訊息和 Rich Menu，無需撰寫程式碼。
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
                      前往「LINE Bot 編輯器」頁面
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">2</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      選擇您的 Bot 並開始設計邏輯流程
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">3</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      使用拖拉式積木建立對話邏輯
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-line/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-line">4</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      設計 Flex 訊息和 Rich Menu（選用）
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
                        功能特色
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        支援邏輯積木、Flex 訊息設計器、Rich Menu 管理和 AI 知識庫整合
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
                        小提示
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        記得隨時儲存您的設計，系統會自動同步到您的 LINE Bot
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href="/bots/visual-editor"
                  className="inline-flex w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-line hover:bg-line-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all group text-sm sm:text-base"
                  >
                    <MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                    開始設計
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full text-sm sm:text-base"
                >
                  查看範例
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
                    alt="視覺化編輯器頁面"
                    className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  />
                  <ProjectImage
                    projectNumber={6}
                    alt="Flex 訊息設計器"
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
