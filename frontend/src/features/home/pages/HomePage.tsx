import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Workflow,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { authManager } from "@/services/UnifiedAuthManager";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";

const featureCards = [
  {
    title: "視覺化設計",
    description: "用拖拉方式整理回覆流程，文字、圖片與卡片都能清楚配置。",
    icon: Workflow,
  },
  {
    title: "清楚管理",
    description: "把 Bot、訊息與好友互動放在同一個地方，不需要來回切換。",
    icon: Bot,
  },
  {
    title: "查看互動",
    description: "最近的訊息、好友變化與連線狀態，都用簡單的方式呈現。",
    icon: BarChart3,
  },
];

const setupSteps = ["建立帳號", "連接 LINE", "設計回覆", "查看互動"];

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (authManager.isAuthenticatedSync()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="app-page-surface flex min-h-screen flex-col text-slate-950">
      <Navbar />
      <PageContentWrapper>
        <main>
          <section className="pt-32 pb-24 text-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="relative z-10 max-w-[1200px] mx-auto">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-[#166534] shadow-sm">
                <Sparkles className="h-4 w-4" />
                <span>你的 LINE Bot 工作台</span>
              </div>

              <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.1] tracking-normal text-slate-950 sm:text-5xl lg:text-[64px]">
                把 LINE Bot 做成<br className="hidden sm:block" />你會用的樣子
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                不用寫程式，也能整理自動回覆、卡片訊息與好友互動。從建立到調整，都放在一個乾淨好懂的工作台。
              </p>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
                <Button asChild className="app-primary-button px-8">
                  <Link to="/register">
                    開始建立
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="app-secondary-button px-8">
                  <Link to="/how-to-establish">查看建立教學</Link>
                </Button>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-0 h-px bg-emerald-100" />
          </section>

          <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto relative z-10">
            <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="app-kicker mb-2">功能</p>
                <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                  做 Bot 需要的事，都放在眼前
                </h2>
              </div>
              <p className="text-slate-600 max-w-md text-base leading-relaxed">
                保留最常用的建立、設計與查看功能，讓第一次使用的人也能很快知道下一步。
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="app-card p-8 transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950 mb-3">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="app-panel mx-auto max-w-[1200px] p-10 sm:p-14">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                  四步開始你的第一個 Bot
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-4">
                {setupSteps.map((step, index) => (
                  <div key={step} className="rounded-[16px] border border-emerald-100 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {index + 1}
                    </div>
                    <p className="text-lg font-semibold text-slate-950">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="relative mx-auto flex max-w-[800px] flex-col items-center overflow-hidden rounded-[22px] bg-[#06C755] p-10 text-white shadow-[0_22px_56px_rgba(6,199,85,0.22)] sm:p-14">
              <div className="relative z-10">
                <h2 className="mb-4 text-3xl font-semibold tracking-normal sm:text-4xl">
                  準備好開始做第一個 Bot？
                </h2>
                <p className="mb-8 text-lg text-white/90">
                  建立帳號後，就能連接 LINE 官方帳號並開始設計回覆。
                </p>
                <Button asChild className="h-14 rounded-[16px] bg-white px-10 text-base font-semibold text-[#166534] hover:bg-emerald-50">
                  <Link to="/register">開始建立</Link>
                </Button>
              </div>
            </div>
          </section>

        </main>
      </PageContentWrapper>
      <Footer />
    </div>
  );
};

export default HomePage;
