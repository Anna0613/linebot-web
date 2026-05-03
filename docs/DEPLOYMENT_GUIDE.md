# LineBot-Web 伺服器部署指南

此指南說明如何在 `/mnt/user/appdata` 伺服器上部署 LineBot-Web 應用。

## 📋 前置要求

- Docker 和 Docker Compose 已安裝
- 服務器已配置 PostgreSQL、Redis 等（參考 `/mnt/user/appdata` 中的現有服務）
- 端口 8001（後端）和 3000（前端）可用

## 🚀 快速部署步驟

### 1. 環境配置

#### 後端環境設定 (.env)

編輯 `backend/.env` 檔案，需要配置以下重要項目：

```bash
# 資料庫連線
DB_HOST=postgresql15           # 使用現有的 PostgreSQL
DB_PORT=5432
DB_NAME=linebot_web
DB_USER=your_username
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=redis              # 或相應的 Redis 服務
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 密鑰設定
JWT_SECRET=your-random-secret-key-min-32-chars
FLASK_SECRET_KEY=your-flask-secret-key

# LINE Bot 設定
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_REDIRECT_URI=https://your-domain/api/v1/auth/line/callback

# 前端 URL
FRONTEND_URL=https://your-domain

# AI 設定（Groq 或 Gemini）
GROQ_API_KEY=your_groq_api_key
```

#### 前端環境設定 (.env)

編輯 `frontend/.env` 檔案：

```bash
VITE_UNIFIED_API_URL=https://api.your-domain
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_PORT=3000
VITE_ALLOWED_HOSTS=your-domain,localhost
VITE_PROXY_SECURE=true
VITE_PROXY_CHANGE_ORIGIN=true
```

### 2. 啟動容器

```bash
cd /mnt/user/appdata/linebot-web
docker-compose up -d
```

### 3. 驗證部署

```bash
# 檢查容器狀態
docker-compose ps

# 檢查後端日誌
docker-compose logs -f backend

# 檢查前端日誌
docker-compose logs -f frontend
```

## 📌 重要配置項

- **資料庫**: 需要現有的 PostgreSQL 實例
- **Redis**: 用於快取和會話管理
- **環境變數**: 務必妥善保管敏感訊息（密鑰、API Key 等）

## 🔗 訪問應用

- 後端 API: http://localhost:8001
- 前端: http://localhost:3000

## ⚠️ 常見問題

**連線失敗**: 檢查環境變數中的資料庫主機名稱是否正確
**容器退出**: 查看日誌尋找詳細錯誤資訊
**端口被佔用**: 修改 docker-compose.yml 中的端口映射
