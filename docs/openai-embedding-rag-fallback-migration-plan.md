# OpenAI Embedding 與 RAG Fallback 遷移計劃

## 背景

目前 AI 知識庫流程使用本地或混合 embedding 服務，查詢與上傳處理過程中可能載入 `sentence-transformers` / `transformers`，造成伺服器 CPU、RAM 與啟動負擔偏高。RAG 也位於主要回答路徑中，LINE 用戶詢問時可能經過意圖判斷、embedding、向量查詢、rerank 與 LLM 回答，導致延遲偏長。

本計劃目標是：

- 將 RAG 降級為 fallback，不作為所有問題的預設主路徑。
- 將 embedding provider 改為 OpenAI `text-embedding-3-small`。
- 直接採用 OpenAI 預設 1536 維向量。
- 移除本地 embedding 模型與本地 rerank 相關邏輯，降低伺服器負載。
- 將既有知識庫 chunk 全量重新 embedding，避免新舊向量空間混用。

## 執行策略

本計劃分成兩條工作線，不建議一次完成所有變更：

1. Embedding 遷移線：
   - OpenAI embedding service。
   - `knowledge_chunks.embedding` 由 `vector(768)` 遷移到 `vector(1536)`。
   - 新寫入與 backfill 改為 `text-embedding-3-small / 1536`。
   - RAG fallback SQL 只查 OpenAI 1536 維 chunks。
   - 移除本地 embedding / rerank 依賴。

2. 文件主路徑線：
   - 文件轉 Markdown 原文。
   - 文件 metadata、AI tags、章節摘要、章節 tags。
   - 文件級 routing 與全文搜尋。
   - OCR fallback。
   - RAG 僅保留為低信心 fallback。

第一版應優先完成 embedding 遷移線，確保資料庫、backfill、查詢條件與依賴移除都穩定後，再推進文件主路徑線。這樣可以降低 schema 遷移、查詢行為改變與文件處理改版同時上線的風險。

OpenAI 官方文件指出 `text-embedding-3-small` 預設 embedding 長度為 1536，`text-embedding-3-large` 預設為 3072，且 embeddings API 可用於 search/retrieval 類場景。

參考：

- https://developers.openai.com/api/docs/guides/embeddings
- https://api.openai.com/v1/embeddings

## 目標架構

### 查詢主路徑

```text
LINE 用戶問題
  -> 規則式快速判斷是否閒聊
  -> 文件標題 / AI 摘要 / AI tags / 文件類型 / 章節摘要 / 全文搜尋
  -> 先判斷候選文件或候選章節
  -> 需要更多內容時才讀取 Markdown 原文或命中章節原文
  -> LLM 根據原文回答
```

### RAG fallback

```text
主路徑低信心或找不到資料
  -> OpenAI text-embedding-3-small 產生 query embedding
  -> pgvector 查 knowledge_chunks.embedding vector(1536)
  -> 取 top K chunk
  -> LLM 根據 chunk 回答
```

### 不再保留的 fallback

```text
OpenAI embedding 失敗
  -> 不回退到本地 sentence-transformers
  -> 改為使用文件/全文搜尋結果，或回覆找不到足夠資料
```

## 目前相關模組

需要盤點與修改的主要位置：

- `backend/app/services/embedding/embedding_service.py`
- `backend/app/services/embedding/embedding_manager.py`
- `backend/app/services/embedding/embedding_cache.py`
- `backend/app/services/knowledge/knowledge_processing_service.py`
- `backend/app/api/api_v1/ai_knowledge.py`
- `backend/app/services/rag/rag_service.py`
- `backend/app/services/rag/hybrid_search_service.py`
- `backend/app/services/rag/rerank_service.py`
- `backend/app/services/runtime/background_tasks.py`
- `backend/app/models/knowledge.py`
- `backend/requirements.txt`
- `backend/migrations/versions/*embedding*.py`

## 設定規格

新增或調整環境變數：

```env
OPENAI_API_KEY=...
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
EMBEDDING_TIMEOUT_SECONDS=15
EMBEDDING_BATCH_SIZE=64
EMBEDDING_MAX_RETRIES=3
RAG_FALLBACK_ENABLED=true
RAG_DEFAULT_TOP_K=3
RAG_DEFAULT_THRESHOLD=0.7
RAG_RERANK_ENABLED=false
OCR_ENABLED=true
OCR_PROVIDER=openai_vision
PANDOC_ENABLED=true
PANDOC_TIMEOUT_SECONDS=30
PANDOC_MAX_FILE_SIZE_MB=20
DOCUMENT_ROUTE_MAX_CANDIDATES=5
DOCUMENT_ROUTE_MAX_SECTIONS=3
```

建議將 embedding 設定集中在 `settings.py`，不要在知識庫寫入、RAG 查詢或 migration script 中硬編碼模型名稱與維度。

## 資料庫遷移計劃

### Schema 變更

目前 `KnowledgeChunk.embedding` 是 `Vector(768)`，目標改為：

```python
embedding = Column(Vector(1536) if Vector else Text, nullable=True)
embedding_model = Column(String(64), nullable=True, server_default="text-embedding-3-small")
embedding_dimensions = Column(String(16), nullable=True, server_default="1536")
```

### Alembic migration

新增 migration：

1. Drop 既有 embedding HNSW / IVFFlat index。
2. 暫時停用 RAG fallback 或標記資料需要重建。
3. 將 `knowledge_chunks.embedding` 改成 `vector(1536)`。
4. 將既有 `embedding` 清空，避免 768 舊向量殘留。
5. 更新 `embedding_model = 'text-embedding-3-small'`。
6. 更新 `embedding_dimensions = '1536'`。
7. 重建 HNSW index。

範例 SQL 方向：

```sql
DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_hnsw;
DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_cosine;
DROP INDEX IF EXISTS idx_kchunks_embedding_hnsw;
DROP INDEX IF EXISTS idx_kchunks_embedding_ivfflat;

ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(1536);

UPDATE knowledge_chunks
SET embedding_model = 'text-embedding-3-small',
    embedding_dimensions = '1536';

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops);
```

實際 migration 需依目前 index 名稱與生產資料庫狀態調整，並在 staging 先驗證。

## OpenAI Embedding Service 設計

### 保留對外介面

保留目前使用中的介面，降低改動範圍：

```python
async def embed_text(text: str, model_name: Optional[str] = None, use_cache: bool = True) -> list[float]

async def embed_texts(
    texts: Sequence[str],
    model_name: Optional[str] = None,
    batch_size: int = 64,
    adaptive: bool = True,
) -> list[list[float]]
```

### 內部行為

新實作應該：

- 使用 OpenAI Python SDK 呼叫 embeddings API。
- 預設 model 為 `text-embedding-3-small`。
- 不傳 `dimensions`，直接使用預設 1536 維。
- 支援批次 input，避免逐 chunk 單次 API 呼叫。
- 加 timeout、retry、backoff。
- 保留 query embedding cache。
- 記錄 usage tokens、耗時、batch size、錯誤類型。
- OpenAI 失敗時不載入本地模型。

### 建議封裝

新增或重寫為：

```text
backend/app/services/embedding/openai_embedding_service.py
```

職責：

- 建立 OpenAI client。
- `embed_one(text)`
- `embed_many(texts)`
- 清理空字串與過長字串。
- 驗證回傳維度必須為 1536。

## 移除本地模型邏輯

### 必須移除或停用

- `sentence-transformers` 模型載入。
- `transformers` 相關啟動環境變數 workaround。
- `_DummyModel`。
- `EmbeddingManager.get_model(...)` 的本地模型載入。
- Gemini embedding fallback，如果最終決策是 OpenAI-only。
- background embedding warmup。
- 本地 CrossEncoder rerank。

### requirements

若確認沒有其他功能使用，從 `backend/requirements.txt` 移除：

```text
sentence-transformers
transformers
```

注意：移除前需用 `rg` 確認 `transformers` 是否只有 embedding/rerank/warmup 使用。

## 知識庫上傳流程調整

### 文件上傳

`KnowledgeProcessingService` 仍保留：

- 檔案讀取。
- TXT/PDF/DOCX 抽文字。
- 文字清理。
- chunk 切分。
- MinIO 原檔儲存。
- AI 文件摘要。
- 原文儲存。

調整：

- `_generate_embeddings_batch` 改呼叫 OpenAI embedding。
- batch size 改由設定控制。
- `embedding_model` 寫入 `text-embedding-3-small`。
- `embedding_dimensions` 寫入 `"1536"`。
- 若 embedding API 失敗，任務可標記為 `completed_without_embedding` 或 `failed_embedding`，避免整份文件完全不可用。

建議新增 job 狀態：

```text
pending
processing
completed
completed_without_embedding
failed
```

這樣主路徑仍可透過 Markdown / metadata 使用該文件，RAG fallback 則等 embedding 補齊。

### 文字知識新增

`ai_knowledge.py` 的文字知識新增也要同步改：

- 不再硬編碼 `all-mpnet-base-v2`。
- 不再硬編碼 768。
- 使用同一個 embedding service。

## Backfill 計劃

### 原則

舊本地模型向量與 OpenAI 向量不能混用。即使都是 768 維也不能混用，現在改 1536 維後更必須全量重建。

### Backfill 腳本

新增腳本：

```text
backend/scripts/migration/backfill_openai_embeddings_1536.py
```

流程：

1. 查詢 `knowledge_chunks` 中未刪除且 `content` 非空的資料。
2. 分批處理，例如每批 64 或 128 chunks。
3. 呼叫 OpenAI embedding。
4. 驗證每筆 embedding 長度為 1536。
5. 更新：
   - `embedding`
   - `embedding_model`
   - `embedding_dimensions`
   - `updated_at`
6. 記錄進度與失敗 chunk id。
7. 支援 resume，避免中斷後重跑全部。

### Backfill 期間策略

選一種：

#### 方案 A：停用 RAG fallback

最安全：

```text
RAG_FALLBACK_ENABLED=false
```

Backfill 完成後再開。

#### 方案 B：只查已完成 OpenAI embedding 的 chunks

RAG SQL 加條件：

```sql
embedding IS NOT NULL
AND embedding_model = 'text-embedding-3-small'
AND embedding_dimensions = '1536'
```

這樣可以逐步上線，但實作稍複雜。

建議採用方案 A，除非生產環境不能短暫停用 RAG fallback。

## RAG Fallback 查詢調整

### SQL 條件

RAG 查詢必須只查 OpenAI 1536 向量：

```sql
WHERE (kc.bot_id = CAST(:bot_id AS UUID) OR kc.bot_id IS NULL)
  AND kc.deleted_at IS NULL
  AND kd.deleted_at IS NULL
  AND kc.embedding IS NOT NULL
  AND kc.embedding_model = 'text-embedding-3-small'
  AND kc.embedding_dimensions = '1536'
```

### 預設參數

```text
top_k = 3
threshold = 0.7
rerank = false
```

RAG fallback 應該只在主路徑低信心時執行，避免每次 LINE 問題都打 OpenAI embedding API。

## 文件優先主路徑規劃

為了讓 RAG 真正變 fallback，需要新增文件級檢索。

### 新的上傳流程

管理者在後台上傳檔案後，檔案不應只被切 chunk 與 embedding。新的處理流程應該先把檔案整理成可查詢的文件知識單位。

```text
管理者上傳檔案
  -> 檔案格式檢查
  -> 原檔存 MinIO
  -> 內容抽取 / Markdown 轉換
      -> TXT 直接讀取純文字
      -> DOCX / HTML / ODT 優先使用 pandoc 轉 Markdown
      -> PDF 優先使用既有 PDF 文字抽取器
      -> 若文字不足或疑似掃描/圖片型文件，啟動 OCR
  -> 清理文字
  -> 正規化成 Markdown 原文
  -> AI 文件分析
      -> 文件標題
      -> 文件類型
      -> 文件摘要
      -> AI tags
      -> 適用問題範圍
      -> 章節切分
      -> 章節摘要
      -> 章節 tags
      -> 關鍵實體
  -> 儲存文件 metadata 與 Markdown 原文
  -> 背景產生 OpenAI 1536 維 embedding，僅供 RAG fallback
```

### 文字抽取與 OCR

目前 TXT/PDF/DOCX 的文字抽取只能處理「文件本身有文字層」的內容。如果使用者上傳的是掃描 PDF、圖片型 PDF、菜單截圖轉 PDF、含大量圖片文字的 DOCX，原生抽取可能得到空字串或極少文字。

因此上傳處理需要 OCR fallback：

```text
原生文字抽取完成
  -> 若 text 長度低於門檻，例如 < 100 字
  -> 或 PDF 頁數存在但文字密度過低
  -> 或偵測到檔案主要是圖片
  -> 啟動 OCR
```

OCR 建議策略：

- 第一版可使用 OpenAI vision-capable model 做 OCR 與版面理解。
- PDF 每頁先轉圖片，再送 OCR。
- 圖片型文件保留頁碼資訊，Markdown 中標記來源頁。
- OCR 結果需要經過文字清理與段落重組。
- OCR 失敗時仍保留原檔，文件狀態標記為 `ocr_failed` 或 `text_extraction_failed`。

OCR 產出的 Markdown 應包含頁碼，例如：

```md
# 文件標題

<!-- source: page 1 -->

## 章節 A

...

<!-- source: page 2 -->

## 章節 B

...
```

### Markdown 原文轉換

上傳後應儲存一份 AI 整理過、但不改變事實內容的 Markdown 原文。

### Pandoc 轉換策略

Pandoc 適合做「結構化文件到 Markdown」的第一層轉換，但不應取代 PDF 抽取或 OCR。

適合優先使用 pandoc：

- DOCX：保留標題、清單、表格、連結等結構，比目前只讀 paragraphs 更完整。
- HTML：轉成 GitHub Flavored Markdown，方便後續搜尋與章節切分。
- ODT / RTF：若未來支援，可沿用同一套轉換入口。

不建議使用 pandoc 作為主方案：

- PDF：PDF 是版面格式，pandoc 不是可靠的 PDF-to-Markdown 工具。
- 掃描 PDF / 圖片型 PDF：仍需 OCR。
- 圖片文字、菜單截圖、含大量圖片文字的 DOCX：pandoc 只能抽出文件內可解析的文字或媒體參照，圖片中的文字仍需 OCR。

第一版建議實作：

```text
DOCX / HTML / ODT
  -> pandoc -f <source_format> -t gfm
  -> 成功：儲存 original_content_md，並由 Markdown 反推純文字 original_content
  -> 失敗：fallback 到現有文字抽取器

PDF
  -> 既有 PDF extractor
  -> 若文字密度不足：OCR
  -> 將抽取結果正規化為 Markdown
```

Pandoc 整合要求：

- 在 Docker image / runtime 明確安裝 pandoc；目前本機環境未預設提供 pandoc。
- 只允許受支援副檔名與 MIME type 進入 pandoc。
- 使用暫存檔時必須清理。
- 加入 timeout，例如 `PANDOC_TIMEOUT_SECONDS=30`。
- 加入最大檔案大小限制，例如 `PANDOC_MAX_FILE_SIZE_MB=20`。
- 記錄 `conversion_method`、`conversion_status`、錯誤訊息與耗時。
- 不把 pandoc 失敗視為整份文件失敗，應 fallback 到現有 extractor 或標記為 `markdown_conversion_failed`。

轉換原則：

- 保留原文資訊，不擅自補充。
- 修正 OCR 常見換行問題。
- 用 Markdown 標題呈現章節。
- 表格、價目表、規則列表盡量轉成 Markdown table 或 bullet list。
- 保留頁碼或段落來源，方便回答時引用。
- 不把摘要混入原文。

範例：

```md
# 店家介紹

## 品牌理念

...

## 營業資訊

| 項目 | 內容 |
| --- | --- |
| 地址 | ... |
| 電話 | ... |
| 營業時間 | ... |
```

### 上傳時產物

每份文件應儲存：

- `title`
- `original_file_name`
- `source_type`
- `ai_summary`
- `ai_tags`
- `doc_type`
- `intended_questions`
- `original_content`
- `original_content_md`
- `keywords`
- `entities`
- `sections`
- `section_summaries`
- `section_keywords`
- `section_tags`
- `extraction_method`
- `conversion_method`
- `conversion_status`
- `ocr_used`
- `ocr_status`
- `source_pages`

### AI 摘要與 tags 規格

AI 文件分析不只產生摘要，還要產生可用於查詢路由的 metadata。

建議 JSON 結構：

```json
{
  "title": "文件標題",
  "doc_type": "store_intro | menu | rules | guide | faq | policy | announcement | other",
  "summary": "100-300 字繁體中文摘要",
  "ai_tags": ["營業時間", "會員規則", "預約流程", "退換貨"],
  "keywords": ["品牌名稱", "服務項目", "地址"],
  "entities": {
    "prices": [],
    "dates": [],
    "locations": [],
    "contacts": [],
    "products": [],
    "services": [],
    "rules": []
  },
  "intended_questions": [
    "這份文件可以回答哪些常見問題"
  ],
  "sections": [
    {
      "section_id": "sec_001",
      "heading": "章節標題",
      "summary": "章節摘要",
      "tags": ["章節標籤"],
      "keywords": ["章節關鍵字"],
      "source_pages": [1, 2]
    }
  ]
}
```

這些 metadata 是查詢主路徑的核心，不應只用於前端顯示。

### 查詢時順序

```text
1. 規則式閒聊判斷
2. 檔名 / 文件標題搜尋
3. AI tags / doc_type / keywords 命中
4. 文件 AI 摘要比對
5. 章節標題 / 章節摘要 / 章節 tags 比對
6. PostgreSQL full-text / trigram 搜尋 Markdown 原文
7. 若候選文件明確，讀取該文件 Markdown 原文或相關章節
8. 若候選不明確，請 LLM 根據候選摘要選文件或章節
9. 若仍無法命中，OpenAI embedding RAG fallback
```

這可以降低 embedding API 次數，也能避免把 RAG 放在所有請求的主路徑。

### 新的查詢流程細節

LINE 用戶詢問時，不應一開始就向量化。新的查詢流程如下：

```text
LINE 問題
  -> 正規化問題
  -> 快速閒聊規則
  -> 讀取該 bot 可用文件列表
      -> title
      -> ai_summary
      -> ai_tags
      -> doc_type
      -> intended_questions
      -> section summaries
  -> 本地輕量 scoring
      -> 標題命中
      -> tag 命中
      -> keyword 命中
      -> doc_type 命中
      -> section summary 命中
      -> full-text/trigram 命中
  -> 產生候選文件/章節
  -> 判斷是否需要讀取原文
      -> 高信心且摘要足夠：可直接用摘要回答簡單問題
      -> 需要細節：讀取 Markdown 原文或命中章節
      -> 文件太長：只讀命中章節與相鄰章節
  -> LLM 根據讀取內容回答
  -> 若找不到候選或信心不足：RAG fallback
```

### 什麼時候只讀摘要

適合只讀摘要回答：

- 使用者問「這份文件大概在說什麼？」
- 使用者問「你們有沒有會員規則？」
- 使用者問「這裡有沒有預約相關資訊？」

這類問題只需要判斷文件是否相關，不一定要讀全文。

### 什麼時候讀 Markdown 原文

需要讀原文：

- 問價格、時間、地址、電話、限制條款、步驟、細節。
- 問「第幾點規則是什麼」。
- 問「如何申請/預約/退費」。
- 摘要命中但不包含答案細節。
- 多個文件摘要都相似，需要看原文消歧。

讀取策略：

```text
小文件
  -> 讀整份 Markdown

大文件
  -> 讀命中章節
  -> 加上前後相鄰章節
  -> 加上文件摘要與章節摘要
```

### 候選文件 scoring 建議

第一版可用規則分數，不必用 LLM：

```text
title exact match: +50
title partial match: +30
ai_tags match: +25
keywords match: +20
doc_type match: +15
section heading match: +25
section summary match: +15
full-text match: +10
recently uploaded/current active document: +10
```

若最高分明顯高於第二名，直接讀該文件或章節。若分數接近，再把候選摘要交給 LLM 選擇。

### LLM 文件選擇 prompt 輸入

只有候選不明確時，才讓 LLM 選文件。輸入不應包含全文，只包含候選 metadata：

```text
用戶問題：
...

候選文件：
1. title
   doc_type
   ai_summary
   ai_tags
   intended_questions
   sections: heading + summary + tags

請選出最可能需要讀取的文件與章節。
只回傳 JSON。
```

回傳範例：

```json
{
  "confidence": 0.82,
  "selected_documents": [
    {
      "document_id": "...",
      "section_ids": ["sec_001", "sec_003"],
      "reason": "問題詢問預約規則，與文件 tags 和章節摘要相符"
    }
  ],
  "needs_full_document": false
}
```

## OCR 與 Markdown 儲存設計

### 建議資料欄位

目前 `KnowledgeDocument` 已有 `original_content` 與 `ai_summary`。建議新增欄位或放入 `meta`，第一版若要降低 DB migration 數量，可先放 `meta`，穩定後再拆欄位。

建議欄位：

```text
original_content_md: Text
ai_tags: JSONB
doc_type: String
keywords: JSONB
entities: JSONB
sections: JSONB
extraction_method: String
conversion_method: String
conversion_status: String
ocr_used: Boolean
ocr_status: String
```

若先放 `meta`：

```json
{
  "original_content_md": "...",
  "ai_tags": [],
  "doc_type": "guide",
  "keywords": [],
  "entities": {},
  "sections": [],
  "extraction_method": "native_pdf | docx | txt | ocr",
  "conversion_method": "pandoc | native_text | pdf_extractor | ocr | none",
  "conversion_status": "success | failed | skipped",
  "ocr_used": true,
  "ocr_status": "success"
}
```

### OCR provider 建議

第一版建議：

- 優先使用 OpenAI vision-capable model 做 OCR + 版面理解。
- 輸出 Markdown，而不只是純文字。
- 保留頁碼。
- 對大型 PDF 做分頁處理與並發限制。

後續若成本或大量 OCR 壓力上升，可再評估：

- Google Cloud Vision
- AWS Textract
- Azure Document Intelligence
- self-hosted OCR worker

但不建議在主 API server 內跑重型本地 OCR，否則會重回伺服器負載問題。

### OCR 啟動門檻

建議規則：

```text
native_text_length < 100
OR native_text_length / page_count < 50
OR PDF image ratio high
OR user manually requests OCR
```

### OCR 任務資源限制

- OCR 一律背景處理。
- 單 bot 同時最多 1-2 個 OCR 任務。
- 全站 OCR 併發限制。
- 每頁 OCR timeout。
- 最大頁數限制。
- 超過限制時讓使用者分批上傳或排隊。

## 效能與成本控制

### 伺服器負載

預期改善：

- 不再載入本地 sentence-transformers。
- 不再載入 transformers。
- 不再有 embedding warmup。
- 不再有本地 CrossEncoder rerank。
- 查詢 CPU/RAM 壓力下降。

### API 成本

需要控制：

- 上傳時 batch embedding。
- 查詢時只在 fallback 用 query embedding。
- query embedding cache。
- 常見問題答案 cache。
- 避免對空字串、超短無意義文字產生 embedding。

### Rate limit

需要加入：

- OpenAI API retry/backoff。
- background job concurrency limit。
- per-user upload concurrency limit。
- backfill sleep / rate limit。
- OpenAI API error metrics。

## 觀測指標

### 必須新增或補強的 tracing

每次 LINE AI 接管記錄：

- webhook receive time
- logic engine time
- document route time
- full-text search time
- embedding API time
- vector search time
- LLM answer time
- LINE push time
- total time
- route used: `document_route` / `rag_fallback` / `chat` / `no_answer`

### 驗收目標

建議第一版目標：

- 主路徑 P50 < 3 秒。
- 主路徑 P95 < 8 秒。
- RAG fallback P50 < 5 秒。
- API server memory 明顯低於移除本地模型前。
- 部署後不再出現 sentence-transformers model loading 日誌。

## 測試計劃

### 單元測試

- OpenAI embedding service mock。
- embedding 維度必須是 1536。
- batch embedding 回傳數量與輸入數量一致。
- OpenAI API 失敗時不 fallback 本地模型。
- cache hit 不再呼叫 OpenAI。

### 整合測試

- 上傳 TXT，確認 chunk 寫入 1536 維 embedding。
- 上傳 DOCX，確認 pandoc 轉出 Markdown，保留標題、清單與表格。
- pandoc 不可用或轉換 timeout 時，確認會 fallback 到現有文字抽取器或標記 `markdown_conversion_failed`。
- 上傳 PDF，確認抽文字、摘要、embedding、MinIO 路徑。
- 上傳掃描 PDF 或低文字密度 PDF，確認觸發 OCR fallback，而不是依賴 pandoc。
- 新增文字知識，確認 embedding model/dimensions。
- RAG fallback 查詢只回傳 OpenAI 1536 chunks。
- 舊資料未 backfill 時不被 RAG 查到。

### 回歸測試

- AI 接管開關仍有效。
- 積木邏輯命中時不觸發 AI 接管。
- AI 接管只處理文字訊息。
- 知識庫文件列表仍可顯示摘要與 chunk count。
- 批次刪除文件仍會軟刪除 chunks。

## 上線順序

### Phase 1：準備

1. 加入 OpenAI 設定。
2. 新增 OpenAI embedding service。
3. 保留舊服務但先不切流量。
4. 補 tracing。

### Phase 2：DB migration

1. 停用 RAG fallback。
2. 跑 Alembic migration，改 `vector(1536)`。
3. 確認 index 建立成功。

### Phase 3：切換新寫入

1. 文件上傳改用 OpenAI embedding。
2. 文字知識新增改用 OpenAI embedding。
3. 新資料寫入 `text-embedding-3-small / 1536`。

### Phase 4：Backfill

1. 執行 backfill script。
2. 驗證完成率。
3. 抽樣比對查詢結果。

### Phase 5：啟用 RAG fallback

1. RAG SQL 加 OpenAI 1536 條件。
2. 開啟 `RAG_FALLBACK_ENABLED=true`。
3. 預設 top_k 3、rerank false。

### Phase 6：移除本地模型

1. 移除本地 embedding fallback。
2. 移除 embedding warmup。
3. 移除本地 rerank。
4. 移除 `sentence-transformers` / `transformers` dependencies。
5. 確認服務啟動不再載入相關套件。

### Phase 7：Markdown 文件處理

1. 新增 `original_content_md` 與 metadata 儲存策略。
2. DOCX / HTML / ODT 優先使用 pandoc 轉 Markdown。
3. PDF 維持原生文字抽取，低文字密度時觸發 OCR。
4. 補上 pandoc timeout、fallback、錯誤記錄與測試。

### Phase 8：文件主路徑

1. 新增文件 metadata / AI tags / 章節摘要。
2. 查詢優先走文件級路由。
3. RAG 僅作 fallback。

## 風險與處理

### 風險：OpenAI API 不可用

處理：

- 不 fallback 本地模型。
- 使用文件全文搜尋結果回答。
- 或回覆「目前無法完成語意搜尋，請稍後再試」。

### 風險：Backfill 時間長

處理：

- 支援 resume。
- 分批處理。
- 記錄失敗 ids。
- Backfill 期間停用 RAG fallback。

### 風險：成本上升

處理：

- RAG fallback 化。
- query cache。
- answer cache。
- 上傳時 batch embedding。
- 限制檔案大小與 chunk 數量。

### 風險：召回品質變動

處理：

- 建立測試問題集。
- 對比舊 RAG 與 OpenAI 1536 RAG。
- 記錄命中 chunk 與 score。
- 調整 threshold/top_k。

### 風險：pandoc runtime 不存在或版本不一致

處理：

- 在 Docker image 明確安裝 pandoc。
- 啟動時檢查 pandoc 是否可用並記錄版本。
- pandoc 不可用時自動停用 `PANDOC_ENABLED` 或 fallback 到既有 extractor。
- CI / staging 使用與 production 相同的 pandoc 版本。

### 風險：Markdown 轉換品質不穩

處理：

- DOCX / HTML / ODT 先用 pandoc，PDF 不以 pandoc 為主方案。
- 轉換後抽樣比對原文件，特別是表格、價目表、規則條款。
- 對空 Markdown、過短 Markdown、表格遺失等情況標記 `conversion_status=failed`。
- 保留原檔與 `original_content`，避免 Markdown 轉換失敗導致資料不可用。

## 不建議事項

- 不建議 OpenAI 失敗後 fallback 到本地模型。
- 不建議新舊 embedding 混查。
- 不建議在 webhook 同步等待大量文件處理。
- 不建議讓所有 LINE 問題都走 RAG。
- 不建議保留本地 rerank，否則仍會引入 `sentence-transformers`。
- 不建議把 pandoc 當作 PDF / 掃描文件 / OCR 的替代方案。

## 完成定義

本次遷移完成需滿足：

- `knowledge_chunks.embedding` 為 `vector(1536)`。
- 新增與 backfill 後資料皆為 `text-embedding-3-small / 1536`。
- RAG fallback 僅查 OpenAI 1536 chunks。
- 本地 embedding 模型與本地 rerank 不再被載入。
- `requirements.txt` 移除不再需要的本地模型依賴。
- LINE 問答主路徑不再預設執行 embedding。
- 有 tracing 可看出每段耗時與 route used。
- DOCX / HTML / ODT 可產生 Markdown 原文，且 pandoc 失敗時有 fallback。
- PDF 與掃描文件仍走 PDF extractor / OCR，不依賴 pandoc。
