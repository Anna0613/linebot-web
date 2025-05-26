# 頭像功能部署指南

## 🚨 SQL錯誤修復

您遇到的SQL錯誤已經修復！問題出現在`ADD CONSTRAINT IF NOT EXISTS`語法上，這在某些PostgreSQL版本中不被支援。

### 修復內容
- 使用`DO $$`語句來檢查約束是否已存在
- 避免重複建立約束的錯誤
- 提供更好的相容性

## 📋 部署步驟

### 1. 執行修復後的資料庫遷移腳本

```bash
psql -h sql.jkl921102.org -U 11131230 -d LineBot_01 -f database_avatar_migration.sql
```

這個腳本現在會：
- 安全地新增avatar_base64和avatar_updated_at欄位
- 建立必要的索引
- 安全地新增大小限制約束（不會重複建立）

### 2. 啟動SettingAPI服務

```bash
cd backend/SettingAPI
pip install -r requirements.txt
python app.py
```

服務將在port 5503啟動。

### 3. 驗證服務運作

測試健康檢查：
```bash
curl http://localhost:5503/health
```

應該回傳：
```json
{
  "status": "healthy",
  "service": "Setting API",
  "timestamp": "2025-05-26T15:06:00"
}
```

### 4. 測試頭像功能

#### 獲取頭像（需要有效token）
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5503/avatar
```

#### 更新頭像
```bash
curl -X PUT \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"avatar":"data:image/jpeg;base64,YOUR_BASE64_DATA"}' \
     http://localhost:5503/avatar
```

## 🔧 配置檢查

### 環境變數已正確設定

**前端 (.env):**
- ✅ `VITE_SETTING_API_URL=http://localhost:5503`

**後端 (SettingAPI/.env):**
- ✅ 資料庫連接設定
- ✅ JWT_SECRET與loginAPI一致
- ✅ Flask配置

## 🎯 功能測試

1. **登入一般帳號**（非LINE用戶）
2. **進入設定頁面** (`/setting`)
3. **測試頭像功能**：
   - 拖拽圖片上傳
   - 點擊選擇圖片
   - 刪除現有頭像
   - 驗證格式限制（JPEG/PNG/GIF）
   - 驗證大小限制（500KB）

## 🔍 故障排除

### 常見問題

1. **JWT認證失敗**
   - 確認JWT_SECRET在所有服務中一致
   - 檢查token是否有效

2. **CORS錯誤**
   - 檢查allowed_origins設定
   - 確認前端URL在白名單中

3. **資料庫連接失敗**
   - 驗證資料庫連接設定
   - 確認資料庫服務運行正常

4. **檔案上傳失敗**
   - 檢查檔案格式（僅支援JPEG/PNG/GIF）
   - 檢查檔案大小（最大500KB）
   - 檢查Base64編碼是否正確

### 日誌檢查

SettingAPI會在控制台顯示詳細的日誌訊息：
- 資料庫連接狀態
- 請求處理結果
- 錯誤詳細信息

## 📊 API端點總結

| 方法 | 端點 | 功能 | 認證 |
|------|------|------|------|
| GET | `/health` | 健康檢查 | ✗ |
| GET | `/avatar` | 獲取用戶頭像 | ✓ |
| PUT | `/avatar` | 更新用戶頭像 | ✓ |
| DELETE | `/avatar` | 刪除用戶頭像 | ✓ |
| GET | `/profile` | 獲取用戶資料 | ✓ |

## ✅ 部署完成檢查清單

- [ ] 資料庫遷移腳本執行成功
- [ ] SettingAPI服務啟動正常
- [ ] 健康檢查回應正常
- [ ] 前端可以正常載入設定頁面
- [ ] 頭像上傳功能正常
- [ ] 頭像刪除功能正常
- [ ] 檔案格式驗證正常
- [ ] 檔案大小限制正常

現在您可以開始測試完整的頭像功能了！
