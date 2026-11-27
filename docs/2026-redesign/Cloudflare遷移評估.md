# Botlyn 遷移至 Cloudflare 與 PostgreSQL 的評估

2026-11-27 · NAS 架構修訂版 · [全站與 AI 客服重構提案](重構計畫.md) · [31 個畫面預覽](screens.html)

**建議採用。** 讓 Cloudflare 執行程式、提供前端、保存檔案與推論，讓 PostgreSQL 統一記錄「發生了什麼、現在誰能回、用了哪一版資料」。如此可以退役 MinIO、MongoDB、Redis，並取消產品執行時的外部模型金鑰。最值得先做的是前端與物件儲存。工作量最大的是把 FastAPI 的行為、人工接手與 LINE 派送移到新的執行環境。

## 用 Hyperdrive 連回 NAS Docker 的 PostgreSQL

**在 NAS Docker 的 PostgreSQL 實例新建專屬資料庫。** 正式連線走 **Worker → Hyperdrive → TCP VPC Service → Cloudflare Tunnel → NAS Docker 內的 PostgreSQL**。前端、R2 與模型可各自遷移。帳號、Bot、LINE 對話、知識、流程與 Flex 都從零開始。R2 使用新空間，舊環境獨立保留。NAS 繼續負責資料保存、更新、供電與還原。這是沒有額外託管資料庫月租的方案。[Cloudflare 私網 PostgreSQL 連線](https://developers.cloudflare.com/hyperdrive/configuration/connect-to-private-database-vpc/)

| 項目 | 針對 NAS 的決策 |
|---|---|
| 私網路徑 | 在 NAS 上用 Docker 執行 cloudflared，讓它加入可達 PG 主庫的 Docker 網路並主動連出。TCP VPC Service 指向 connector 可解析的穩定內部主機名、PostgreSQL 連接埠與協定，Hyperdrive 指向該 service ID。若 connector 使用另一個容器，localhost 指的是 connector 自己。路由器無須轉發公網 5432。[Workers VPC 連線步驟](https://developers.cloudflare.com/hyperdrive/configuration/connect-to-private-database-vpc/) |
| 主庫與 TLS | 專案的一份 Compose 將 postgresql-master 映射為 5432:5432，副本為 5433:5432，這只代表檔案設定。試點先從 connector 所在網路確認實際主庫、DNS、角色及 pgvector，再用符合憑證名稱的主機名連線。PostgreSQL 要啟用 TLS，私有 CA 可交給 VPC Service 驗證並保留 verify_full。應用程式使用專用資料庫角色。[專案 Compose](../../docker-compose.postgresql-replica.yml) · [TLS 與私有 CA](https://developers.cloudflare.com/hyperdrive/configuration/connect-to-private-database-vpc/#tls-certificate-verification) |
| 一致性與延遲 | webhook 去重、人工接手、草稿版本與待派送工作走主庫和關閉查詢快取的 Hyperdrive 設定。連線池可以省下反覆建立連線的時間，每次寫入仍需經 NAS 網路往返。測試台灣流量下的 webhook 提交 P95、客服接手 P95、尖峰連線數與 NAS 上傳頻寬。將同一操作的資料庫往返合併成短交易，模型推論放在交易外。[Hyperdrive 讀寫一致性](https://developers.cloudflare.com/hyperdrive/get-started/) |
| NAS 斷線 | 本版採用入站 Queues。入口在 Cloudflare 讀取各 Bot 的驗簽設定，整批事件都成功入列才向 LINE 確認。主庫離線期間可收件，人工接手和派送暫停。復線後依事件 ID 去重補入主庫，檢查接手狀態與回覆時效。提議付費方案入站及死信各保留 7 天，到期前依積壓告警處理。[主計畫的離線流程](重構計畫.md#nas-離線與恢復) · [Queues 限制](https://developers.cloudflare.com/queues/platform/limits/) |
| 維護與帳單 | Hyperdrive 包含於 Workers 方案；Workers VPC 目前為開放測試，測試期間免費，仍適用 Workers 用量計費。NAS 成本包含電力、磁碟、網路、異機備份及維護時間。同機副本無法在整台 NAS 離線時接手。以隔離環境演練從異機備份或備份加 WAL 還原，並驗證訊息順序及待派送狀態。[Hyperdrive 定價](https://developers.cloudflare.com/hyperdrive/platform/pricing/) · [Workers VPC 定價與階段](https://developers.cloudflare.com/workers-vpc/platform/pricing/) |

**試點順序。** 在 NAS 同一個 PostgreSQL 實例建立隔離測試庫及角色。先從 Worker 經私網完成讀寫，再用測試 Bot 驗證 webhook 去重與人工接手。中斷測試用 tunnel 再恢復，記錄客服畫面、重送處理與補齊時間。確認能在隔離環境還原資料，以及斷線時間符合你的客服需求後，再切正式流量。這次評估僅查閱版本庫與服務規格，NAS 實際網路、憑證、備份及延遲尚待驗證。

## 現況與目標

| 責任 | 程式庫裡的現況 | 建議歸屬 |
|---|---|---|
| 網頁與 API 入口 | React／Vite 建置後由 Docker 內的 serve 提供 dist，建置時寫入多個網域，另複製 assets、manifest 和 service worker | Workers Static Assets 提供網頁。API、WebSocket、登入回呼及 webhook 進 Worker。遷移期間按路由轉發到 FastAPI。[前端容器](../../frontend/Dockerfile) · [建置後處理](../../frontend/copy-assets.js) · [SPA 路由](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) |
| LINE 對話與客服工作區 | Mongo 對話文件內嵌 messages，AI 分析和上下文也直接讀 Mongo。Bot、規則等資料在 PG | 一則訊息一列。PG 拿 (bot_id, source_type, source_id) 找對話，依 conversation_id、seq 分頁。異質 LINE payload 用 JSONB。接手狀態、事件、待發訊息和發送結果同庫。[對話服務](../../backend/app/services/conversation/conversation_service.py) · [上下文](../../backend/app/services/conversation/context_builder.py) |
| 檔案與圖像 | MinIO 保存聊天媒體、知識原檔、頭像及編輯器素材。部分已發布內容含完整代理網址 | R2 保存物件。PG 保存擁有者、用途、版本、檔案鍵與雜湊。公開發布素材與私有資料各用獨立 bucket。[儲存服務](../../backend/app/services/storage/minio_service.py) · [R2 自訂網域](https://developers.cloudflare.com/r2/buckets/public-buckets/) |
| Redis 與背景工作 | webhook 用 Redis 去重，WebSocket 用 Pub/Sub 廣播，儀表板和部分查詢用快取。另有程序內的 PriorityQueue 和執行緒 | PG 唯一鍵承接去重，PG 索引與增量彙總供畫面查詢，Queues 承接可重試工作。保留即時客服時，由 Durable Object 管理同一 Bot 的連線。重連後依游標補讀 PG。[webhook](../../backend/app/api/api_v1/webhook.py) · [WebSocket](../../backend/app/services/realtime/websocket_manager.py) · [背景任務](../../backend/app/services/runtime/background_tasks.py) · [WebSocket 休眠](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) |
| 模型、文件及向量 | AI 接管內有固定 Groq 模型，AI 分析也有 Gemini 路徑，文件摘要及 OpenAI embedding 各有呼叫點。知識與對話記憶已有 1536 維欄位 | Worker 透過 AI binding 呼叫 Cloudflare 代管模型。需要語意檢索時，向量仍放 PG 的 pgvector。模型與執行政策以發布版本管理。[AI 接管](../../backend/app/services/ai/ai_takeover_service.py) · [分析](../../backend/app/services/ai/ai_analysis_service.py) · [知識模型](../../backend/app/models/knowledge.py) · [對話記憶](../../backend/app/models/conversation_memory.py) |
| 帳號郵件 | 驗證與密碼重設使用 SMTP，設定含外部郵件伺服器 | 如要一併退出 SMTP，可試 Cloudflare Email Sending，目前為 Beta。寄給一般註冊者需 Workers Paid；以實際收件網域驗收送達、退信與重寄。LINE Login 與 Messaging API 仍是產品必要的通路。[郵件服務](../../backend/app/services/auth/email_service.py) · [方案與限制](https://developers.cloudflare.com/email-service/platform/pricing/) |

## 一則訊息從進站到回覆

1. **先在 Cloudflare 確認收件。** Webhook Worker 用已發布至專用私有 R2 的 Bot 驗簽設定校驗原始請求，再把事件送入入站 Queues。整批成功後回 LINE 2xx。多事件請求部分失敗時回傳失敗，讓重送交由後續唯一鍵處理。空事件驗證另行成功回應。一般事件直接入列，超限內容先存私有 R2 再入列參照，兩者都成功才確認。入口讀取設定所需的解密金鑰由 Worker secret 提供。[LINE webhook](https://developers.line.biz/en/docs/messaging-api/receiving-messages/) · [Queues 限制](https://developers.cloudflare.com/queues/platform/limits/)
2. **寫主庫並分派。** 消費者經 Hyperdrive、TCP VPC Service、Tunnel 在 NAS 主庫完成短交易，用 (bot_id, webhook_event_id) 同時落實去重、寫訊息、建立待辦。提交後才向入站佇列確認消費。待辦成功提交後可立即通知工作 Worker，另用定時掃描補送未派的 job ID。工作可用獨立工作佇列與短租約重試，文件匯入等慢工作分開調度。亂序事件保留發生時間與提交序號，補入歷史後重新核對本輪是否仍適合回應。關係到接手與派送的讀取關閉快取。量測入口確認、排隊、PG 提交與模型各段 P95。[Queues 投遞語意](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) · [Hyperdrive 私網連線](https://developers.cloudflare.com/hyperdrive/configuration/connect-to-private-database-vpc/)
3. **決策。** 固定規則先跑，只有明確 AI 節點或允許接管的未命中事件才進入 TypeScript agent loop。它按需呼叫 knowledge.search、knowledge.read、conversation.read_recent、flex.render 等工具。Worker 依 Bot 與文件版本授權，從 PG 或 R2 讀有限範圍，把結果交回模型。設定每個 run 的步數、用量及時間預算；將工具、來源位置、耗時及結果記入 PG。推論期間釋放 DB 連線。當來源不足、模型限流或超時，依政策要求澄清或移給客服。[Workers AI 工具呼叫](https://developers.cloudflare.com/workers-ai/features/function-calling/)
4. **送出與接手。** 流程模擬器及正式執行器共用版本化的 ReplyPlan，預覽使用測試工具。只有派送端持有 LINE token。接手時在 PG 提高對話的控制版本，取消尚未送出的舊任務。送出前再核對控制版本、reply token 的時效及一次性。已在傳送中的訊息在客服介面明示。LINE 回應不明時記為待確認，自動改用 push 容易造成雙重回覆。Durable Object 只向已授權連線推播已提交事件，歷史以 PG 為準。[LINE 回覆訊息](https://developers.line.biz/en/reference/messaging-api/#send-reply-message) · [LINE 重試](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/)

**維運取捨。** 收件匣需要即時接手與跨分頁同步，這是引入 Durable Objects 最有價值的地方。若首批 Bot 可接受數秒延遲，可先用游標輪詢，並量測 PG 查詢量。第一版可省下 KV、D1、Vectorize、AI Search 及額外 agent 平台。PG 使用 NAS 上的新資料庫，建議以異機備份及 WAL 歸檔建立可驗證的時間點還原能力。入站由 Cloudflare 暫存，客服讀寫與提交回覆依賴 PG。應演練 PG 故障、恢復後消化積壓、R2 物件搭配資料庫版本還原，以及 AI 暫停時的人工接手。Cloudflare 區域故障也可能同時影響網站、佇列及模型。

## Workers AI 能否完全接手模型

**可以收斂成一套供應商介面。** 新 Worker 可用 env.AI.run 呼叫代管模型，線上路徑不必保存 Groq、Gemini、OpenAI 的 key。建議先自建小型 TypeScript harness，沿用本案的發布版本、接手、取消及 outbox 規則。原有 Python 後端在過渡期仍可透過受控服務介面使用同一套推論。模型只提出工具要求，讀哪份檔案、可讀多長、能否發 Flex 均由應用程式決定。UI 可用「客服回覆」「摘要」「語意搜尋」呈現用途，供管理者檢視實際模型版本、錯誤與用量。[官方模型與介面](https://developers.cloudflare.com/workers-ai/features/function-calling/) · [推論資料處理說明](https://developers.cloudflare.com/workers-ai/platform/data-usage/)

| 工作 | 首輪試用候選與採用條件 |
|---|---|
| 繁中客服與工具選擇 | 把同一批已去識別、有人審定的台灣客服對話交給 @cf/google/gemma-4-26b-a4b-it 和 @cf/qwen/qwen3.8-27b。兩者皆列有 function calling。量測正確工具及參數、繁中語意、引用版本、缺證移交、P95 及每個成功案件成本。用達標且便宜者作預設。[Gemma](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/) · [Qwen](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) |
| 摘要與分析 | 以新建文件、報表和測試問答檢查結構化輸出，記錄各功能的模型用量。版本升級前重跑同一套案例。[模型生命週期公告](https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/) |
| 檢索與讀原文 | 先比較「文件目錄＋關鍵字＋原文」和加入 @cf/baai/bge-m3 的命中率。若測試顯示需要向量索引，再針對新文件產生向量，查詢與文件固定同模型和版本。[BGE-M3](https://developers.cloudflare.com/workers-ai/models/bge-m3/) |

**文件解析是保留 Python 的主要理由。** 先比較 Workers AI 的 toMarkdown 與既有擷取器在實際繁中 PDF、表格、DOCX、掃描件的結果，檢查頁碼／段落能否定位、檔案上限、逾時及重試。OCR 或缺少頁碼的內容應標明證據位置。若原生套件實測仍有必要，可把該解析器單獨放 Cloudflare Containers，由 Worker 提交工作及存取 R2。其映像、啟動延遲、資源與維運成本另計。Python Workers 支援 FastAPI 及部分套件，但目前的 SQL 驅動、執行緒和程序內排程都要逐項驗證，不能用「支援 FastAPI」推定整套後端可原封搬遷。[Python 套件支援](https://developers.cloudflare.com/workers/languages/python/packages/) · [文件轉換](https://developers.cloudflare.com/workers-ai/features/markdown-conversion/) · [Containers](https://developers.cloudflare.com/containers/)

## 實際帳單可能是多少

以下為美金月估算，採 2026-11-27 查得的單價。假設每月 10,000 個 AI 案件，每案把**所有往返**相加為 2,500 input 與 400 output tokens，每月合計 25M／4M。假設沒有快取折扣，模型部分採牌價未扣免費額度。這些是比較用假設，尚未取得本案的實際用量。

| 項目 | 算式與小計 |
|---|---|
| Worker | Paid 起價 US$5／月。靜態資產請求免費。API 執行、超額 CPU、紀錄另依用量；Hyperdrive 連線池包含於方案。[Workers](https://developers.cloudflare.com/workers/platform/pricing/) · [Hyperdrive](https://developers.cloudflare.com/hyperdrive/platform/pricing/) |
| R2 Standard | 若月平均存放 100 GB、帳戶的 10 GB-month 免費額度全可用，儲存費 (100−10) × $0.015 = **$1.35**。另計超額讀寫，R2 網路傳出免費。[R2](https://developers.cloudflare.com/r2/pricing/) |
| Gemma 或 Qwen 擇一 | Gemma 為 25 × $0.10 + 4 × $0.30 = **$3.70**。Qwen 為 25 × $0.45 + 4 × $3.20 = **$24.05**。長對話、工具傳回的文字及重試都會增加 token。[Gemma 單價](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/) · [Qwen 單價](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) |

上述三項合計約 **$10.05 或 $30.40／月**。完整預算還需加 NAS 電力、磁碟、網路及異機備份、Queues 操作、即時連線、寄信、embedding／解析、監控及選用的容器。決策前至少採集一個具代表性的營運週期，記錄尖峰 webhook／秒、同時在線客服、PG 查詢延遲、檔案大小分布、每案模型往返與輸入輸出量。與現有主機和人員花在更新、備份、還原的時間一併比較。[Queues 計費](https://developers.cloudflare.com/queues/platform/pricing/) · [Workers AI 計費](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## 切換順序與退役條件

| 階段 | 切換內容 | 放行與回退 |
|---|---|---|
| 0 · 私網與還原 | 測試 Bot、私有 TCP 路徑、主庫 TLS、隔離測試庫與異機備份。 | 經 Worker 成功讀寫，演練 Tunnel 中斷、復線與備份還原。 |
| 1a · 前端 | 將現有 dist 部署到預覽網域，沿用既有 API 契約。新設計可獨立驗收。設定深連結 fallback，保留 API 404、WS upgrade、OAuth callback 與 webhook。檢查 Cookie、CORS、舊 SW 更新、附件與私有 API 快取。 | 桌機及手機完成登入、重設密碼、聊天與兩個編輯器的載入／儲存，直接重整子頁成功。可獨立把前端路由切回舊站。 |
| 1b · R2 | 新工作區使用專屬空間。新文件依 Bot、版本及雜湊寫入私有 R2，發布的公開圖片另用公開空間。 | 驗證第一份文件、重送、撤回、跨 Bot 權限，以及 LINE 可讀取新發布的圖片。 |
| 2 · 收件與 PG 對話 | 建立入口驗簽設定、Queues 與 PG 唯一鍵，從新 Bot 的第一則事件建立對話。 | 重送只存一則，斷線復原可補收。人工接手後取消待辦。驗證備份可還原新對話及其引用。[全新工作區驗收](重構計畫.md) |
| 3–5 · 模型與工作區 | 用新文件及測試事件評測 Workers AI。逐 Bot 開啟工具，發布新流程與 Flex。逐項完成剩餘 FastAPI 路由、分析、排程、郵件及 LINE 憑證存取。 | 模型引用可追溯，派送可切回人工。新工作區的功能在獨立 PG 與 Cloudflare 服務上通過驗收。 |

這次依據 repository 與官方服務規格評估。上線決策仍缺正式資料體積、尖峰流量、NAS 實際網路與還原能力、真實模型品質及可接受的客服延遲。第一個技術試點建議選一個測試 Bot，串起「LINE 事件 → 驗簽並入列 → NAS PG → 查一份私有 R2 文件 → 繁中回覆提案 → 人工接手」，記錄每段耗時、每案成本與重送結果；它比只測模型單輪問答更能驗證整套方案。
