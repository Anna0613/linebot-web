# LineBot Web 部署指南

## 概述

本文檔說明如何部署和管理 LineBot Web 應用的 Docker 容器。

## 快速開始

### 1. 重新部署應用

使用自動化部署腳本重新部署整個應用：

```bash
./scripts/redeploy.sh
```

這個腳本會：
- 檢查 Docker 環境
- 備份現有容器日誌（可選）
- 清理舊的 Docker 資源
- 重新構建映像（無快取）
- 啟動新的容器
- 執行健康檢查
- 顯示部署資訊

### 2. 檢查應用狀態

使用狀態檢查腳本查看應用當前狀態：

```bash
./scripts/status.sh
```

這個腳本會顯示：
- 容器運行狀態
- 服務健康檢查結果
- 資源使用情況
- 最近的日誌
- Docker 映像信息

## 手動部署步驟

如果需要手動控制部署過程：

### 1. 停止現有容器

```bash
docker-compose down
```

### 2. 清理舊資源

```bash
# 移除舊映像
docker rmi linebot-web-frontend linebot-web-backend 2>/dev/null || true

# 清理未使用的映像
docker image prune -f
```

### 3. 重新構建映像

```bash
# 無快取構建
docker-compose build --no-cache
```

### 4. 啟動服務

```bash
docker-compose up -d
```

### 5. 驗證部署

```bash
# 檢查容器狀態
docker ps

# 檢查後端健康狀態
curl http://localhost:6000/health

# 檢查前端
curl http://localhost:3000
```

## 服務端點

- **前端**: http://localhost:3000
- **後端 API**: http://localhost:6000
- **健康檢查**: http://localhost:6000/health

## 故障排除

### 檢查容器日誌

```bash
# 後端日誌
docker logs linebot-web-backend

# 前端日誌
docker logs linebot-web-frontend

# 實時查看日誌
docker logs -f linebot-web-backend
```

### 檢查容器狀態

```bash
# 查看所有容器
docker ps -a

# 查看 linebot-web 相關容器
docker ps --filter "name=linebot-web"
```

### 檢查資源使用

```bash
# 查看資源使用情況
docker stats

# 查看特定容器資源使用
docker stats linebot-web-backend linebot-web-frontend
```

### 常見問題

#### 1. 端口衝突

如果遇到端口衝突，檢查是否有其他服務佔用端口：

```bash
# 檢查端口 3000
lsof -i :3000

# 檢查端口 6000
lsof -i :6000
```

#### 2. 映像構建失敗

確保 `.dockerignore` 文件存在並正確配置：

```bash
# 檢查前端 .dockerignore
cat frontend/.dockerignore

# 檢查後端 .dockerignore
cat backend/.dockerignore
```

#### 3. 健康檢查失敗

檢查服務是否正確啟動：

```bash
# 檢查後端詳細日誌
docker logs linebot-web-backend --tail 50

# 檢查前端詳細日誌
docker logs linebot-web-frontend --tail 50
```

## 環境變量

確保以下環境變量文件存在並正確配置：

- `backend/.env` - 後端環境變量
- `frontend/.env` - 前端環境變量

## 備份和恢復

### 備份容器日誌

```bash
# 創建備份目錄
mkdir -p backup/logs/$(date +%Y%m%d_%H%M%S)

# 備份日誌
docker logs linebot-web-backend > backup/logs/$(date +%Y%m%d_%H%M%S)/backend.log
docker logs linebot-web-frontend > backup/logs/$(date +%Y%m%d_%H%M%S)/frontend.log
```

### 備份數據庫（如果適用）

```bash
# 如果使用 PostgreSQL
docker exec linebot-web-backend pg_dump -U username dbname > backup/db_$(date +%Y%m%d_%H%M%S).sql
```

## 監控

### 設置監控腳本

可以設置定期執行狀態檢查：

```bash
# 添加到 crontab（每 5 分鐘檢查一次）
*/5 * * * * /path/to/linebot-web/scripts/status.sh >> /var/log/linebot-web-status.log 2>&1
```

### 健康檢查端點

後端提供健康檢查端點：`GET /health`

返回格式：
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "production"
}
```

## 更新流程

1. 拉取最新代碼
2. 運行 ESLint 檢查（前端）
3. 執行測試
4. 運行重新部署腳本
5. 驗證部署結果

```bash
# 完整更新流程
git pull origin main
cd frontend && pnpm lint && cd ..
./scripts/redeploy.sh
./scripts/status.sh
```
