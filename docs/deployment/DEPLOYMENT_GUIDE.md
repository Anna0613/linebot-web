# Unraid Docker 部署指南

## 前置準備

1. 確保Unraid系統已安裝並正常運行
2. 安裝Docker
3. 安裝Community Applications (CA)

## 環境變數設置

1. 創建 `.env` 檔案：
```bash
cd /mnt/user/appdata/linebot
cp .env.example .env
```

2. 設置必要的環境變數：
```bash
# 生成安全的 JWT 密鑰
JWT_SECRET=$(openssl rand -hex 32)

# 編輯 .env 檔案
nano .env
```

3. 重要的環境變數說明：
- `JWT_SECRET`: 用於JWT加密的密鑰（所有API共用）
- `DB_*`: 資料庫連接配置
- `MAIL_*`: 郵件服務配置
- `VITE_*`: 前端API端點配置

## 部署步驟

### 1. 配置目錄結構

在Unraid上創建以下目錄結構：
```
/mnt/user/appdata/linebot/
├── .env                # 環境變數配置
├── loginAPI/          # 登入API服務
├── puzzleAPI/         # 拼圖API服務
└── postgres/          # PostgreSQL資料
```

### 2. 部署服務

1. 下載專案檔案：
```bash
cd /mnt/user/appdata/linebot
git clone your_repository_url .
```

2. 配置環境變數：
```bash
cp .env.example .env
# 編輯 .env 填入實際的配置值
```

3. 啟動服務：
```bash
docker-compose up -d
```

### 3. 驗證部署

1. 檢查服務狀態：
```bash
docker-compose ps
```

2. 測試API端點：
- LoginAPI: `http://your-unraid-ip:5501/check_login`
- LINE LoginAPI: `http://your-unraid-ip:5502/api/database-status`
- PuzzleAPI: `http://your-unraid-ip:5503/docs`

### 4. JWT認證說明

本系統使用統一的JWT認證機制：

1. 認證流程：
   - 用戶登入後獲取JWT token
   - token存儲在cookie中
   - 所有API請求都使用相同的token

2. Token管理：
   - 有效期：7天
   - 自動更新：登入後自動延長
   - 安全存儲：使用HttpOnly cookie

3. 錯誤處理：
   - 401: token無效或過期
   - 403: 權限不足
   - 重新導向到登入頁面

### 5. 監控和維護

1. 查看容器日誌：
```bash
docker-compose logs -f [service_name]
```

2. 監控系統資源：
```bash
docker stats
```

3. 定期備份：
- PostgreSQL數據
- 環境配置文件
- SSL證書（如有）

### 6. 更新流程

1. 拉取最新代碼：
```bash
git pull origin main
```

2. 重建並重啟服務：
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### 7. 安全建議

1. JWT相關：
   - 定期更換JWT_SECRET
   - 使用足夠長度的密鑰
   - 啟用HTTPS

2. 資料庫安全：
   - 使用強密碼
   - 限制資料庫訪問
   - 定期備份

3. 系統安全：
   - 更新容器映像
   - 監控系統日誌
   - 設置防火牆規則

### 8. 故障排除

1. JWT相關問題：
   - 檢查JWT_SECRET是否一致
   - 驗證token格式
   - 檢查cookie設置

2. 資料庫連接問題：
   - 確認資料庫服務狀態
   - 檢查連接字符串
   - 驗證用戶權限

3. API問題：
   - 檢查網路連接
   - 查看錯誤日誌
   - 測試API端點

如需協助，請聯繫系統管理員或參考專案文檔。
