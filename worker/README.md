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

1. 將既有開發用 FastAPI 指向**獨立測試資料庫**，沿用其登入帳號、Bot 與 migration 歷史，先核對 Alembic 的目標 URL。在該庫將 schema 升至 `inbox_sources_20261127`，開啟 `PG_INBOX_ENABLED=true` 後重啟 FastAPI。
2. 在 worker 設定 `LOCAL_DATABASE_URL`（限 loopback）、`LOCAL_BOT_ID`（該帳號已啟用的測試 Bot UUID）、`LOCAL_DESTINATION` 及 `LOCAL_CHANNEL_SECRET`（可自訂測試值）。執行 `npm run dev`。它在 127.0.0.1:8787 建立本機 Worker 及驗簽設定。媒體、對話及查詢均不需真實 LINE 權杖。
3. 以 `npm run sample` 從同一組環境變數送出具正確簽章的本機測試訊息。重複使用相同的 `LOCAL_EVENT_ID` 可檢查去重。以 `LOCAL_TEXT` 指定訊息內容。
4. 在 frontend 設定 `VITE_PG_INBOX=true`，以 `VITE_UNIFIED_API_URL` 指向上述本機 FastAPI 並啟動 Vite。登入、選取同一個 Bot、從側欄開啟客服收件匣。可切換對話、分頁載入較早訊息、接手或等待同步。收件匣目前每五秒更新。
5. 本機模擬器的暫存資源用於開發，測試時只關閉測試 PG 以重現 NAS 離線，保留 Worker 執行。正式環境的保留期限、死信重播、TLS Tunnel、AI、R2 媒體搬遷與 LINE 派送依主計畫另行驗證。

## 在收件匣試用知識草稿

在同一測試 Bot 的知識庫新增一筆「營業時間為週一至週五九點到六點。」的文字資料。以 `LOCAL_TEXT=營業時間 npm run sample` 送出新訊息。在收件匣點「產生回覆草稿」，展開「引用原文」可查看文件、讀取的段落與工具步驟。模擬器每三秒領取一次請求，使用會搜尋、讀取並摘錄原文的本機替身；這個結果用來驗證流程，繁中模型品質仍需獨立量測。

草稿在目前 Bot 的授權範圍內搜尋，每輪最多四步。缺少證據時顯示交由客服處理。人工接手、訊息撤回或新回合會取消待辦。這個流程使用本機模型替身，可獨立測試。

## 在同一則客服訊息核對文件、流程與 Flex

1. 在「頻道編輯器 → AI 知識庫管理 → 收件匣草稿來源」新增來源，選取檔案後按「確認發布」。上傳既有文件的原檔時，可在「發布對象」選擇該文件，逐份升級。試行入口接受 UTF-8 TXT、Markdown、有文字的 PDF 和 DOCX。每份原檔上限 5 MiB，抽取文字上限 2 MiB 或一萬段；掃描 PDF 需先做 OCR。
2. Worker 從 PG 領取待發布版本，將原始位元組和可定位的文字寫進專用 R2 binding `KNOWLEDGE`。兩個物件均以 SHA-256 檢查，相同內容可重試。PG 在同一筆交易切換可引用版本並清掉暫存檔案。模擬器使用 `worker/.local-r2/` 保存物件，也可用 `LOCAL_R2_DIR` 指定目錄；重新開發時要搭配原測試庫及對應目錄。
3. 發布狀態變成「可引用」後，到收件匣產生草稿並展開引用。搜尋走 PG 索引，讀取使用已授權版本的 R2 位元組範圍並比對段落雜湊。位置顯示頁碼、段落／表格列或行號。來源改版與撤回會使先前引用失效。已發布的歷史物件會保留，供對帳與稽核使用。其他尚未升級的文件仍可從 PG 讀取。
4. 在流程畫布按「將已儲存流程存為測試版」。這個操作會把已存檔的流程和它引用的 Flex 內容一起固定，並檢查流程所屬 Bot 和 Flex 擁有者。相同內容重試會取得同一版。回到收件匣，在一則文字訊息展開「用這則訊息測試流程」，選擇版本即可查看分支回覆和 Flex 預覽。舊版本可重播。測試沿用編輯器模擬器，AI、等待與外部 API 節點呈現預期動作；不會向 LINE 派送。

## 批次搬遷既有 MinIO 知識原檔

在 `backend/` 執行 `scripts.migration.knowledge_originals`。盤點涵蓋 `knowledge_documents.source_type='file'` 與舊儲存格式 `<歸屬>/knowledge/<物件>`。全庫盤點會另外列出無 Bot 的文件及無法對應 Bot 的知識物件；這些項目需要確認歸屬。LINE 對話附件和 Flex 圖片另行搬遷。

| 環境變數 | 用途 |
|---|---|
| `MIGRATION_DATABASE_URL` | 有原文件目錄及 `inbox_sources_20261127` schema 的 PostgreSQL 主庫 URL；本機演練指向獨立測試庫。 |
| `MIGRATION_MINIO_URL`、`MIGRATION_MINIO_BUCKET`、`MIGRATION_MINIO_ACCESS_KEY`、`MIGRATION_MINIO_SECRET_KEY` | 來源 MinIO。URL 含協定與連接埠，憑證只需列出及讀取物件。 |
| `LOCAL_R2_AUDIT_URL`、`LOCAL_R2_AUDIT_TOKEN` | 本機對帳時，URL 指向運行中的模擬器（例如 `http://127.0.0.1:8787`）。啟動 `npm run dev` 前，給 Worker 和搬遷程序相同的 token。模擬器只會對所設定測試 Bot 的物件計算摘要。 |
| `MIGRATION_R2_URL`、`MIGRATION_R2_BUCKET`、`MIGRATION_R2_ACCESS_KEY`、`MIGRATION_R2_SECRET_KEY` | 使用 S3 相容目的端對帳時，提供 `KNOWLEDGE` 對應 bucket 的唯讀憑證，取消設定 `LOCAL_R2_AUDIT_URL`。可用 `MIGRATION_R2_REGION` 指定簽章區域。 |

以下命令共用同一份盤點快照。`BOT_ID` 是要處理的測試頻道 UUID。

```sh
python -m scripts.migration.knowledge_originals inventory --all --manifest knowledge-inventory.json
python -m scripts.migration.knowledge_originals apply --bot "$BOT_ID" --manifest knowledge-inventory.json --limit 25
python -m scripts.migration.knowledge_originals verify --bot "$BOT_ID" --manifest knowledge-inventory.json
```

- **盤點**只讀取來源。也可以把 `--all` 換成 `--bot "$BOT_ID"` 產生單一頻道的快照。清單含文件 ID、物件路徑、檔名、大小及試行容量內原檔的 SHA-256。缺檔、越界路徑、超過 5 MiB、無文件歸屬的物件會單獨列出。
- **搬遷**在寫入前比對目錄與實際 MinIO 位元組，每份各自提交。Worker 依既有發布流程寫入 R2；首次發布成功後，該文件就會成為收件匣可引用的版本。重跑 `apply` 會略過已排隊或已發布的相同第一版。`--limit` 只計算本次新增的待辦。來源變動、衝突及撤回均可從報表辨識。舊 MinIO 物件保留。
- **對帳**重新讀取來源和目的端原檔、目的端的定位文字，逐一比對 SHA-256。報表以 JSON Lines 輸出，可重導至檔案留存。現行版本已升級時，`verified_archived` 代表原本搬遷的第一版核對成功。每次執行最後一列是狀態計數。
- 退出碼 `0` 表示該階段完成；`apply` 的 `queued` 是已排入發布。退出碼 `2` 表示仍有待處理或異常項目，例如批次上限 `deferred`、等待 Worker 的 `awaiting_worker`、來源變更或雜湊不符。退出碼 `1` 表示整體操作失敗。檔案新增或缺檔問題修復後，另存新快照可保留前後兩次的盤點依據。

本機整合測試可使用 MinIO server 執行檔。在 `worker/` 執行 `INBOX_TEST_MINIO_BIN=/absolute/path/to/minio INBOX_TEST_PYTHON=.venv/bin/python npm test`，測試會建立獨立的 loopback MinIO、PostgreSQL、Miniflare 與測試資料。
