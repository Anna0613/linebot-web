import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { BarChart3, Bot, ShieldCheck, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import AppShell, { AppRobotIllustration } from "@/components/layout/AppShell";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";

const highlights = [
  {
    title: "快速建立",
    description: "貼上 LINE Channel 憑證，就能把 Bot 加到工作台。",
    icon: Bot,
  },
  {
    title: "視覺化編輯",
    description: "以積木方式整理對話邏輯、Flex 訊息與 Rich Menu。",
    icon: Workflow,
  },
  {
    title: "查看互動",
    description: "從工作台查看好友、訊息與最近互動。",
    icon: BarChart3,
  },
];

const About = () => {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useUnifiedAuth({
    requireAuth: false,
  });

  if (loading) {
    return (
      <div className="app-page-surface flex min-h-screen items-center justify-center">
        <div className="app-panel p-6 text-sm font-medium text-slate-600">
          <Loader text="載入中..." />
        </div>
      </div>
    );
  }

  const PageShell = ({ children }: { children: ReactNode }) =>
    isAuthenticated ? (
      <AppShell user={user} activeNav="home" headerKicker="About">
        {children}
      </AppShell>
    ) : (
      <div className="app-page-surface flex min-h-screen flex-col text-slate-950">
        <Navbar />
        {children}
        <Footer />
      </div>
    );

  return (
    <PageShell>
      <PageContentWrapper>
        <main className={isAuthenticated ? "py-6" : "pt-32"}>
          <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
            <div className="app-panel grid overflow-hidden p-0 lg:grid-cols-[1fr_0.82fr]">
              <div className="p-8 sm:p-10 lg:p-12">
                <p className="app-kicker mb-2">關於</p>
                <h1 className="text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl lg:text-5xl">關於 LineBot Web</h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                  LineBot Web 是一個給一般使用者操作的 LINE Bot 工作台。重點是把建立、設計與查看互動放在同一個清楚流程裡。
                </p>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => navigate("/how-to-establish")}
                    className="app-primary-button px-8"
                  >
                    查看建立教學
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/bots/create")}
                    className="app-secondary-button px-8"
                  >
                    開始建立 Bot
                  </Button>
                </div>
              </div>
              <div className="flex items-end justify-center bg-gradient-to-br from-emerald-100/70 via-white/50 to-emerald-50/80 p-6">
                <AppRobotIllustration />
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16 relative z-10">
            <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="app-kicker mb-2">重點</p>
                <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">平台做三件事</h2>
              </div>
              <p className="text-slate-600 max-w-md text-base leading-relaxed">
                減少跳轉、減少設定負擔，讓 Bot 從建立到日常調整都更容易。
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="app-card p-8 transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950 mb-3">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-24 pt-8 relative z-10">
            <div className="app-panel p-10 sm:p-12">
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-normal text-slate-950">適合需要固定維護 LINE Bot 的情境</h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                      客服、活動通知、教育助理與社群互動都能用同一套流程處理，不需要在多個工具之間來回切換。
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="app-secondary-button shrink-0 px-8"
                >
                  前往工作台
                </Button>
              </div>
            </div>
          </section>
        </main>
      </PageContentWrapper>
    </PageShell>
  );
};

export default About;
