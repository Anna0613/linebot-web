# 📋 BotCraft 維護指南

## 🔧 日常維護命令

### 檢查應用狀態
```bash
cd /mnt/user/appdata/botcraft

# 查看所有容器狀態
docker-compose ps

# 查看容器資源使用
docker stats

# 檢查網絡連線
docker network ls
```

### 檢查日誌
```bash
# 實時查看後端日誌（最後 50 行）
docker-compose logs -f --tail=50 backend

# 實時查看前端日誌
docker-compose logs -f --tail=50 frontend

# 查看特定時間範圍的日誌
docker-compose logs --since 1h backend
```

### 重啟服務
```bash
# 重啟所有容器
docker-compose restart

# 重啟特定容器
docker-compose restart backend
docker-compose restart frontend

# 完全停止並重新啟動
docker-compose down
docker-compose up -d
```

## 🚨 常見問題排查

### 1. 後端無法連接資料庫
**症狀:** `connection refused` 錯誤

**解決步驟:**
```bash
# 檢查環境變數
cat backend/.env | grep DB_

# 測試資料庫連線
docker-compose exec backend python -c "
from sqlalchemy import create_engine
# 檢查 engine 是否能連線
"

# 檢查 PostgreSQL 容器是否運行
docker ps | grep postgres
```

### 2. 前端無法訪問後端 API
**症狀:** CORS 錯誤或 API 連線失敗

**解決步驟:**
```bash
# 檢查前端環境變數
cat frontend/.env

# 測試 API 連通性
curl http://localhost:8001/api/v1/health

# 檢查容器網絡
docker network inspect botcraft_botcraft-network
```

### 3. 容器自動重啟
**症狀:** 容器狀態頻繁改變

**解決步驟:**
```bash
# 查看完整日誌
docker-compose logs backend

# 檢查資源限制是否達上限
docker stats

# 檢查磁碟空間
df -h

# 查看最近的系統錯誤
journalctl -xe
```

### 4. 內存洩漏
**症狀:** 應用逐漸變慢，內存持續增加

**解決步驟:**
```bash
# 監控內存使用
docker stats --no-stream

# 重啟容器釋放內存
docker-compose restart backend

# 檢查應用日誌中的內存警告
docker-compose logs backend | grep -i memory
```

## 🔐 安全維護

### 定期備份
```bash
# 備份資料庫
docker-compose exec postgres pg_dump -U your_user your_db > backup.sql

# 備份 MongoDB（如果使用）
docker-compose exec mongodb mongodump --out /tmp/backup
```

### 密鑰管理
```bash
# 檢查敏感信息（應避免暴露）
cat backend/.env | grep -E 'SECRET|PASSWORD|KEY|API'

# 定期輪換 JWT 密鑰（需重新部署）
# 更新 backend/.env 中的 JWT_SECRET
```

## 📊 性能監控

### 檢查容器性能
```bash
# 實時監控
watch -n 1 'docker stats --no-stream'

# 查看歷史資源使用
docker stats --no-stream botcraft-backend
docker stats --no-stream botcraft-frontend
```

### 日誌大小管理
```bash
# 查看日誌大小
du -sh /var/lib/docker/containers

# 清理舊日誌
docker-compose logs --tail=1000 backend > backup.log
docker-compose logs --truncate backend
```

## 🔄 更新和升級

### 更新應用代碼
```bash
cd /mnt/user/appdata/botcraft

# 拉取最新代碼
git pull origin main

# 重新構建容器
docker-compose build --no-cache

# 重新啟動
docker-compose up -d
```

### 更新依賴
```bash
# 後端依賴更新
cd backend
pip install --upgrade -r requirements.txt

# 前端依賴更新
cd ../frontend
pnpm update
```

## 📞 故障排查檢查清單

- [ ] 檢查容器是否正在運行
- [ ] 查看容器日誌中的錯誤信息
- [ ] 驗證環境變數配置
- [ ] 檢查資料庫連線
- [ ] 驗證網絡連通性
- [ ] 檢查磁碟和內存空間
- [ ] 查看系統日誌（journalctl）
- [ ] 重啟應用並觀察
