# 系統流程圖（LineBot-Web）

以下以兩個常見流程示意：使用者登入、LINE Webhook → AI 回覆流程。

## 使用者登入流程（帳密/LINE Login）

```mermaid
sequenceDiagram
  participant U as 使用者
  participant FE as 前端 (Vite)
  participant BE as 後端 (FastAPI)
  participant PG as PostgreSQL

  U->>FE: 開啟登入頁 / 輸入憑證 / 或點擊 LINE Login
  FE->>BE: POST /api/v1/auth/login 或 /auth/line-login
  BE->>PG: 查詢/建立使用者、驗證密碼/綁定 LINE
  PG-->>BE: 回傳使用者資訊
  BE-->>FE: 設定 Cookie/Token、回傳登入結果
  FE-->>U: 導向儀表板/首頁
```

## LINE Webhook → 背景任務（AI 回覆）

```mermaid
sequenceDiagram
  participant LINE as LINE Platform
  participant BE as 後端 (FastAPI)
  participant R as 背景任務/快取
  participant PG as PostgreSQL
  participant M as MongoDB(可選)
  participant MINIO as MinIO
  participant FE as 前端 (WebSocket)

  LINE->>BE: POST /api/v1/webhooks/{bot_id}
  BE->>PG: 讀取 Bot 設定（channel token/secret）
  BE->>R: 排入 AI 接管背景任務（RAG/LLM）
  R->>BE: 取得任務配置並執行（非同步）
  BE->>MINIO: （必要時）存取媒體
  BE->>LINE: 發送 AI 產生的回覆給使用者
  BE->>M: 寫入對話紀錄（可選）
  BE-->>FE: 透過 WebSocket 推播最新訊息
```

備註
- 背景任務實際由後端的任務管理器與服務模組協同運作（詳見 `app/services/`）
- AI 供應商預設為 Groq，可改為 Gemini；模型與參數可在 Bot 設定或環境變數調整
