# BotCraft Landing Page Design 與 CIS 規範

來源檔案：`Landing Page.html`
語系：繁體中文
品牌名稱：BotCraft
頁面定位：AI 對話機器人建構平台 Landing Page

## 1. 品牌總述

BotCraft 是一個視覺化的對話機器人建構平台，核心承諾是讓使用者不用寫程式，也能用拖拉式流程、訊息積木、AI 知識庫與 LINE 整合建立可上線的 Bot。

品牌主張：

- 主要標語：把對話機器人，做成你想要的樣子。
- 產品信念：畫得出來，就跑得起來。
- 輔助文案：把想法畫出來，就讓它跑起來。
- 核心價值：視覺化、零程式、可控 AI、快速上線、多管道整合。

品牌個性：

- 專業但不冰冷：保留 SaaS 工具的精準感，同時用口語中文降低技術門檻。
- 技術可信：以 LINE Messaging API、Webhook、Flex Message、RAG、PostgreSQL 等整合項目建立可信度。
- 創作者友善：文案聚焦「拖一拖」、「畫出來」、「三分鐘上手」，讓使用者感覺可以立即開始。
- AI 謹慎可控：AI 被描述為「接管」與「基於知識庫回答」，避免不可控或過度神化。

目標受眾：

- 學生、個人創作者、社團經營者。
- 小品牌、店家、接案者。
- 需要 LINE Bot、客服 Bot、行銷推播或 AI 知識庫的團隊。
- 想降低 Bot 開發門檻，但仍需要流程、資料與發布可控的人。

## 2. CIS 核心識別

### 2.1 Logo 結構

現有 Logo 由品牌圖形與文字標準字組成。

品牌圖形：

- 基本外框：26px x 26px 的深色圓角方形。
- 圓角：7px，呈現工具型產品的穩定感與友善感。
- 左眼：6px 圓點，使用品牌強調紫色 `--accent`。
- 右眼：6px 圓點，使用高亮黃綠色 `--hi`。
- 下方尾巴：白色 8px x 4px 的短弧形，暗示對話泡泡或聊天機器人的嘴型。
- 視覺意象：聊天機器人、對話氣泡、工具積木、可被組裝的品牌角色。

文字標準字：

- 文字：BotCraft。
- 字體：Geist 或同級幾何無襯線字體。
- 字重：600。
- 字距：略緊，`letter-spacing: -0.01em`。
- 圖文間距：10px。

反白版本：

- 頁尾深色背景中，品牌圖形外框改為淺色 `--bg`。
- 眼睛維持紫色與黃綠色，用於保持識別一致性。
- 文字使用淺色 `--bg`。

### 2.2 Logo 使用規範

建議最小尺寸：

- 完整 Logo：高度不低於 26px。
- 單獨品牌圖形：不低於 18px，低於此尺寸時兩個眼睛與尾巴會失去辨識度。
- App icon 或 favicon：可使用單獨品牌圖形，建議保留深色底與雙色眼睛。

安全留白：

- Logo 四周至少保留一個品牌圖形寬度的 0.5 倍作為留白。
- 導覽列中 Logo 左右不應貼齊容器邊界，需保留與目前 `--pad-x` 相同的頁面節奏。

禁止用法：

- 不要改變兩個眼睛的相對位置。
- 不要將圖形拉伸成非正方形。
- 不要把 Logo 放在低對比或花紋過重的背景上。
- 不要將 Logo 改成高彩度漸層或加入陰影特效。
- 不要在 Logo 上附加複雜吉祥物表情，現有識別應維持抽象、幾何、產品化。

## 3. 視覺主題

整體風格是「現代 SaaS 工具介面 + AI 工作台 + 輕量 editorial 排版」。

設計語彙：

- 大面積暖白背景，降低壓迫感。
- 深墨色作為主文字、CTA、深色工作台區塊，建立可信度。
- 紫色作為 AI、條件節點、品牌重點與互動強調。
- 黃綠色作為 highlight、成功狀態、熱門標籤與第二品牌輔助色。
- 細線框、網格、虛線節點連線，建立「流程編輯器」與「可組裝系統」的心智模型。
- 產品 UI mockup 取代抽象插畫，直接展示聊天、節點、屬性面板與推播數據。

視覺關鍵詞：

- Visual builder
- No-code automation
- Chat workflow
- AI handoff
- Technical but approachable
- Modular dashboard
- Calm premium SaaS

## 4. 色彩系統

色彩以 OKLCH token 為主，保留較穩定的明度與色相控制。

| Token | 值 | 用途 |
| --- | --- | --- |
| `--bg` | `oklch(0.98 0.006 85)` | 全站主背景，暖白色 |
| `--bg-2` | `oklch(0.96 0.008 85)` | 區塊背景、step 區底色 |
| `--card` | `#ffffff` | 卡片、聊天視窗、方案卡 |
| `--ink` | `oklch(0.18 0.012 270)` | 主文字、主 CTA、深色區背景 |
| `--ink-2` | `oklch(0.36 0.014 270)` | 內文、導覽連結、描述文字 |
| `--ink-3` | `oklch(0.58 0.012 270)` | meta、輔助資料、時間戳 |
| `--line` | `oklch(0.88 0.008 270)` | 主要線框 |
| `--line-2` | `oklch(0.93 0.006 270)` | 淡分隔線、背景網格 |
| `--accent` | `oklch(0.62 0.18 290)` | 品牌紫、AI、重點節點 |
| `--accent-soft` | `oklch(0.92 0.06 290)` | 紫色柔和背景 |
| `--accent-ink` | `oklch(0.32 0.16 290)` | 紫色文字、斜體重點 |
| `--hi` | `oklch(0.90 0.13 95)` | 黃綠高亮、熱門標籤、成功感 |
| `--hi-soft` | `oklch(0.95 0.08 95)` | 標題螢光筆效果、柔和高亮 |

使用原則：

- 主背景保持暖白，不使用冷灰或純白鋪滿整頁。
- 深墨色只用於主 CTA、重要文字與深色產品展示區，不要讓全站過暗。
- 紫色只用於品牌重點、AI、條件、hover 與重點標記，避免整頁變成單一紫色主題。
- 黃綠色只作為少量 highlight，不作為主要按鈕色。
- 線框使用低彩度灰紫，維持工具產品的精密感。

## 5. 字體與排版

字體：

- 主字體：`Geist`, fallback 至系統無襯線。
- 等寬字體：`Geist Mono`, fallback 至系統等寬字。
- 字體特性：`font-feature-settings: "ss01", "cv11"`，數字資訊使用 `tnum`。

排版風格：

- 標題大、緊、乾淨，使用低行高與微負字距。
- 內文使用 1.55 至 1.65 行高，維持繁中閱讀性。
- 技術資訊、版本、節點名、計數、標籤使用等寬字，強化工程感。
- 英文與技術詞不翻譯過度，保留 LINE、Webhook、Flex、RAG 等原始詞以建立專業語境。

主要尺寸：

| 層級 | 尺寸 | 用途 |
| --- | --- | --- |
| Hero H1 | `clamp(48px, 6vw, 88px)` | 首屏主張 |
| Final CTA | `clamp(48px, 7vw, 104px)` | 結尾大型召喚 |
| Section title | `clamp(36px, 4.4vw, 56px)` | 主要區塊標題 |
| Builder title | `clamp(40px, 5vw, 64px)` | 深色工作台標題 |
| Lead | 18px / 1.6 | Hero 說明 |
| Section desc | 17px / 1.55 | 區塊說明 |
| Body / Card | 14px 至 15px | 卡片、方案、FAQ 內容 |
| Mono label | 10px 至 12px | tag、step、meta、節點類型 |

## 6. 版面與網格

全站基礎：

- 最大寬度：`--max: 1240px`。
- 桌面左右留白：`--pad-x: 56px`。
- 平板以下左右留白：`--pad-x: 28px`。
- 頁面採用中心容器與 full-width 色帶交錯。

主要版型：

- 導覽列：sticky top，玻璃模糊背景，左 Logo、中導覽、右 CTA。
- Hero：左右雙欄，左側文案與 CTA，右側聊天產品 mockup。
- Features：6 欄 mosaic，透過不同 span 建立產品能力層級。
- Builder：深色 full-width 區塊，三欄工作台：元件抽屜、畫布、屬性面板。
- How：三步驟卡片，從連線、設計、發布建立 onboarding 心智模型。
- Stats：四欄數據列，強化效率與可信度。
- Pricing：三欄方案卡，中間 Studio 深色 featured。
- FAQ：單欄 accordion。
- Final CTA：大標題與側欄 CTA。
- Footer：四欄資訊架構。

RWD 行為：

- 斷點：`max-width: 980px`。
- Hero、section head、builder head、final CTA 改為單欄。
- Feature mosaic 改為兩欄，所有 tile 橫跨兩欄。
- Builder stage 移除左右面板，只保留 canvas。
- Steps、Pricing、Stats 改為單欄堆疊。
- Footer 改為兩欄。
- Nav links 隱藏，只保留品牌、登入與主 CTA。

## 7. 元件規範

### 7.1 Button

共用樣式：

- inline-flex，垂直置中。
- 高度由 `padding: 11px 18px` 決定。
- 圓角：999px，形成 pill button。
- 字體：14px / 500。
- active 狀態：`translateY(1px)`，提供輕微按壓感。

Primary：

- 背景：`--ink`。
- 文字：`--bg`。
- hover：更深的墨色。
- 用於「免費開始」、「開始建立你的 Bot」、「升級 Studio」等主要行動。

Ghost：

- 背景透明。
- 線框：`--line`。
- hover 線框轉 `--ink`。
- 用於次要行動，例如「先看編輯器長怎樣」、「看示範影片」。

### 7.2 Navigation

- sticky 固定在頂部。
- 背景使用 `backdrop-filter: blur(14px)` 與半透明暖白。
- 底部分隔線使用 `--line-2`。
- 導覽連結 hover 從 `--ink-2` 轉為 `--ink`。
- 導覽錨點對應功能、編輯器、怎麼運作、方案、常見問題。

### 7.3 Hero Chat Canvas

用途：讓首屏直接理解產品能產生聊天機器人回覆。

視覺元素：

- 白色卡片，18px 圓角。
- macOS 交通燈式 header。
- URL meta：`botcraft.app/preview/onboarding`。
- 使用者訊息、Bot 訊息、AI 訊息三種 bubble。
- AI bubble 使用 `--accent-soft` 與 `--accent-ink`。
- 浮動貼紙顯示 LINE 已連線與節點觸發。

### 7.4 Feature Tile

- 背景多數為白色卡片。
- 線框使用 `--line-2`。
- 圓角：`--rad: 14px`。
- hover 線框轉深色，表示可探索。
- tile number 使用等寬字建立產品模組感。
- 特殊 tile：
  - AI tile 使用深色背景，提高權重。
  - Rich Menu tile 使用紫色柔和背景，對應設計與圖文選單。

### 7.5 Builder Stage

用途：具體展示產品核心工作流。

三欄結構：

- 左側 rail：觸發、邏輯、動作元件。
- 中央 canvas：節點、連線、流程圖。
- 右側 inspector：節點屬性、條件、fallback 行為。

深色介面語彙：

- 背景墨色。
- 節點邊框依類型上色。
- live path 使用紫色虛線動畫。
- dotted canvas 模擬專業流程編輯器。

### 7.6 Pricing Card

- 三欄方案：Hobby、Studio、Team。
- 中間 Studio 使用深色 featured 樣式，並加上黃綠「最熱門」標籤。
- 功能列表使用遮罩 SVG check icon。
- CTA 置底，方案內容高度自然對齊。

### 7.7 FAQ Accordion

- 預設全部收合。
- 點擊問題後展開答案，且一次只保留一題開啟。
- plus icon 在開啟時轉為深色圓形並旋轉。
- 答案使用 `max-height` 與 `margin-top` 轉場。

## 8. 互動與動效

主要互動：

- 導覽列 sticky 與毛玻璃效果。
- CTA hover 與 active 位移。
- Feature tile hover 線框變深。
- Flex card hover 時輕微旋轉與上移。
- FAQ accordion 點擊展開。
- Pricing card hover 線框變深。
- Tweaks panel 可調整強調色、標題字重、ticker 顯示、builder 深色背景。

動效清單：

| 動效 | 時間 / 行為 | 用途 |
| --- | --- | --- |
| ticker | 40s linear infinite | 展示已整合技術，建立平台廣度 |
| reveal | 0.8s ease | 區塊進入視窗時淡入上移 |
| bubbleIn | 0.6s stagger | Hero 聊天訊息逐則出現 |
| typing | 1.2s infinite | 模擬 Bot 輸入中 |
| float | 6s infinite | 浮動狀態貼紙 |
| dash | 1.4s 至 1.6s linear | 流程連線中的資料流 |
| blob | 6s infinite | AI 能量球微動 |
| spin | 24s infinite | AI blob 外圈旋轉 |
| pulse | 2.4s infinite | 發布與上線的訊號感 |
| count-up | 1400ms ease-out | Stats 數字從 0 遞增 |

動效原則：

- 動效幅度小，速度平穩，偏工具產品而非遊戲感。
- 所有動畫都應有明確語意：載入、連線、資料流、上線、訊息回覆。
- 避免大幅度 bounce、過度閃爍、無目的裝飾動畫。
- 建議補上 `prefers-reduced-motion`，在使用者要求降低動態時關閉 ticker、float、spin、pulse、count-up。

## 9. 內容策略與語氣

文案語氣：

- 使用繁體中文。
- 短句、口語、直接，避免過度行銷形容詞。
- 技術詞與產品詞可以保留英文，但要放在可理解的情境中。
- 以「你」稱呼使用者，降低距離。
- 使用「畫」、「拖」、「接」、「發布」、「跑起來」等動作詞，強化無程式與視覺化心智。

推薦語句：

- 把對話機器人，做成你想要的樣子。
- 畫得出來，就跑得起來。
- 不用寫一行程式碼。
- 三分鐘內看到第一則回覆。
- 交給 AI 前，流程仍由你控制。
- 從 LINE Channel 到上線發布，一個工作台完成。

避免語句：

- 不要宣稱 AI 完全取代人。
- 不要使用過度浮誇的效率承諾。
- 不要用太多未解釋的工程縮寫堆砌首屏。
- 不要把產品描述成單純聊天玩具，應保持工具平台定位。

## 10. 資訊架構

Landing Page 的說服順序：

1. Nav：快速提供產品、編輯器、流程、方案與 FAQ 的錨點。
2. Hero：用一句話建立產品定位與主要利益。
3. Ticker：補充技術整合廣度。
4. Features：用 mosaic 展示主要能力。
5. Builder：把抽象功能具體化成真實工作台。
6. How：降低上線門檻，說明三步驟。
7. Stats：用效率與規模數據建立信任。
8. Pricing：提供免費入口與升級路徑。
9. FAQ：解除疑慮。
10. Final CTA：再次召喚免費開始。
11. Footer：補齊產品、資源、公司資訊。

CTA 優先順序：

- Primary：免費開始、開始建立你的 Bot。
- Secondary：先看編輯器長怎樣、看示範影片。
- Sales：聯絡我們。

## 11. 可存取性與落地注意事項

現有優點：

- HTML 使用 `lang="zh-Hant"`。
- 導覽、header、section、footer 語意清楚。
- 主色與背景對比普遍足夠。
- 大多數互動目標尺寸充足。
- 文字層級明確，手機斷點有處理。

建議補強：

- FAQ item 目前是 `div` click，建議改為 `button` 或加入 `role="button"`、`tabindex="0"`、`aria-expanded`、鍵盤 Enter/Space 支援。
- 所有 `.btn` 與 nav link 應加入明確 `:focus-visible` 樣式。
- 補上 `prefers-reduced-motion`，停用或縮短連續動畫。
- Ticker 為純展示內容，可加入 `aria-hidden="true"` 或提供靜態替代。
- Hero mockup 中的裝飾性 SVG、節點、貼紙若不影響理解，應避免被螢幕閱讀器重複朗讀。
- 若未來按鈕連到實際產品，`href="#"` 需替換為真實路由。
- Tweaks panel 中的 `heroLayout` 目前只存在於預設資料，未看到實際套用邏輯；若要保留，需補上行為或移除。

## 12. 設計延伸指南

後續新頁面應延續以下規範：

- 維持暖白底、深墨文字、紫色 AI/重點、黃綠少量高亮。
- 用產品 UI、流程節點、聊天氣泡、屬性面板、資料圖表作為主要視覺，不依賴通用 stock image。
- 卡片圓角以 14px 為上限，小元件使用 8px。
- 重要頁面標題使用大字、低行高、微負字距。
- 技術 meta 使用 Geist Mono。
- CTA 保持 pill 形狀與深墨主按鈕。
- 工作台、流程、AI 相關區塊可使用深色模式強化專業感。
- 新互動必須有狀態回饋：hover、active、focus、loading、empty、error。
- 新功能文案應先描述使用者能完成什麼，再補充底層技術。

## 13. Design Token 摘要

```css
:root {
  --bg: oklch(0.98 0.006 85);
  --bg-2: oklch(0.96 0.008 85);
  --ink: oklch(0.18 0.012 270);
  --ink-2: oklch(0.36 0.014 270);
  --ink-3: oklch(0.58 0.012 270);
  --line: oklch(0.88 0.008 270);
  --line-2: oklch(0.93 0.006 270);
  --accent: oklch(0.62 0.18 290);
  --accent-soft: oklch(0.92 0.06 290);
  --accent-ink: oklch(0.32 0.16 290);
  --hi: oklch(0.90 0.13 95);
  --hi-soft: oklch(0.95 0.08 95);
  --card: #ffffff;

  --f-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --f-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;

  --rad: 14px;
  --rad-sm: 8px;
  --max: 1240px;
  --pad-x: 56px;
}
```

## 14. 一句話 CIS 描述

BotCraft 的品牌識別是一套以深墨色、品牌紫、黃綠高亮與幾何聊天 Logo 組成的現代 SaaS 視覺系統。它用清楚的大字標題、等寬技術標籤、流程節點、聊天泡泡與深色工作台語彙，傳達「不用寫程式，也能把對話流程畫出來並上線」的產品承諾。整體風格應保持精準、乾淨、可信、友善，讓技術能力看得見，也讓非工程使用者願意開始操作。
