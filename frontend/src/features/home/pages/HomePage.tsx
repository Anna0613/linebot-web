import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BotCraftBrand from "@/components/brand/BotCraftIdentity";
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
    description:
      "把訊息積木一塊一塊接起來，就像畫流程圖。條件分支、變數、跳轉，都看得見。",
    className: "bc-t-flow",
    art: "flow",
  },
  {
    id: "02 / AI",
    title: "AI 知識庫接管",
    description:
      "整合 Groq 與 Gemini，讓 Bot 在你不在線時也能用你的資料回答問題。",
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
    id: "05 / INSIGHT",
    title: "互動紀錄與好友管理",
    description:
      "查看訊息、好友、連線狀態與最近活動，調整 Bot 時不需要跳到別處。",
    className: "bc-t-analytics",
    art: "analytics",
  },
];

const faqs = [
  {
    question: "我需要會寫程式才能用嗎？",
    answer:
      "不需要。整個流程從 LINE Channel 連線、訊息設計、上線發布都是視覺化操作。如果你會寫，也可以用 Webhook 與 API 自己擴充。",
  },
  {
    question: "目前可以怎麼開始使用？",
    answer:
      "註冊後可以依照建立教學新增 LINE Bot，接著進入工作台調整邏輯、Flex Message、AI 知識庫與 Rich Menu。",
  },
  {
    question: "Bot 的對話資料儲存在哪？",
    answer:
      "對話歷史儲存在加密的 MongoDB，媒體檔案儲存在 MinIO 物件儲存。你可以隨時下載或刪除所有對話資料，也可以選擇關閉對話記錄功能。",
  },
  {
    question: "AI 接管是什麼意思？",
    answer:
      "當你定義的流程沒有匹配到使用者訊息時，可以選擇交給 AI 處理。AI 會基於你上傳到知識庫的內容，用 RAG 檢索方式回覆。",
  },
  {
    question: "可以同時連到 LINE 以外的平台嗎？",
    answer:
      "目前首頁與工作台都以 LINE Messaging API 為主，示意畫面也只展示系統內實際支援的 LINE Bot 管理流程。",
  },
];

const ArrowIcon = () => (
  <svg
    className="bc-btn-arrow"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

const FeatureArt = ({ type }: { type: string }) => {
  if (type === "flow") {
    return (
      <div className="bc-art-flow">
        <svg
          className="bc-wire"
          style={{ left: 60, top: 50, width: 200, height: 60 }}
        >
          <path d="M 0 10 C 60 10, 60 50, 130 50" />
        </svg>
        <svg
          className="bc-wire bc-live"
          style={{ left: 240, top: 60, width: 200, height: 60 }}
        >
          <path d="M 0 0 C 80 0, 80 60, 160 60" />
        </svg>
        <div className="bc-node" style={{ left: 8, top: 34 }}>
          on:訊息
        </div>
        <div className="bc-node bc-node-accent" style={{ left: 80, top: 88 }}>
          if 包含「訂位」
        </div>
        <div className="bc-node bc-node-dark" style={{ left: 240, top: 48 }}>
          回覆 Flex 卡
        </div>
        <div className="bc-node" style={{ left: 280, top: 128 }}>
          交給 AI
        </div>
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
    <div className="bc-art-analytics">
      <div className="bc-analytics-top">
        <span>最近 7 天</span>
        <b>即時連線</b>
      </div>
      <div className="bc-analytics-bars" aria-hidden="true">
        {[42, 58, 36, 72, 54, 88].map((height, index) => (
          <span
            key={index}
            style={{ "--h": `${height}%` } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="bc-analytics-list">
        <span>訊息統計</span>
        <span>好友列表</span>
        <span>系統活動</span>
      </div>
    </div>
  );
};

const ProductShellPreview = () => (
  <div className="bc-product-shell" aria-label="BotCraft 工作台實際畫面示意">
    <aside className="bc-product-sidebar">
      <div className="bc-product-brand">
        <span className="bc-product-mark" />
        <span>BotCraft</span>
      </div>
      <div className="bc-product-switcher">
        <span>目前 Bot</span>
        <b>school project</b>
      </div>
      <nav className="bc-product-nav">
        <span className="bc-product-nav-active">工作台</span>
        <span>編輯 Bot</span>
        <span>互動紀錄</span>
        <span>好友</span>
        <span>設定</span>
      </nav>
      <div className="bc-product-callout">
        <b>Bot 目前正常</b>
        <span>查看連線、訊息與好友互動。</span>
      </div>
    </aside>

    <div className="bc-product-main">
      <header className="bc-product-topbar">
        <div>
          <span>WORKSPACE</span>
          <b>今天想更新哪一個 Bot？</b>
        </div>
        <div className="bc-product-user">R</div>
      </header>

      <section className="bc-product-hero-card">
        <div>
          <span>你的 LINE Bot 工作台</span>
          <h3>建立 Bot、調整回覆、查看最近互動。</h3>
        </div>
        <span className="bc-product-action">建立 Bot</span>
      </section>

      <div className="bc-product-grid">
        <section className="bc-product-panel bc-product-wide">
          <div className="bc-product-panel-head">
            <b>我的 Bot</b>
            <span>搜尋 / 篩選 / 開啟設計</span>
          </div>
          <div className="bc-product-table">
            <div>
              <b>school project</b>
              <span>啟用</span>
              <em>編輯</em>
            </div>
            <div>
              <b>customer support</b>
              <span>停用</span>
              <em>設定</em>
            </div>
            <div>
              <b>line demo</b>
              <span>啟用</span>
              <em>互動</em>
            </div>
          </div>
        </section>

        <section className="bc-product-panel">
          <div className="bc-product-panel-head">
            <b>訊息趨勢</b>
            <span>7 day view</span>
          </div>
          <div className="bc-product-chart" aria-hidden="true">
            {[26, 52, 34, 68, 46, 74, 58].map((height, index) => (
              <span
                key={index}
                style={{ "--h": `${height}%` } as React.CSSProperties}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

const BuilderStage = () => (
  <div className="bc-builder-stage bc-reveal">
    <aside className="bc-stage-rail">
      <div className="bc-rail-head">觸發</div>
      <div className="bc-rail-item">
        <span className="bc-dot bc-y" />
        收到訊息
      </div>
      <div className="bc-rail-item">
        <span className="bc-dot bc-y" />
        加入好友
      </div>
      <div className="bc-rail-head">邏輯</div>
      <div className="bc-rail-item">
        <span className="bc-dot" />
        條件分支
      </div>
      <div className="bc-rail-item">
        <span className="bc-dot" />
        變數設定
      </div>
      <div className="bc-rail-item">
        <span className="bc-dot" />
        等待輸入
      </div>
      <div className="bc-rail-head">動作</div>
      <div className="bc-rail-item">
        <span className="bc-dot bc-b" />
        傳送文字
      </div>
      <div className="bc-rail-item">
        <span className="bc-dot bc-b" />
        傳送 Flex
      </div>
      <div className="bc-rail-item">
        <span className="bc-dot bc-g" />
        呼叫 AI
      </div>
      <div className="bc-rail-item">
        <span className="bc-dot bc-g" />
        呼叫 API
      </div>
    </aside>

    <div className="bc-stage-canvas">
      <div className="bc-stage-tabs">
        <span>基本資料</span>
        <span className="bc-tab-active">邏輯編輯器</span>
        <span>Flex Message 編輯</span>
        <span>AI 知識庫管理</span>
        <span>功能選單</span>
      </div>
      <div className="bc-canvas-board">
        <div className="bc-canvas-dropzone">
          <div className="bc-flow-card bc-start">
            <div className="bc-nh">TRIGGER</div>
            當收到文字訊息時
          </div>
          <div className="bc-flow-line" />
          <div className="bc-flow-card bc-cond">
            <div className="bc-nh">IF</div>
            如果包含「預約」
          </div>
          <div className="bc-flow-branches">
            <div className="bc-flow-card bc-action">
              <div className="bc-nh">ACTION</div>
              回覆 Flex 訊息
            </div>
            <div className="bc-flow-card bc-ai">
              <div className="bc-nh">AI</div>
              查詢知識庫
            </div>
          </div>
        </div>
        <div className="bc-stage-simulator">
          <div className="bc-sim-head">LINE Bot 模擬器</div>
          <div className="bc-sim-body">
            <span>
              歡迎使用 LINE Bot 模擬器，請輸入訊息來測試您的 Bot 邏輯。
            </span>
            <b>我想預約明天下午</b>
            <span>已觸發「預約」分支，回覆 Flex 訊息。</span>
          </div>
          <div className="bc-sim-input">輸入訊息...</div>
        </div>
      </div>
    </div>

    <aside className="bc-stage-insp">
      <div className="bc-insp-head">
        節點屬性 <span className="bc-insp-pill">IF</span>
      </div>
      <div className="bc-insp-row">
        <label>條件類型</label>
        <div className="bc-insp-input">文字包含</div>
      </div>
      <div className="bc-insp-row">
        <label>關鍵字（OR）</label>
        <div className="bc-insp-input">預約, 訂位</div>
      </div>
      <div className="bc-insp-row">
        <label>不符合時</label>
        <div className="bc-insp-input bc-ml">
          切到 AI 知識庫管理，確認是否需要由知識庫回覆。
        </div>
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

    document
      .querySelectorAll(".bc-stat-num")
      .forEach((el) => numIo.observe(el));
    return () => numIo.disconnect();
  }, []);

  return (
    <div className="bc-landing">
      <nav className="bc-nav" data-screen-label="01 Nav">
        <div className="bc-nav-inner">
          <BotCraftBrand />
          <div className="bc-nav-links">
            <a href="#features">功能</a>
            <a href="#builder">編輯器</a>
            <a href="#how">怎麼運作</a>
            <a href="#faq">常見問題</a>
          </div>
          <div className="bc-nav-cta">
            <Link to="/login" className="bc-login">
              登入
            </Link>
            <Link to="/register" className="bc-btn bc-btn-primary">
              免費開始
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </nav>

      <header className="bc-hero" data-screen-label="02 Hero">
        <div className="bc-grid-bg" />
        <div className="bc-eyebrow">
          <span className="bc-eyebrow-dot" />
          v3.0 · AI 對話接管 已上線
        </div>
        <div className="bc-hero-grid">
          <div>
            <h1 className="bc-h1">
              把對話機器人，
              <br />
              做成<span className="bc-ital">你想要的</span>
              <span className="bc-hi-mark">樣子</span>。
            </h1>
            <p className="bc-lead">
              BotCraft 是一個 LINE Bot 製作與管理工作台。建立
              Bot、調整回覆、編輯 Flex Message、管理 Rich Menu 與 AI
              知識庫，都在同一套實際介面裡完成。
            </p>
            <div className="bc-hero-cta">
              <Link className="bc-btn bc-btn-primary" to="/register">
                開始建立你的 Bot
                <ArrowIcon />
              </Link>
              <a className="bc-btn bc-btn-ghost" href="#builder">
                先看編輯器長怎樣
              </a>
            </div>
            <div className="bc-hero-meta">
              <span>
                <b className="bc-mono">LINE</b>&nbsp;Messaging API
              </span>
              <span>
                <b className="bc-mono">0</b>&nbsp;行程式碼
              </span>
              <span>
                <b className="bc-mono">5</b>&nbsp;個編輯分頁
              </span>
            </div>
          </div>

          <div className="bc-hero-visual">
            <ProductShellPreview />
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

      <section
        className="bc-section"
        id="features"
        data-screen-label="03 Features"
      >
        <div className="bc-section-head bc-reveal">
          <div>
            <div className="bc-section-tag">FEATURES · 01</div>
            <h2 className="bc-section-title">
              不只是回覆，
              <br />是<span className="bc-ital">真的會聊天</span>的助理。
            </h2>
          </div>
          <p className="bc-section-desc">
            從 Bot 建立、拖拉式邏輯編輯、AI 知識庫，到 Flex 卡片、Rich
            Menu、互動紀錄與好友管理，把系統內實際存在的 Bot
            工作整合在一個工作台裡。
          </p>
        </div>

        <div className="bc-mosaic">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`bc-tile ${feature.className} bc-reveal`}
            >
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

      <section
        className="bc-builder"
        id="builder"
        data-screen-label="04 Builder"
      >
        <div className="bc-builder-inner">
          <div className="bc-builder-head bc-reveal">
            <div>
              <div className="bc-section-tag">BUILDER · 02</div>
              <h2 className="bc-builder-title">
                畫得出來，
                <br />
                就跑得起來。
              </h2>
            </div>
            <p className="bc-builder-desc">
              這裡依照目前系統的編輯器結構呈現：基本資料、邏輯編輯器、Flex
              Message、AI
              知識庫管理與功能選單。左側選積木，中間編輯流程，右側即時模擬。
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
              <h2 className="bc-section-title">
                三步驟，
                <br />從 0 到上線。
              </h2>
            </div>
            <p className="bc-section-desc">
              依照建立教學填入 LINE Channel 資訊，選擇要編輯的
              Bot，接著在工作台完成邏輯、Flex、AI 知識庫與 Rich Menu 設定。
            </p>
          </div>

          <div className="bc-steps bc-reveal">
            <div className="bc-step">
              <div className="bc-step-num">STEP 01</div>
              <h3 className="bc-step-title">連結你的頻道</h3>
              <p className="bc-step-desc">
                依建立教學準備 Channel Access Token 與 Channel
                Secret，建立你的第一個 LINE Bot。
              </p>
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
              <p className="bc-step-desc">
                在畫布上把節點拖出來、連起來。即時預覽機器人會怎麼回覆。
              </p>
              <div className="bc-step-art bc-s-art-2">
                <div className="bc-mini-flow">
                  <svg
                    className="bc-wire"
                    style={{ left: 0, top: 24, width: "100%", height: 60 }}
                  >
                    <path d="M 30 10 C 90 10, 90 50, 150 50" />
                  </svg>
                  <div className="bc-node" style={{ left: 6, top: 14 }}>
                    trigger
                  </div>
                  <div
                    className="bc-node bc-node-accent"
                    style={{ left: 80, top: 54 }}
                  >
                    flex
                  </div>
                </div>
              </div>
            </div>
            <div className="bc-step">
              <div className="bc-step-num">STEP 03</div>
              <h3 className="bc-step-title">查看互動狀態</h3>
              <p className="bc-step-desc">
                從互動紀錄與好友管理查看訊息、連線狀態和最近活動，再回編輯器快速調整。
              </p>
              <div className="bc-step-art bc-s-art-3">
                <div className="bc-pulse-ring" />
                <div className="bc-pulse-core" />
              </div>
            </div>
          </div>

          <div className="bc-stats bc-reveal">
            <div className="bc-stat">
              <div className="bc-stat-num" data-count="5" data-unit="">
                0
              </div>
              <div className="bc-stat-label">編輯器分頁</div>
            </div>
            <div className="bc-stat">
              <div className="bc-stat-num" data-count="1" data-unit="">
                0
              </div>
              <div className="bc-stat-label">主要通訊平台：LINE</div>
            </div>
            <div className="bc-stat">
              <div className="bc-stat-num" data-count="4" data-unit="">
                0
              </div>
              <div className="bc-stat-label">核心管理頁面</div>
            </div>
            <div className="bc-stat">
              <div className="bc-stat-num" data-count="0" data-unit="行">
                0行
              </div>
              <div className="bc-stat-label">建立流程必寫程式碼</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bc-section" id="faq" data-screen-label="06 FAQ">
        <div className="bc-section-head bc-reveal">
          <div>
            <div className="bc-section-tag">FAQ · 05</div>
            <h2 className="bc-section-title">常見問題</h2>
          </div>
          <p className="bc-section-desc">
            沒看到你的問題？寄信到{" "}
            <a href="mailto:jkl921102@gmail.com">jkl921102@gmail.com</a>
            ，通常一天內回覆。
          </p>
        </div>

        <div className="bc-faq-list bc-reveal">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                className={`bc-faq-item ${isOpen ? "bc-open" : ""}`}
                key={faq.question}
              >
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

      <section className="bc-finale" data-screen-label="07 CTA">
        <h2 className="bc-finale-title bc-reveal">
          開始畫你的
          <br />
          <span className="bc-ital">第一個</span> Bot 吧。
        </h2>
        <div className="bc-finale-side bc-reveal">
          <p>
            註冊後依照建立教學新增 LINE Bot，再進入工作台設定回覆、Flex
            Message、AI 知識庫與 Rich Menu。
          </p>
          <div className="bc-ctas">
            <Link className="bc-btn bc-btn-primary" to="/register">
              免費開始
              <ArrowIcon />
            </Link>
            <Link className="bc-btn bc-btn-ghost" to="/how-to-establish">
              看建立教學
            </Link>
          </div>
        </div>
      </section>

      <footer className="bc-footer" data-screen-label="08 Footer">
        <div className="bc-foot-inner">
          <div className="bc-foot-grid">
            <div className="bc-foot-brand">
              <BotCraftBrand inverted />
              <p>視覺化的對話機器人建構平台。把想法畫出來，就讓它跑起來。</p>
              <p className="bc-mono">© 2026 BotCraft Studio</p>
            </div>
            <div className="bc-foot-col">
              <h4>產品</h4>
              <ul>
                <li>
                  <a href="#features">功能總覽</a>
                </li>
                <li>
                  <a href="#builder">編輯器</a>
                </li>
                <li>
                  <Link to="/dashboard">工作台</Link>
                </li>
              </ul>
            </div>
            <div className="bc-foot-col">
              <h4>資源</h4>
              <ul>
                <li>
                  <Link to="/how-to-establish">建立教學</Link>
                </li>
                <li>
                  <Link to="/suggest">意見回饋</Link>
                </li>
                <li>
                  <Link to="/terms">服務條款</Link>
                </li>
                <li>
                  <Link to="/privacy">隱私權</Link>
                </li>
              </ul>
            </div>
            <div className="bc-foot-col">
              <h4>公司</h4>
              <ul>
                <li>
                  <Link to="/about">關於我們</Link>
                </li>
                <li>
                  <a href="mailto:jkl921102@gmail.com">聯絡</a>
                </li>
                <li>
                  <Link to="/login">登入</Link>
                </li>
                <li>
                  <Link to="/register">建立帳號</Link>
                </li>
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
