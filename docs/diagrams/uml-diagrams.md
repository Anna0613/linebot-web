# LINE Bot 編輯設計系統 - UML 圖表集合

> 完整的 UML 圖表集合，包含使用案例圖、活動圖和循序圖，用於描述 LINE Bot 編輯設計系統的架構和流程。

## 📋 目錄

1. [使用案例圖 (Use Case Diagram)](#1-使用案例圖-use-case-diagram)
2. [用戶操作活動圖 (User Activity Diagram)](#2-用戶操作活動圖-user-activity-diagram)
3. [建立 LINE Bot 流程活動圖](#3-建立-line-bot-流程活動圖)
4. [拖曳式設計活動圖](#4-拖曳式設計活動圖)
5. [設計 LINE Bot 系統循序圖](#5-設計-line-bot-系統循序圖)
6. [建立 LINE Bot 系統循序圖](#6-建立-line-bot-系統循序圖)

---

## 1. 使用案例圖 (Use Case Diagram)

識別系統的主要參與者和核心使用案例，展示使用者、管理員、LINE 平台與系統功能之間的關係。

```mermaid
graph TB
    %% 參與者定義
    User[👤 使用者<br/>User]
    Admin[👨‍💼 管理員<br/>Admin]
    LineAPI[🤖 LINE 平台<br/>LINE API]
    System[🖥️ 系統<br/>System]

    %% 使用案例定義
    subgraph "LINE Bot 編輯設計系統"
        %% 認證相關
        UC1[登入系統<br/>Login]
        UC2[註冊帳號<br/>Register]
        UC3[忘記密碼<br/>Forget Password]
        
        %% Bot 管理
        UC4[建立 LINE Bot<br/>Create Bot]
        UC5[編輯 Bot 設定<br/>Edit Bot Settings]
        UC6[刪除 Bot<br/>Delete Bot]
        UC7[查看 Bot 列表<br/>View Bot List]
        
        %% 視覺化編輯
        UC8[拖曳式設計<br/>Drag-Drop Design]
        UC9[邏輯流程編輯<br/>Logic Flow Edit]
        UC10[Flex 訊息設計<br/>Flex Message Design]
        UC11[預覽訊息<br/>Preview Message]
        
        %% 訊息管理
        UC12[建立自動回覆<br/>Create Auto Reply]
        UC13[管理關鍵字<br/>Manage Keywords]
        UC14[發送測試訊息<br/>Send Test Message]
        
        %% 用戶管理
        UC15[查看用戶列表<br/>View Users]
        UC16[分析用戶行為<br/>Analyze User Behavior]
        UC17[管理用戶標籤<br/>Manage User Tags]
        
        %% 系統管理
        UC18[監控系統狀態<br/>Monitor System]
        UC19[管理權限<br/>Manage Permissions]
        UC20[備份資料<br/>Backup Data]
        
        %% Webhook 處理
        UC21[接收 LINE 事件<br/>Receive LINE Events]
        UC22[處理用戶訊息<br/>Process User Messages]
        UC23[發送回覆訊息<br/>Send Reply Messages]
    end

    %% 關係連接
    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15
    User --> UC16
    User --> UC17

    Admin --> UC18
    Admin --> UC19
    Admin --> UC20

    LineAPI --> UC21
    LineAPI --> UC22
    LineAPI --> UC23

    %% 包含關係
    UC4 -.->|includes| UC5
    UC8 -.->|includes| UC9
    UC8 -.->|includes| UC10
    UC10 -.->|includes| UC11
    UC12 -.->|includes| UC13

    %% 擴展關係
    UC14 -.->|extends| UC12
    UC16 -.->|extends| UC15

    %% 樣式
    classDef actor fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef usecase fill:#f3e5f5,stroke:#4a148c,stroke-width:1px
    classDef system fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px

    class User,Admin,LineAPI actor
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13,UC14,UC15,UC16,UC17,UC18,UC19,UC20,UC21,UC22,UC23 usecase
```

### 主要參與者說明

- **使用者 (User)**: 使用系統建立和管理 LINE Bot 的一般用戶
- **管理員 (Admin)**: 負責系統管理和維護的管理人員
- **LINE 平台 (LINE API)**: 提供 LINE Bot 服務的外部平台
- **系統 (System)**: LINE Bot 編輯設計系統本身

---

## 2. 用戶操作活動圖 (User Activity Diagram)

描繪使用者從登入到完成 Bot 設定的完整操作流程，包含決策點、分支流程和錯誤處理路徑。

```mermaid
flowchart TD
    Start([開始]) --> CheckLogin{已登入?}
    
    %% 登入流程
    CheckLogin -->|否| LoginPage[顯示登入頁面]
    LoginPage --> InputCredentials[輸入帳號密碼]
    InputCredentials --> ValidateLogin{驗證登入}
    ValidateLogin -->|失敗| LoginError[顯示錯誤訊息]
    LoginError --> LoginPage
    ValidateLogin -->|成功| Dashboard[進入儀表板]
    
    %% 已登入直接進入
    CheckLogin -->|是| Dashboard
    
    %% 儀表板操作
    Dashboard --> ChooseAction{選擇操作}
    ChooseAction -->|建立新 Bot| CreateBot[建立 LINE Bot]
    ChooseAction -->|編輯現有 Bot| SelectBot[選擇現有 Bot]
    ChooseAction -->|查看分析| ViewAnalytics[查看分析報告]
    ChooseAction -->|登出| Logout[登出系統]
    
    %% 建立 Bot 流程
    CreateBot --> InputBotInfo[輸入 Bot 基本資訊]
    InputBotInfo --> InputChannelInfo[輸入 Channel Token/Secret]
    InputChannelInfo --> ValidateChannel{驗證 Channel 資訊}
    ValidateChannel -->|失敗| ChannelError[顯示錯誤訊息]
    ChannelError --> InputChannelInfo
    ValidateChannel -->|成功| SaveBot[儲存 Bot 設定]
    SaveBot --> BotCreated[Bot 建立成功]
    
    %% 編輯 Bot 流程
    SelectBot --> BotEditor[進入 Bot 編輯器]
    BotCreated --> BotEditor
    
    %% Bot 編輯器操作
    BotEditor --> EditorChoice{選擇編輯模式}
    EditorChoice -->|視覺化編輯| VisualEditor[拖曳式編輯器]
    EditorChoice -->|Flex 訊息| FlexEditor[Flex 訊息設計器]
    EditorChoice -->|自動回覆| AutoReply[自動回覆設定]
    EditorChoice -->|測試 Bot| TestBot[測試 Bot 功能]
    
    %% 視覺化編輯流程
    VisualEditor --> DragBlocks[拖曳邏輯積木]
    DragBlocks --> ConnectBlocks[連接積木節點]
    ConnectBlocks --> SetProperties[設定積木屬性]
    SetProperties --> PreviewLogic[預覽邏輯流程]
    PreviewLogic --> SaveLogic{儲存邏輯?}
    SaveLogic -->|是| SaveVisualDesign[儲存視覺化設計]
    SaveLogic -->|否| DragBlocks
    
    %% Flex 訊息編輯流程
    FlexEditor --> DesignFlex[設計 Flex 訊息]
    DesignFlex --> PreviewFlex[預覽訊息效果]
    PreviewFlex --> SaveFlex{儲存訊息?}
    SaveFlex -->|是| SaveFlexMessage[儲存 Flex 訊息]
    SaveFlex -->|否| DesignFlex
    
    %% 自動回覆設定流程
    AutoReply --> SetKeywords[設定關鍵字]
    SetKeywords --> SetResponse[設定回覆內容]
    SetResponse --> TestReply[測試自動回覆]
    TestReply --> SaveReply{儲存設定?}
    SaveReply -->|是| SaveAutoReply[儲存自動回覆]
    SaveReply -->|否| SetKeywords
    
    %% 測試流程
    TestBot --> SendTestMessage[發送測試訊息]
    SendTestMessage --> CheckResponse[檢查 Bot 回應]
    CheckResponse --> TestResult{測試結果}
    TestResult -->|通過| TestSuccess[測試成功]
    TestResult -->|失敗| TestFailed[測試失敗]
    TestFailed --> DebugBot[除錯 Bot 設定]
    DebugBot --> TestBot
    
    %% 完成流程
    SaveVisualDesign --> Complete[設定完成]
    SaveFlexMessage --> Complete
    SaveAutoReply --> Complete
    TestSuccess --> Complete
    ViewAnalytics --> Dashboard
    
    %% 結束或繼續
    Complete --> ContinueEdit{繼續編輯?}
    ContinueEdit -->|是| BotEditor
    ContinueEdit -->|否| Dashboard
    
    %% 登出
    Logout --> End([結束])
    
    %% 錯誤處理
    ChannelError --> RetryOrCancel{重試或取消?}
    RetryOrCancel -->|取消| Dashboard
    RetryOrCancel -->|重試| InputChannelInfo
    
    %% 樣式定義
    classDef startEnd fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff
    classDef process fill:#2196f3,stroke:#1565c0,stroke-width:2px,color:#fff
    classDef decision fill:#ff9800,stroke:#ef6c00,stroke-width:2px,color:#fff
    classDef error fill:#f44336,stroke:#c62828,stroke-width:2px,color:#fff
    classDef success fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff
    
    class Start,End startEnd
    class LoginPage,InputCredentials,Dashboard,CreateBot,InputBotInfo,InputChannelInfo,SaveBot,BotCreated,BotEditor,VisualEditor,DragBlocks,ConnectBlocks,SetProperties,PreviewLogic,SaveVisualDesign,FlexEditor,DesignFlex,PreviewFlex,SaveFlexMessage,AutoReply,SetKeywords,SetResponse,TestReply,SaveAutoReply,TestBot,SendTestMessage,CheckResponse,Complete,SelectBot,ViewAnalytics,Logout,DebugBot process
    class CheckLogin,ValidateLogin,ChooseAction,ValidateChannel,EditorChoice,SaveLogic,SaveFlex,SaveReply,TestResult,ContinueEdit,RetryOrCancel decision
    class LoginError,ChannelError,TestFailed error
    class TestSuccess success
```

---

## 3. 建立 LINE Bot 流程活動圖

詳細說明建立新 LINE Bot 的步驟流程，包含初始化、設定參數、連接 LINE API、測試驗證等階段。

```mermaid
flowchart TD
    Start([開始建立 LINE Bot]) --> InitForm[初始化建立表單]

    %% 基本資訊輸入
    InitForm --> InputBasicInfo[輸入 Bot 基本資訊]
    InputBasicInfo --> ValidateBasicInfo{驗證基本資訊}
    ValidateBasicInfo -->|格式錯誤| ShowBasicError[顯示格式錯誤]
    ShowBasicError --> InputBasicInfo
    ValidateBasicInfo -->|通過| InputChannelInfo[輸入 LINE Channel 資訊]

    %% Channel 資訊設定
    InputChannelInfo --> ValidateChannelFormat{驗證 Channel 格式}
    ValidateChannelFormat -->|格式錯誤| ShowChannelError[顯示格式錯誤]
    ShowChannelError --> InputChannelInfo
    ValidateChannelFormat -->|通過| TestConnection[測試 LINE API 連接]

    %% API 連接測試
    TestConnection --> APITest{API 連接測試}
    APITest -->|失敗| ConnectionError[連接失敗]
    ConnectionError --> ShowConnectionError[顯示連接錯誤訊息]
    ShowConnectionError --> RetryConnection{重試連接?}
    RetryConnection -->|是| TestConnection
    RetryConnection -->|否| InputChannelInfo

    APITest -->|成功| CreateBotRecord[建立 Bot 記錄]

    %% 資料庫操作
    CreateBotRecord --> SaveToDatabase[儲存到資料庫]
    SaveToDatabase --> DatabaseOperation{資料庫操作}
    DatabaseOperation -->|失敗| DatabaseError[資料庫錯誤]
    DatabaseError --> ShowDatabaseError[顯示資料庫錯誤]
    ShowDatabaseError --> RetryDatabase{重試儲存?}
    RetryDatabase -->|是| SaveToDatabase
    RetryDatabase -->|否| CleanupFailed[清理失敗資料]
    CleanupFailed --> End([建立失敗])

    DatabaseOperation -->|成功| SetupWebhook[設定 Webhook URL]

    %% Webhook 設定
    SetupWebhook --> ConfigureWebhook[配置 Webhook 端點]
    ConfigureWebhook --> RegisterWebhook[向 LINE 註冊 Webhook]
    RegisterWebhook --> WebhookTest{Webhook 註冊測試}
    WebhookTest -->|失敗| WebhookError[Webhook 設定失敗]
    WebhookError --> ShowWebhookError[顯示 Webhook 錯誤]
    ShowWebhookError --> RetryWebhook{重試設定?}
    RetryWebhook -->|是| SetupWebhook
    RetryWebhook -->|否| PartialSuccess[部分成功 - Bot 已建立但 Webhook 未設定]

    WebhookTest -->|成功| InitializeBot[初始化 Bot 設定]

    %% Bot 初始化
    InitializeBot --> SetDefaultSettings[設定預設參數]
    SetDefaultSettings --> CreateDefaultTemplates[建立預設模板]
    CreateDefaultTemplates --> SetupAutoReply[設定基本自動回覆]
    SetupAutoReply --> EnableBot[啟用 Bot]

    %% 驗證測試
    EnableBot --> SendWelcomeMessage[發送歡迎訊息測試]
    SendWelcomeMessage --> FinalTest{最終測試}
    FinalTest -->|失敗| FinalTestError[最終測試失敗]
    FinalTestError --> ShowFinalError[顯示測試錯誤]
    ShowFinalError --> DebugBot[進入除錯模式]
    DebugBot --> ManualFix[手動修正設定]
    ManualFix --> SendWelcomeMessage

    FinalTest -->|成功| BotCreated[Bot 建立成功]

    %% 後續設定
    BotCreated --> ShowSuccessMessage[顯示成功訊息]
    ShowSuccessMessage --> OfferNextSteps[提供後續設定選項]
    OfferNextSteps --> NextStepChoice{選擇後續動作}
    NextStepChoice -->|立即設計| GoToDesigner[前往視覺化設計器]
    NextStepChoice -->|稍後設定| GoToDashboard[返回儀表板]
    NextStepChoice -->|查看教學| ShowTutorial[顯示使用教學]

    %% 結束點
    GoToDesigner --> DesignerEnd([進入設計器])
    GoToDashboard --> DashboardEnd([返回儀表板])
    ShowTutorial --> TutorialEnd([顯示教學])
    PartialSuccess --> PartialEnd([部分成功])

    %% 並行處理
    parallel1[發送通知郵件]
    parallel2[記錄操作日誌]
    parallel3[更新使用統計]

    BotCreated --> parallel1
    BotCreated --> parallel2
    BotCreated --> parallel3

    parallel1 --> ShowSuccessMessage
    parallel2 --> ShowSuccessMessage
    parallel3 --> ShowSuccessMessage

    %% 樣式定義
    classDef startEnd fill:#4caf50,stroke:#2e7d32,stroke-width:3px,color:#fff
    classDef process fill:#2196f3,stroke:#1565c0,stroke-width:2px,color:#fff
    classDef decision fill:#ff9800,stroke:#ef6c00,stroke-width:2px,color:#fff
    classDef error fill:#f44336,stroke:#c62828,stroke-width:2px,color:#fff
    classDef success fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff
    classDef parallel fill:#9c27b0,stroke:#6a1b9a,stroke-width:2px,color:#fff
    classDef warning fill:#ff5722,stroke:#d84315,stroke-width:2px,color:#fff

    class Start,End,DesignerEnd,DashboardEnd,TutorialEnd,PartialEnd startEnd
    class InitForm,InputBasicInfo,InputChannelInfo,TestConnection,CreateBotRecord,SaveToDatabase,SetupWebhook,ConfigureWebhook,RegisterWebhook,InitializeBot,SetDefaultSettings,CreateDefaultTemplates,SetupAutoReply,EnableBot,SendWelcomeMessage,ShowSuccessMessage,OfferNextSteps,GoToDesigner,GoToDashboard,ShowTutorial,CleanupFailed,DebugBot,ManualFix process
    class ValidateBasicInfo,ValidateChannelFormat,APITest,DatabaseOperation,WebhookTest,FinalTest,RetryConnection,RetryDatabase,RetryWebhook,NextStepChoice decision
    class ShowBasicError,ShowChannelError,ConnectionError,ShowConnectionError,DatabaseError,ShowDatabaseError,WebhookError,ShowWebhookError,FinalTestError,ShowFinalError error
    class BotCreated success
    class parallel1,parallel2,parallel3 parallel
    class PartialSuccess warning
```

---

## 4. 拖曳式設計活動圖

展示使用者使用拖曳介面設計對話流程的互動過程，包含元件選擇、拖曳放置、連接節點、屬性設定等操作。

```mermaid
flowchart TD
    Start([進入視覺化編輯器]) --> LoadEditor[載入編輯器介面]

    %% 初始化編輯器
    LoadEditor --> InitCanvas[初始化畫布]
    InitCanvas --> LoadBlocks[載入積木庫]
    LoadBlocks --> LoadExistingDesign{載入現有設計?}
    LoadExistingDesign -->|是| LoadDesignData[載入設計資料]
    LoadExistingDesign -->|否| ShowEmptyCanvas[顯示空白畫布]
    LoadDesignData --> RenderExistingBlocks[渲染現有積木]
    RenderExistingBlocks --> EditorReady[編輯器就緒]
    ShowEmptyCanvas --> EditorReady

    %% 主要編輯循環
    EditorReady --> UserAction{使用者操作}

    %% 拖曳積木操作
    UserAction -->|拖曳積木| SelectBlock[選擇積木類型]
    SelectBlock --> DragStart[開始拖曳]
    DragStart --> DragMove[拖曳移動]
    DragMove --> DropZoneCheck{檢查放置區域}
    DropZoneCheck -->|有效區域| HighlightDropZone[高亮放置區域]
    DropZoneCheck -->|無效區域| ShowInvalidIndicator[顯示無效指示]
    HighlightDropZone --> DropBlock[放置積木]
    ShowInvalidIndicator --> DragMove

    %% 積木放置處理
    DropBlock --> ValidatePlacement{驗證放置位置}
    ValidatePlacement -->|有效| CreateBlockInstance[建立積木實例]
    ValidatePlacement -->|無效| ShowPlacementError[顯示放置錯誤]
    ShowPlacementError --> UserAction
    CreateBlockInstance --> AddToCanvas[加入畫布]
    AddToCanvas --> UpdateConnections[更新連接點]

    %% 連接積木操作
    UserAction -->|連接積木| SelectSourceBlock[選擇來源積木]
    SelectSourceBlock --> ShowConnectionPoints[顯示連接點]
    ShowConnectionPoints --> DragConnection[拖曳連接線]
    DragConnection --> FindTargetBlock[尋找目標積木]
    FindTargetBlock --> ValidateConnection{驗證連接}
    ValidateConnection -->|有效| CreateConnection[建立連接]
    ValidateConnection -->|無效| ShowConnectionError[顯示連接錯誤]
    ShowConnectionError --> UserAction
    CreateConnection --> UpdateFlowLogic[更新流程邏輯]

    %% 設定積木屬性
    UserAction -->|設定屬性| SelectBlockForEdit[選擇要編輯的積木]
    SelectBlockForEdit --> ShowPropertyPanel[顯示屬性面板]
    ShowPropertyPanel --> EditProperties[編輯屬性]
    EditProperties --> ValidateProperties{驗證屬性}
    ValidateProperties -->|有效| SaveProperties[儲存屬性]
    ValidateProperties -->|無效| ShowPropertyError[顯示屬性錯誤]
    ShowPropertyError --> EditProperties
    SaveProperties --> UpdateBlockDisplay[更新積木顯示]

    %% 預覽功能
    UserAction -->|預覽流程| ValidateFlow{驗證流程完整性}
    ValidateFlow -->|有錯誤| ShowFlowErrors[顯示流程錯誤]
    ShowFlowErrors --> HighlightErrors[高亮錯誤積木]
    HighlightErrors --> UserAction
    ValidateFlow -->|通過| GeneratePreview[生成預覽]
    GeneratePreview --> ShowPreviewPanel[顯示預覽面板]
    ShowPreviewPanel --> SimulateFlow[模擬流程執行]
    SimulateFlow --> ShowSimulationResult[顯示模擬結果]

    %% 儲存操作
    UserAction -->|儲存設計| PrepareData[準備儲存資料]
    PrepareData --> SerializeBlocks[序列化積木資料]
    SerializeBlocks --> SerializeConnections[序列化連接資料]
    SerializeConnections --> ValidateDesign{驗證設計完整性}
    ValidateDesign -->|有錯誤| ShowSaveErrors[顯示儲存錯誤]
    ShowSaveErrors --> UserAction
    ValidateDesign -->|通過| SaveToServer[儲存到伺服器]
    SaveToServer --> SaveResult{儲存結果}
    SaveResult -->|成功| ShowSaveSuccess[顯示儲存成功]
    SaveResult -->|失敗| ShowSaveFailure[顯示儲存失敗]
    ShowSaveFailure --> UserAction

    %% 其他操作
    UserAction -->|刪除積木| ConfirmDelete{確認刪除?}
    ConfirmDelete -->|是| DeleteBlock[刪除積木]
    ConfirmDelete -->|否| UserAction
    DeleteBlock --> UpdateConnections

    UserAction -->|複製積木| CopyBlock[複製積木]
    CopyBlock --> PasteBlock[貼上積木]
    PasteBlock --> CreateBlockInstance

    UserAction -->|撤銷操作| UndoAction[撤銷動作]
    UndoAction --> RestorePreviousState[恢復前一狀態]
    RestorePreviousState --> RefreshCanvas[重新整理畫布]

    UserAction -->|重做操作| RedoAction[重做動作]
    RedoAction --> ApplyNextState[套用下一狀態]
    ApplyNextState --> RefreshCanvas

    %% 結束流程
    UserAction -->|離開編輯器| CheckUnsavedChanges{有未儲存變更?}
    CheckUnsavedChanges -->|是| PromptSave[提示儲存]
    CheckUnsavedChanges -->|否| ExitEditor[離開編輯器]
    PromptSave --> SaveChoice{選擇儲存?}
    SaveChoice -->|是| SaveToServer
    SaveChoice -->|否| ExitEditor

    %% 回到主循環
    UpdateConnections --> UserAction
    UpdateFlowLogic --> UserAction
    UpdateBlockDisplay --> UserAction
    ShowSimulationResult --> UserAction
    ShowSaveSuccess --> UserAction
    RefreshCanvas --> UserAction

    %% 結束點
    ExitEditor --> End([離開編輯器])

    %% 樣式定義
    classDef startEnd fill:#4caf50,stroke:#2e7d32,stroke-width:3px,color:#fff
    classDef process fill:#2196f3,stroke:#1565c0,stroke-width:2px,color:#fff
    classDef decision fill:#ff9800,stroke:#ef6c00,stroke-width:2px,color:#fff
    classDef error fill:#f44336,stroke:#c62828,stroke-width:2px,color:#fff
    classDef success fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff
    classDef userAction fill:#9c27b0,stroke:#6a1b9a,stroke-width:2px,color:#fff
    classDef canvas fill:#00bcd4,stroke:#006064,stroke-width:2px,color:#fff

    class Start,End startEnd
    class LoadEditor,InitCanvas,LoadBlocks,LoadDesignData,ShowEmptyCanvas,RenderExistingBlocks,EditorReady,SelectBlock,DragStart,DragMove,HighlightDropZone,ShowInvalidIndicator,DropBlock,CreateBlockInstance,AddToCanvas,UpdateConnections,SelectSourceBlock,ShowConnectionPoints,DragConnection,FindTargetBlock,CreateConnection,UpdateFlowLogic,SelectBlockForEdit,ShowPropertyPanel,EditProperties,SaveProperties,UpdateBlockDisplay,GeneratePreview,ShowPreviewPanel,SimulateFlow,ShowSimulationResult,PrepareData,SerializeBlocks,SerializeConnections,SaveToServer,DeleteBlock,CopyBlock,PasteBlock,UndoAction,RestorePreviousState,RedoAction,ApplyNextState,RefreshCanvas,ExitEditor process
    class LoadExistingDesign,DropZoneCheck,ValidatePlacement,ValidateConnection,ValidateProperties,ValidateFlow,ValidateDesign,SaveResult,ConfirmDelete,CheckUnsavedChanges,SaveChoice decision
    class ShowPlacementError,ShowConnectionError,ShowPropertyError,ShowFlowErrors,HighlightErrors,ShowSaveErrors,ShowSaveFailure error
    class ShowSaveSuccess success
    class UserAction userAction
    class PromptSave canvas
```

---
