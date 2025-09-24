# LineBot-Web 前端（Vite + React + TS）

本文件說明前端專案的技術棧、環境變數、開發/建置/部署方式與常用腳本。

## 專案介紹（前端）

此前端提供完整的管理介面，協助非工程背景的營運/行銷人員也能輕鬆管理 LINE Bot：
- 儀表板：概覽 Bot 與近期活動
- Bot 管理：建立、編輯、刪除 Bot，設定頻道金鑰、Webhook 相關資訊
- 視覺化 Bot 編輯器：以積木方式編排回覆邏輯與流程
- Flex 訊息設計：可視化配置與即時預覽，產生對應 JSON
- 使用者/對話：檢視特定 Bot 的使用者清單與互動（配合後端 MongoDB）
- 帳號與設定：登入、註冊、Email 驗證與偏好設定等

## 技術棧與版本

- Vite 5（`vite`）
- React 18（`react`, `react-dom`）
- TypeScript 5（`typescript`）
- Tailwind CSS 3（`tailwindcss` + `@tailwindcss/typography`）
- shadcn-ui（基於 Radix UI）
- Node.js 18（Docker 基底映像採用 `node:18-alpine`）

埠號配置
- 開發伺服器：`8080`（見 `vite.config.ts` → `server.port`）
- 預覽伺服器：`3000`（見 `vite.config.ts` → `preview.port`）

## 圖表

- 系統架構圖：linebot-web/docs/diagrams/system-architecture.md
- 系統流程圖（登入/Webhook）：linebot-web/docs/diagrams/system-flows.md
- 使用案例圖：linebot-web/docs/diagrams/use-cases.md

## 使用流程（前端視角）

1) 依 `env.example` 建立 `.env.local` 並設定 `VITE_UNIFIED_API_URL`
2) 啟動開發伺服器（`npm run dev`）並登入/註冊
3) 新增 Bot → 輸入 LINE Channel 設定 → 連動 Webhook（部署後）
4) 透過視覺化編輯器與 Flex 設計器製作回覆內容
5) 於儀表板檢視使用情況，必要時用 Lighthouse/分析腳本做效能檢視

## 目錄結構

```
frontend/
├── src/                 # 前端程式碼
├── public/              # 公開資源
├── tests/               # 測試（如使用 Vitest/RTL）
├── env.example          # 前端環境變數範例
├── .env / .env.local    # 實際環境變數（不提交版控）
├── vite.config.ts       # Vite 設定
├── tailwind.config.ts   # Tailwind 設定
├── Dockerfile           # 前端容器（預覽）
└── package.json         # 指令與依賴
```

## 環境變數（統一 API）

前端統一透過 `VITE_UNIFIED_API_URL` 呼叫後端 API。

1) 建立環境檔案
```bash
cp env.example .env.local
```

2) 設定對應環境
- 開發本機：`VITE_UNIFIED_API_URL=http://localhost:8000`
- Docker Compose（容器間）：`VITE_UNIFIED_API_URL=http://backend:8005`

向後相容（可選）
- 仍保留舊的分散式 API 變數（如 `VITE_LOGIN_API_URL` 等）以相容既有程式，但不建議新專案使用。

## 主要功能頁面（速覽）

- `DashboardPage.tsx`：儀表板總覽
- `BotManagementPage.tsx`：Bot 列表、建立/編輯/刪除
- `VisualBotEditorPage.tsx`：視覺化 Bot 編輯器
- `BotUsersPage.tsx`：Bot 使用者清單與互動紀錄
- `LoginPage.tsx`、`Register.tsx`、`LINELogin.tsx`：登入/註冊/LINE Login
- `Setting.tsx`：使用者與系統相關設定
- `HowToEstablish.tsx`、`About.tsx`：說明與介紹頁

## 常用指令（package.json）

- `npm run dev`：啟動 Vite 開發伺服器（埠 8080）
- `npm run build`：生產建置（並複製 `assets/`）
- `npm run build:dev`：開發建置（與 Makefile `dev-build` 對應）
- `npm run build:prod`：生產建置（與 Makefile `prod-build` 對應）
- `npm run preview`：啟動預覽伺服器（預設埠 3000）
- `npm run lint`：ESLint 檢查
- `npm run format`：Prettier 格式化 `src/` 與 `tests/`
- `npm run type-check`：TypeScript 型別檢查
- `npm run optimize-images`：最佳化影像（使用專案 `scripts/` 工具）
- `npm run analyze`：建置並輸出 bundle 分析
- `npm run lighthouse`：以 8080 埠對本機進行 Lighthouse 分析

對應 Makefile（專案根目錄）
- `make dev-frontend` 等同 `npm run dev`
- `make dev-build` 對應 `npm run build:dev`
- `make prod-build` 對應 `npm run build`

## 開發說明

- 啟動前請確認 `.env.local` 內 `VITE_UNIFIED_API_URL` 指向後端
- Path alias：以 `@` 指向 `src/`（見 `vite.config.ts`）
- `assets/` 由自訂 middleware 於開發時提供（見 `vite.config.ts` 插件 `assets-middleware`）
- PWA/manifest 在開發模式以 `manifest-middleware` 提供簡化版本

## Docker（前端容器）

- 基底：`node:18-alpine`
- 埠：對外 `3000`（容器內 `pnpm preview --port 3000`）
- 透過 build args / ENV 設定：`VITE_UNIFIED_API_URL`、`VITE_WEBHOOK_DOMAIN` 等
- 參考：`linebot-web/docker-compose.yml`

範例（僅前端容器）
```bash
docker build -t linebot-web-frontend ./frontend \
  --build-arg VITE_UNIFIED_API_URL=http://backend:8005
docker run -p 3000:3000 linebot-web-frontend
```

## 常見問題

- 連線被拒：請確認後端是否在 `8000`（本機）或 `8005`（Docker 容器）運作
- CORS 錯誤：請在後端 `.env` 設定 `EXTRA_ALLOWED_ORIGINS` 或調整 `ALLOWED_ORIGIN_REGEX`
- 靜態資源 404：開發模式由 middleware 提供 `/assets`，生產建置已由 `copy-assets.js` 處理

（已移除所有 Lovable 相關內容，以符合實際專案）
