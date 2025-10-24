# LineBot-Web 系統流程圖

本文件說明 LineBot-Web 專案的主要業務流程，包含使用者登入、Bot 建立、Webhook 處理、AI 知識庫等核心功能流程。

## 目錄

- [使用者註冊與登入流程](#使用者註冊與登入流程)
- [LINE Login 流程](#line-login-流程)
- [Bot 建立與設定流程](#bot-建立與設定流程)
- [Webhook 事件處理流程](#webhook-事件處理流程)
- [AI 知識庫處理流程](#ai-知識庫處理流程)
- [視覺化編輯器互動流程](#視覺化編輯器互動流程)
- [訊息廣播流程](#訊息廣播流程)

---

## 使用者註冊與登入流程

### 一般帳密註冊流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant FE as 前端
    participant API as 後端 API
    participant DB as PostgreSQL
    participant Mail as 郵件服務

    User->>FE: 填寫註冊表單
    FE->>FE: 前端驗證
    FE->>API: POST /api/v1/auth/register
    API->>API: 驗證資料格式
    API->>DB: 檢查 username/email 是否存在
    
    alt 帳號已存在
        DB-->>API: 帳號已存在
        API-->>FE: 400 Bad Request
        FE-->>User: 顯示錯誤訊息
    else 帳號可用
        API->>API: bcrypt 雜湊密碼
        API->>DB: 建立新使用者
        DB-->>API: 使用者已建立
        API->>Mail: 發送驗證郵件
        API-->>FE: 201 Created
        FE-->>User: 註冊成功，請檢查郵件
    end
```

### 一般帳密登入流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant FE as 前端
    participant API as 後端 API
    participant DB as PostgreSQL
    participant Redis as Redis

    User->>FE: 輸入帳號密碼
    FE->>API: POST /api/v1/auth/login
    API->>DB: 查詢使用者
    
    alt 使用者不存在
        DB-->>API: 查無使用者
        API-->>FE: 401 Unauthorized
        FE-->>User: 帳號或密碼錯誤
    else 使用者存在
        DB-->>API: 返回使用者資料
        API->>API: 驗證密碼 (bcrypt)
        
        alt 密碼錯誤
            API-->>FE: 401 Unauthorized
            FE-->>User: 帳號或密碼錯誤
        else 密碼正確
            API->>API: 生成 JWT Token
            API->>Redis: 儲存 Session (可選)
            API-->>FE: 200 OK + Set-Cookie
            FE->>FE: 儲存 Token
            FE-->>User: 登入成功，導向儀表板
        end
    end
```

---

## LINE Login 流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant FE as 前端
    participant API as 後端 API
    participant LINE as LINE Platform
    participant DB as PostgreSQL

    User->>FE: 點擊 LINE Login
    FE->>API: GET /api/v1/auth/line/login
    API->>API: 生成 state 參數
    API-->>FE: 302 Redirect to LINE
    FE->>LINE: 導向 LINE 授權頁面
    
    User->>LINE: 授權登入
    LINE-->>API: GET /api/v1/auth/line/callback?code=xxx&state=xxx
    
    API->>API: 驗證 state 參數
    API->>LINE: POST /oauth2/v2.1/token (交換 access_token)
    LINE-->>API: access_token
    
    API->>LINE: GET /v2/profile (取得用戶資料)
    LINE-->>API: 用戶資料 (userId, displayName, pictureUrl)
    
    API->>DB: 查詢 LINE ID 是否已註冊
    
    alt 已註冊
        DB-->>API: 返回使用者資料
        API->>API: 生成 JWT Token
    else 未註冊
        API->>DB: 建立新使用者 (line_id)
        DB-->>API: 使用者已建立
        API->>API: 生成 JWT Token
    end
    
    API-->>FE: 302 Redirect + Set-Cookie
    FE-->>User: 登入成功，導向儀表板
```

---

## Bot 建立與設定流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant FE as 前端
    participant API as 後端 API
    participant DB as PostgreSQL
    participant LINE as LINE Platform

    User->>FE: 填寫 Bot 資料
    Note over User,FE: 名稱、Channel ID、<br/>Channel Secret、Access Token
    
    FE->>API: POST /api/v1/bots
    API->>API: 驗證 JWT Token
    API->>API: 驗證 Bot 資料
    
    API->>LINE: 驗證 Channel Token (可選)
    LINE-->>API: Token 有效
    
    API->>DB: 建立 Bot 記錄
    DB-->>API: Bot 已建立
    
    API-->>FE: 201 Created + Bot 資料
    FE-->>User: Bot 建立成功
    
    User->>FE: 設定 Webhook URL
    Note over User,FE: https://domain.com/api/v1/webhooks/{bot_id}
    
    User->>LINE: 在 LINE Developers Console 設定 Webhook
    LINE->>API: 驗證 Webhook (GET)
    API-->>LINE: 200 OK
    LINE-->>User: Webhook 設定成功
```

---

## Webhook 事件處理流程

```mermaid
sequenceDiagram
    participant LineUser as LINE 用戶
    participant LINE as LINE Platform
    participant API as 後端 Webhook
    participant Logic as 邏輯引擎
    participant AI as AI 服務
    participant DB as PostgreSQL
    participant Mongo as MongoDB

    LineUser->>LINE: 發送訊息
    LINE->>API: POST /api/v1/webhooks/{bot_id}
    Note over LINE,API: X-Line-Signature Header
    
    API->>API: 驗證簽名
    
    alt 簽名無效
        API-->>LINE: 400 Bad Request
    else 簽名有效
        API->>DB: 查詢 Bot 設定
        DB-->>API: Bot 資料
        
        API->>Mongo: 儲存對話記錄
        
        API->>Logic: 執行邏輯引擎
        Logic->>DB: 查詢邏輯模板
        
        alt 有匹配的邏輯
            Logic-->>API: 返回回覆內容
        else 無匹配邏輯且啟用 AI
            Logic->>AI: 查詢 AI 知識庫
            AI->>DB: 向量檢索
            DB-->>AI: 相關知識片段
            AI->>AI: 生成回覆 (Groq/Gemini)
            AI-->>Logic: AI 回覆
            Logic-->>API: 返回 AI 回覆
        else 無匹配且未啟用 AI
            Logic-->>API: 返回預設回覆
        end
        
        API->>LINE: 回覆訊息
        LINE->>LineUser: 顯示回覆
        API-->>LINE: 200 OK
    end
```

---

## AI 知識庫處理流程

### 知識上傳與處理

```mermaid
sequenceDiagram
    participant User as 使用者
    participant FE as 前端
    participant API as 後端 API
    participant Embedding as 嵌入服務
    participant DB as PostgreSQL

    User->>FE: 上傳文字或檔案
    FE->>API: POST /api/v1/bots/{bot_id}/knowledge/text
    Note over FE,API: 或 /knowledge/file
    
    API->>API: 驗證權限
    API->>DB: 建立 KnowledgeDocument
    DB-->>API: Document ID
    
    alt 文字內容
        API->>API: 遞迴分塊 (Recursive Chunking)
    else 檔案內容
        API->>API: 解析檔案 (PDF/DOCX/TXT)
        API->>API: 遞迴分塊
    end
    
    loop 每個文字塊
        API->>Embedding: 生成向量嵌入
        Note over API,Embedding: all-mpnet-base-v2<br/>768 維向量
        Embedding-->>API: 向量
        API->>DB: 儲存 KnowledgeChunk + 向量
    end
    
    DB-->>API: 所有塊已儲存
    API-->>FE: 200 OK + 處理結果
    FE-->>User: 知識上傳成功
```

### AI 回覆生成流程

```mermaid
sequenceDiagram
    participant User as LINE 用戶
    participant Webhook as Webhook 處理
    participant RAG as RAG 服務
    participant DB as PostgreSQL
    participant AI as AI API (Groq/Gemini)

    User->>Webhook: 發送訊息
    Webhook->>RAG: 查詢相關知識
    
    RAG->>RAG: 生成查詢向量
    RAG->>DB: 向量相似度搜尋
    Note over RAG,DB: SELECT * FROM knowledge_chunks<br/>ORDER BY embedding <=> query_vector<br/>LIMIT top_k
    
    DB-->>RAG: 返回 top_k 個相關片段
    
    RAG->>RAG: 組裝上下文
    Note over RAG: 包含：<br/>1. 系統提示詞<br/>2. 相關知識片段<br/>3. 對話歷史<br/>4. 用戶問題
    
    RAG->>AI: 生成回覆
    AI-->>RAG: AI 回覆
    
    alt 相似度 >= threshold
        RAG-->>Webhook: 返回 AI 回覆
    else 相似度 < threshold
        RAG-->>Webhook: 返回預設回覆
    end
    
    Webhook->>User: 發送回覆
```

---

## 視覺化編輯器互動流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Editor as 視覺化編輯器
    participant API as 後端 API
    participant DB as PostgreSQL

    User->>Editor: 拖曳積木元件
    Editor->>Editor: 即時預覽
    
    User->>Editor: 調整屬性
    Editor->>Editor: 更新預覽
    
    User->>Editor: 點擊儲存
    Editor->>API: POST /api/v1/bots/{bot_id}/logic-templates
    Note over Editor,API: 包含邏輯資料 JSON
    
    API->>API: 驗證邏輯結構
    API->>API: 生成 Python 程式碼
    API->>DB: 儲存邏輯模板
    DB-->>API: 儲存成功
    API-->>Editor: 200 OK
    Editor-->>User: 儲存成功
    
    User->>Editor: 測試邏輯
    Editor->>API: POST /api/v1/bots/{bot_id}/test-logic
    API->>API: 執行邏輯引擎
    API-->>Editor: 測試結果
    Editor-->>User: 顯示測試結果
```

---

## 訊息廣播流程

```mermaid
sequenceDiagram
    participant User as 管理者
    participant FE as 前端
    participant API as 後端 API
    participant DB as PostgreSQL
    participant LINE as LINE Platform
    participant LineUsers as LINE 用戶群

    User->>FE: 建立廣播訊息
    Note over User,FE: 選擇目標用戶<br/>編輯訊息內容
    
    FE->>API: POST /api/v1/bots/{bot_id}/broadcast
    API->>API: 驗證權限
    API->>DB: 查詢目標用戶列表
    DB-->>API: 用戶 LINE ID 列表
    
    alt 指定用戶群
        API->>LINE: Multicast API
        Note over API,LINE: 最多 500 個用戶
    else 全體用戶
        API->>LINE: Broadcast API
    end
    
    LINE->>LineUsers: 推送訊息
    LINE-->>API: 200 OK
    
    API->>DB: 記錄廣播歷史
    API-->>FE: 200 OK + 發送結果
    FE-->>User: 廣播成功
```

---

## Rich Menu 設定流程

```mermaid
sequenceDiagram
    participant User as 管理者
    participant FE as 前端
    participant API as 後端 API
    participant DB as PostgreSQL
    participant LINE as LINE Platform

    User->>FE: 設計 Rich Menu
    Note over User,FE: 設定區域、動作、圖片
    
    FE->>API: POST /api/v1/bots/{bot_id}/rich-menus
    API->>API: 驗證 Rich Menu 結構
    
    API->>LINE: POST /v2/bot/richmenu (建立 Rich Menu)
    LINE-->>API: Rich Menu ID
    
    API->>LINE: POST /v2/bot/richmenu/{id}/content (上傳圖片)
    LINE-->>API: 200 OK
    
    API->>DB: 儲存 Rich Menu 資料
    DB-->>API: 儲存成功
    API-->>FE: 201 Created
    FE-->>User: Rich Menu 建立成功
    
    User->>FE: 啟用 Rich Menu
    FE->>API: POST /api/v1/bots/{bot_id}/rich-menus/{id}/activate
    API->>LINE: POST /v2/bot/user/all/richmenu/{id} (設為預設)
    LINE-->>API: 200 OK
    API->>DB: 更新啟用狀態
    API-->>FE: 200 OK
    FE-->>User: Rich Menu 已啟用
```

---

## 效能監控流程

```mermaid
sequenceDiagram
    participant Admin as 管理者
    participant FE as 前端
    participant API as 後端 API
    participant Redis as Redis
    participant DB as PostgreSQL

    Admin->>FE: 查看效能統計
    FE->>API: GET /api/v1/performance/stats
    
    API->>Redis: 查詢快取統計
    Redis-->>API: 快取命中率、大小
    
    API->>DB: 查詢資料庫統計
    DB-->>API: 連線池狀態、查詢數
    
    API->>API: 計算系統指標
    Note over API: CPU、記憶體、<br/>回應時間等
    
    API-->>FE: 200 OK + 統計資料
    FE-->>Admin: 顯示效能儀表板
    
    alt 需要清除快取
        Admin->>FE: 清除快取
        FE->>API: POST /api/v1/performance/cache/clear
        API->>Redis: FLUSHDB
        Redis-->>API: OK
        API-->>FE: 200 OK
        FE-->>Admin: 快取已清除
    end
```

---

*本文件由 LineBot-Web 專案團隊維護*
*最後更新: 2025-10-24*

