# 🚀 LineBot-Web 快速部署指南

## 📍 當前位置
```
/mnt/user/appdata/linebot-web
```

## ⚡ 3 步快速部署

### Step 1: 初始化環境 (5 分鐘)
```bash
cd /mnt/user/appdata/linebot-web
./setup-production.sh
```
此腳本將：
- ✅ 檢查 Docker 環境
- 📝 建立 `.env` 配置檔
- 🔍 顯示配置檢查清單

### Step 2: 編輯配置檔 (10 分鐘)

編輯後端配置：
```bash
nano backend/.env
```
**必填項:**
```
DB_HOST=postgresql15
DB_NAME=linebot_web
DB_USER=your_username
DB_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_min_32_chars
```

編輯前端配置：
```bash
nano frontend/.env
```
**必填項:**
```
VITE_UNIFIED_API_URL=https://api.your-domain
VITE_ALLOWED_HOSTS=your-domain,localhost
```

### Step 3: 部署 (5-15 分鐘)
```bash
cd /mnt/user/appdata/linebot-web
docker-compose up -d
```

✅ 完成！應用應該已啟動。

## 🔍 驗證部署

```bash
# 檢查容器狀態
docker-compose ps

# 檢查後端日誌
docker-compose logs -f backend

# 檢查前端日誌
docker-compose logs -f frontend
```

## 🌐 訪問應用

後端 API: http://localhost:8001 (埠號 8001)
前端: http://localhost:3000 (埠號 3000)

## 📚 更多資訊

- 詳細部署指南: DEPLOYMENT_GUIDE.md
- 應用 README: README.md
- 環境變數完整說明: backend/.env.template

## 🛑 停止應用

```bash
docker-compose down
```

---

查看 DEPLOYMENT_GUIDE.md 取得更多幫助。

