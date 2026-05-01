import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  LayoutTemplate,
  MessageSquareText,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AppRobotIllustration } from "@/components/layout/AppShell";
import { authManager } from "@/services/UnifiedAuthManager";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";

const featureCards = [
  {
    title: "建立 Bot",
    description: "填入 LINE Channel 資訊，集中管理多個 Bot。",
    icon: Bot,
  },
  {
    title: "設計流程",
    description: "用視覺化積木整理回覆邏輯與 Flex 訊息。",
    icon: Workflow,
  },
  {
    title: "追蹤狀態",
    description: "在同一個看板查看訊息、用戶與互動表現。",
    icon: BarChart3,
  },
];

const setupSteps = ["註冊帳號", "建立 Bot", "編輯流程", "查看成效"];

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (authManager.isAuthenticatedSync()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="app-page-surface flex flex-col">
      <Navbar />
      <PageContentWrapper>
        <main className="pt-24 sm:pt-28">
          <section className="app-section pb-12 pt-8 text-center sm:pb-16">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/70 px-3 py-1 text-sm font-semibold text-[#166534] shadow-sm">
              <img
                src="/assets/images/line-logo.svg"
                alt=""
                className="h-5 w-5 rounded-full"
              />
              LINE Bot 工作台
            </div>

            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              LINE Bot 製作輔助系統
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              建立、編輯與管理 LINE Bot 的單一工作區。保留必要工具，減少不必要的操作噪音。
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="app-primary-button h-12 px-5">
                <Link to="/register">
                  開始使用
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="app-secondary-button h-12 px-5">
                <Link to="/how-to-establish">查看建立教學</Link>
              </Button>
            </div>

            <div className="app-panel-strong mx-auto mt-10 grid max-w-5xl gap-0 overflow-hidden text-left lg:grid-cols-[1fr_0.9fr]">
              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="app-soft-icon">
                    <LayoutTemplate className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="app-kicker">Dashboard style</p>
                    <h2 className="app-card-title mt-1">清楚的 Bot 管理入口</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Bot", "12"],
                    ["Messages", "8.4k"],
                    ["Users", "1.2k"],
                  ].map(([label, value]) => (
                    <div key={label} className="app-muted-panel">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[14px] bg-white/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-950">
                      建立流程
                    </span>
                    <MessageSquareText className="h-4 w-4 text-[#16a34a]" />
                  </div>
                  <div className="space-y-2">
                    {setupSteps.map((step) => (
                      <div
                        key={step}
                        className="flex items-center gap-2 rounded-[12px] bg-slate-50/80 px-3 py-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-center bg-gradient-to-br from-emerald-100/70 via-white/50 to-stone-100/80 p-5">
                <AppRobotIllustration />
              </div>
            </div>
          </section>

          <section id="features" className="app-section py-10">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="app-kicker">核心功能</p>
                <h2 className="app-page-title mt-2">只留下常用工作流</h2>
              </div>
              <p className="app-subtitle">
                從建立到分析，頁面都以同一套工作台語彙呈現。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="app-panel p-5">
                    <span className="app-soft-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="app-card-title mt-5">{feature.title}</h3>
                    <p className="app-card-copy mt-2">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="how-it-works" className="app-section py-10">
            <div className="app-panel p-5 sm:p-7">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="app-kicker">使用方式</p>
                  <h2 className="app-page-title mt-2">四步完成設定</h2>
                </div>
                <Button asChild variant="outline" className="app-secondary-button">
                  <Link to="/how-to-establish">完整教學</Link>
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {setupSteps.map((step, index) => (
                  <div key={step} className="rounded-[14px] bg-slate-50/80 p-4">
                    <span className="text-sm font-semibold text-[#166534]">
                      0{index + 1}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="demo" className="app-section pb-16 pt-10">
            <div className="flex flex-col items-center justify-between gap-4 rounded-[16px] bg-[#16a34a] p-6 text-center text-white shadow-lg shadow-emerald-700/20 sm:flex-row sm:text-left">
              <div>
                <h2 className="text-xl font-semibold">準備開始建立 LINE Bot？</h2>
                <p className="mt-1 text-sm text-white/80">
                  直接進入工作台，或先看 LINE Developers 設定教學。
                </p>
              </div>
              <Button asChild className="h-11 rounded-[14px] bg-white px-4 text-sm font-semibold text-[#166534] hover:bg-emerald-50">
                <Link to="/login">登入工作台</Link>
              </Button>
            </div>
          </section>
        </main>
      </PageContentWrapper>
      <Footer />
    </div>
  );
};

export default HomePage;
