# LineBot-Web 後端（FastAPI 統一 API）

本文件說明後端服務之技術棧、環境設定、埠號、啟動方式與常用操作，已與當前專案配置同步。

## 專案介紹（後端）

此後端負責整合登入、用戶、Bot 管理、Webhook、分析與檔案服務等能力為單一統一 API：
- 將原本多個微服務（Login、LINE Login、Puzzle/Bot、Setting）整合為單一 FastAPI 應用，降低維運複雜度
- 提供一致的路由前綴 `/api/v1` 與回應格式，簡化前端串接
- 內建背景任務、快取、效能端點，提升穩定性與可觀測性
- 支援 MinIO（媒體檔案）、MongoDB（對話記錄，可選）、Redis（快取/任務佇列等）

## 技術棧與版本

- Python 3.11（見 `pyproject.toml` → `requires-python >=3.11`）
- FastAPI 0.115.x、Uvicorn 0.34.x
- SQLAlchemy 2、Alembic、psycopg2/asyncpg（PostgreSQL）
- Redis、MongoDB（選用，透過 Motor/Beanie）、MinIO
- AI：預設 Groq（`llama-3.1-70b-versatile`），亦相容 Gemini

## 埠號與服務

- 本機開發：Uvicorn 於 `http://localhost:8000`
- Docker 容器：後端對內埠 `8005`
- Docker Compose 對外：`8001:8005`（即 API `http://localhost:8001`）

## 目錄結構（摘要）

```
backend/
├── app/
│   ├── api/                # /api/v1 路由（auth/users/bots/...）
│   ├── config.py           # 設定（環境變數讀取、CORS、API 前綴等）
│   ├── main.py             # FastAPI 入口（Lifespan、掛載 /media、全域例外處理）
│   ├── services/           # 業務服務（背景任務、MinIO、快取等）
│   ├── schemas/, models/   # Pydantic 與 ORM 模型
│   └── ...
├── env.example             # 推薦的 .env 範本
├── Dockerfile              # 容器（EXPOSE 8005）
├── requirements.txt        # 依賴（對齊 Docker 安裝）
└── pyproject.toml          # 開發工具與測試設定
```

## 環境變數設定

請複製 `env.example` 為 `.env`，依環境調整。重點變數：

- 基本：`DEBUG`、`ENVIRONMENT`、`SHOW_DOCS`（是否開啟 `/docs`）
- 資料庫：`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`（自動組出 `DATABASE_URL`）
- JWT：`JWT_SECRET`、`JWT_ALGORITHM`、`JWT_EXPIRE_MINUTES`、`JWT_REMEMBER_EXPIRE_MINUTES`
- LINE Login：`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINE_REDIRECT_URI`
  - 開發建議：`http://localhost:8000/api/v1/auth/line/callback`
- CORS/前端：`FRONTEND_URL`、`EXTRA_ALLOWED_ORIGINS`（逗號分隔）、`ALLOWED_ORIGIN_REGEX`
- Redis：`REDIS_HOST`、`REDIS_PORT`、`REDIS_DB`、`REDIS_PASSWORD`、`REDIS_URL`
- MinIO：`MINIO_ENDPOINT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_SECURE`、`MINIO_BUCKET_NAME`、`MINIO_PUBLIC_URL`
- MongoDB（選用）：`MONGODB_HOST`、`MONGODB_PORT`、`MONGODB_USERNAME`、`MONGODB_PASSWORD`、`MONGODB_DATABASE`、`MONGODB_SSL`
- AI：`AI_PROVIDER`（`groq`/`gemini`）、`GROQ_API_KEY`、`GROQ_MODEL`、`GEMINI_API_KEY`、`GEMINI_MODEL`、`AI_MAX_HISTORY_MESSAGES`

提示：專案預設 `ALLOWED_ORIGINS` 已包含常見本機埠（8080、3000、5173），並提供正則相容子網域；額外網域可用 `EXTRA_ALLOWED_ORIGINS` 補充。

## 圖表

- 系統架構圖：linebot-web/docs/diagrams/system-architecture.md
- 系統流程圖（登入/Webhook）：linebot-web/docs/diagrams/system-flows.md
- 使用案例圖：linebot-web/docs/diagrams/use-cases.md

## 使用流程（後端視角）

1) 準備 `backend/.env`（可由 `env.example` 複製），設定 DB、JWT、LINE、Redis/MinIO 等
2) 開發環境啟動：`make -C .. dev-backend`（Uvicorn 於 8000）
3) 部署時使用 Docker：容器內埠 8005，Compose 對外映射 8001，前端以 `VITE_UNIFIED_API_URL` 指向對外 API
4) 設定 LINE 後台 Webhook，指向 `http(s)://<你的域名或 IP>/api/v1/webhooks/{bot_id}`
5) 透過效能端點與日誌監控健康狀態與背景任務

## 啟動方式（本機）

使用 Makefile（建議與前端協同啟動）：
```bash
make -C ../ dev-backend   # 於 linebot-web 根目錄執行亦可
```

或直接使用 Uvicorn：
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

單獨建置後端映像並啟動：
```bash
docker build -t linebot-web-backend ./backend
docker run --env-file ./backend/.env -p 8001:8005 linebot-web-backend
# 之後 API 可透過 http://localhost:8001 存取
```

透過 Docker Compose（建議搭配前端共同運作）：
```bash
make -C .. docker-build
make -C .. docker-up
# 前端 http://localhost:3000 、後端 http://localhost:8001
```

## API 與文件

- 路徑前綴：`/api/v1`
- 模組：`auth`、`users`、`bots`、`bot_dashboard`、`bot_analytics`、`ai_analysis`、`ai_knowledge`、`batch_operations`、`webhook`、`websocket`、`storage_test`
- 健康檢查：`GET /health`
- 效能端點：`GET /api/v1/performance/stats`、`GET /api/v1/performance/cache/clear`
- 靜態檔案：`/media`
- 文件：`/docs`（需 `SHOW_DOCS=True`）

## 資料庫遷移（Alembic）

- 升級至最新：`make -C .. migrate`
- 產生新遷移：`make -C .. migration MSG="你的描述"`
- 手動：`alembic revision --autogenerate -m "描述" && alembic upgrade head`

## 開發指引

新增路由一般步驟：
1) 於 `schemas/` 定義 Pydantic 模型
2) 於 `services/` 實作商業邏輯
3) 於 `api/api_v1/` 新增 router 並在 `api.py` 註冊

## 除錯與監控

- `GET /health`：快速檢查服務狀態
- 啟用 `SHOW_DOCS=True` 後可於 `/docs` 瀏覽 Swagger
- 啟動時序、快取與背景任務狀態可參考 `/api/v1/performance/stats`

（本文件已移除舊版或不相干資訊，並對齊當前專案設定，包括埠號、AI 設定與 Docker 行為。）
