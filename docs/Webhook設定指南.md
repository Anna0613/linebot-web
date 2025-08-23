# LINE Bot Webhook 設定指南

## 📝 概述

本指南將幫助您正確設定 LINE Bot 的 Webhook，解決常見的綁定問題。

## 🔍 常見問題診斷

### 問題 1: "未綁定" 狀態
**症狀**: Bot 管理頁面顯示 "未綁定"
**原因**: 
- LINE 平台的 Webhook URL 設定不正確
- ngrok URL 過期或更改
- 後端環境變數設定錯誤

### 問題 2: Webhook 無回應
**症狀**: 用戶訊息沒有觸發 Bot 回應
**原因**:
- Webhook URL 無法訪問
- 簽名驗證失敗
- 後端服務未運行

## 🛠️ 設定步驟

### 步驟 1: 配置後端環境變數

1. 複製 `.env.example` 為 `.env`:
```bash
cd backend
cp .env.example .env
```

2. 編輯 `.env` 文件，設定 Webhook 域名:
```env
# Webhook 設定 - 請替換為您的 ngrok URL
WEBHOOK_DOMAIN="https://your-ngrok-url.ngrok-free.app"
```

### 步驟 2: 啟動 ngrok

1. 安裝 ngrok (如果尚未安裝):
```bash
# macOS
brew install ngrok

# Windows - 下載並安裝 ngrok
# https://ngrok.com/download
```

2. 啟動 ngrok:
```bash
ngrok http 8000
```

3. 複製 HTTPS URL (例如: `https://abc123.ngrok-free.app`)

### 步驟 3: 更新環境變數

1. **後端環境變數** (`backend/.env`):
```env
WEBHOOK_DOMAIN="https://abc123.ngrok-free.app"
```

2. **前端環境變數** (`frontend/.env`):
```env
VITE_WEBHOOK_DOMAIN=https://abc123.ngrok-free.app
```

### 步驟 4: 重啟服務

```bash
# 重啟後端
cd backend
python main.py

# 重啟前端 (新終端)
cd frontend
npm run dev
```

### 步驟 5: 在 LINE Developers 設定 Webhook

1. 登入 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 Bot
3. 前往 "Messaging API" 頁面
4. 在 "Webhook URL" 欄位輸入:
```
https://abc123.ngrok-free.app/api/v1/webhooks/YOUR_BOT_ID
```
5. 點擊 "Update" 然後 "Verify" 測試連接

## 🔧 故障排除

### 驗證 Webhook URL

使用以下命令測試 Webhook 端點:

```bash
# 測試基本連接
curl -X GET https://your-ngrok-url.ngrok-free.app/api/v1/webhooks/YOUR_BOT_ID/info

# 測試 Webhook 狀態
curl -X GET https://your-ngrok-url.ngrok-free.app/api/v1/webhooks/YOUR_BOT_ID/status
```

### 檢查日誌

1. **後端日誌**: 查看 FastAPI 控制台輸出
2. **ngrok 日誌**: 查看 ngrok 控制台的請求記錄
3. **瀏覽器開發者工具**: 檢查前端 API 調用

### 常見錯誤解決方案

| 錯誤 | 解決方案 |
|------|----------|
| 404 Not Found | 檢查 Webhook URL 路徑是否正確 |
| 簽名驗證失敗 | 確認 Channel Secret 設定正確 |
| ngrok 連接失敗 | 重新啟動 ngrok 並更新 URL |
| Bot 未回應 | 檢查 Channel Token 和邏輯設定 |

## 📋 檢查清單

在完成設定後，請確認以下項目：

- [ ] ngrok 正在運行並提供 HTTPS URL
- [ ] 後端 `.env` 中的 `WEBHOOK_DOMAIN` 已更新
- [ ] 前端 `.env` 中的 `VITE_WEBHOOK_DOMAIN` 已更新
- [ ] 服務已重啟
- [ ] LINE Developers Console 中的 Webhook URL 已更新
- [ ] Webhook 驗證通過
- [ ] Bot 管理頁面顯示 "已綁定" 狀態

## 🚨 生產環境注意事項

### 固定域名設定

生產環境請使用固定域名而不是 ngrok:

```env
# 生產環境
WEBHOOK_DOMAIN="https://api.yourdomain.com"
```

### SSL 證書

確保您的域名有有效的 SSL 證書，LINE 平台要求 HTTPS 連接。

### 防火牆設定

確保您的服務器可以接收來自 LINE 平台的 HTTP 請求。

## 💡 提示

1. **開發環境**: 每次重啟 ngrok 都需要更新環境變數
2. **測試模式**: 可以使用 ngrok 的 Web 介面 (http://127.0.0.1:4040) 監控請求
3. **多 Bot 支援**: 每個 Bot 都有獨立的 Webhook 端點
4. **自動重新綁定**: 考慮實作自動檢測 URL 變更並重新設定的功能

---

需要更多協助？請檢查系統日誌或聯繫開發團隊。