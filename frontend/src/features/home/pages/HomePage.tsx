import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BotcraftBrand from "@/components/brand/BotcraftBrand";
import { authManager } from "@/services/UnifiedAuthManager";

const integrations = [
  "LINE Messaging API",
  "Webhook",
  "Flex Message",
  "Rich Menu",
  "Groq",
  "Gemini",
  "RAG 向量檢索",
  "PostgreSQL",
  "Redis",
  "MongoDB",
  "MinIO",
  "WebSocket",
];

const features = [
  {
    id: "01 / FLOW",
    title: "視覺化流程編輯器",
    description: "把訊息積木一塊一塊接起來，就像畫流程圖。條件分支、變數、跳轉，都看得見。",
    className: "bc-t-flow",
    art: "flow",
  },
  {
    id: "02 / AI",
    title: "AI 知識庫接管",
    description: "整合 Groq 與 Gemini，讓 Bot 在你不在線時也能用你的資料回答問題。",
    className: "bc-t-ai",
    art: "ai",
  },
  {
    id: "03 / FLEX",
    title: "Flex 訊息設計",
    description: "所見即所得地排版卡片訊息，再也不用手刻 JSON。",
    className: "bc-t-flex",
    art: "flex",
  },
  {
    id: "04 / MENU",
    title: "圖文選單",
    description: "分格、上稿、上架，三步驟完成。",
    className: "bc-t-rich",
    art: "rich",
  },
  {
    id: "05 / BROADCAST",
    title: "分群推播",
    description: "排程、A/B、追蹤點擊率，全在儀表板裡。",
    className: "bc-t-broad",
    art: "broad",
  },
];

const plans = [
  {
    name: "Hobby",
    price: "0",
    description: "給想試試看 Bot 怎麼運作的學生與個人用戶。",
    cta: "免費開始",
    href: "/register",
    features: ["1 個 Bot，1,000 訊息/月", "視覺化流程編輯", "Flex 訊息設計", "社群論壇支援"],
  },
  {
    name: "Studio",
    price: "299",
    description: "適合接案、社團、小品牌。AI 接管 + 知識庫。",
    cta: "升級 Studio",
    href: "/register",
    featured: true,
    features: ["5 個 Bot，50,000 訊息/月", "AI 接管（Groq / Gemini）", "RAG 知識庫，3 GB", "分群推播 + A/B 測試", "對話歷史 90 天"],
  },
  {
    name: "Team",
    price: "999",
    description: "給需要協作、稽核、私有部署的團隊。",
    cta: "聯絡我們",
    href: "mailto:jkl921102@gmail.com",
    features: ["不限 Bot，500,000 訊息/月", "多人協作 + 權限管理", "對話分析與標註", "Webhook & API 開放", "專屬技術支援"],
  },
];

const faqs = [
  {
    question: "我需要會寫程式才能用嗎？",
    answer: "不需要。整個流程從 LINE Channel 連線、訊息設計、上線發布都是視覺化操作。如果你會寫，也可以用 Webhook 與 API 自己擴充。",
  },
  {
    question: "免費方案有時間限制嗎？",
    answer: "沒有。Hobby 方案永久免費，每月 1,000 則訊息額度。學生用戶提供 NT$0 升級到 Studio 的優惠，請從學生方案頁申請。",
  },
  {
    question: "Bot 的對話資料儲存在哪？",
    answer: "對話歷史儲存在加密的 MongoDB，媒體檔案儲存在 MinIO 物件儲存。你可以隨時下載或刪除所有對話資料，也可以選擇關閉對話記錄功能。",
  },
  {
    question: "AI 接管是什麼意思？",
    answer: "當你定義的流程沒有匹配到使用者訊息時，可以選擇交給 AI 處理。AI 會基於你上傳到知識庫的內容，用 RAG 檢索方式回覆。",
  },
  {
    question: "可以同時連到 LINE 以外的平台嗎？",
    answer: "目前主要支援 LINE Messaging API。Web Chat、Telegram、Discord 等管道在 roadmap 上，預計陸續開放。",
  },
];

const ArrowIcon = () => (
  <svg className="bc-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

const FeatureArt = ({ type }: { type: string }) => {
  if (type === "flow") {
    return (
      <div className="bc-art-flow">
        <svg className="bc-wire" style={{ left: 60, top: 50, width: 200, height: 60 }}>
          <path d="M 0 10 C 60 10, 60 50, 130 50" />
        </svg>
        <svg className="bc-wire bc-live" style={{ left: 240, top: 60, width: 200, height: 60 }}>
          <path d="M 0 0 C 80 0, 80 60, 160 60" />
        </svg>
        <div className="bc-node" style={{ left: 8, top: 34 }}>on:訊息</div>
        <div className="bc-node bc-node-accent" style={{ left: 80, top: 88 }}>if 包含「訂位」</div>
        <div className="bc-node bc-node-dark" style={{ left: 240, top: 48 }}>回覆 Flex 卡</div>
        <div className="bc-node" style={{ left: 280, top: 128 }}>交給 AI</div>
      </div>
    );
  }

  if (type === "ai") {
    return (
      <div className="bc-art-ai">
        <div className="bc-ai-tags">
          <span className="bc-ai-tag">RAG</span>
          <span className="bc-ai-tag bc-hot">向量檢索</span>
          <span className="bc-ai-tag">語意搜尋</span>
        </div>
        <div className="bc-ai-blob" />
      </div>
    );
  }

  if (type === "flex") {
    return (
      <div className="bc-art-flex">
        <div className="bc-flex-card">
          <div className="bc-flex-card-img" />
          <div className="bc-flex-card-body">
            <div className="bc-flex-line bc-l1" />
            <div className="bc-flex-line bc-l2" />
            <div className="bc-flex-line bc-l3" />
            <div className="bc-flex-btn">查看詳情</div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "rich") {
    return (
      <div className="bc-art-rich">
        <div className="bc-rich-cell bc-dark">A</div>
        <div className="bc-rich-cell">B</div>
        <div className="bc-rich-cell">C</div>
        <div className="bc-rich-cell bc-dark">D</div>
      </div>
    );
  }

  return (
    <div className="bc-art-broad">
      <div className="bc-broad-bar bc-acc" style={{ "--w": "78%" } as React.CSSProperties} />
      <div className="bc-broad-meta"><span>VIP · 1,204</span><span>78%</span></div>
      <div className="bc-broad-bar" style={{ "--w": "54%" } as React.CSSProperties} />
      <div className="bc-broad-meta"><span>新會員 · 3,820</span><span>54%</span></div>
      <div className="bc-broad-bar" style={{ "--w": "32%" } as React.CSSProperties} />
      <div className="bc-broad-meta"><span>沉睡用戶 · 8,113</span><span>32%</span></div>
    </div>
  );
};

const BuilderStage = () => (
  <div className="bc-builder-stage bc-reveal">
    <aside className="bc-stage-rail">
      <div className="bc-rail-head">觸發</div>
      <div className="bc-rail-item"><span className="bc-dot bc-y" />收到訊息</div>
      <div className="bc-rail-item"><span className="bc-dot bc-y" />加入好友</div>
      <div className="bc-rail-item"><span className="bc-dot bc-y" />排程</div>
      <div className="bc-rail-head">邏輯</div>
      <div className="bc-rail-item"><span className="bc-dot" />條件分支</div>
      <div className="bc-rail-item"><span className="bc-dot" />變數設定</div>
      <div className="bc-rail-item"><span className="bc-dot" />等待輸入</div>
      <div className="bc-rail-head">動作</div>
      <div className="bc-rail-item"><span className="bc-dot bc-b" />傳送文字</div>
      <div className="bc-rail-item"><span className="bc-dot bc-b" />傳送 Flex</div>
      <div className="bc-rail-item"><span className="bc-dot bc-g" />呼叫 AI</div>
      <div className="bc-rail-item"><span className="bc-dot bc-g" />呼叫 API</div>
    </aside>

    <div className="bc-stage-canvas">
      <svg className="bc-canvas-wire" viewBox="0 0 800 460" preserveAspectRatio="none">
        <path d="M 170 90 C 240 90, 240 200, 320 200" />
        <path className="bc-live" d="M 470 200 C 540 200, 540 100, 620 100" />
        <path d="M 470 240 C 540 240, 540 320, 620 320" />
      </svg>
      <div className="bc-canvas-node bc-start" style={{ left: 30, top: 70 }}>
        <div className="bc-nh">TRIGGER</div>
        收到訊息
      </div>
      <div className="bc-canvas-node bc-cond" style={{ left: 320, top: 180 }}>
        <div className="bc-nh">IF</div>
        包含「預約」
      </div>
      <div className="bc-canvas-node bc-action" style={{ left: 620, top: 80 }}>
        <div className="bc-nh">ACTION</div>
        回覆 Flex 卡片
      </div>
      <div className="bc-canvas-node bc-action" style={{ left: 620, top: 300 }}>
        <div className="bc-nh">ACTION</div>
        交給 AI 回覆
      </div>
    </div>

    <aside className="bc-stage-insp">
      <div className="bc-insp-head">節點屬性 <span className="bc-insp-pill">IF</span></div>
      <div className="bc-insp-row">
        <label>條件類型</label>
        <div className="bc-insp-input">contains_keyword</div>
      </div>
      <div className="bc-insp-row">
        <label>關鍵字（OR）</label>
        <div className="bc-insp-input">預約, 訂位, booking</div>
      </div>
      <div className="bc-insp-row">
        <label>不符合時</label>
        <div className="bc-insp-input bc-ml">→ 流向「交給 AI 回覆」分支，使用 knowledge base「v3-store」</div>
      </div>
    </aside>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (authManager.isAuthenticatedSync()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("bc-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".bc-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const numIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = Number.parseFloat(el.dataset.count || "0");
          const unit = el.dataset.unit || "";
          const start = performance.now();
          const duration = 1400;

          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = `${Math.round(target * eased)}${unit}`;
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
          numIo.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll(".bc-stat-num").forEach((el) => numIo.observe(el));
    return () => numIo.disconnect();
  }, []);

  return (
    <div className="bc-landing">
      <nav className="bc-nav" data-screen-label="01 Nav">
        <div className="bc-nav-inner">
          <BotcraftBrand />
          <div className="bc-nav-links">
            <a href="#features">功能</a>
            <a href="#builder">編輯器</a>
            <a href="#how">怎麼運作</a>
            <a href="#pricing">方案</a>
            <a href="#faq">常見問題</a>
          </div>
          <div className="bc-nav-cta">
            <Link to="/login" className="bc-login">登入</Link>
            <Link to="/register" className="bc-btn bc-btn-primary">
              免費開始
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </nav>

      <header className="bc-hero" data-screen-label="02 Hero">
        <div className="bc-grid-bg" />
        <div className="bc-eyebrow"><span className="bc-eyebrow-dot" />v3.0 · AI 對話接管 已上線</div>
        <div className="bc-hero-grid">
          <div>
            <h1 className="bc-h1">
              把對話機器人，<br />
              做成<span className="bc-ital">你想要的</span><span className="bc-hi-mark">樣子</span>。
            </h1>
            <p className="bc-lead">
              Botcraft 是一個視覺化的對話流程編輯平台。把訊息積木拖一拖，串起來，就能在 LINE、Web、各種通訊管道上跑起來，不用寫一行程式碼。
            </p>
            <div className="bc-hero-cta">
              <Link className="bc-btn bc-btn-primary" to="/register">
                開始建立你的 Bot
                <ArrowIcon />
              </Link>
              <a className="bc-btn bc-btn-ghost" href="#builder">先看編輯器長怎樣</a>
            </div>
            <div className="bc-hero-meta">
              <span><b className="bc-mono">3</b>&nbsp;分鐘上手</span>
              <span><b className="bc-mono">0</b>&nbsp;行程式碼</span>
              <span><b className="bc-mono">∞</b>&nbsp;對話流程</span>
            </div>
          </div>

          <div className="bc-hero-visual">
            <div className="bc-chat-canvas">
              <div className="bc-chat-canvas-bg" />
              <div className="bc-chat-head">
                <div className="bc-traffic"><i /><i /><i /></div>
                <span className="bc-url">botcraft.app/preview/onboarding</span>
              </div>
              <div className="bc-chat-body">
                <div className="bc-bubble bc-in-bubble">嗨～請問營業時間是？<small>USER · 09:42</small></div>
                <div className="bc-bubble bc-out-bubble">我們週一到週五 10:00–20:00 都開著喔 ✦<small>BOT · FLOW: hours</small></div>
                <div className="bc-bubble bc-in-bubble">那我可以預約看店嗎？<small>USER · 09:42</small></div>
                <div className="bc-bubble bc-ai-bubble">好的，我幫你看了週六下午有空檔，要約 14:30 嗎？<small>AI · KNOWLEDGE BASE</small></div>
                <div className="bc-typing"><i /><i /><i /></div>
              </div>
              <div className="bc-chat-sticker bc-s1"><span className="bc-pulse" />已連線&nbsp;·&nbsp;LINE</div>
              <div className="bc-chat-sticker bc-s2"><span className="bc-mono">↳</span>觸發節點&nbsp;<b className="bc-mono">#hours</b></div>
            </div>
          </div>
        </div>
      </header>

      <div className="bc-ticker" aria-label="已整合技術">
        <div className="bc-ticker-inner">
          <span className="bc-ticker-label">已整合</span>
          <div className="bc-ticker-track">
            <div className="bc-ticker-row">
              {[...integrations, ...integrations].map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="bc-section" id="features" data-screen-label="03 Features">
        <div className="bc-section-head bc-reveal">
          <div>
            <div className="bc-section-tag">FEATURES · 01</div>
            <h2 className="bc-section-title">不只是回覆，<br />是<span className="bc-ital">真的會聊天</span>的助理。</h2>
          </div>
          <p className="bc-section-desc">
            從拖拉式流程編輯、AI 知識庫接管，到 Flex 卡片、Rich Menu、群發排程，把過去散落在各處的 Bot 工作，整合在一個工作台裡。
          </p>
        </div>

        <div className="bc-mosaic">
          {features.map((feature) => (
            <div key={feature.id} className={`bc-tile ${feature.className} bc-reveal`}>
              <span className="bc-tile-num">{feature.id}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="bc-tile-art">
                <FeatureArt type={feature.art} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bc-builder" id="builder" data-screen-label="04 Builder">
        <div className="bc-builder-inner">
          <div className="bc-builder-head bc-reveal">
            <div>
              <div className="bc-section-tag">BUILDER · 02</div>
              <h2 className="bc-builder-title">畫得出來，<br />就跑得起來。</h2>
            </div>
            <p className="bc-builder-desc">
              左邊是元件抽屜，中間是畫布，右邊是屬性面板。三欄式工作流，熟悉、直覺、不出錯。底下把 Webhook、訊息事件、AI 推論都串好了。
            </p>
          </div>
          <BuilderStage />
        </div>
      </section>

      <section className="bc-how">
        <div className="bc-section" id="how" data-screen-label="05 How">
          <div className="bc-section-head bc-reveal">
            <div>
              <div className="bc-section-tag">FLOW · 03</div>
              <h2 className="bc-section-title">三步驟，<br />從 0 到上線。</h2>
            </div>
            <p className="bc-section-desc">不需要伺服器、不用部署、不用設 webhook。把 LINE Channel 接上，畫好流程，按下發布。</p>
          </div>

          <div className="bc-steps bc-reveal">
            <div className="bc-step">
              <div className="bc-step-num">STEP 01</div>
              <h3 className="bc-step-title">連結你的頻道</h3>
              <p className="bc-step-desc">把 LINE Channel ID 與 Secret 貼進來，剩下的 Webhook、權限、SSL 我們處理。</p>
              <div className="bc-step-art bc-s-art-1">
                <div className="bc-blip">CH</div>
                <div className="bc-link-line" />
                <div className="bc-blip bc-dark">⇄</div>
                <div className="bc-link-line" />
                <div className="bc-blip bc-acc">BC</div>
              </div>
            </div>
            <div className="bc-step">
              <div className="bc-step-num">STEP 02</div>
              <h3 className="bc-step-title">畫出對話流程</h3>
              <p className="bc-step-desc">在畫布上把節點拖出來、連起來。即時預覽機器人會怎麼回覆。</p>
              <div className="bc-step-art bc-s-art-2">
                <div className="bc-mini-flow">
                  <svg className="bc-wire" style={{ left: 0, top: 24, width: "100%", height: 60 }}>
                    <path d="M 30 10 C 90 10, 90 50, 150 50" />
                  </svg>
                  <div className="bc-node" style={{ left: 6, top: 14 }}>trigger</div>
                  <div className="bc-node bc-node-accent" style={{ left: 80, top: 54 }}>flex</div>
                </div>
              </div>
            </div>
            <div className="bc-step">
              <div className="bc-step-num">STEP 03</div>
              <h3 className="bc-step-title">一鍵上線</h3>
              <p className="bc-step-desc">發布後，每一則訊息都會即時透過 WebSocket 流回儀表板，可以邊看邊調。</p>
              <div className="bc-step-art bc-s-art-3">
                <div className="bc-pulse-ring" />
                <div className="bc-pulse-core" />
              </div>
            </div>
          </div>

          <div className="bc-stats bc-reveal">
            <div className="bc-stat"><div className="bc-stat-num" data-count="3" data-unit="分鐘">0分鐘</div><div className="bc-stat-label">平均上手時間</div></div>
            <div className="bc-stat"><div className="bc-stat-num" data-count="98" data-unit="%">0%</div><div className="bc-stat-label">訊息送達成功率</div></div>
            <div className="bc-stat"><div className="bc-stat-num" data-count="42" data-unit="ms">0ms</div><div className="bc-stat-label">P95 回應延遲</div></div>
            <div className="bc-stat"><div className="bc-stat-num" data-count="12" data-unit="k+">0k+</div><div className="bc-stat-label">已建立的 Bot</div></div>
          </div>
        </div>
      </section>

      <section className="bc-section" id="pricing" data-screen-label="06 Pricing">
        <div className="bc-section-head bc-reveal">
          <div>
            <div className="bc-section-tag">PRICING · 04</div>
            <h2 className="bc-section-title">先免費，<br />有需要再升級。</h2>
          </div>
          <p className="bc-section-desc">學生與個人用戶永遠有可用的免費額度。需要更多訊息量、AI 接管或團隊協作時，再考慮其他方案。</p>
        </div>

        <div className="bc-price-grid bc-reveal">
          {plans.map((plan) => {
            const content = (
              <>
                {plan.featured && <div className="bc-plan-flag">最熱門</div>}
                <div className="bc-plan-name">{plan.name}</div>
                <div className="bc-plan-price"><span className="bc-currency">NT$</span>{plan.price}<span className="bc-period">/月</span></div>
                <p className="bc-plan-desc">{plan.description}</p>
                <ul className="bc-feat">
                  {plan.features.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="bc-plan-cta">
                  {plan.href.startsWith("mailto:") ? (
                    <a className="bc-btn bc-btn-primary" href={plan.href}>{plan.cta}</a>
                  ) : (
                    <Link className="bc-btn bc-btn-primary" to={plan.href}>{plan.cta}</Link>
                  )}
                </div>
              </>
            );

            return <div key={plan.name} className={`bc-plan ${plan.featured ? "bc-featured" : ""}`}>{content}</div>;
          })}
        </div>
      </section>

      <section className="bc-section" id="faq" data-screen-label="07 FAQ">
        <div className="bc-section-head bc-reveal">
          <div>
            <div className="bc-section-tag">FAQ · 05</div>
            <h2 className="bc-section-title">常見問題</h2>
          </div>
          <p className="bc-section-desc">
            沒看到你的問題？寄信到 <a href="mailto:jkl921102@gmail.com">jkl921102@gmail.com</a>，通常一天內回覆。
          </p>
        </div>

        <div className="bc-faq-list bc-reveal">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div className={`bc-faq-item ${isOpen ? "bc-open" : ""}`} key={faq.question}>
                <button
                  className="bc-faq-q"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  {faq.question}
                  <span className="bc-plus" />
                </button>
                <div className="bc-faq-a">{faq.answer}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bc-finale" data-screen-label="08 CTA">
        <h2 className="bc-finale-title bc-reveal">
          開始畫你的<br />
          <span className="bc-ital">第一個</span> Bot 吧。
        </h2>
        <div className="bc-finale-side bc-reveal">
          <p>免費註冊不用信用卡。三分鐘內就能在 LINE 上看到你做的機器人回應第一則訊息。</p>
          <div className="bc-ctas">
            <Link className="bc-btn bc-btn-primary" to="/register">
              免費開始
              <ArrowIcon />
            </Link>
            <Link className="bc-btn bc-btn-ghost" to="/how-to-establish">看建立教學</Link>
          </div>
        </div>
      </section>

      <footer className="bc-footer" data-screen-label="09 Footer">
        <div className="bc-foot-inner">
          <div className="bc-foot-grid">
            <div className="bc-foot-brand">
              <BotcraftBrand inverted />
              <p>視覺化的對話機器人建構平台。把想法畫出來，就讓它跑起來。</p>
              <p className="bc-mono">© 2026 Botcraft Studio</p>
            </div>
            <div className="bc-foot-col">
              <h4>產品</h4>
              <ul>
                <li><a href="#features">功能總覽</a></li>
                <li><a href="#builder">編輯器</a></li>
                <li><a href="#pricing">方案</a></li>
                <li><Link to="/dashboard">工作台</Link></li>
              </ul>
            </div>
            <div className="bc-foot-col">
              <h4>資源</h4>
              <ul>
                <li><Link to="/how-to-establish">建立教學</Link></li>
                <li><Link to="/suggest">意見回饋</Link></li>
                <li><Link to="/terms">服務條款</Link></li>
                <li><Link to="/privacy">隱私權</Link></li>
              </ul>
            </div>
            <div className="bc-foot-col">
              <h4>公司</h4>
              <ul>
                <li><Link to="/about">關於我們</Link></li>
                <li><a href="mailto:jkl921102@gmail.com">聯絡</a></li>
                <li><Link to="/login">登入</Link></li>
                <li><Link to="/register">建立帳號</Link></li>
              </ul>
            </div>
          </div>
          <div className="bc-foot-bot">
            <span>Made with care · 100% 視覺化</span>
            <span>v3.0 · build 2604.05</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
