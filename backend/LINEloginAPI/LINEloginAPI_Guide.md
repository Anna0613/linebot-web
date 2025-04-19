# API 使用說明文件

本文件說明此 API 服務的環境變數設定及主要功能，方便開發者理解與使用。

---

## 環境變數設定

| 變數名稱              | 說明                             | 範例值                          |
|---------------------|--------------------------------|------------------------------|
| `DB_HOST`           | 資料庫主機位置                     | `localhost`                  |
| `DB_PORT`           | 資料庫連接埠號                     | `5432`                       |
| `DB_NAME`           | 資料庫名稱                        | `mydb`                       |
| `DB_USER`           | 資料庫使用者帳號                    | `user`                       |
| `DB_PASSWORD`       | 資料庫使用者密碼                    | `secret`                     |
| `JWT_SECRET`        | JWT 簽章密鑰，用於產生與驗證 Token     | `your_jwt_secret`            |
| `LINE_CHANNEL_ID`   | LINE Login 頻道 ID                | `123456`                     |
| `LINE_CHANNEL_SECRET`| LINE Login 頻道密鑰                | `abcdef`                     |
| `LINE_REDIRECT_URI` | LINE Login 授權回調網址              | `http://localhost:5501/line/callback` |
| `FRONTEND_URL`      | 前端應用程式網址                   | `http://localhost:8080`      |

---

## API 功能說明

### 1. LINE Login 登入流程

- **路由**：`GET /api/line-login`
- **功能**：產生 LINE OAuth 2.0 登入連結，前端可導向此連結讓使用者進行 LINE 授權。
- **回傳**：
```

{
"login_url": "https://access.line.me/oauth2/v2.1/authorize?response_type=code\&client_id=...\&redirect_uri=...\&state=...\&scope=profile%20openid%20email"
}

```

### 2. LINE Login 授權回調

- **路由**：`GET /line/callback`
- **功能**：
- 接收 LINE 授權後回傳的 `code` 與 `state`。
- 向 LINE 伺服器請求 access token。
- 使用 access token 取得使用者 LINE 個人資料。
- 將使用者資料儲存或更新於資料庫中。
- 產生 JWT Token，並將使用者導向前端頁面，附帶 Token 與顯示名稱。
- **流程**：
1. 取得授權碼 `code`。
2. 交換取得 access token。
3. 取得使用者個人資料（userId、displayName、pictureUrl）。
4. 資料庫新增或更新使用者資料。
5. 產生 JWT Token（有效期限 1 小時）。
6. 導向前端，網址格式：
   ```
   {FRONTEND_URL}/line-login?token={JWT_TOKEN}&amp;display_name={URL_ENCODED_DISPLAY_NAME}
   ```

### 3. 驗證 JWT Token

- **路由**：`POST /api/verify-token`
- **請求格式**：
```

{
"token": "JWT_TOKEN"
}

```
- **功能**：
- 驗證 JWT Token 是否有效。
- 回傳對應使用者資料（line_id、display_name、picture_url）。
- **回傳範例**：
```

{
"line_id": "Uxxxxxxxxxxxxxx",
"display_name": "使用者名稱",
"picture_url": "https://example.com/picture.jpg"
}

```
- **錯誤回應**：
- Token 過期或無效會回傳 401。
- 找不到使用者回傳 404。

### 4. 資料庫狀態檢查

- **路由**：`GET /api/database-status`
- **功能**：
- 檢查資料庫連線是否正常。
- 確認 `users` 表是否存在。
- 確認 PostgreSQL `uuid-ossp` 擴展是否啟用。
- 回傳使用者數量。
- **回傳範例**：
```

{
"connection": "successful",
"users_table_exists": true,
"uuid_ossp_enabled": true,
"user_count": 10
}

```

---

## 資料庫模型

- **User 表格結構**

| 欄位名稱     | 資料型態            | 說明                          |
|------------|-----------------|-----------------------------|
| `id`       | UUID            | 主鍵，自動產生 UUID             |
| `line_id`  | String(255)     | LINE 使用者唯一識別碼，唯一且不可為空   |
| `display_name` | String(255)  | 使用者顯示名稱                    |
| `email`    | String(255)     | 使用者電子郵件（可為空）             |
| `picture_url` | String(255)   | 使用者頭像網址                    |
| `created_at` | DateTime       | 建立時間，預設為當下 UTC 時間         |

---

## 注意事項

- 請確保所有環境變數皆已正確設定，否則服務無法正常啟動。
- JWT Token 有效期限為 1 小時，過期後需重新登入。
- LINE Login 授權回調網址需與 LINE Developers 設定一致。
- 前端需將登入後取得的 Token 保存在安全位置，並在後續 API 呼叫中使用。

---

此說明文件依據 API 程式碼與環境設定整理，協助開發者快速理解與整合 LINE Login 功能與使用者驗證流程。
```