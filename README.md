# BotCraft 管理平台

[![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](#-授權)
![Status](https://img.shields.io/badge/Status-Active-green)

BotCraft 是一個現代化的 LINE Bot 管理平台，採用前後端分離架構，提供完整的 Web 介面來建立、管理與分析 LINE Bot。

## 📋 目錄

- [專案特色功能](#-專案特色功能)
- [技術架構](#️-技術架構)
- [快速開始](#-快速開始)
- [外部服務設定](#-外部服務設定)
- [Docker 部署](#-docker-部署)
- [開發指南](#️-開發指南)
- [授權](#-授權)

## ✨ 專案特色功能

### 🤖 Bot 管理
- **多 Bot 管理**：支援建立、編輯、刪除多個 LINE Bot
- **視覺化編輯器**：以積木方式編排回覆邏輯與流程，無需撰寫程式碼
- **Flex 訊息設計**：可視化配置與即時預覽，快速製作精美的卡片式訊息
- **Rich Menu 管理**：圖形化設定 LINE Bot 的圖文選單

### 🧠 AI 智能功能
- **AI 知識庫**：支援文字、批次匯入等多種方式建立知識庫
- **AI 接管對話**：整合 Groq/Gemini AI，提供智能客服回覆
- **RAG 檢索增強**：基於向量資料庫的語意搜尋，提升回覆準確度
- **對話分析**：使用 AI 分析使用者對話歷史，提供營運決策參考

### 📊 分析與監控
- **即時儀表板**：概覽 Bot 活動、使用者互動統計
- **對話記錄**：完整保存使用者對話歷史（MongoDB）
- **效能監控**：內建快取統計、效能報告端點
- **批次操作**：支援大量訊息發送與資料處理

### 💬 訊息功能
- **多種訊息類型**：文字、圖片、影片、音訊、Flex 訊息等
- **廣播訊息**：支援全體或指定用戶群發訊息
- **Webhook 處理**：自動處理 LINE 平台的各種事件
- **WebSocket 即時通訊**：支援即時訊息推送

### 🔐 使用者管理
- **多重登入方式**：支援 LINE Login 與一般帳密登入
- **Email 驗證**：確保帳號安全性
- **權限管理**：基於 JWT 的身份驗證與授權

## 🏗️ 技術架構

### 前端技術棧
- **框架**：Vite 5 + React 18 + TypeScript 5
- **樣式**：Tailwind CSS 3 + shadcn-ui（基於 Radix UI）
- **開發埠號**：8080

### 後端技術棧
- **框架**：FastAPI 0.115.x + Python 3.11
- **伺服器**：Uvicorn
- **ORM**：SQLAlchemy 2 + Alembic
- **開發埠號**：8000

### 資料儲存
- **PostgreSQL**：主要資料庫（Bot、使用者、知識庫等）
- **MongoDB**：對話歷史記錄（選用）
- **Redis**：快取與 Session 管理
- **MinIO**：媒體檔案儲存

### AI 服務
- **Groq**：預設 AI 提供者（推薦）
- **Gemini**：備選 AI 提供者

## 🚀 快速開始

### 環境需求
- Python 3.11+
- Node.js 18+
- pnpm（前端套件管理）
- PostgreSQL（必要）
- Redis（必要）
- MongoDB（選用，用於對話記錄）
- MinIO（選用，用於媒體儲存）

### 前端啟動

```bash
cd botcraft/frontend
pnpm install
pnpm dev
```

前端將在 `http://localhost:8080` 啟動。

### 後端啟動

```bash
cd botcraft/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python .\scripts\development\start.py
```

後端將在 `http://localhost:8000` 啟動。

### 環境變數設定

**前端環境變數**（`frontend/.env.local`）：
```powershell
# 複製範例檔案
Copy-Item frontend\env.example frontend\.env.local

# 主要設定
VITE_UNIFIED_API_URL=http://localhost:8000
```

**後端環境變數**（`backend/.env`）：
```powershell
# 複製範例檔案
Copy-Item backend\env.example backend\.env

# 必要設定請參考「外部服務設定」章節
```

> 💡 **提示**：詳細的環境變數說明請參考 `backend/env.example` 和 `frontend/env.example`

## 🔌 外部服務設定

### LINE Messaging API

1. **申請 LINE 官方帳號**
   - 前往 [LINE Developers Console](https://developers.line.biz/console/)
   - 建立 Provider 和 Messaging API Channel

2. **取得憑證**
   - Channel ID
   - Channel Secret
   - Channel Access Token

3. **設定環境變數**（編輯 `backend/.env`）
   ```ini
   LINE_CHANNEL_ID=your_line_channel_id
   LINE_CHANNEL_SECRET=your_line_channel_secret
   LINE_REDIRECT_URI=http://localhost:8000/api/v1/auth/line/callback
   ```

4. **設定 Webhook**
   - 在 LINE Developers Console 設定 Webhook URL：
   - `https://your-domain.com/api/v1/webhooks/{bot_id}`

### PostgreSQL 資料庫

編輯 `backend/.env`：

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

### Redis

編輯 `backend/.env`：

```ini
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379/0
```

### MongoDB（選用）

用於儲存對話歷史記錄。編輯 `backend/.env`：

```ini
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USERNAME=
MONGODB_PASSWORD=
MONGODB_DATABASE=botcraft_conversations
MONGODB_AUTH_DATABASE=admin
MONGODB_SSL=False
```

### MinIO（選用）

用於儲存媒體檔案。編輯 `backend/.env`：

```ini
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=False
MINIO_REGION=us-east-1
MINIO_BUCKET_NAME=message-store
MINIO_PUBLIC_URL=http://localhost:9000
```

### AI 服務

**Groq（推薦）**

1. 前往 [Groq Console](https://console.groq.com/keys) 取得 API Key
2. 編輯 `backend/.env` 設定環境變數：
   ```ini
   AI_PROVIDER=groq
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

**Gemini（備選）**

1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 取得 API Key
2. 編輯 `backend/.env` 設定環境變數：
   ```ini
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```

### JWT 與安全設定

編輯 `backend/.env`：

```ini
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=180
SECRET_KEY=your-secret-key-here
```

## 🐳 Docker 部署

### 使用 Docker Compose 部署

1. **準備環境變數**
   ```powershell
   # 確保已設定 backend/.env 和 frontend/.env
   cd botcraft
   Copy-Item backend\env.example backend\.env
   Copy-Item frontend\env.example frontend\.env

   # 使用文字編輯器編輯環境變數，設定生產環境的值
   notepad backend\.env
   notepad frontend\.env
   ```

2. **建置映像檔**
   ```powershell
   cd botcraft
   docker-compose build
   ```

3. **啟動服務**
   ```powershell
   docker-compose up -d
   ```

4. **檢查服務狀態**
   ```powershell
   docker-compose ps
   docker-compose logs -f
   ```

### 服務端點

- **前端**：`http://localhost:3000`
- **後端 API**：`http://localhost:8001`
- **健康檢查**：`http://localhost:8001/health`
- **API 文件**：`http://localhost:8001/docs`（需設定 `SHOW_DOCS=True`）

### Docker Compose 架構

```yaml
services:
  backend:
    ports: "8001:8005"  # 對外:容器內
    volumes:
      - ./backend/media:/app/media
      - ./backend/logs:/app/logs

  frontend:
    ports: "3000:3000"
    depends_on:
      - backend
```

### 生產環境注意事項

1. **環境變數**
   - 修改 `docker-compose.yml` 中的 `VITE_UNIFIED_API_URL` 為實際的 API 網址
   - 確保所有敏感資訊（API Key、密碼等）已正確設定

2. **資料庫**
   - 建議使用外部 PostgreSQL 服務（如 AWS RDS、Google Cloud SQL）
   - 設定定期備份機制

3. **反向代理**
   - 建議使用 Nginx 或 Caddy 作為反向代理
   - 設定 SSL/TLS 憑證（Let's Encrypt）

4. **日誌管理**
   - 後端日誌位於 `backend/logs/`
   - 建議設定日誌輪替與集中管理

5. **效能優化**
   - 調整資料庫連線池大小（`POOL_SIZE`、`POOL_MAX_OVERFLOW`）
   - 啟用 Redis 快取
   - 設定適當的 `LOG_LEVEL`（建議 `INFO` 或 `WARNING`）

6. **安全性**
   - 定期更新依賴套件
   - 設定防火牆規則
   - 啟用 CORS 白名單（`EXTRA_ALLOWED_ORIGINS`）

## 🛠️ 開發指南

### 專案結構

```
botcraft/
├── backend/              # FastAPI 後端
│   ├── app/             # 主要應用程式
│   │   ├── api/         # API 路由
│   │   ├── models/      # 資料模型
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # 業務邏輯
│   │   └── utils/       # 工具函式
│   ├── migrations/      # Alembic 資料庫遷移
│   ├── tests/           # 後端測試
│   └── scripts/         # 開發腳本
├── frontend/            # React 前端
│   ├── src/            # 前端程式碼
│   │   ├── components/ # React 元件
│   │   ├── pages/      # 頁面元件
│   │   ├── services/   # API 服務
│   │   └── utils/      # 工具函式
│   └── tests/          # 前端測試
├── assets/             # 共用靜態資源
├── scripts/            # 部署腳本
└── tests/integration/  # 整合測試
```

### 常用開發指令

#### 安裝依賴

```powershell
# 後端依賴
cd botcraft/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 前端依賴
cd botcraft/frontend
pnpm install
```

#### 環境初始化

```powershell
# 複製環境變數範例檔案
cd botcraft

# 後端環境變數
Copy-Item backend\env.example backend\.env
# 編輯 backend\.env 設定配置

# 前端環境變數
Copy-Item frontend\env.example frontend\.env.local
# 編輯 frontend\.env.local 設定配置
```

#### 啟動開發伺服器

```powershell
# 後端（在第一個終端）
cd botcraft/backend
venv\Scripts\activate
python .\scripts\development\start.py

# 前端（在第二個終端）
cd botcraft/frontend
pnpm dev
```

#### 測試

```powershell
# 後端測試
cd botcraft/backend
venv\Scripts\activate
pytest

# 前端測試
cd botcraft/frontend
pnpm test

# 整合測試
cd botcraft/tests/integration
pytest
```

#### 程式碼檢查與格式化

```powershell
# 後端 Lint
cd botcraft/backend
venv\Scripts\activate
flake8 .
mypy .

# 後端格式化
black .
isort .

# 前端 Lint
cd botcraft/frontend
pnpm lint

# 前端格式化
pnpm format
```

#### 資料庫遷移

```powershell
# 執行遷移
cd botcraft/backend
venv\Scripts\activate
alembic upgrade head

# 建立新遷移
alembic revision --autogenerate -m "描述"
```

#### Docker 操作

```powershell
# 建置映像檔
cd botcraft
docker-compose build

# 啟動容器
docker-compose up -d

# 停止容器
docker-compose down

# 查看容器狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

#### 清理

```powershell
# 清理前端建置檔案
cd botcraft/frontend
Remove-Item -Recurse -Force dist, node_modules\.vite

# 清理後端快取
cd botcraft/backend
Remove-Item -Recurse -Force __pycache__, .pytest_cache, .mypy_cache

# 清理 Docker 資源
docker-compose down -v
docker system prune -f
```

### API 路由架構

所有 API 路由前綴為 `/api/v1`：

- **認證**：`/api/v1/auth/*`
- **使用者管理**：`/api/v1/users/*`
- **Bot 管理**：`/api/v1/bots/*`
- **AI 知識庫**：`/api/v1/bots/{bot_id}/knowledge/*`
- **AI 分析**：`/api/v1/bots/{bot_id}/ai/*`
- **Bot 分析**：`/api/v1/bots/{bot_id}/analytics/*`
- **Webhook**：`/api/v1/webhooks/{bot_id}`
- **WebSocket**：`/api/v1/ws`
- **批次操作**：`/api/v1/batch/*`

### 測試

```powershell
# 後端測試（pytest）
cd botcraft/backend
venv\Scripts\activate
pytest

# 前端測試
cd botcraft/frontend
pnpm test

# 整合測試
cd botcraft/tests/integration
pytest
```

### 程式碼風格

- **Python**：Black (88 字元)、isort、flake8、mypy
- **TypeScript/React**：Prettier + ESLint、2 空格縮排

## 📚 相關文件

- [前端 README](frontend/README.md)
- [後端 README](backend/README.md)
- [系統架構圖](docs/diagrams/system-architecture.md)
- [系統流程圖](docs/diagrams/system-flows.md)
- [使用案例圖](docs/diagrams/use-cases.md)

## ⚠️ 注意事項

- 請勿將 `.env` 檔案提交到版本控制系統
- 生產環境請使用強密碼與安全的 JWT Secret
- 定期更新依賴套件以修補安全漏洞
- 建議使用 HTTPS 進行生產環境部署

## 📄 授權

本專案採用 All Rights Reserved 的閉源授權條款。未經著作權人事先書面授權，不得使用、複製、修改、發布、散布、再授權或銷售本系統與相關文件。

聯絡授權方式：
email:jkl921102@gmail.com
name:JerryLin
