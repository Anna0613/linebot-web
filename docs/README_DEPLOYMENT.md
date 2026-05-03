# 🎉 LineBot-Web 部署完成

感謝您選擇部署 LineBot-Web！本指南將幫助您快速開始。

## 📍 您的位置

```
/mnt/user/appdata/
├── linebot-web/                    應用源碼
│   ├── QUICK_START.md             從這裡開始！
│   ├── DEPLOYMENT_GUIDE.md
│   ├── MAINTENANCE.md
│   ├── SERVER_REQUIREMENTS.md
│   ├── setup-production.sh        自動化部署腳本
│   ├── backend/
│   │   ├── .env.template
│   │   └── ... (FastAPI 代碼)
│   ├── frontend/
│   │   ├── .env.template
│   │   └── ... (React 代碼)
│   └── docker-compose.yml
│
├── LINEBOT_DEPLOYMENT_SUMMARY.md   部署總結
└── README_DEPLOYMENT.md             本文件
```

## 🚀 快速開始（5 分鐘）

### 步驟 1: 運行自動化部署腳本
```bash
cd /mnt/user/appdata/linebot-web
./setup-production.sh
```

### 步驟 2: 編輯配置檔
```bash
nano backend/.env
nano frontend/.env
```

### 步驟 3: 啟動應用
```bash
docker-compose up -d
```

### 步驟 4: 訪問應用
```
前端: http://localhost:3000
後端: http://localhost:8001
```

## 📚 完整文檔

| 文檔 | 用途 |
|------|------|
| QUICK_START.md | 快速 3 步部署指南 |
| DEPLOYMENT_GUIDE.md | 完整部署說明 |
| SERVER_REQUIREMENTS.md | 伺服器要求 |
| MAINTENANCE.md | 維護和故障排查 |

位置: `/mnt/user/appdata/linebot-web/`

## ⚠️ 重要提醒

1. **環境變數**: 所有範本文件中的 `CHANGE_ME_*` 都需要替換為實際值
2. **資料庫**: 確保 PostgreSQL 和 Redis 可訪問
3. **安全**: 不要提交 .env 到版本控制，使用強密碼
4. **磁碟**: 需要至少 50GB 儲存空間

## 🔍 驗證部署

```bash
# 檢查容器狀態
docker-compose ps

# 查看日誌
docker-compose logs backend

# 測試後端
curl http://localhost:8001/api/v1/health
```

## 📋 必填配置項

**後端 (backend/.env):**
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET (最少 32 個字符)
- FRONTEND_URL

**前端 (frontend/.env):**
- VITE_UNIFIED_API_URL
- VITE_ALLOWED_HOSTS

## 💡 快速命令

```bash
# 進入應用目錄
cd /mnt/user/appdata/linebot-web

# 啟動應用
docker-compose up -d

# 檢查狀態
docker-compose ps

# 查看日誌
docker-compose logs -f

# 停止應用
docker-compose down

# 重啟應用
docker-compose restart
```

---

**準備好了？開始部署！**

```bash
cd /mnt/user/appdata/linebot-web
./setup-production.sh
```

查看 QUICK_START.md 取得更多幫助。
