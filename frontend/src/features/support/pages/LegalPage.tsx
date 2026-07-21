import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AppShell from "@/components/layout/AppShell";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

type LegalSection = {
  title: string;
  body: string;
};

const termsSections: LegalSection[] = [
  {
    title: "服務使用",
    body: "本平台協助使用者建立、管理與測試 LINE Bot。使用者需自行確認提供的 LINE Channel Access Token、Channel Secret 與相關設定具備正確權限。",
  },
  {
    title: "帳號與安全",
    body: "使用者應妥善保管帳號、密碼與第三方平台憑證。若發現未授權使用或設定外洩，請盡快更新憑證並調整 Bot 設定。",
  },
  {
    title: "內容與操作責任",
    body: "使用者透過 Bot 發送的訊息、Rich Menu、AI 知識庫與自動化流程，應符合 LINE 平台規範與適用法律。",
  },
  {
    title: "服務調整",
    body: "平台可能依功能改善、安全維護或第三方 API 變更調整服務內容。重大調整應在產品介面或相關公告中提示。",
  },
];

const privacySections: LegalSection[] = [
  {
    title: "資料類型",
    body: "平台可能處理帳號資料、Bot 設定資料、LINE 使用者互動資料、Rich Menu 圖片與使用者上傳的 AI 知識庫內容。",
  },
  {
    title: "資料用途",
    body: "資料用於登入驗證、Bot 建立與管理、Webhook 狀態檢查、訊息互動分析、AI 回覆輔助與系統安全維護。",
  },
  {
    title: "第三方整合",
    body: "本平台會與 LINE Developers、LINE Login 與 Messaging API 等第三方服務互動。第三方服務的資料處理方式依其各自政策為準。",
  },
  {
    title: "使用者控制",
    body: "使用者可在帳號設定中更新個人資料、電子郵件與密碼，也可刪除頭像或依平台提供的機制管理 Bot 與相關資料。",
  },
];

const LegalPage = () => {
  const location = useLocation();
  const isTerms = location.pathname === "/terms";
  const { user, loading, isAuthenticated } = useUnifiedAuth({
    requireAuth: false,
  });

  const title = isTerms ? "服務條款" : "隱私政策";
  const description = isTerms
    ? "使用 BotCraft 前，請先了解平台使用範圍與帳號責任。"
    : "了解平台如何使用資料支援 Bot 建立、設定、AI 接管與互動查看。";
  const sections = isTerms ? termsSections : privacySections;

  if (loading) {
    return (
      <div className="app-page-surface flex min-h-screen items-center justify-center">
        <div className="app-panel p-8">
          <Loader text="載入中..." />
        </div>
      </div>
    );
  }

  const PageShell = ({ children }: { children: React.ReactNode }) =>
    isAuthenticated ? (
      <AppShell user={user} activeNav="settings" headerKicker={title}>
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
        <main className="flex-1">
          <div className="pt-32 pb-16 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 text-center">
                <h1 className="app-page-title mb-3">{title}</h1>
                <p className="text-base leading-relaxed text-[var(--bc-ink-2)] sm:text-lg">
                  {description}
                </p>
              </div>

              <div className="app-panel space-y-6 p-6 sm:p-8">
                <div className="app-muted-panel p-4 text-sm text-slate-600">
                  本頁為平台目前的使用與資料處理摘要，後續可依正式政策更新。
                </div>

                <div>
                  {sections.map((section, index) => (
                    <div key={section.title}>
                      {index > 0 && <Separator className="my-6" />}
                      <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-950">
                          {section.title}
                        </h2>
                        <p className="text-sm leading-relaxed text-[var(--bc-ink-2)] sm:text-base">
                          {section.body}
                        </p>
                      </section>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild className="app-primary-button">
                    <Link to={isAuthenticated ? "/dashboard" : "/register"}>
                      {isAuthenticated ? "返回工作台" : "回到建立帳號"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="app-secondary-button">
                    <Link to={isTerms ? "/privacy" : "/terms"}>
                      查看{isTerms ? "隱私政策" : "服務條款"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </PageContentWrapper>
    </PageShell>
  );
};

export default LegalPage;
