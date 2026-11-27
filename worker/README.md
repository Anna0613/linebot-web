# 本機 LINE 收件與 PostgreSQL 收件匣

這是遷移計畫的第一段可執行流程。Webhook Worker 從私有 R2 binding 讀取帶 Bot ID 綁定的加密驗簽設定，核對 LINE 簽章及 destination，將整批事件逐一提交到入站佇列後回應。消費 Worker 經 Hyperdrive binding 寫 PG，交易提交後才確認消費。FastAPI 提供原有 Cookie 登入下的查詢與接手操作。React 收件匣位於 `/bots/inbox`。

本版是並行驗證路徑。主庫保存文字、附件種類及 LINE 訊息 ID；撤回會清除本文。其他事件先保留收件憑據。接手會提升該對話的控制版本並取消新路徑的待辦。舊 FastAPI webhook 的 AI 接管仍由舊設定控制。新路徑沒有派送器，測試使用獨立 Bot。

## 驗證整條路徑

在 `worker/` 執行，使用 Node 24、npm 與專案後端的 Python 環境。

```sh
npm ci
npm run check
INBOX_TEST_PYTHON=.venv/bin/python npm test
```

測試在 loopback 建立臨時 PostgreSQL 與 Miniflare 的 R2、Queues 及 Hyperdrive 模擬。測試先關閉 PG，再送一則簽名訊息，重啟 PG 並檢查原事件補入及重送去重。設定 INBOX_TEST_PYTHON 會額外在 backend 目錄啟動 FastAPI 路由測試，驗證權限、讀取與人工接手；相對路徑以 backend 為起點。單純的 `npm test` 測 Worker 與資料庫。測試資料由程序建立。

## 使用既有本機測試帳號操作畫面

1. 將既有開發用 FastAPI 指向**獨立測試資料庫**，沿用其登入帳號、Bot 與 migration 歷史，先核對 Alembic 的目標 URL。在該庫將 schema 升至 `inbox_drafts_20261127`，開啟 `PG_INBOX_ENABLED=true` 後重啟 FastAPI。
2. 在 worker 設定 `LOCAL_DATABASE_URL`（限 loopback）、`LOCAL_BOT_ID`（該帳號已啟用的測試 Bot UUID）、`LOCAL_DESTINATION` 及 `LOCAL_CHANNEL_SECRET`（可自訂測試值）。執行 `npm run dev`。它在 127.0.0.1:8787 建立本機 Worker 及驗簽設定。媒體、對話及查詢均不需真實 LINE 權杖。
3. 以 `npm run sample` 從同一組環境變數送出具正確簽章的本機測試訊息。重複使用相同的 `LOCAL_EVENT_ID` 可檢查去重。以 `LOCAL_TEXT` 指定訊息內容。
4. 在 frontend 設定 `VITE_PG_INBOX=true`，以 `VITE_UNIFIED_API_URL` 指向上述本機 FastAPI 並啟動 Vite。登入、選取同一個 Bot、從側欄開啟客服收件匣。可切換對話、分頁載入較早訊息、接手或等待同步。收件匣目前每五秒更新。
5. 本機模擬器的暫存資源用於開發，測試時只關閉測試 PG 以重現 NAS 離線，保留 Worker 執行。正式環境的保留期限、死信重播、TLS Tunnel、AI、R2 媒體搬遷與 LINE 派送依主計畫另行驗證。

## 在收件匣試用知識草稿

在同一測試 Bot 的知識庫新增一筆「營業時間為週一至週五九點到六點。」的文字資料。以 `LOCAL_TEXT=營業時間 npm run sample` 送出新訊息。在收件匣點「產生回覆草稿」，展開「引用原文」可查看文件、讀取的段落與工具步驟。模擬器每三秒領取一次請求，使用會搜尋、讀取並摘錄原文的本機替身；這個結果用來驗證流程，繁中模型品質仍需獨立量測。

草稿只使用該 Bot 既有且未刪除的 PostgreSQL 知識段落，每輪最多四步。沒有證據時顯示交由客服處理。來源修改／撤回後，查詢端不再提供舊答案。人工接手、更新回合或訊息收回會取消待辦並清掉草稿，過期的模型工作不能覆寫新的接手狀態。缺段落的舊文件、R2 原檔工具及不可變發布版本屬後續遷移範圍。Worker 另提供使用 AI binding 的排程入口；本機開發不會呼叫遠端模型或 LINE。
