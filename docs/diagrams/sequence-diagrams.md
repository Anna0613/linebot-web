# LINE Bot 編輯設計系統 - 循序圖集合

> 系統循序圖集合，描述 LINE Bot 編輯設計系統中各元件之間的互動時序和訊息傳遞。

## 📋 目錄

1. [設計 LINE Bot 系統循序圖](#1-設計-line-bot-系統循序圖)
2. [建立 LINE Bot 系統循序圖](#2-建立-line-bot-系統循序圖)

---

## 1. 設計 LINE Bot 系統循序圖

描述設計階段中各系統元件之間的互動順序，包含前端介面、後端服務、資料庫之間的訊息傳遞。

```mermaid
sequenceDiagram
    participant U as 👤 使用者
    participant FE as 🖥️ 前端介面
    participant API as 🔌 API Gateway
    participant Auth as 🔐 認證服務
    participant BotSvc as 🤖 Bot 服務
    participant FlexSvc as 📱 Flex 服務
    participant LogicSvc as ⚙️ 邏輯引擎
    participant DB as 🗄️ 資料庫
    participant Cache as ⚡ 快取
    participant WS as 🔄 WebSocket

    Note over U, WS: LINE Bot 設計階段 - 系統互動流程

    %% 1. 進入設計模式
    U->>FE: 點擊「設計 Bot」
    FE->>API: GET /api/v1/bots/{bot_id}
    API->>Auth: 驗證使用者權限
    Auth-->>API: 權限確認
    API->>BotSvc: 取得 Bot 資訊
    BotSvc->>DB: 查詢 Bot 資料
    DB-->>BotSvc: 返回 Bot 資料
    BotSvc-->>API: Bot 資訊
    API-->>FE: Bot 資料
    FE-->>U: 顯示設計介面

    %% 2. 載入現有設計
    FE->>API: GET /api/v1/bots/{bot_id}/visual-editor
    API->>LogicSvc: 取得視覺化設計資料
    LogicSvc->>Cache: 檢查快取
    Cache-->>LogicSvc: 快取未命中
    LogicSvc->>DB: 查詢邏輯模板
    DB-->>LogicSvc: 返回設計資料
    LogicSvc->>Cache: 更新快取
    LogicSvc-->>API: 設計資料
    API-->>FE: 視覺化設計資料
    FE-->>U: 渲染設計畫布

    %% 3. 建立 WebSocket 連接
    FE->>WS: 建立 WebSocket 連接
    WS->>Auth: 驗證 WebSocket 連接
    Auth-->>WS: 連接授權
    WS-->>FE: 連接建立成功

    %% 4. 拖曳積木設計
    U->>FE: 拖曳邏輯積木
    FE->>FE: 本地驗證積木放置
    FE->>WS: 發送積木變更事件
    WS->>LogicSvc: 處理積木變更
    LogicSvc->>LogicSvc: 驗證邏輯完整性
    LogicSvc-->>WS: 變更確認
    WS-->>FE: 即時同步變更
    FE-->>U: 更新畫布顯示

    %% 5. 設計 Flex 訊息
    U->>FE: 點擊「設計 Flex 訊息」
    FE->>API: GET /api/v1/bots/{bot_id}/flex-messages
    API->>FlexSvc: 取得 Flex 訊息列表
    FlexSvc->>DB: 查詢 Flex 訊息
    DB-->>FlexSvc: 返回訊息列表
    FlexSvc-->>API: Flex 訊息資料
    API-->>FE: 訊息列表
    FE-->>U: 顯示 Flex 設計器

    %% 6. 即時預覽
    U->>FE: 修改 Flex 設計
    FE->>FE: 本地渲染預覽
    FE->>API: POST /api/v1/flex-messages/preview
    API->>FlexSvc: 驗證 Flex JSON
    FlexSvc->>FlexSvc: 格式驗證
    FlexSvc-->>API: 驗證結果
    API-->>FE: 預覽資料
    FE-->>U: 顯示即時預覽

    %% 7. 儲存設計
    U->>FE: 點擊「儲存設計」
    FE->>API: PUT /api/v1/bots/{bot_id}/visual-editor
    API->>Auth: 驗證操作權限
    Auth-->>API: 權限確認
    
    par 並行處理
        API->>LogicSvc: 儲存邏輯設計
        LogicSvc->>DB: 更新邏輯模板
        DB-->>LogicSvc: 儲存確認
        LogicSvc->>Cache: 更新快取
    and
        API->>FlexSvc: 儲存 Flex 訊息
        FlexSvc->>DB: 更新 Flex 資料
        DB-->>FlexSvc: 儲存確認
    end

    LogicSvc-->>API: 邏輯儲存完成
    FlexSvc-->>API: Flex 儲存完成
    API-->>FE: 儲存成功
    FE-->>U: 顯示儲存成功訊息

    %% 8. 測試設計
    U->>FE: 點擊「測試設計」
    FE->>API: POST /api/v1/bots/{bot_id}/test
    API->>LogicSvc: 執行邏輯測試
    LogicSvc->>LogicSvc: 模擬事件處理
    LogicSvc->>FlexSvc: 取得測試訊息
    FlexSvc-->>LogicSvc: 返回測試訊息
    LogicSvc-->>API: 測試結果
    API-->>FE: 測試報告
    FE-->>U: 顯示測試結果

    %% 9. 發布設計
    U->>FE: 點擊「發布設計」
    FE->>API: POST /api/v1/bots/{bot_id}/deploy
    API->>Auth: 驗證發布權限
    Auth-->>API: 權限確認
    API->>BotSvc: 部署 Bot 設定
    BotSvc->>LogicSvc: 啟用邏輯模板
    LogicSvc->>DB: 更新模板狀態
    DB-->>LogicSvc: 狀態更新完成
    LogicSvc-->>BotSvc: 啟用完成
    BotSvc-->>API: 部署成功
    API-->>FE: 發布確認
    FE-->>U: 顯示發布成功

    %% 10. 關閉連接
    U->>FE: 離開設計介面
    FE->>WS: 關閉 WebSocket 連接
    WS-->>FE: 連接關閉確認
    FE-->>U: 返回儀表板

    Note over U, WS: 設計階段完成
```

### 設計階段互動說明

- **即時同步**: 透過 WebSocket 實現即時的設計變更同步
- **並行處理**: 邏輯設計和 Flex 訊息可以並行儲存，提高效率
- **快取機制**: 使用 Redis 快取提高設計資料的讀取速度
- **權限驗證**: 每個關鍵操作都進行權限驗證確保安全性

---

## 2. 建立 LINE Bot 系統循序圖

展示建立 Bot 時系統內部的物件互動時序，包含 API 呼叫、資料儲存、LINE 平台註冊等步驟的時間順序。

```mermaid
sequenceDiagram
    participant U as 👤 使用者
    participant FE as 🖥️ 前端介面
    participant API as 🔌 API Gateway
    participant Auth as 🔐 認證服務
    participant BotSvc as 🤖 Bot 服務
    participant LineAPI as 📱 LINE API
    participant DB as 🗄️ 資料庫
    participant Cache as ⚡ 快取
    participant Email as 📧 郵件服務
    participant Log as 📝 日誌服務

    Note over U, Log: LINE Bot 建立流程 - 系統時序互動

    %% 1. 使用者發起建立請求
    U->>FE: 點擊「建立新 Bot」
    FE->>FE: 顯示建立表單
    FE-->>U: 表單介面

    %% 2. 輸入基本資訊
    U->>FE: 填寫 Bot 基本資訊
    FE->>FE: 前端驗證表單
    alt 表單驗證失敗
        FE-->>U: 顯示驗證錯誤
    else 表單驗證通過
        FE->>API: POST /api/v1/bots
        Note right of FE: 包含 Bot 名稱、描述等
    end

    %% 3. 後端驗證與認證
    API->>Auth: 驗證使用者身份
    Auth->>Auth: 檢查 JWT Token
    alt 認證失敗
        Auth-->>API: 認證失敗
        API-->>FE: 401 未授權
        FE-->>U: 請重新登入
    else 認證成功
        Auth-->>API: 使用者資訊
    end

    %% 4. 驗證 LINE Channel 資訊
    API->>BotSvc: 建立 Bot 請求
    BotSvc->>BotSvc: 驗證輸入資料
    BotSvc->>LineAPI: 驗證 Channel Token
    Note right of BotSvc: GET /v2/bot/info

    alt LINE API 驗證失敗
        LineAPI-->>BotSvc: 401/403 錯誤
        BotSvc-->>API: Channel 驗證失敗
        API-->>FE: 400 錯誤回應
        FE-->>U: 顯示 Channel 錯誤
    else LINE API 驗證成功
        LineAPI-->>BotSvc: Bot 資訊
        Note left of LineAPI: 返回 Bot 名稱、圖片等
    end

    %% 5. 建立資料庫記錄
    BotSvc->>DB: 開始資料庫交易
    BotSvc->>DB: INSERT Bot 記錄

    alt 資料庫操作失敗
        DB-->>BotSvc: 插入失敗
        BotSvc->>DB: 回滾交易
        BotSvc-->>API: 資料庫錯誤
        API-->>FE: 500 伺服器錯誤
        FE-->>U: 建立失敗訊息
    else 資料庫操作成功
        DB-->>BotSvc: 插入成功
        Note right of DB: 返回 Bot ID
    end

    %% 6. 設定 Webhook
    BotSvc->>LineAPI: 設定 Webhook URL
    Note right of BotSvc: PUT /v2/bot/channel/webhook/endpoint

    alt Webhook 設定失敗
        LineAPI-->>BotSvc: 設定失敗
        BotSvc->>Log: 記錄 Webhook 錯誤
        Note right of BotSvc: 繼續流程，稍後可手動設定
    else Webhook 設定成功
        LineAPI-->>BotSvc: 設定成功
        BotSvc->>Log: 記錄 Webhook 成功
    end

    %% 7. 初始化預設設定
    par 並行初始化
        BotSvc->>DB: 建立預設 Flex 訊息模板
        DB-->>BotSvc: 模板建立完成
    and
        BotSvc->>DB: 建立預設邏輯模板
        DB-->>BotSvc: 邏輯模板完成
    and
        BotSvc->>DB: 建立預設自動回覆規則
        DB-->>BotSvc: 回覆規則完成
    end

    %% 8. 提交交易
    BotSvc->>DB: 提交資料庫交易
    DB-->>BotSvc: 交易提交成功

    %% 9. 更新快取
    BotSvc->>Cache: 更新 Bot 快取
    Cache-->>BotSvc: 快取更新完成

    %% 10. 發送通知
    par 並行通知處理
        BotSvc->>Email: 發送建立成功郵件
        Email->>Email: 準備郵件內容
        Email-->>BotSvc: 郵件發送完成
    and
        BotSvc->>Log: 記錄 Bot 建立日誌
        Log->>Log: 寫入操作日誌
        Log-->>BotSvc: 日誌記錄完成
    end

    %% 11. 返回成功回應
    BotSvc-->>API: Bot 建立成功
    Note left of BotSvc: 返回完整 Bot 資訊
    API-->>FE: 201 建立成功
    FE->>FE: 更新本地狀態
    FE-->>U: 顯示建立成功訊息

    %% 12. 後續操作選項
    FE->>FE: 顯示後續操作選項
    FE-->>U: 提供設計/設定選項

    alt 使用者選擇立即設計
        U->>FE: 點擊「立即設計」
        FE->>FE: 導航到設計器
        FE-->>U: 進入視覺化設計器
    else 使用者選擇稍後設定
        U->>FE: 點擊「稍後設定」
        FE->>FE: 導航到儀表板
        FE-->>U: 返回 Bot 列表
    else 使用者選擇查看教學
        U->>FE: 點擊「查看教學」
        FE->>FE: 顯示使用教學
        FE-->>U: 教學內容
    end

    %% 13. 背景任務處理
    Note over BotSvc, Log: 背景任務持續進行

    par 背景處理
        BotSvc->>LineAPI: 定期檢查 Bot 狀態
        LineAPI-->>BotSvc: 狀態回應
    and
        BotSvc->>DB: 更新使用統計
        DB-->>BotSvc: 統計更新完成
    and
        Log->>Log: 清理過期日誌
    end

    Note over U, Log: Bot 建立流程完成
```

### 建立階段互動說明

- **交易管理**: 使用資料庫交易確保資料一致性
- **錯誤處理**: 完整的錯誤處理機制，包含回滾和清理
- **並行處理**: 初始化設定和通知處理採用並行方式提高效率
- **背景任務**: 建立完成後持續進行狀態監控和統計更新
- **用戶體驗**: 提供多種後續操作選項，引導用戶完成設定

---

## 📊 圖表使用說明

### 如何閱讀循序圖

1. **參與者 (Participants)**: 圖表頂部的各個系統元件
2. **生命線 (Lifelines)**: 從參與者向下延伸的垂直線
3. **訊息 (Messages)**: 參與者之間的水平箭頭
4. **啟動框 (Activation Boxes)**: 表示物件處於活躍狀態的時間
5. **替代流程 (Alt)**: 條件分支的不同執行路徑
6. **並行處理 (Par)**: 同時執行的多個操作

### 圖表更新維護

- 當系統架構變更時，請同步更新相關圖表
- 新增功能時，考慮是否需要新增對應的互動流程
- 定期檢查圖表與實際實作的一致性
