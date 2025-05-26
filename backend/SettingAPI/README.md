# Setting API - 用戶設定服務

此服務提供用戶設定相關的API功能，包括頭像管理、個人資料管理等。

## 功能特色

- **頭像管理**：支援用戶上傳、更新、刪除頭像（Base64格式）
- **個人資料**：獲取和管理用戶基本資料
- **安全驗證**：JWT token驗證
- **檔案驗證**：圖片格式和大小限制
- **跨域支援**：完整的CORS配置

## API端點

### 頭像管理

#### 獲取用戶頭像
```
GET /avatar
Authorization: Bearer <token>
```

**回應範例：**
```json
{
  "avatar": "data:image/jpeg;base64,/9j/4AAQ...",
  "updated_at": "2025-05-26T14:30:00",
  "message": "Avatar retrieved successfully"
}
```

#### 更新用戶頭像
```
PUT /avatar
Authorization: Bearer <token>
Content-Type: application/json

{
  "avatar": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**回應範例：**
```json
{
  "message": "Avatar updated successfully",
  "avatar": "data:image/jpeg;base64,/9j/4AAQ...",
  "updated_at": "2025-05-26T14:30:00"
}
```

#### 刪除用戶頭像
```
DELETE /avatar
Authorization: Bearer <token>
```

**回應範例：**
```json
{
  "message": "Avatar deleted successfully"
}
```

### 個人資料

#### 獲取用戶資料
```
GET /profile
Authorization: Bearer <token>
```

**回應範例：**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "email_verified": true,
  "created_at": "2025-05-01T10:00:00",
  "avatar": "data:image/jpeg;base64,/9j/4AAQ...",
  "avatar_updated_at": "2025-05-26T14:30:00"
}
```

### 健康檢查

#### 服務狀態檢查
```
GET /health
```

**回應範例：**
```json
{
  "status": "healthy",
  "service": "Setting API",
  "timestamp": "2025-05-26T14:30:00"
}
```

## 安裝和部署

### 1. 環境要求

- Python 3.9+
- PostgreSQL 資料庫
- Redis（可選，用於session管理）

### 2. 安裝依賴

```bash
pip install -r requirements.txt
```

### 3. 環境配置

複製 `.env.example` 為 `.env` 並設定相關變數：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```env
# 資料庫設定
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Flask設定
FLASK_SECRET_KEY=your_secret_key
ENVIRONMENT=development
PORT_SETTING=5503

# JWT設定
JWT_SECRET=your_jwt_secret

# 域名設定
DOMAIN=.yourdomain.com
```

### 4. 資料庫設定

執行資料庫遷移腳本：
```bash
psql -h your_db_host -U your_db_user -d your_db_name -f ../../database_avatar_migration.sql
```

### 5. 啟動服務

#### 開發環境
```bash
python app.py
```

#### 生產環境（使用Docker）
```bash
docker build -t setting-api .
docker run -p 5503:5503 setting-api
```

## 資料庫架構變更

此服務需要對 `users` 表進行以下修改：

```sql
-- 新增頭像相關欄位
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_base64 TEXT,
ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP WITHOUT TIME ZONE;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_users_avatar_updated_at ON users(avatar_updated_at);

-- 加入大小限制約束
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_avatar_size 
CHECK (LENGTH(avatar_base64) <= 2097152);
```

## 頭像規格限制

- **支援格式**：JPEG, PNG, GIF
- **最大大小**：500KB (原始檔案)
- **Base64編碼**：最大約667KB
- **推薦尺寸**：200x200px
- **自動壓縮**：前端會自動壓縮至適當品質

## 安全性考量

1. **JWT驗證**：所有API都需要有效的JWT token
2. **檔案驗證**：嚴格檢查圖片格式和大小
3. **SQL注入防護**：使用參數化查詢
4. **XSS防護**：適當的輸入驗證和輸出編碼
5. **大小限制**：資料庫層級的大小約束

## 錯誤處理

API會回傳適當的HTTP狀態碼和錯誤訊息：

- `200` - 成功
- `400` - 請求錯誤（格式、大小等）
- `401` - 認證失敗
- `404` - 資源不存在
- `500` - 伺服器錯誤

**錯誤回應格式：**
```json
{
  "error": "Error description"
}
```

## 開發測試

### 使用 curl 測試 API

```bash
# 獲取頭像
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5503/avatar

# 更新頭像
curl -X PUT \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"avatar":"data:image/jpeg;base64,YOUR_BASE64_DATA"}' \
     http://localhost:5503/avatar

# 刪除頭像
curl -X DELETE \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5503/avatar
```

## 監控和日誌

- 服務運行在指定端口（預設5503）
- 所有請求都會記錄到控制台
- 資料庫連接錯誤會自動記錄
- 建議使用反向代理（如Nginx）進行負載平衡

## 版本歷史

- **v1.0.0** - 初始版本，支援頭像管理和基本個人資料功能
