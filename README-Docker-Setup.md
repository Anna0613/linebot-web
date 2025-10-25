# Docker 本地開發環境設置指南

本指南將幫助您在本機設置完整的開發環境，包括 PostgreSQL、Redis、MinIO 和 MongoDB。

## 前置需求

1. **安裝 Docker Desktop**
   - 下載：https://www.docker.com/products/docker-desktop/
   - 安裝後確保 Docker 服務正在運行

## 快速開始

### 1. 啟動所有服務

```bash
# Windows
scripts\start-local-services.bat

# 或手動執行
docker-compose -f docker-compose.local.yml up -d
```

### 2. 切換到本地環境配置

```bash
# Windows  
scripts\switch-to-local-env.bat

# 或手動複製
copy backend\.env.local backend\.env
```

### 3. 驗證服務

所有服務啟動後，您可以訪問：

- **PostgreSQL**: `localhost:5432`
  - 資料庫: `linebot`
  - 用戶: `linebot_user`
  - 密碼: `linebot_password`

- **Redis**: `localhost:6379`
  - 密碼: `redis_password`

- **MinIO**:
  - API: http://localhost:9000
  - Web Console: http://localhost:9001
  - 用戶: `minioadmin`
  - 密碼: `minioadmin123`

- **MongoDB**: `localhost:27017`
  - 用戶: `mongo_user`
  - 密碼: `mongo_password`
  - 資料庫: `linebot_conversations`

## 管理命令

### 啟動服務
```bash
docker-compose -f docker-compose.local.yml up -d
```

### 停止服務
```bash
docker-compose -f docker-compose.local.yml down
```

### 查看服務狀態
```bash
docker-compose -f docker-compose.local.yml ps
```

### 查看服務日誌
```bash
# 查看所有服務日誌
docker-compose -f docker-compose.local.yml logs

# 查看特定服務日誌
docker-compose -f docker-compose.local.yml logs postgres
docker-compose -f docker-compose.local.yml logs redis
docker-compose -f docker-compose.local.yml logs minio
docker-compose -f docker-compose.local.yml logs mongodb
```

### 重啟服務
```bash
docker-compose -f docker-compose.local.yml restart
```

## 資料持久化

所有服務的資料都會持久化儲存在 Docker volumes 中：
- `postgres_data`: PostgreSQL 資料
- `redis_data`: Redis 資料  
- `minio_data`: MinIO 物件儲存資料
- `mongodb_data`: MongoDB 資料

## 故障排除

### 1. 端口衝突
如果遇到端口衝突，請修改 `docker-compose.local.yml` 中的端口映射。

### 2. 服務無法啟動
```bash
# 查看詳細錯誤信息
docker-compose -f docker-compose.local.yml logs [service_name]

# 重新構建並啟動
docker-compose -f docker-compose.local.yml up -d --force-recreate
```

### 3. 清理所有資料
```bash
# 停止服務並刪除 volumes（注意：這會刪除所有資料）
docker-compose -f docker-compose.local.yml down -v
```

## 開發建議

1. **環境隔離**: 使用 `.env.local` 進行本地開發，保持 `.env` 用於生產環境
2. **資料備份**: 定期備份重要的開發資料
3. **資源監控**: 使用 `docker stats` 監控容器資源使用情況

## 配置自定義

如需修改服務配置，請編輯：
- `docker-compose.local.yml`: Docker 服務配置
- `backend/.env.local`: 應用程式環境變數
- `scripts/init-postgres.sql`: PostgreSQL 初始化腳本
- `scripts/init-mongodb.js`: MongoDB 初始化腳本
