# LineBot-Web（統一版）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/Status-Active-green)

LineBot-Web 是一個現代化的 LINE Bot 管理平台，採用前後端分離架構與統一 API 設計，提供便捷的 Web 介面來建立、管理與分析 LINE Bot。

**技術棧（與專案實際配置一致）**
- 前端：Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3 + shadcn-ui（Radix UI）
- 後端：FastAPI（0.115.x）+ Python 3.11 + Uvicorn + SQLAlchemy 2 + Alembic
- 其他：PostgreSQL、Redis、MongoDB（選用）、MinIO、Groq（預設 AI 提供者）

**開發伺服器埠號**
- 前端（Vite 開發）：`8080`
- 後端（Uvicorn 開發）：`8000`
- Docker Compose（預覽/部署）：前端 `3000`、後端 `8001`（對外）→ 容器內後端埠 `8005`

## 專案介紹

LineBot-Web 的目標是「讓團隊與個人快速打造、管理與營運 LINE 官方帳號的聊天機器人」。

- 過去將登入、Bot 管理、設定、分析等拆為多個微服務，維運成本高、介面分散；本專案以 FastAPI 實作統一後端，前端採一致的 UI/UX，降低學習與操作成本。
- 透過視覺化工具（Bot 編輯器、Flex 訊息設計）與內建 API，縮短從概念到上線的時間。
- 內建快取、背景任務與監控端點，提升效能並方便問題追蹤。

適用對象
- 想要快速建立與維護 LINE Bot 的開發者與小型團隊
- 希望具備「低門檻上手」與「可擴充後端能力」的產品團隊
- 既有老專案希望整合為單一 API 的維運人員

常見使用情境
- 建立多個 Bot 並管理其頻道密鑰、Webhook、回覆內容與素材
- 使用 Flex 設計器快速製作行銷訊息或卡片式 UI
- 透過使用者清單與對話記錄（選用 MongoDB）進行客服/營運分析
- 以批次操作與背景任務處理大量訊息或資料整理

典型工作流程
1) 管理者於前端註冊/登入 → 於「Bot 管理」建立 Bot 並填入 LINE Channel 設定
2) 設定 Webhook Domain（部署時）並將 LINE 後台的 Webhook 指向後端 `/api/v1/webhooks/{bot_id}`
3) 使用「視覺化 Bot 編輯器 / Flex 設計器」建立內容與回覆邏輯
4) 前端以 `VITE_UNIFIED_API_URL` 串接後端 → 開發/預覽/部署
5) 使用儀表板與效能端點監控（如 `/api/v1/performance/stats`）

## 功能特色

- 統一 API 架構（`/api/v1`）：認證、用戶、Bot 管理、Webhook、WebSocket、儀表板、批次、MinIO 測試等
- 支援 LINE Login 與一般帳密登入
- 媒體/檔案服務整合 MinIO，並提供 `/media` 靜態服務
- 效能優化與背景任務：快取、多層快取統計、效能報告 `/api/v1/performance/*`
- 跨域安全：允許清單 + 正則自動允許 localhost 與子網域

## 圖表

- 系統架構圖：linebot-web/docs/diagrams/system-architecture.md
- 系統流程圖：linebot-web/docs/diagrams/system-flows.md
- 使用案例圖：linebot-web/docs/diagrams/use-cases.md

## 專案結構

```
linebot-web/
├── backend/                 # FastAPI 後端（主程式於 app/main.py）
├── frontend/                # Vite + React 前端
├── assets/                  # 共用靜態資源（前端開發期由中介層提供）
├── tests/
│   └── integration/         # 跨服務整合測試
├── scripts/                 # 部署/檢查腳本
├── docker-compose.yml       # Docker 服務編排（前端/後端）
├── Makefile                 # 常用開發/建置指令
└── docs/                    # 文件（內含部署指南等）
```

## 快速開始（本機開發）

需求：Python 3.11、Node.js 18、PostgreSQL/Redis（如需）、可選 MongoDB/MinIO

1) 安裝依賴與環境初始化
```bash
make -C linebot-web install
make -C linebot-web dev-setup   # 會依 env.example 生成 backend/.env 與 frontend/.env.local
```

2) 啟動開發伺服器（兩個終端）
```bash
# 終端 A：後端 FastAPI（http://localhost:8000）
make -C linebot-web dev-backend

# 終端 B：前端 Vite（http://localhost:8080）
make -C linebot-web dev-frontend
```

3) 前端統一 API 設定（必要）
- 前端採用統一 API：在 `frontend/.env.local` 設定 `VITE_UNIFIED_API_URL=http://localhost:8000`
- 範本請見：`frontend/env.example`

## 環境變數

- 後端：請複製 `backend/env.example` 為 `backend/.env`，最少需設定資料庫與 JWT、LINE Login、Redis/MinIO（如需）。
- 前端：請複製 `frontend/env.example` 為 `frontend/.env.local`，建議僅設定 `VITE_UNIFIED_API_URL`；其餘舊式分散 API 變數僅保留向後相容（不建議使用）。

### 日誌（Logging）統一規範
- 後端使用 Python logging，統一格式：`%(asctime)s | %(levelname)s | %(name)s | %(message)s`
- 檔案輸出：`backend/logs/app.log`（DEBUG 以上），`backend/logs/error.log`（ERROR 以上，自動輪替）
- 透過環境變數控制等級：`LOG_LEVEL=DEBUG|INFO|WARNING|ERROR|CRITICAL`（預設 INFO）
- FastAPI 中介層統一記錄 `HTTP <METHOD> <PATH> -> <STATUS>`，詳細標頭在 DEBUG 等級
- FE（開發模式）已統一 console 輸出格式（見 `frontend/src/utils/setupLogging.ts`），生產建置已移除 console 呼叫
- SQL 查詢輸出預設關閉（避免噪音）；如需除錯可設定 `SQL_ECHO=True`，或將 `sqlalchemy.*` logger 調至 `INFO`

重點說明（統一 API）
- `VITE_UNIFIED_API_URL`：前端呼叫的統一後端 API 根路徑，例如：
  - 開發環境：`http://localhost:8000`
  - Docker Compose（容器間）：`http://backend:8005`

## Docker 與 Docker Compose

編排檔：`linebot-web/docker-compose.yml`

- 後端服務
  - 容器埠：`8005`
  - 對外映射：`8001:8005`（即對外 API 為 `http://localhost:8001`）
  - 掛載卷：`./backend/media:/app/media`、`./backend/logs:/app/logs`
- 前端服務
  - 使用 Vite 預覽伺服器，容器/對外埠：`3000:3000`
  - 構建時會透過 `ARG/ENV` 設定 `VITE_UNIFIED_API_URL` 等變數（預設為 `https://api.jkl921102.org`，請依需求改成內網位址）

常用指令
```bash
make -C linebot-web docker-build
make -C linebot-web docker-up
make -C linebot-web docker-down
```

啟動後端點
- 前端：`http://localhost:3000`
- 後端 API：`http://localhost:8001`
- 健康檢查：`http://localhost:8001/health`

提示
- 需本地互通時，建議將 `frontend/.env` 或 docker-compose build args 的 `VITE_UNIFIED_API_URL` 設為 `http://backend:8005`，使前端容器內可直接連到後端容器。

## Makefile 指令（專案根目錄）

- `install`：安裝後端與前端依賴
- `dev-setup`：建立 `backend/.env` 與 `frontend/.env.local`
- `dev-build`：前端開發建置（`npm run build:dev`）
- `prod-build`：前端生產建置（`npm run build`）
- `test`：執行後端 PyTest、前端 `npm test`、整合測試（前端測試需先配置）
- `format`：後端 Black+isort、前端 Prettier
- `lint`：後端 flake8+mypy、前端 ESLint
- `docker-build`：`docker-compose build`
- `docker-up`：`docker-compose up -d`
- `docker-down`：`docker-compose down`
- `dev-backend`：啟動後端（Uvicorn，埠 8000）
- `dev-frontend`：啟動前端（Vite，埠 8080）
- `clean`：清理前端 dist/ 與後端快取、移除 Docker 資源
- `migrate`：`alembic upgrade head`
- `migration`：`alembic revision --autogenerate -m "$(MSG)"`
- `deploy-staging` / `deploy-production`：呼叫 `scripts/deploy.sh`（依環境使用）

## API 與路由簡述

- 路由前綴：`/api/v1`
- 主要模組：`auth`、`users`、`bots`、`bot_dashboard`、`bot_analytics`、`ai_analysis`、`ai_knowledge`、`batch`、`webhook`、`websocket`、`storage_test`
- 文件：`/docs`（需在後端 `.env` 設定 `SHOW_DOCS=True`）
- 靜態：`/media`（後端自動掛載 `backend/media`）

## 測試與品質

- 全部測試：`make -C linebot-web test`
- 前端測試：需先設定 Vitest/Vite 環境與 `npm test` script（Makefile 已預留）
- Lint/Format：`make -C linebot-web lint`、`make -C linebot-web format`

## 注意事項

- 移除舊的 Lovable 相關說明，請以本文件與 `frontend/README.md`、`backend/README.md` 為準。
- 請勿提交任何機密憑證到版本庫（含 `.env`）。
- 若使用 Docker Compose，請檢查 `docker-compose.yml` 的 `build.args` 與 `env_file` 是否符合您的部署環境。

---

若需我幫忙執行 lint/測試或調整 docker-compose API 目標，告訴我一聲即可。
