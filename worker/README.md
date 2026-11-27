# 本機 LINE 收件與 PostgreSQL 收件匣

這是遷移計畫的第一段可執行流程。Webhook Worker 從私有 R2 binding 讀取帶 Bot ID 綁定的加密驗簽設定，核對 LINE 簽章及 destination，將整批事件逐一提交到入站佇列後回應。消費 Worker 經 Hyperdrive binding 寫 PG，交易提交後才確認消費。FastAPI 提供原有 Cookie 登入下的查詢與接手操作。React 收件匣位於 `/bots/inbox`。

新環境從空白資料庫及 R2 空間開始。主庫保存文字、附件種類及 LINE 訊息 ID；撤回會清除本文。其他事件先保留收件憑據。接手會提升該對話的控制版本並取消新路徑的待辦。舊 FastAPI webhook 的 AI 接管仍由舊設定控制。新路徑沒有派送器，測試使用獨立 Bot。

## 驗證整條路徑

在 `worker/` 執行，使用 Node 24、npm 與專案後端的 Python 環境。

```sh
npm ci
npm run check
INBOX_TEST_PYTHON=.venv/bin/python npm test
```

測試在 loopback 建立臨時 PostgreSQL 與 Miniflare 的 R2、Queues 及 Hyperdrive 模擬。測試先關閉 PG，再送一則簽名訊息，重啟 PG 並檢查原事件補入及重送去重。設定 INBOX_TEST_PYTHON 會額外在 backend 目錄啟動 FastAPI 路由測試，驗證權限、讀取與人工接手；相對路徑以 backend 為起點。單純的 `npm test` 測 Worker 與資料庫。測試資料由程序建立。

## 從空白資料庫開始操作畫面

1. 在本機 PostgreSQL 建立獨立空資料庫，例如 `botlyn_fresh`。現階段完整 FastAPI schema 使用 `uuid-ossp` 和 pgvector，測試可用 `pgvector/pgvector:pg16`。將 backend 的 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` 及對應的 `DB_REPLICA_*` 明確指向此庫，在 `backend/` 執行 `.venv/bin/python scripts/database/db_manager.py init`。初始化會建立帳號、Bot、收件匣、知識與流程所需的結構。開啟 `PG_INBOX_ENABLED=true` 啟動 FastAPI，註冊新帳號並建立測試 Bot。這些頁面目前仍由 FastAPI 提供。
2. 在 worker 設定 `LOCAL_DATABASE_URL`（限 loopback）、`LOCAL_BOT_ID`（該帳號已啟用的測試 Bot UUID）、`LOCAL_DESTINATION` 及 `LOCAL_CHANNEL_SECRET`（可自訂測試值），並將 `LOCAL_R2_DIR` 指向此環境專屬的新目錄。執行 `npm run dev`。它在 127.0.0.1:8787 建立本機 Worker 及驗簽設定。媒體、對話及查詢均不需真實 LINE 權杖。
3. 以 `npm run sample` 從同一組環境變數送出具正確簽章的本機測試訊息。重複使用相同的 `LOCAL_EVENT_ID` 可檢查去重。以 `LOCAL_TEXT` 指定訊息內容。
4. 在 frontend 設定 `VITE_PG_INBOX=true`，以 `VITE_UNIFIED_API_URL` 指向上述本機 FastAPI 並啟動 Vite。登入、選取同一個 Bot、從側欄開啟客服收件匣。可切換對話、分頁載入較早訊息、接手或等待同步。收件匣目前每五秒更新。
5. 本機模擬器的暫存資源用於開發，測試時只關閉測試 PG 以重現 NAS 離線，保留 Worker 執行。正式環境的保留期限、死信重播、TLS Tunnel、AI、新媒體寫入 R2與 LINE 派送依主計畫另行驗證。

## 在收件匣試用知識草稿

在同一測試 Bot 發布一份 UTF-8 文字檔，內文寫「營業時間為週一至週五九點到六點。」並等待狀態顯示「可引用」。以 `LOCAL_TEXT=營業時間 npm run sample` 送出新訊息。在收件匣點「產生回覆草稿」，展開「引用原文」可查看文件、讀取的段落與工具步驟。模擬器每三秒領取一次請求，使用會搜尋、讀取並摘錄原文的本機替身；這個結果用來驗證流程，繁中模型品質仍需獨立量測。

草稿在目前 Bot 的授權範圍內搜尋，每輪最多四步。缺少證據時顯示交由客服處理。人工接手、訊息撤回或新回合會取消待辦。這個流程使用本機模型替身，可獨立測試。

## 在同一則客服訊息核對文件、流程與 Flex

1. 在「頻道編輯器 → AI 知識庫管理 → 收件匣草稿來源」新增來源，選取檔案後按「確認發布」。同一來源可用「更新版本」上傳修訂稿。試行入口接受 UTF-8 TXT、Markdown、有文字的 PDF 和 DOCX。每份原檔上限 5 MiB，抽取文字上限 2 MiB 或一萬段；掃描 PDF 需先做 OCR。
2. Worker 從 PG 領取待發布版本，將原始位元組和可定位的文字寫進專用 R2 binding `KNOWLEDGE`。兩個物件均以 SHA-256 檢查，相同內容可重試。PG 在同一筆交易切換可引用版本並清掉暫存檔案。模擬器使用 `worker/.local-r2/` 保存物件，也可用 `LOCAL_R2_DIR` 指定目錄；重新開發時要搭配原測試庫及對應目錄。
3. 發布狀態變成「可引用」後，到收件匣產生草稿並展開引用。搜尋走 PG 索引，讀取使用已授權版本的 R2 位元組範圍並比對段落雜湊。位置顯示頁碼、段落／表格列或行號。來源改版與撤回會使先前引用失效。已發布的歷史物件會保留，供對帳與稽核使用。
4. 在流程畫布按「將已儲存流程存為測試版」。這個操作會把已存檔的流程和它引用的 Flex 內容一起固定，並檢查流程所屬 Bot 和 Flex 擁有者。相同內容重試會取得同一版。回到收件匣，在一則文字訊息展開「用這則訊息測試流程」，選擇版本即可查看分支回覆和 Flex 預覽。舊版本可重播。測試沿用編輯器模擬器，AI、等待與外部 API 節點呈現預期動作；不會向 LINE 派送。
