import React from "react";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectImage } from "@/components/ui/ResponsiveImage";

const StepTwo = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-secondary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-12 sm:top-20 left-0 w-60 h-60 sm:w-80 sm:h-80 bg-accent/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-12 sm:bottom-20 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Image Section */}
          <div className="order-1 relative fade-in-element">
            <div className="relative">
              <div className="glassmorphism p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-glass-lg">
                <div className="grid grid-cols-1 gap-3 sm:gap-6">
                  <div className="relative">
                    <ProjectImage
                      projectNumber={3}
                      alt="LINE Developers Provider 建立頁面"
                      className="w-full rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    />
                    {/* Highlight indicator - 在手機版縮小 */}
                    <div className="hidden sm:block absolute top-4 right-4 w-20 h-8 md:w-32 md:h-12 border-2 border-red-500 rounded-full opacity-75 animate-pulse"></div>
                  </div>

                  <div className="relative">
                    <ProjectImage
                      projectNumber={4}
                      alt="Provider 建立表單"
                      className="w-full h-32 sm:h-48 object-cover rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    />
                  </div>
                </div>
              </div>

              {/* Floating elements - 在手機版縮小 */}
              <div className="absolute -top-3 -right-3 sm:-top-6 sm:-right-6 w-8 h-8 sm:w-10 sm:h-10 bg-accent/20 rounded-full animate-float"></div>
              <div
                className="absolute -bottom-3 -left-3 sm:-bottom-6 sm:-left-6 w-6 h-6 sm:w-8 sm:h-8 bg-primary/20 rounded-full animate-float"
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
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-accent/10 rounded-full text-accent font-medium text-sm">
                <span>第二步</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                建立 <span className="text-gradient">Provider</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Provider 是管理您所有 LINE Bot
                服務的容器，每個開發者都需要先建立 Provider。
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
                  操作步驟：
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent">1</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      登入LINE Developers後，點選「Create」按鈕
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent">2</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      輸入Provider名稱（建議使用英文）
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent">3</span>
                    </div>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      點擊「Create」完成Provider建立
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-secondary rounded-xl p-4 border border-border">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-white font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1 text-sm sm:text-base">
                      小提示
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Provider名稱建議使用有意義的英文名稱，之後無法修改。一個開發者可以建立多個Provider來管理不同的專案。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all group text-sm sm:text-base"
                >
                  <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                  建立 Provider
                </Button>
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
        </div>
      </div>
    </section>
  );
};

export default StepTwo;
