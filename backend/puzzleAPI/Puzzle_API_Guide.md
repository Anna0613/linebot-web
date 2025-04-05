# Puzzle API 使用說明

## 概述
`Puzzle API` 是一個基於 Node.js 和 Express 的後端服務，用於管理 LINE Bot 的機器人和 Flex Messages，並整合 LINE Messaging API 以發送訊息和接收 Webhook 事件。該 API 使用 PostgreSQL 資料庫（`LineBot_01`）儲存資料，每個用戶最多可創建 3 個機器人，每個機器人最多儲存 10 個 Flex Messages。每個機器人擁有獨立的 `channel_access_token` 和 `channel_secret`，允許動態發送訊息。

- **基礎 URL**: `http://localhost:3000/api`（本地測試）或 `http://<Unraid_IP>:3000/api`（部署後）
- **技術棧**: Node.js, Express, Sequelize, PostgreSQL
- **認證**: 目前無需額外認證，建議未來整合 `loginAPI`

---

## API 端點

### 1. 獲取用戶的機器人
#### 端點
- **方法**: `GET`
- **路徑**: `/api/bots/:userId`

#### 描述
返回指定用戶的所有機器人及其關聯的 Flex Messages。

#### 參數
- **路徑參數**:
  - `userId` (整數, 必填): 用戶 ID，對應 `users` 表的 `id`。

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
        "channel_access_token": "your_channel_access_token",
        "channel_secret": "your_channel_secret",
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
    ```
- **錯誤**:
  - **狀態碼**: `500 Internal Server Error`
  - **範例**: `{ "error": "資料庫查詢失敗" }`

#### 備註
若無機器人，回應為空陣列 `[]`。

### 2. 建立新機器人
#### 端點
- **方法**: `POST`
- **路徑**: `/api/bots`

#### 描述
為指定用戶創建新機器人，需提供名稱及 LINE Channel 的認證憑證。

#### 參數
- **請求體** (JSON, 必填):
  - `userId` (整數): 用戶 ID。
  - `name` (字串): 機器人名稱。
  - `channel_access_token` (字串): LINE Channel 的 Access Token。
  - `channel_secret` (字串): LINE Channel 的 Secret。
- **範例**:
  ```json
  {
    "userId": 1,
    "name": "Test Bot",
    "channel_access_token": "your_channel_access_token",
    "channel_secret": "your_channel_secret"
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "id": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
      "userId": 1,
      "name": "Test Bot",
      "channel_access_token": "your_channel_access_token",
      "channel_secret": "your_channel_secret",
      "createdAt": "2025-04-04T12:00:00Z",
      "updatedAt": "2025-04-04T12:00:00Z"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "已達機器人數量上限 (3)" }`
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "用戶不存在" }`

#### 限制
每個用戶最多 3 個機器人。

### 3. 儲存 Flex Message
#### 端點
- **方法**: `POST`
- **路徑**: `/api/flex-messages`

#### 描述
為指定機器人儲存 Flex Message。

#### 參數
- **請求體** (JSON, 必填):
  - `botId` (UUID): 機器人 ID。
  - `flexMessage` (物件): LINE Flex Message JSON。
- **範例**:
  ```json
  {
    "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
    "flexMessage": {
      "type": "flex",
      "altText": "Test Message",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": "Hello" }
          ]
        }
      }
    }
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "id": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
      "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
      "flexMessage": { "type": "flex", "altText": "Test Message", "contents": { ... } },
      "createdAt": "2025-04-04T12:01:00Z",
      "updatedAt": "2025-04-04T12:01:00Z"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "已達 Flex Message 數量上限 (10)" }`
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "機器人不存在" }`

#### 限制
每個機器人最多 10 個 Flex Messages。

### 4. 修改機器人資訊
#### 端點
- **方法**: `PUT`
- **路徑**: `/api/bots/:botId`

#### 描述
修改指定機器人的名稱。

#### 參數
- **路徑參數**:
  - `botId` (UUID, 必填): 機器人 ID。
- **請求體** (JSON, 可選):
  - `name` (字串): 新名稱。
- **範例**:
  ```json
  {
    "name": "Updated Bot"
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "id": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
      "userId": 1,
      "name": "Updated Bot",
      "channel_access_token": "your_channel_access_token",
      "channel_secret": "your_channel_secret",
      "createdAt": "2025-04-04T12:00:00Z",
      "updatedAt": "2025-04-05T10:00:00Z"
    }
    ```
- **錯誤**:
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "機器人不存在" }`

### 5. 修改 Flex Message
#### 端點
- **方法**: `PUT`
- **路徑**: `/api/flex-messages/:flexMessageId`

#### 描述
修改指定 Flex Message 的內容。

#### 參數
- **路徑參數**:
  - `flexMessageId` (UUID, 必填): Flex Message ID。
- **請求體** (JSON, 可選):
  - `flexMessage` (物件): 新 Flex Message 內容。
- **範例**:
  ```json
  {
    "flexMessage": {
      "type": "flex",
      "altText": "Updated Message",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": "Updated Hello" }
          ]
        }
      }
    }
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "id": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
      "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
      "flexMessage": { "type": "flex", "altText": "Updated Message", "contents": { ... } },
      "createdAt": "2025-04-04T12:01:00Z",
      "updatedAt": "2025-04-05T10:00:00Z"
    }
    ```
- **錯誤**:
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "Flex Message 不存在" }`

### 6. 刪除機器人
#### 端點
- **方法**: `DELETE`
- **路徑**: `/api/bots/:botId`

#### 描述
刪除指定機器人及其所有 Flex Messages。

#### 參數
- **路徑參數**:
  - `botId` (UUID, 必填): 機器人 ID。

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "機器人已刪除"
    }
    ```
- **錯誤**:
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "機器人不存在" }`

#### 備註
由於資料庫設有 ON DELETE CASCADE，相關 Flex Messages 會自動刪除。

### 7. 刪除 Flex Message
#### 端點
- **方法**: `DELETE`
- **路徑**: `/api/flex-messages/:flexMessageId`

#### 描述
刪除指定的 Flex Message。

#### 參數
- **路徑參數**:
  - `flexMessageId` (UUID, 必填): Flex Message ID。

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Flex Message 已刪除"
    }
    ```
- **錯誤**:
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "Flex Message 不存在" }`

### 8. 發送 Flex Message
#### 端點
- **方法**: `POST`
- **路徑**: `/api/send-message`

#### 描述
將指定的 Flex Message 使用對應機器人的 channel_access_token 發送到 LINE 用戶。

#### 參數
- **請求體** (JSON, 必填):
  - `botId` (UUID): 機器人 ID。
  - `flexMessageId` (UUID): Flex Message ID。
  - `userId` (字串): LINE 用戶 ID。
- **範例**:
  ```json
  {
    "botId": "2dcc9df0-ce46-451c-a502-b9fee9b97577",
    "flexMessageId": "e3837f26-b8be-43e2-b162-be2ffafde1d4",
    "userId": "U1234567890abcdef1234567890abcdef"
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "訊息已發送"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "此 Bot 缺少 CHANNEL_ACCESS_TOKEN" }`
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "Flex Message 不存在" }`
  - **狀態碼**: `400 Bad Request`（LINE API 錯誤）
  - **範例**: `{ "error": { "message": "Invalid user ID" } }`

#### 備註
發送時使用指定 botId 的 channel_access_token。

### 9. Webhook 接收
#### 端點
- **方法**: `POST`
- **路徑**: `/webhook`

#### 描述
接收 LINE 平台的 Webhook 事件。

#### 參數
- **請求體** (JSON, 由 LINE 平台提供):
  - `events` (陣列): 事件列表。
- **範例**:
  ```json
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
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **Body**: `"OK"`

#### 備註
目前僅記錄請求，未來可根據 Bot 的 channel_secret 驗證簽名並處理事件。

## 環境變數
需要在部署時配置（例如透過 .env 或 Unraid Docker UI）：
```
PORT_PUZZLE=3000
DB_HOST=sql.jkl921102.org
DB_PORT=5432
DB_NAME=LineBot_01
DB_USER=11131230
DB_PASSWORD=11131230
```

#### 說明:
- `PORT_PUZZLE`: 服務運行端口（預設 3000）。
- `DB_*`: 資料庫連線參數。
- `CHANNEL_ACCESS_TOKEN` 和 `CHANNEL_SECRET` 不再全局定義，改為儲存在 bots 表中。

## 資料庫結構
### 表: users
- `id` (INTEGER, 主鍵): 用戶 ID。
- `username` (VARCHAR): 用戶名。
- `password` (VARCHAR): 密碼。
- `email` (VARCHAR): 電子郵件。

### 表: bots
- `id` (UUID, 主鍵): 機器人 ID。
- `userId` (INTEGER, 外鍵): 參考 users(id)。
- `name` (VARCHAR): 機器人名稱。
- `channel_access_token` (TEXT): LINE Channel 的 Access Token。
- `channel_secret` (TEXT): LINE Channel 的 Secret。
- `createdAt` (TIMESTAMP): 創建時間。
- `updatedAt` (TIMESTAMP): 更新時間。

### 表: flex_messages
- `id` (UUID, 主鍵): Flex Message ID。
- `botId` (UUID, 外鍵): 參考 bots(id)。
- `flexMessage` (JSON): Flex Message 內容。
- `createdAt` (TIMESTAMP): 創建時間。
- `updatedAt` (TIMESTAMP): 更新時間。

## 使用範例
### Postman 測試流程
1. **建立機器人**:
   - POST http://<Unraid_IP>:3000/api/bots
   - Body: `{"userId": 1, "name": "Bot 1", "channel_access_token": "token1", "channel_secret": "secret1"}`

2. **儲存 Flex Message**:
   - POST http://<Unraid_IP>:3000/api/flex-messages
   - Body: `{"botId": "機器人ID", "flexMessage": {...}}`

3. **發送 Flex Message**:
   - POST http://<Unraid_IP>:3000/api/send-message
   - Body: `{"botId": "機器人ID", "flexMessageId": "FlexMessageID", "userId": "LINE用戶ID"}`

4. **獲取機器人**:
   - GET http://<Unraid_IP>:3000/api/bots/1

5. **修改與刪除**:
   - 使用對應的 PUT 和 DELETE 端點。

## 注意事項
- **安全性**: 目前無認證，建議與 loginAPI 整合。
- **Webhook**: 未實作簽名驗證，需根據 channel_secret 處理。
- **Flex Message**: 確保符合 LINE API 規範（參考：https://developers.line.biz/en/docs/messaging-api/flex-message-elements/）。
- **端口衝突**: 若 3000 被占用，可改用其他端口（例如 -p 3001:3000）。
