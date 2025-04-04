# LineBot Puzzle API 說明文件

## 概述
此 API 提供了一個後端服務，用於管理 LINE Bot 的機器人和 Flex Message。服務運行在 Node.js 環境，使用 PostgreSQL 資料庫（`LineBot_01`），並支援多用戶操作。每個用戶最多可創建 3 個機器人，每個機器人最多可儲存 10 個 Flex Message。API 基於 RESTful 設計，支援基本的 CRUD 操作及 LINE Messaging API 整合。

- **基礎 URL**: `http://localhost:3000/api`
- **資料庫**: PostgreSQL (`LineBot_01`)
- **認證**: 目前無需額外認證（未來可加入 JWT 或其他機制）。

---

## API 端點

### 1. 獲取用戶的機器人
#### 端點
- **方法**: `GET`
- **路徑**: `/bots/:userId`

#### 描述
返回指定用戶的所有機器人及其相關 Flex Messages。

#### 參數
- **路徑參數**:
  - `userId` (整數, 必填): 用戶的 ID，對應 `users` 表的 `id`。

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **Content-Type**: `application/json`
  - **範例**:
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": 1,
        "name": "Bot 1",
        "createdAt": "2025-04-04T12:00:00Z",
        "updatedAt": "2025-04-04T12:00:00Z",
        "FlexMessages": [
          {
            "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "flexMessage": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  { "type": "text", "text": "Hello" }
                ]
              }
            },
            "createdAt": "2025-04-04T12:01:00Z",
            "updatedAt": "2025-04-04T12:01:00Z"
          }
        ]
      }
    ]
    ```
- **錯誤**:
  - **狀態碼**: `500 Internal Server Error`
  - **範例**:
    ```json
    {
      "error": "資料庫查詢失敗"
    }
    ```

#### 備註
- 如果用戶尚未創建機器人，回應為空陣列 `[]`。

---

### 2. 建立新機器人
#### 端點
- **方法**: `POST`
- **路徑**: `/bots`

#### 描述
為指定用戶創建一個新機器人。

#### 參數
- **請求體** (JSON, 必填):
  - `userId` (整數): 用戶的 ID，對應 `users` 表的 `id`。
  - `name` (字串): 機器人的名稱。
- **範例**:
  ```json
  {
    "userId": 1,
    "name": "Bot 1"
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **Content-Type**: `application/json`
  - **範例**:
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": 1,
      "name": "Bot 1",
      "createdAt": "2025-04-04T12:00:00Z",
      "updatedAt": "2025-04-04T12:00:00Z"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
    - **範例**: `{ "error": "已達機器人數量上限 (3)" }`
  - **狀態碼**: `404 Not Found`
    - **範例**: `{ "error": "用戶不存在" }`
  - **狀態碼**: `500 Internal Server Error`
    - **範例**: `{ "error": "伺服器錯誤" }`

#### 限制
- 每個用戶最多創建 3 個機器人。

---

### 3. 儲存 Flex Message
#### 端點
- **方法**: `POST`
- **路徑**: `/flex-messages`

#### 描述
為指定機器人儲存一個新的 Flex Message。

#### 參數
- **請求體** (JSON, 必填):
  - `botId` (UUID): 機器人的 ID，對應 `bots` 表的 `id`。
  - `flexMessage` (物件): LINE Flex Message 的 JSON 結構。
- **範例**:
  ```json
  {
    "botId": "550e8400-e29b-41d4-a716-446655440000",
    "flexMessage": {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "Hello, World!"
          }
        ]
      }
    }
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **Content-Type**: `application/json`
  - **範例**:
    ```json
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "botId": "550e8400-e29b-41d4-a716-446655440000",
      "flexMessage": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "Hello, World!"
            }
          ]
        }
      },
      "createdAt": "2025-04-04T12:01:00Z",
      "updatedAt": "2025-04-04T12:01:00Z"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
    - **範例**: `{ "error": "已達 Flex Message 數量上限 (10)" }`
  - **狀態碼**: `404 Not Found`
    - **範例**: `{ "error": "機器人不存在" }`
  - **狀態碼**: `500 Internal Server Error`
    - **範例**: `{ "error": "伺服器錯誤" }`

#### 限制
- 每個機器人最多儲存 10 個 Flex Message。
- `flexMessage` 應符合 LINE Flex Message 的 JSON 規範（參考：https://developers.line.biz/en/docs/messaging-api/flex-message-elements/）。

---

### 4. 發送 Flex Message
#### 端點
- **方法**: `POST`
- **路徑**: `/send-message`

#### 描述
將指定的 Flex Message 發送到指定的 LINE 用戶。

#### 參數
- **請求體** (JSON, 必填):
  - `botId` (UUID): 機器人的 ID，對應 `bots` 表的 `id`。
  - `flexMessageId` (UUID): Flex Message 的 ID，對應 `flex_messages` 表的 `id`。
  - `userId` (字串): LINE 用戶的 ID。
- **範例**:
  ```json
  {
    "botId": "550e8400-e29b-41d4-a716-446655440000",
    "flexMessageId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "userId": "U1234567890abcdef1234567890abcdef"
  }
  ```

#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **Content-Type**: `application/json`
  - **範例**:
    ```json
    {
      "message": "訊息已發送"
    }
    ```
- **錯誤**:
  - **狀態碼**: `404 Not Found`
    - **範例**: `{ "error": "Flex Message 不存在" }`
  - **狀態碼**: `500 Internal Server Error`
    - **範例**: `{ "error": "LINE API 請求失敗" }`

#### 備註
- 需要在環境變數中設置有效的 `CHANNEL_ACCESS_TOKEN`。
- `userId` 必須是有效的 LINE 用戶 ID，可從 LINE 平台獲取。

## 資料庫結構
- **表**: `users`
  - `id` (INTEGER, 主鍵): 用戶 ID。
  - `username` (VARCHAR): 用戶名稱。
  - `password` (VARCHAR): 密碼。
  - `email` (VARCHAR): 電子郵件。
- **表**: `bots`
  - `id` (UUID, 主鍵): 機器人 ID。
  - `userId` (INTEGER, 外鍵): 參考 `users(id)`。
  - `name` (VARCHAR): 機器人名稱。
  - `createdAt` (TIMESTAMP): 創建時間。
  - `updatedAt` (TIMESTAMP): 更新時間。
- **表**: `flex_messages`
  - `id` (UUID, 主鍵): Flex Message ID。
  - `botId` (UUID, 外鍵): 參考 `bots(id)`。
  - `flexMessage` (JSON): Flex Message 內容。
  - `createdAt` (TIMESTAMP): 創建時間。
  - `updatedAt` (TIMESTAMP): 更新時間。

---

## 使用範例
### Postman 測試流程
1. **獲取用戶機器人**:
   - `GET http://localhost:3000/api/bots/1`
2. **建立機器人**:
   - `POST http://localhost:3000/api/bots`
   - Body: `{"userId": 1, "name": "Bot 1"}`
3. **儲存 Flex Message**:
   - `POST http://localhost:3000/api/flex-messages`
   - Body: `{"botId": "機器人ID", "flexMessage": {...}}`
4. **發送 Flex Message**:
   - `POST http://localhost:3000/api/send-message`
   - Body: `{"botId": "機器人ID", "flexMessageId": "Flex Message ID", "userId": "LINE用戶ID"}`