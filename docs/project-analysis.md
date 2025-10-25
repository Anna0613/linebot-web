# LineBot-Web 專案分析報告

## 摘要
LineBot-Web 是一個以 FastAPI（後端）與 Vite + React + TypeScript（前端）打造的 LINE Bot 管理平台，提供視覺化 Bot 流程編輯、Rich Menu 與 Flex 訊息管理、AI 知識庫（RAG）與對話接管、即時儀表板與分析、Webhook 與 WebSocket 即時通訊等功能。後端整合 PostgreSQL、Redis、（選用）MongoDB 與 MinIO；AI 供應商預設整合 Groq（亦支援 Gemini）。

## 專案結構
- 根目錄：`linebot-web/`
  - `backend/`：FastAPI 應用及腳本、遷移、測試
  - `frontend/`：Vite + React + TS 前端程式碼、測試
  - `assets/`：共享圖片資源
  - `docs/`：文件（本檔）
  - `docker-compose.yml`：前後端服務組合
  - `scripts/`：部署、建置、優化工具腳本

## 技術棧與子系統
- 前端
  - Vite 5、React 18、TypeScript 5、Tailwind CSS、shadcn-ui、React Router、React Query、Zod
  - 主要區塊：頁面（`src/pages`）、通用元件與 UI（`src/components`）、服務層（`src/services`）、邏輯與工具（`src/utils`）、型別（`src/types`）
- 後端
  - FastAPI 0.115.x、Uvicorn、SQLAlchemy 2、Alembic、Pydantic v2
  - 資料儲存：PostgreSQL（核心資料）、Redis（快取/Session/排程）、MongoDB（選用-對話歷史）、MinIO（選用-媒體）
  - 主要區塊：API 路由（`app/api/api_v1`）、服務層（`app/services`）、Schema（`app/schemas`）、設定（`app/config`）、中介層與 utils
- AI 與 RAG
  - 支援 Groq（預設）與 Gemini；知識庫上傳/分塊/嵌入、向量檢索（pgvector）與對話接管

## 核心功能地圖
- Bot 管理：多 Bot、視覺化邏輯編排、Flex 訊息設計、Rich Menu 管理
- AI 能力：知識庫管理、RAG 檢索、AI 對話接管、對話分析
- 分析/監控：儀表板、對話記錄、效能/快取監控
- 訊息/事件：多類型訊息、廣播/多播、Webhook 事件處理、WebSocket 即時推送
- 安全/身份：帳密與 LINE Login、Email 驗證、JWT 授權

## 建置與執行
- 前端
  - 安裝：`cd linebot-web/frontend && pnpm install`
  - 開發：`pnpm dev`（預設 8080）
  - 打包：`pnpm build` 或 `pnpm build:prod`
- 後端
  - 進入：`cd linebot-web/backend`
  - 安裝：建立 venv 並 `pip install -r requirements.txt`
  - 遷移：`alembic upgrade head`
  - 開發：`python ./scripts/development/start.py`（預設 8000）
- Docker（根目錄）
  - `docker-compose build && docker-compose up -d`
  - 服務端點：前端 `http://localhost:3000`、API `http://localhost:8001`、健康檢查 `/health`、API Docs `/docs`（需 `SHOW_DOCS=True`）

> 備註：本倉庫未提供 `Makefile`，請依 README 的前後端指令與 `scripts/` 腳本操作。

## 測試現況
- 後端：`linebot-web/backend/tests/`（基本健康檢查等，測試數量偏少）
- 前端：`linebot-web/frontend/tests/`（`App.test.tsx` 與 `setup.ts`）
- 整合：`linebot-web/tests/integration/test_api_integration.py`

## 後端 API 概覽（節選）
- 路由前綴：`/api/v1`
- 模組：
  - `auth.py`（登入/註冊/LINE Login）
  - `webhook.py`（LINE 事件處理）
  - `websocket.py`（即時通訊）
  - `bots.py`、`bot_dashboard.py`、`bot_analytics.py`（Bot 管理/儀表板/分析）
  - `ai_knowledge.py`（AI 知識庫上傳/檢索/維護）
  - `rich_menu.py`（Rich Menu 管理）
- 服務層（節選）：
  - `conversation_service.py`、`line_bot_service.py`、`bot_service.py`
  - `rag_service.py`、`knowledge_processing_service.py`、`logic_engine_service.py`
  - `groq_service.py`、`embedding_manager.py`、`minio_service.py`、`cache_service.py`

## 前端功能模組（節選）
- 頁面：`BotManagementPage.tsx`、`BotUsersPage.tsx`、登入/設定等
- 編輯器/模擬器：`VisualBotEditor.tsx`、`Workspace.tsx`、`LineBotSimulator.tsx`、`EnhancedLineBotSimulator.tsx`
- AI/知識庫：`AIKnowledgeBaseManager.tsx`
- 服務層：`UnifiedApiClient.ts`、`UnifiedAuthManager.ts`、`visualEditorApi.ts`
- 工具：`EnhancedFlexMessageGenerator.ts`、`codeGenerator.ts` 等

## 大型檔案清單（單檔超過 500 行）
> 統計範圍：程式碼類型（py/ts/tsx/js/jsx/sh/sql/css/scss/html），排除 `node_modules`、`venv`、`__pycache__`、`dist`、`build`。

- 2435 行 — linebot-web/frontend/src/pages/BotManagementPage.tsx
- 1323 行 — linebot-web/backend/app/services/conversation_service.py
- 1119 行 — linebot-web/backend/app/services/line_bot_service.py
- 1064 行 — linebot-web/backend/app/services/bot_service.py
- 1001 行 — linebot-web/backend/app/api/api_v1/webhook.py
- 988 行 — linebot-web/frontend/src/components/users/ChatPanel.tsx
- 987 行 — linebot-web/backend/app/api/api_v1/bot_analytics.py
- 965 行 — linebot-web/frontend/src/home.css
- 950 行 — linebot-web/frontend/src/pages/BotUsersPage.tsx
- 910 行 — linebot-web/frontend/src/services/UnifiedApiClient.ts
- 887 行 — linebot-web/backend/app/api/api_v1/rich_menu.py
- 829 行 — linebot-web/frontend/src/components/visual-editor/EnhancedLineBotSimulator.tsx
- 789 行 — linebot-web/frontend/src/components/ai/AIKnowledgeBaseManager.tsx
- 782 行 — linebot-web/backend/app/api/api_v1/bot_dashboard.py
- 769 行 — linebot-web/backend/app/api/api_v1/ai_knowledge.py
- 762 行 — linebot-web/frontend/src/components/ui/sidebar.tsx
- 752 行 — linebot-web/backend/app/services/rag_service.py
- 718 行 — linebot-web/frontend/src/utils/EnhancedFlexMessageGenerator.ts
- 681 行 — linebot-web/frontend/src/utils/IntelligentValidationSystem.ts
- 678 行 — linebot-web/frontend/src/services/visualEditorApi.ts
- 643 行 — linebot-web/frontend/src/components/visual-editor/LineBotSimulator.tsx
- 608 行 — linebot-web/backend/app/services/groq_service.py
- 605 行 — linebot-web/frontend/src/components/visual-editor/Workspace.tsx
- 566 行 — linebot-web/frontend/src/constants/blockConstants.ts
- 558 行 — linebot-web/backend/app/services/knowledge_processing_service.py
- 557 行 — linebot-web/frontend/src/components/richmenu/RichMenuForm.tsx
- 549 行 — linebot-web/backend/app/services/logic_engine_service.py
- 531 行 — linebot-web/frontend/src/components/layout/DashboardNavbar.tsx
- 525 行 — linebot-web/frontend/src/utils/codeGenerator.ts
- 515 行 — linebot-web/backend/app/api/api_v1/bots.py
- 503 行 — linebot-web/backend/app/services/auth_service.py
- 502 行 — linebot-web/frontend/src/components/visual-editor/VisualBotEditor.tsx
- 501 行 — linebot-web/frontend/src/components/forms/BotCreationForm.tsx

## 維護與重構建議（聚焦於大型檔案）
- 前端
  - `BotManagementPage.tsx`（2435 行）：
    - 切分為容器元件（資料/狀態）與展示元件（UI），將各功能面板（列表、建立/編輯表單、統計區塊）拆分至 `/components/...` 子模組。
    - 將 API 呼叫、快取與同步邏輯抽離到 hooks（例如 `useBots`, `useBotActions`）。
  - `UnifiedApiClient.ts`、`ChatPanel.tsx`、編輯器/模擬器相關檔：
    - 依職責分層（請求攔截/錯誤處理/型別/具體 API 模組），減少單檔責任範圍。
    - 視覺化編輯器的 block/連線/驗證邏輯可拆分為多個專用 util 模組與獨立 hooks。
  - 大型 CSS（`home.css`、`dashboard.css`）：
    - 優先改為 Tailwind utilities 或分割為語義化的 CSS Modules，降低單檔複雜度。
- 後端
  - `webhook.py`、`conversation_service.py`、`line_bot_service.py`、`bot_service.py`：
    - 依事件類型/處理階段切分 router 與 service（例如 message/postback/follow 分檔），將共用驗證與轉換邏輯進入 `utils/`。
    - 將繁重流程（媒體處理、嵌入、廣播）轉至背景任務，縮小同步端點責任域。
  - `rag_service.py`、`knowledge_processing_service.py`：
    - 以管線（pipeline）模式拆分為：擷取 → 清理 → 分塊 → 嵌入 → 寫入，各步驟獨立測試。
  - API 路由檔（`ai_knowledge.py`、`bot_dashboard.py`、`rich_menu.py` 等）：
    - 以「資源為單位」聚合子 router，並將輸入/輸出 schema 與 service 邏輯限制在小型函式中，提升可讀性與測試性。

## 風險與注意事項
- 環境機密：請勿提交 `.env` 檔的敏感值；依 README 指示在本機複製 `env.example` 後再填寫。
- Docker 預設埠與環境：請依實際部署環境調整 `VITE_UNIFIED_API_URL`、`LINE_*`、DB/Redis 連線等變數。
- 測試覆蓋率：目前測試數量偏少，建議針對大型 service 與關鍵路由補齊單元與整合測試。

## 建議下一步
- 補齊單元/整合測試（webhook 事件、RAG 流程、可視化編輯器核心邏輯）。
- 拆分超大檔案並建立對應目錄結構與模組邊界。
- 前端效能：持續進行程式碼分割、虛擬清單/延遲載入；後端效能：快取策略與非同步背景任務最佳化。
- 撰寫或對齊 API 規格（OpenAPI Tag/Description）以利前端/第三方整合。

---
本報告由倉庫原始碼與專案 README 彙整而成；大型檔案清單以自動化行數統計產出，僅涵蓋程式類型檔案。

