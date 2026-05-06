import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  KeyRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AppShell from "@/components/layout/AppShell";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";

const guideSteps = [
  {
    id: 1,
    title: "註冊 LINE Developers",
    shortTitle: "註冊帳號",
    body: "登入 LINE Developers，準備建立 Messaging API Channel。",
    checklist: ["使用 LINE 帳號登入", "確認開發者資訊", "進入 Console"],
  },
  {
    id: 2,
    title: "建立 Provider",
    shortTitle: "Provider",
    body: "Provider 是 Channel 的歸屬單位，可以使用公司、品牌或專案名稱。",
    checklist: ["新增 Provider", "填入名稱", "確認建立成功"],
  },
  {
    id: 3,
    title: "建立 Channel",
    shortTitle: "Channel",
    body: "建立 Messaging API Channel，讓平台可以連接您的 LINE Bot。",
    checklist: ["選擇 Messaging API", "填入基本資料", "啟用 Webhook"],
  },
  {
    id: 4,
    title: "取得 API 金鑰",
    shortTitle: "API 金鑰",
    body: "複製 Channel Access Token 與 Channel Secret，貼到工作台建立 Bot。",
    checklist: ["發行長期 Token", "複製 Channel Secret", "回到平台建立 Bot"],
  },
];

const HowToEstablish = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const { user, loading, isAuthenticated } = useUnifiedAuth({
    requireAuth: false,
  });

  const steps = useMemo(() => guideSteps, []);
  const activeStep = steps[currentStep - 1];

  const nextStep = () => setCurrentStep((step) => Math.min(step + 1, steps.length));
  const prevStep = () => setCurrentStep((step) => Math.max(step - 1, 1));
  const goToStep = (step: number) => setCurrentStep(step);

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
      <AppShell user={user} activeNav="create" headerKicker="建立教學">
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
          <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
            <div className="mb-8">
              <p className="app-kicker mb-2">建立教學</p>
              <h1 className="mt-2 text-3xl font-medium leading-tight tracking-[-0.03em] text-[var(--bc-ink)] sm:text-4xl">Botcraft 建立教學</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--bc-ink-2)]">
                四個步驟取得 LINE Channel 憑證，完成後即可回到 Botcraft 工作台建立 Bot。
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.68fr_1fr]">
              <aside className="app-panel p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {steps.map((step) => {
                    const isActive = step.id === currentStep;
                    const isDone = step.id < currentStep;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => goToStep(step.id)}
                        className={`flex items-center gap-3 rounded-[14px] px-3 py-3 text-left transition-colors ${
                          isActive
                            ? "bg-emerald-50 text-[#166534]"
                            : "bg-white text-slate-600 hover:bg-emerald-50/70"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-sm font-semibold ${
                            isDone || isActive
                              ? "bg-[#16a34a] text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">
                            {step.shortTitle}
                          </span>
                          <span className="block text-xs opacity-70">
                            {step.title}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <article className="app-panel p-8 sm:p-10">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div>
                    <p className="app-kicker mb-2">Step {activeStep.id}</p>
                    <h2 className="text-2xl font-medium tracking-[-0.02em] text-[var(--bc-ink)]">
                      {activeStep.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--bc-ink-2)]">
                      {activeStep.body}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                    <KeyRound className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-8 grid gap-4">
                  {activeStep.checklist.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-5 py-4 text-base text-slate-700 shadow-sm"
                    >
                      <CheckCircle2 className="h-5 w-5 text-[#16a34a]" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="app-secondary-button px-6 disabled:opacity-50"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      上一步
                    </Button>
                    {currentStep < steps.length ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="app-primary-button px-6"
                      >
                        下一步
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => navigate("/bots/create")}
                        className="app-primary-button px-6"
                      >
                        建立 Bot
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="app-secondary-button px-6"
                  >
                    <a
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      LINE Developers
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </article>
            </div>
          </section>
        </main>
      </PageContentWrapper>
    </PageShell>
  );
};

export default HowToEstablish;
