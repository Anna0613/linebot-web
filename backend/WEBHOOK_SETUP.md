# LINE Bot Webhook 設置指南

## 🎯 問題解決
此更新解決了**用戶管理為空**的問題。現在系統將能夠：
- ✅ 接收 LINE 平台的 Webhook 事件
- ✅ 自動記錄用戶關注/取消關注事件  
- ✅ 記錄所有用戶訊息互動
- ✅ 在前端正確顯示真實用戶數據

## 🔧 新增功能

### 1. Webhook API 端點
- `POST /api/v1/webhooks/{bot_id}` - 接收 LINE Webhook 事件
- `GET /api/v1/webhooks/{bot_id}/info` - 獲取 Webhook 配置信息
- `POST /api/v1/webhooks/{bot_id}/test` - 測試 Webhook 連接

### 2. 增強的事件處理
- **關注事件 (follow)**: 自動創建/更新用戶記錄
- **訊息事件 (message)**: 記錄所有類型的訊息互動
- **取消關注事件 (unfollow)**: 更新用戶狀態

### 3. 自動用戶數據記錄
- 用戶基本信息 (ID, 顯示名稱等)
- 互動歷史記錄
- 關注狀態追蹤
- 活躍度統計

## 📋 設置步驟

### 步驟 1: 數據庫遷移
確保數據庫遷移已運行：
```bash
cd backend
alembic upgrade head
```

### 步驟 2: 啟動後端服務
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 步驟 3: 設置 LINE Developer Console

1. 登入 [LINE Developer Console](https://developers.line.biz/)
2. 選擇您的 Bot
3. 前往 "Messaging API" 設定頁
4. 設置 Webhook URL:
   ```
   https://your-domain.com/api/v1/webhooks/{bot_id}
   ```
   - 將 `{bot_id}` 替換為實際的 Bot ID
   - 將 `your-domain.com` 替換為您的實際域名

5. 啟用 "Use webhook" 選項
6. 驗證 Webhook URL

### 步驟 4: 測試功能

1. **測試用戶關注**:
   - 掃描 Bot 的 QR Code 並關注
   - 檢查前端用戶管理頁面是否顯示新用戶

2. **測試訊息互動**:
   - 發送訊息給 Bot
   - 檢查互動歷史是否正確記錄

3. **檢查數據統計**:
   - 前往 Bot 管理頁面查看分析數據
   - 所有統計數據現在都基於真實用戶互動

## 🔍 驗證 Webhook 是否工作

### 方法 1: 檢查服務器日誌
```bash
# 查看後端日誌，尋找 Webhook 事件
grep -i "webhook" logs/app.log
```

### 方法 2: 檢查數據庫
```sql
-- 檢查是否有用戶記錄
SELECT * FROM line_bot_users LIMIT 10;

-- 檢查互動記錄
SELECT * FROM line_bot_user_interactions ORDER BY timestamp DESC LIMIT 10;
```

### 方法 3: 使用 Webhook 測試端點
```bash
curl -X POST "http://localhost:8000/api/v1/webhooks/{bot_id}/test"
```

## 🚨 常見問題排解

### 問題 1: Webhook URL 驗證失敗
- **原因**: SSL 憑證問題或 URL 不可訪問
- **解決**: 確保域名有效且支持 HTTPS

### 問題 2: 簽名驗證失敗
- **原因**: Channel Secret 不正確
- **解決**: 檢查 Bot 設定中的 Channel Secret

### 問題 3: 用戶數據仍然為空
- **原因**: Webhook 可能未正確設置
- **解決**: 
  1. 檢查 LINE Developer Console 設置
  2. 驗證 Webhook URL 格式
  3. 測試新的互動（關注/發送訊息）

### 問題 4: 數據庫錯誤
- **原因**: 數據庫遷移未運行
- **解決**: 運行 `alembic upgrade head`

## 📊 預期結果

設置完成後，您應該能看到：

1. **用戶管理頁面** (`/bots/{bot_id}/users`):
   - 顯示真實的關注者列表
   - 每個用戶的基本信息和互動統計
   - 互動歷史記錄

2. **Bot 分析頁面** (`/bots/management`):
   - 基於真實數據的統計圖表
   - 用戶活躍度分析
   - 訊息類型分布

3. **即時數據更新**:
   - 新用戶關注時立即顯示
   - 訊息互動實時記錄
   - 分析數據自動更新

## 🎉 完成！

現在您的 LINE Bot 將能夠正確追蹤和管理所有用戶互動，用戶管理頁面不再是空的！