# 🖥️ LineBot-Web 伺服器基礎設施要求

## 📋 系統要求

### 最小配置（開發/測試環境）
- **CPU**: 2 核心
- **內存**: 4 GB RAM
- **儲存**: 20 GB SSD
- **OS**: Linux (Ubuntu 18.04+ 推薦)

### 建議配置（生產環境）
- **CPU**: 4 核心以上
- **內存**: 8 GB RAM 以上
- **儲存**: 50+ GB SSD
- **網絡**: 1 Gbps 網卡
- **OS**: Linux (Ubuntu 20.04+ 或 CentOS 8+)

## 📦 必要服務

### 1. Docker & Docker Compose ✓
```bash
# 檢查安裝
docker --version
docker-compose --version
```

### 2. PostgreSQL 資料庫 ⚙️
需要在伺服器上運行一個 PostgreSQL 實例。
當前伺服器路徑: `/mnt/user/appdata/postgresql15`

**要求:**
- PostgreSQL 12+
- 可用連接數: ≥ 30
- 儲存空間: ≥ 10 GB

**配置參考:**
```
DB_HOST=postgresql15
DB_PORT=5432
POOL_SIZE=10
POOL_MAX_OVERFLOW=20
```

### 3. Redis 緩存 ⚙️
用於會話管理和快取。

**要求:**
- Redis 5.0+
- 記憶體: ≥ 512 MB

**配置參考:**
```
REDIS_HOST=redis
REDIS_PORT=6379
```

### 4. MongoDB（可選） 📊
用於存儲對話歷史記錄。
當前伺服器路徑: `/mnt/user/appdata/mongodb`

**要求:**
- MongoDB 4.0+
- 儲存空間: ≥ 5 GB

### 5. MinIO（可選） 🗂️
用於媒體文件存儲。
當前伺服器路徑: `/mnt/user/appdata/minio`

**要求:**
- 儲存空間: ≥ 20 GB

## 🌐 網絡要求

### 埠號佔用
```
8001  - 後端 API (HTTP)
3000  - 前端服務 (HTTP)
5432  - PostgreSQL（如果暴露）
6379  - Redis（如果暴露）
27017 - MongoDB（如果暴露）
9000  - MinIO（如果暴露）
```

### 防火牆規則
```bash
# 允許外部訪問前端和後端
sudo ufw allow 3000/tcp
sudo ufw allow 8001/tcp

# 內部服務（可選，如需遠程訪問）
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw allow 6379/tcp  # Redis
```

### 反向代理（生產推薦）
建議在 8001 和 3000 前面設置 Nginx 反向代理：
```nginx
upstream backend {
    server 127.0.0.1:8001;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 安全要求

### SSL/TLS 證書
```bash
# 生成自簽名證書（開發用）
openssl req -x509 -newkey rsa:4096 -nodes \
    -out cert.pem -keyout key.pem -days 365
```

### 環境變數保護
- ✓ 使用 `.env` 檔案存儲敏感信息
- ✓ 不要提交 `.env` 到版本控制
- ✓ 限制檔案訪問權限
```bash
chmod 600 backend/.env frontend/.env
```

### 定期備份
```bash
# 每天自動備份資料庫
0 2 * * * docker-compose -f /mnt/user/appdata/linebot-web/docker-compose.yml \
    exec postgres pg_dump -U user db > /backups/linebot_$(date +%Y%m%d).sql
```

## 📊 資源配置參考

### Docker 資源限制（docker-compose.yml）
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1'      # 最多使用 1 個 CPU
        memory: 1.5G   # 最多使用 1.5GB 內存
      reservations:
        cpus: '0.5'    # 預留 0.5 個 CPU
        memory: 768M   # 預留 768MB 內存

frontend:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

## ✅ 預部署檢查清單

- [ ] Docker 和 Docker Compose 已安裝
- [ ] PostgreSQL 可訪問且配置正確
- [ ] Redis 可訪問
- [ ] 所需埠號未被占用
- [ ] 磁碟空間充足
- [ ] 防火牆規則已設置
- [ ] SSL 證書已準備（生產環境）
- [ ] 環境變數檔案已創建並填入實際值
- [ ] 備份策略已設置

## 📞 驗證部署前檢查

```bash
# 檢查 Docker
docker ps

# 檢查網絡
netstat -tln | grep -E '8001|3000|5432|6379'

# 檢查資料庫連線
docker run --rm -it postgres psql -h host -U user -d db -c "SELECT 1"

# 檢查儲存空間
df -h /mnt/user/appdata
```
