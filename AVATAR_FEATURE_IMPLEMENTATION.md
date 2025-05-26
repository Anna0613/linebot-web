# 頭像功能實作總結

本文檔詳細說明了為LineBot項目實作的頭像功能，包括資料庫架構修改、後端API開發和前端整合。

## 📋 功能概述

為一般帳號登入的用戶添加頭像上傳、更新和刪除功能，使用Base64格式儲存頭像圖片。LINE用戶的頭像仍然來自LINE平台，不可修改。

## 🗄️ 資料庫架構修改

### 修改的表格：`users`

```sql
-- 新增欄位
ALTER TABLE users 
ADD COLUMN avatar_base64 TEXT,
ADD COLUMN avatar_updated_at TIMESTAMP WITHOUT TIME ZONE;

-- 建立索引
CREATE INDEX idx_users_avatar_updated_at ON users(avatar_updated_at);

-- 大小限制約束（約2MB）
ALTER TABLE users 
ADD CONSTRAINT check_avatar_size 
CHECK (LENGTH(avatar_base64) <= 2097152);
```

### 更新後的users表結構

| 欄位名稱 | 資料型別 | 描述 |
|---------|----------|------|
| id | uuid | 主鍵 |
| username | varchar | 使用者名稱 |
| email | varchar | 電子郵件 |
| password | varchar | 密碼 |
| email_verified | boolean | 電子郵件驗證狀態 |
| created_at | timestamp | 建立時間 |
| **avatar_base64** | **text** | **頭像Base64資料（新增）** |
| **avatar_updated_at** | **timestamp** | **頭像更新時間（新增）** |

## 🔧 後端實作

### 新建的SettingAPI服務

**位置：** `backend/SettingAPI/`

**主要文件：**
- `app.py` - 主要Flask應用程式
- `auth_service.py` - JWT驗證服務
- `requirements.txt` - Python依賴
- `Dockerfile` - Docker部署配置
- `.env` - 環境變數配置
- `README.md` - API文檔

### API端點

| 方法 | 端點 | 功能 | 認證 |
|------|------|------|------|
| GET | `/avatar` | 獲取用戶頭像 | ✓ |
| PUT | `/avatar` | 更新用戶頭像 | ✓ |
| DELETE | `/avatar` | 刪除用戶頭像 | ✓ |
| GET | `/profile` | 獲取用戶資料 | ✓ |
| GET | `/health` | 健康檢查 | ✗ |

### 安全性特色

1. **JWT認證**：所有API都需要有效token
2. **檔案驗證**：
   - 支援格式：JPEG, PNG, GIF
   - 大小限制：500KB
   - Base64格式驗證
3. **SQL注入防護**：參數化查詢
4. **CORS配置**：完整的跨域支援

## 🎨 前端實作

### 新建的元件

**AvatarUpload元件** (`frontend/src/components/AvatarUpload/AvatarUpload.tsx`)

**功能特色：**
- 拖拽上傳支援
- 自動圖片壓縮
- 即時預覽
- 格式和大小驗證
- 載入狀態顯示
- 錯誤處理和提示

### 更新的服務

**API配置** (`frontend/src/config/apiConfig.ts`)
- 新增SETTING_API_URL配置
- 添加頭像相關端點

**API客戶端** (`frontend/src/services/api.ts`)
- `getProfile()` - 獲取用戶資料
- `getAvatar()` - 獲取頭像
- `updateAvatar()` - 更新頭像
- `deleteAvatar()` - 刪除頭像

### 更新的頁面

**Setting頁面** (`frontend/src/pages/Setting.tsx`)
- 整合AvatarUpload元件
- 區分LINE用戶和一般用戶
- 完整的錯誤處理
- Toast通知

## 🚀 部署指南

### 1. 資料庫遷移

執行SQL腳本：
```bash
psql -h your_host -U your_user -d your_db -f database_avatar_migration.sql
```

### 2. 後端部署

```bash
cd backend/SettingAPI
pip install -r requirements.txt
python app.py
```

或使用Docker：
```bash
docker build -t setting-api .
docker run -p 5503:5503 setting-api
```

### 3. 前端環境變數

在`.env`文件中添加：
```env
VITE_SETTING_API_URL=https://setting-api.jkl921102.org
```

## 🔍 測試方法

### 後端API測試

```bash
# 獲取頭像
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5503/avatar

# 更新頭像
curl -X PUT \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"avatar":"data:image/jpeg;base64,YOUR_BASE64"}' \
     http://localhost:5503/avatar
```

### 前端功能測試

1. 登入一般帳號（非LINE）
2. 進入設定頁面
3. 測試頭像上傳、更新、刪除功能
4. 驗證檔案格式和大小限制
5. 檢查錯誤處理和提示

## 📊 技術規格

### 頭像限制

- **支援格式**：JPEG, PNG, GIF
- **最大檔案大小**：500KB
- **推薦尺寸**：200x200px
- **壓縮品質**：80%
- **Base64編碼限制**：約667KB

### 性能考量

- 前端自動壓縮減少傳輸量
- 資料庫索引提升查詢效能
- 適當的錯誤處理避免無效請求
- CORS快取減少預檢請求

## 🔒 安全性措施

1. **認證授權**：JWT token驗證
2. **輸入驗證**：嚴格的檔案格式檢查
3. **大小限制**：前端和後端雙重限制
4. **SQL防護**：參數化查詢
5. **XSS防護**：適當的編碼處理

## 🐛 已知限制

1. **儲存方式**：使用Base64儲存在資料庫中，會增加約33%的空間使用
2. **快取策略**：目前沒有實作CDN或快取機制
3. **批量操作**：目前只支援單一頭像操作
4. **歷史記錄**：沒有保存頭像變更歷史

## 🔮 未來改進建議

1. **雲端儲存**：考慮使用AWS S3或類似服務
2. **CDN整合**：提升圖片載入速度
3. **圖片最佳化**：WebP格式支援
4. **批量操作**：支援多張圖片上傳
5. **版本管理**：頭像變更歷史記錄

## 📁 檔案結構

```
├── database_avatar_migration.sql          # 資料庫遷移腳本
├── backend/
│   └── SettingAPI/                        # 設定API服務
│       ├── app.py                         # 主要應用程式
│       ├── auth_service.py                # 認證服務
│       ├── requirements.txt               # Python依賴
│       ├── Dockerfile                     # Docker配置
│       ├── .env                          # 環境變數
│       └── README.md                     # API文檔
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── AvatarUpload/
    │   │       └── AvatarUpload.tsx       # 頭像上傳元件
    │   ├── config/
    │   │   └── apiConfig.ts              # API配置（已更新）
    │   ├── services/
    │   │   └── api.ts                    # API服務（已更新）
    │   └── pages/
    │       └── Setting.tsx               # 設定頁面（已更新）
```

## ✅ 完成狀態

- [x] 資料庫架構修改
- [x] 後端API開發
- [x] 前端元件開發
- [x] API整合
- [x] 錯誤處理
- [x] 安全性驗證
- [x] 文檔撰寫
- [x] 部署配置

此頭像功能現已完全實作完成，可以開始部署和測試！
