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
    description: "用 LINE Channel 憑證建立 Bot，集中到同一個管理中心。",
    icon: Bot,
  },
  {
    title: "視覺化編輯",
    description: "以積木方式整理對話邏輯、Flex 訊息與 Rich Menu。",
    icon: Workflow,
  },
  {
    title: "營運追蹤",
    description: "從 dashboard 觀察用戶、訊息與互動數據。",
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
      <div className="app-page-surface flex min-h-screen flex-col">
        <Navbar />
        {children}
        <Footer />
      </div>
    );

  return (
    <PageShell>
      <PageContentWrapper>
        <main className={isAuthenticated ? "py-6" : "pt-28"}>
          <section className="app-section pb-12">
            <div className="app-panel-strong grid overflow-hidden lg:grid-cols-[1fr_0.82fr]">
              <div className="p-6 sm:p-8 lg:p-10">
                <p className="app-kicker">About</p>
                <h1 className="app-title mt-3">關於本網站</h1>
                <p className="app-subtitle mt-4">
                  LineBot Web 是一個給非工程使用者與團隊操作的 LINE Bot 工作台。重點是把建立、編輯與追蹤放在同一個清楚的流程裡。
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => navigate("/how-to-establish")}
                    className="app-primary-button"
                  >
                    查看建立教學
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/bots/create")}
                    className="app-secondary-button"
                  >
                    開始建立 Bot
                  </Button>
                </div>
              </div>
              <div className="flex items-end justify-center bg-gradient-to-br from-emerald-100/70 via-white/50 to-stone-100/80 p-6">
                <AppRobotIllustration />
              </div>
            </div>
          </section>

          <section className="app-section py-8">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="app-kicker">Focus</p>
                <h2 className="app-page-title mt-2">平台做三件事</h2>
              </div>
              <p className="app-subtitle">
                減少跳轉、減少設定負擔，讓 Bot 從設定到營運更容易追蹤。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="app-panel p-5">
                    <span className="app-soft-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="app-card-title mt-5">{item.title}</h3>
                    <p className="app-card-copy mt-2">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="app-section pb-16 pt-8">
            <div className="app-panel p-5 sm:p-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="app-soft-icon shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="app-card-title">適合需要穩定管理 LINE Bot 的場景</h2>
                    <p className="app-card-copy mt-2 max-w-2xl">
                      客服、活動通知、教育助理與行銷互動都能用同一套流程管理，不需要在多個工具之間來回切換。
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="app-secondary-button shrink-0"
                >
                  前往 Dashboard
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
