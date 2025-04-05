---

### **2. Puzzle API 使用說明文件**
儲存為 `D:\vs_files\code_file\linebotweb\linebot-web\puzzleAPI\Puzzle_API_Guide.md`

```markdown
# Puzzle API 使用說明

## 概述
`Puzzle API` 是一個基於 Node.js 和 Express 的後端服務，用於管理 LINE Bot 的機器人和 Flex Messages，並整合 LINE Messaging API 以發送訊息和接收 Webhook 事件。服務使用 PostgreSQL 資料庫（`LineBot_01`）儲存資料，每個用戶最多可創建 3 個機器人，每個機器人最多儲存 10 個 Flex Messages。

- **基礎 URL**: `http://localhost:3000/api`（本地測試）
- **技術棧**: Node.js, Express, PostgreSQL
- **認證**: 目前無需額外認證

---

## API 端點

### 1. 獲取用戶的機器人
#### 端點
- **方法**: `GET`
- **路徑**: `/bots/:userId`

#### 描述
返回指定用戶的所有機器人及其 Flex Messages。

#### 參數
- **路徑參數**:
  - `userId` (整數, 必填): 用戶 ID。

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    [
      {
        "id": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
        "userId": 1,
        "name": "Test Bot",
        "createdAt": "2025-04-04T12:00:00Z",
        "updatedAt": "2025-04-04T12:00:00Z",
        "FlexMessages": [
          {
            "id": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
            "flexMessage": { "type": "flex", "altText": "Test", "contents": { ... } },
            "createdAt": "2025-04-04T12:01:00Z"
          }
        ]
      }
    ]
錯誤:
狀態碼: 500 Internal Server Error
範例: { "error": "資料庫查詢失敗" }
備註
若無機器人，回應為 []。
2. 建立新機器人
端點
方法: POST
路徑: /bots
描述
為指定用戶創建新機器人。

參數
請求體 (JSON, 必填):
userId (整數): 用戶 ID。
name (字串): 機器人名稱。
範例:
{
  "userId": 1,
  "name": "Test Bot"
}
回應
成功:
狀態碼: 200 OK
範例:
{
  "id": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
  "userId": 1,
  "name": "Test Bot",
  "createdAt": "2025-04-04T12:00:00Z",
  "updatedAt": "2025-04-04T12:00:00Z"
}
錯誤:
狀態碼: 400 Bad Request
範例: { "error": "已達機器人數量上限 (3)" }
狀態碼: 404 Not Found
範例: { "error": "用戶不存在" }
限制
每個用戶最多 3 個機器人。
3. 儲存 Flex Message
端點
方法: POST
路徑: /flex-messages
描述
為指定機器人儲存 Flex Message。

參數
請求體 (JSON, 必填):
botId (UUID): 機器人 ID。
flexMessage (物件): LINE Flex Message。
範例:
{
  "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
  "flexMessage": {
    "type": "flex",
    "altText": "Test",
    "contents": { "type": "bubble", "body": { "type": "box", "contents": [ ... ] } }
  }
}
回應
成功:
狀態碼: 200 OK
範例:
{
  "id": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
  "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
  "flexMessage": { ... },
  "createdAt": "2025-04-04T12:01:00Z",
  "updatedAt": "2025-04-04T12:01:00Z"
}
錯誤:
狀態碼: 400 Bad Request
範例: { "error": "已達 Flex Message 數量上限 (10)" }
狀態碼: 404 Not Found
範例: { "error": "機器人不存在" }
限制
每個機器人最多 10 個 Flex Messages。
4. 修改機器人資訊
端點
方法: PUT
路徑: /bots/:botId
描述
修改指定機器人名稱。

參數
路徑參數:
botId (UUID, 必填): 機器人 ID。
請求體 (JSON, 可選):
name (字串): 新名稱。
範例:
{
  "name": "Updated Bot"
}
回應
成功:
狀態碼: 200 OK
範例:
{
  "id": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
  "userId": 1,
  "name": "Updated Bot",
  "createdAt": "2025-04-04T12:00:00Z",
  "updatedAt": "2025-04-05T10:00:00Z"
}
錯誤:
狀態碼: 404 Not Found
範例: { "error": "機器人不存在" }
5. 修改 Flex Message
端點
方法: PUT
路徑: /flex-messages/:flexMessageId
描述
修改指定 Flex Message 內容。

參數
路徑參數:
flexMessageId (UUID, 必填): Flex Message ID。
請求體 (JSON, 可選):
flexMessage (物件): 新內容。
範例:
{
  "flexMessage": {
    "type": "flex",
    "altText": "Updated",
    "contents": { "type": "bubble", "body": { ... } }
  }
}
回應
成功:
狀態碼: 200 OK
範例:
{
  "id": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
  "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
  "flexMessage": { ... },
  "createdAt": "2025-04-04T12:01:00Z",
  "updatedAt": "2025-04-05T10:00:00Z"
}
錯誤:
狀態碼: 404 Not Found
範例: { "error": "Flex Message 不存在" }
6. 刪除機器人
端點
方法: DELETE
路徑: /bots/:botId
描述
刪除指定機器人及其 Flex Messages。

參數
路徑參數:
botId (UUID, 必填): 機器人 ID。
回應
成功:
狀態碼: 200 OK
範例:
{
  "message": "機器人已刪除"
}
錯誤:
狀態碼: 404 Not Found
範例: { "error": "機器人不存在" }
7. 刪除 Flex Message
端點
方法: DELETE
路徑: /flex-messages/:flexMessageId
描述
刪除指定 Flex Message。

參數
路徑參數:
flexMessageId (UUID, 必填): Flex Message ID。
回應
成功:
狀態碼: 200 OK
範例:
{
  "message": "Flex Message 已刪除"
}
錯誤:
狀態碼: 404 Not Found
範例: { "error": "Flex Message 不存在" }
8. 發送 Flex Message
端點
方法: POST
路徑: /send-message
描述
將 Flex Message 發送到 LINE 用戶。

參數
請求體 (JSON, 必填):
botId (UUID): 機器人 ID。
flexMessageId (UUID): Flex Message ID。
userId (字串): LINE 用戶 ID。
範例:
{
  "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
  "flexMessageId": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
  "userId": "U1234567890abcdef1234567890abcdef"
}
回應
成功:
狀態碼: 200 OK
範例:
{
  "message": "訊息已發送"
}
錯誤:
狀態碼: 404 Not Found
範例: { "error": "Flex Message 不存在" }
狀態碼: 400 Bad Request
範例: { "error": { "message": "Invalid user ID" } }
9. Webhook 接收
端點
方法: POST
路徑: /webhook
描述
接收 LINE 平台的 Webhook 事件。

參數
請求體 (JSON, 由 LINE 提供):
events (陣列): 事件列表。
範例:
{
  "events": [
    {
      "type": "message",
      "source": { "userId": "U123...", "type": "user" },
      "message": { "type": "text", "text": "Hi" },
      "replyToken": "abcdef1234567890..."
    }
  ]
}
回應
成功:
狀態碼: 200 OK
Body: "OK"
備註
目前僅記錄請求，未來可處理事件。
資料庫結構
表: users（與 loginAPI 共享）
表: bots
id (UUID, 主鍵): 機器人 ID。
userId (INTEGER, 外鍵): 參考 users(id)。
name (VARCHAR): 機器人名稱。
createdAt (TIMESTAMP): 創建時間。
updatedAt (TIMESTAMP): 更新時間。
表: flex_messages
id (UUID, 主鍵): Flex Message ID。
botId (UUID, 外鍵): 參考 bots(id)。
flexMessage (JSON): Flex Message 內容。
createdAt (TIMESTAMP): 創建時間。
updatedAt (TIMESTAMP): 更新時間。
使用範例
Postman 測試流程
獲取機器人:
GET http://localhost:3000/api/bots/1
建立機器人:
POST http://localhost:3000/api/bots
Body: {"userId": 1, "name": "Test Bot"}
儲存 Flex Message:
POST http://localhost:3000/api/flex-messages
Body: {"botId": "機器人ID", "flexMessage": {...}}
修改機器人:
PUT http://localhost:3000/api/bots/機器人ID
Body: {"name": "New Bot"}
修改 Flex Message:
PUT http://localhost:3000/api/flex-messages/FlexMessageID
Body: {"flexMessage": {...}}
刪除機器人:
DELETE http://localhost:3000/api/bots/機器人ID
刪除 Flex Message:
DELETE http://localhost:3000/api/flex-messages/FlexMessageID
發送 Flex Message:
POST http://localhost:3000/api/send-message
Body: {"botId": "機器人ID", "flexMessageId": "FlexMessageID", "userId": "LINE用戶ID"}
Webhook 測試:
使用 ngrok（例如 https://abcd-1234.ngrok-free.app/webhook）。
在 LINE Developer Console 設定 Webhook URL。