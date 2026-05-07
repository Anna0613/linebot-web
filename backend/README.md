# BotCraft 後端

> FastAPI 統一 API 架構 - 現代化的 LINE Bot 管理平台後端服務

## 📋 目錄

- [專案特色](#專案特色)
- [技術架構](#技術架構)
- [核心功能](#核心功能)
- [快速開始](#快速開始)
- [API 文件](#api-文件)
- [開發指南](#開發指南)

## ✨ 專案特色

### 統一 API 架構
將原本分散的多個微服務（Login API、LINE Login API、Puzzle API、Setting API）整合為單一 FastAPI 應用：
- ✅ **降低維運複雜度**：從 4 個服務整合為 1 個統一服務
- ✅ **一致的路由設計**：統一使用 `/api/v1` 前綴
- ✅ **標準化回應格式**：簡化前端串接與錯誤處理
- ✅ **自動生成 API 文件**：OpenAPI/Swagger 文件自動更新

### 現代化技術棧
- **FastAPI 0.115.x**：高效能、自動驗證、異步支援
- **Python 3.11**：最新語言特性與效能優化
- **SQLAlchemy 2**：現代化 ORM，支援異步操作
- **Alembic**：資料庫版本控制與遷移管理

### 多資料源整合
- **PostgreSQL**：核心資料儲存（用戶、Bot、知識庫）
- **Redis**：快取、Session、背景任務佇列
- **MongoDB**：對話歷史記錄（選用）
- **MinIO**：媒體檔案儲存（選用）

### AI 智能功能
- **RAG 檢索增強生成**：基於向量資料庫的語意搜尋
- **多 AI 提供者支援**：Groq（預設）、Gemini（備選）
- **知識庫管理**：文件上傳、自動分塊、向量嵌入
- **智能對話接管**：可設定閾值自動切換 AI 回覆

### 效能與監控
- **多層快取策略**：Redis 快取提升回應速度
- **背景任務處理**：異步處理耗時操作
- **效能監控端點**：即時查看系統狀態與快取統計
- **健康檢查機制**：快速診斷服務狀態

## 🏗️ 技術架構

### 核心技術棧

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **Web 框架** | FastAPI | 0.115.x | API 服務框架 |
| **ASGI 伺服器** | Uvicorn | 0.34.x | 異步 HTTP 伺服器 |
| **ORM** | SQLAlchemy | 2.x | 資料庫 ORM |
| **資料庫遷移** | Alembic | - | 版本控制 |
| **資料驗證** | Pydantic | 2.x | 資料模型驗證 |
| **認證** | JWT | - | Token 認證 |
| **快取** | Redis | - | 快取與佇列 |
| **AI 嵌入** | Sentence Transformers | - | 向量嵌入 |

### 服務埠號

| 環境 | 埠號 | 說明 |
|------|------|------|
| **本機開發** | 8000 | Uvicorn 開發伺服器 |
| **Docker 容器內** | 8005 | 容器內部埠號 |
| **Docker 對外** | 8001 | 映射到主機的埠號 |

### 目錄結構

```
backend/
├── app/                        # 主應用程式
│   ├── api/                    # API 路由層
│   │   └── api_v1/            # v1 版本 API
│   │       ├── auth.py        # 認證路由
│   │       ├── users.py       # 用戶管理
│   │       ├── bots.py        # Bot 管理
│   │       ├── webhook.py     # Webhook 處理
│   │       ├── websocket.py   # WebSocket 即時通訊
│   │       ├── ai_knowledge.py # AI 知識庫
│   │       ├── ai_analysis.py  # AI 分析
│   │       ├── bot_analytics.py # Bot 分析
│   │       ├── bot_dashboard.py # 儀表板
│   │       ├── rich_menu.py    # Rich Menu
│   │       └── batch_operations.py # 批次操作
│   ├── models/                 # 資料模型層
│   │   ├── user.py            # 用戶模型
│   │   ├── bot.py             # Bot 相關模型
│   │   ├── knowledge.py       # 知識庫模型
│   │   ├── line_user.py       # LINE 用戶模型
│   │   └── mongodb/           # MongoDB 模型
│   ├── schemas/                # Pydantic Schemas
│   │   ├── auth.py            # 認證 Schema
│   │   ├── bot.py             # Bot Schema
│   │   ├── knowledge.py       # 知識庫 Schema
│   │   └── ...
│   ├── services/               # 業務邏輯層
│   │   ├── auth_service.py    # 認證服務
│   │   ├── bot_service.py     # Bot 服務
│   │   ├── line_bot_service.py # LINE Bot 服務
│   │   ├── conversation_service.py # 對話服務
│   │   ├── rag_service.py     # RAG 檢索服務
│   │   ├── embedding_service.py # 嵌入服務
│   │   ├── minio_service.py   # MinIO 服務
│   │   ├── cache_service.py   # 快取服務
│   │   └── logic_engine_service.py # 邏輯引擎
│   ├── utils/                  # 工具函式
│   ├── config.py              # 配置管理
│   ├── database.py            # 資料庫連接
│   └── main.py                # FastAPI 應用入口
├── migrations/                 # Alembic 遷移檔案
├── scripts/                    # 工具腳本
│   ├── development/           # 開發腳本
│   ├── database/              # 資料庫工具
│   └── data_processing/       # 資料處理
├── tests/                      # 測試檔案
├── logs/                       # 日誌檔案
├── media/                      # 媒體檔案
├── env.example                 # 環境變數範例
├── requirements.txt            # Python 依賴
├── pyproject.toml             # 專案配置
├── Dockerfile                 # Docker 映像檔
└── README.md                  # 本文件
```

## 🚀 核心功能

### 1. 認證與授權系統
- **多重登入方式**
  - 一般帳密登入（bcrypt 加密）
  - LINE Login OAuth 2.0
  - Email 驗證機制
- **JWT Token 認證**
  - Access Token（可設定滑動過期）
  - Refresh Token（記住我功能）
  - Cookie-based Session

### 2. Bot 管理系統
- **完整 CRUD 操作**
  - 建立、讀取、更新、刪除 Bot
  - Channel Token 驗證
  - Webhook URL 管理
- **視覺化編輯器**
  - 邏輯模板儲存與執行
  - 程式碼自動生成
  - 即時預覽與測試
- **Flex 訊息設計**
  - 可視化設計介面
  - JSON 匯出與驗證
  - 設計區塊儲存
- **Rich Menu 管理**
  - Rich Menu 建立與上傳
  - 區域設定與動作綁定
  - 啟用/停用管理

### 3. Webhook 事件處理
- **LINE 平台事件**
  - 訊息事件（文字、圖片、影片等）
  - Postback 事件
  - Follow/Unfollow 事件
- **邏輯引擎**
  - 條件匹配與執行
  - 多層邏輯流程
  - 變數與狀態管理
- **簽名驗證**
  - X-Line-Signature 驗證
  - 防止偽造請求

### 4. AI 知識庫系統
- **知識管理**
  - 文字/檔案上傳（PDF、DOCX、TXT）
  - 自動分塊（Recursive Chunking）
  - 向量嵌入（OpenAI text-embedding-3-small, 1536 維）
- **RAG 檢索**
  - 向量相似度搜尋（pgvector）
  - Top-K 檢索
  - 相似度閾值控制
- **AI 對話接管**
  - Groq API 整合（llama-3.1-70b-versatile）
  - 系統提示詞自訂
  - 對話歷史管理

### 5. 數據分析與監控
- **儀表板統計**
  - 訊息量統計
  - 活躍用戶數
  - 回應時間分析
  - 成功率追蹤
- **對話記錄**
  - MongoDB 儲存
  - 時間範圍查詢
  - 用戶互動分析
- **效能監控**
  - 系統資源使用
  - 快取命中率
  - 資料庫連線池狀態
  - 背景任務狀態

### 6. 訊息管理
- **推送訊息**
  - 單一用戶推送
  - 多播訊息（Multicast）
  - 廣播訊息（Broadcast）
- **訊息類型**
  - 文字訊息（支援長訊息自動分割）
  - 圖片、影片、音訊
  - Flex 訊息
  - Template 訊息

### 7. 批次操作
- **背景任務**
  - 異步處理耗時操作
  - 任務佇列管理
  - 進度追蹤
- **批次處理**
  - 大量訊息發送
  - 資料匯入/匯出
  - 知識庫批次上傳

## 🚀 快速開始

### 環境需求
- Python 3.11+
- PostgreSQL 12+
- Redis 6+
- MongoDB 4+ (選用)
- MinIO (選用)

### 安裝步驟

1. **進入後端目錄**
   ```powershell
   cd botcraft/backend
   ```

2. **建立虛擬環境**
   ```powershell
   python -m venv venv
   ```

3. **啟動虛擬環境**
   ```powershell
   venv\Scripts\activate
   ```

4. **安裝依賴**
   ```powershell
   pip install -r requirements.txt
   ```

5. **設定環境變數**
   ```powershell
   Copy-Item env.example .env
   # 使用編輯器編輯 .env 設定必要參數
   ```

6. **執行資料庫遷移**
   ```powershell
   alembic upgrade head
   ```

7. **啟動開發伺服器**
   ```powershell
   python .\scripts\development\start.py
   ```

   後端將在 `http://localhost:8000` 啟動。

8. **訪問 API 文件**
   - 設定 `.env` 中 `SHOW_DOCS=True`
   - 訪問 `http://localhost:8000/docs`

### 環境變數配置

詳細的環境變數說明請參考 `env.example`，以下是關鍵配置：

**基本設定**
```ini
DEBUG=False
ENVIRONMENT=development
SHOW_DOCS=True
LOG_LEVEL=INFO
```

**資料庫設定**
```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linebot_db
DB_USER=postgres
DB_PASSWORD=your_password
```

**JWT 設定**
```ini
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=180
```

**LINE 設定**
```ini
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_REDIRECT_URI=http://localhost:8000/api/v1/auth/line/callback
```

**AI 設定**
```ini
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

完整的環境變數列表請參考 [主 README](../README.md#外部服務設定)。

### Docker 部署

**單獨建置後端容器**
```powershell
# 建置映像檔
docker build -t botcraft-backend .

# 啟動容器
docker run --env-file .env -p 8001:8005 botcraft-backend
```

**使用 Docker Compose（推薦）**

詳細的 Docker 部署說明請參考 [主 README - Docker 部署章節](../README.md#docker-部署)。

```powershell
# 回到專案根目錄
cd ..

# 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f backend
```

## 📚 API 文件

### API 路由架構

所有 API 路由使用統一前綴 `/api/v1`：

| 路由 | 說明 | 主要端點 |
|------|------|----------|
| `/api/v1/auth` | 認證相關 | 登入、註冊、LINE Login |
| `/api/v1/users` | 用戶管理 | 個人資料、設定 |
| `/api/v1/bots` | Bot 管理 | CRUD、設定、測試 |
| `/api/v1/bots/{id}/knowledge` | AI 知識庫 | 上傳、查詢、管理 |
| `/api/v1/bots/{id}/ai` | AI 分析 | 對話分析、AI 查詢 |
| `/api/v1/bots/{id}/analytics` | Bot 分析 | 統計、報表 |
| `/api/v1/bot_dashboard` | 儀表板 | 綜合數據 |
| `/api/v1/webhooks/{bot_id}` | Webhook | LINE 事件接收 |
| `/api/v1/ws` | WebSocket | 即時通訊 |
| `/api/v1/batch` | 批次操作 | 批次處理 |

### 核心端點

**健康檢查**
```http
GET /health
```

**API 文件**
```http
GET /docs          # Swagger UI
GET /redoc         # ReDoc
GET /openapi.json  # OpenAPI Schema
```

**效能監控**
```http
GET /api/v1/performance/stats        # 效能統計
POST /api/v1/performance/cache/clear # 清除快取
```

**靜態檔案**
```http
GET /media/{file_path}  # 媒體檔案存取
```

### 認證方式

API 使用 JWT Token 認證，有兩種方式：

1. **Cookie 方式**（推薦）
   - 登入後自動設定 Cookie
   - 前端無需手動處理 Token

2. **Authorization Header**
   ```http
   Authorization: Bearer <your_jwt_token>
   ```

## 🛠️ 開發指南

### 新增 API 端點

1. **定義 Schema** (`app/schemas/`)
   ```python
   from pydantic import BaseModel

   class ItemCreate(BaseModel):
       name: str
       description: str | None = None

   class ItemResponse(BaseModel):
       id: str
       name: str
       description: str | None
       created_at: datetime
   ```

2. **實作 Service** (`app/services/`)
   ```python
   class ItemService:
       @staticmethod
       async def create_item(db: AsyncSession, data: ItemCreate):
           item = Item(**data.model_dump())
           db.add(item)
           await db.commit()
           await db.refresh(item)
           return item
   ```

3. **建立 Router** (`app/api/api_v1/`)
   ```python
   from fastapi import APIRouter, Depends

   router = APIRouter()

   @router.post("/items", response_model=ItemResponse)
   async def create_item(
       data: ItemCreate,
       db: AsyncSession = Depends(get_async_db),
       current_user: User = Depends(get_current_user_async)
   ):
       return await ItemService.create_item(db, data)
   ```

4. **註冊 Router** (`app/api/api_v1/api.py`)
   ```python
   from app.api.api_v1 import items

   api_router.include_router(items.router, prefix="/items", tags=["Items"])
   ```

### 資料庫遷移

**建立新遷移**
```powershell
cd backend
alembic revision --autogenerate -m "描述變更內容"
```

**執行遷移**
```powershell
alembic upgrade head
```

**回滾遷移**
```powershell
alembic downgrade -1
```

### 測試

**執行測試**
```powershell
pytest
```

**測試覆蓋率**
```powershell
pytest --cov=app --cov-report=html
```

### 程式碼品質

**Lint 檢查**
```powershell
flake8 .
mypy .
```

**格式化**
```powershell
black .
isort .
```

## 📖 相關文件

- [系統架構圖](../docs/diagrams/system-architecture.md)
- [系統流程圖](../docs/diagrams/system-flows.md)
- [使用案例圖](../docs/diagrams/use-cases.md)
- [主 README](../README.md)
- [前端 README](../frontend/README.md)

## 🔧 常見問題

**Q: 如何啟用 API 文件？**
A: 在 `.env` 中設定 `SHOW_DOCS=True`，然後訪問 `/docs`

**Q: 如何清除快取？**
A: 訪問 `POST /api/v1/performance/cache/clear`

**Q: 資料庫連線失敗怎麼辦？**
A: 檢查 `.env` 中的資料庫設定，確保 PostgreSQL 服務正在運行

**Q: Webhook 簽名驗證失敗？**
A: 確認 Bot 的 Channel Secret 設定正確

**Q: AI 回覆不準確？**
A: 調整 `ai_threshold` 和 `ai_top_k` 參數，或增加更多知識庫內容

---

*本文件由 BotCraft 專案團隊維護*
*最後更新: 2025-10-24*
