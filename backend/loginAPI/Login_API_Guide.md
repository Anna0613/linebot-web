# Login API 使用說明

## 概述
`Login API` 是一個基於 Python Flask 的後端服務，提供用戶註冊、登入、檢查登入狀態和登出功能。該 API 使用 PostgreSQL 資料庫（`LineBot_01`）儲存用戶資料，並支援跨來源資源共享（CORS）。用戶登入後，會話（session）將在 7 天內有效。

- **基礎 URL**: `http://localhost:5501`（本地測試）
- **技術棧**: Python, Flask, PostgreSQL
- **認證**: 使用 Flask session 管理登入狀態

---

## API 端點

### 1. 註冊用戶
#### 端點
- **方法**: `POST`
- **路徑**: `/register`

#### 描述
註冊新用戶，將用戶名、密碼（加密後）和電子郵件儲存到資料庫。

#### 參數
- **請求體** (JSON, 必填):
  - `username` (字串): 用戶名。
  - `password` (字串): 密碼（將被加密）。
  - `email` (字串): 電子郵件。
- **範例**:
  ```json
  {
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }
回應
成功:
狀態碼: 201 Created
範例:
{
  "message": "User registered successfully!"
}
錯誤:
狀態碼: 400 Bad Request
範例: { "error": "Username, password, and email are required." }
範例: { "error": "Username or email already exists." }
狀態碼: 500 Internal Server Error
範例: { "error": "Database connection failed" }
2. 用戶登入
端點
方法: POST
路徑: /login
描述
驗證用戶憑證並建立會話。

參數
請求體 (JSON, 必填):
username (字串): 用戶名。
password (字串): 密碼。
範例:
{
  "username": "testuser",
  "password": "password123"
}
回應
成功:
狀態碼: 200 OK
範例:
{
  "message": "Login successful!",
  "username": "testuser",
  "email": "test@example.com"
}
錯誤:
狀態碼: 400 Bad Request
範例: { "error": "Username and password are required." }
狀態碼: 401 Unauthorized
範例: { "error": "Invalid username or password." }
狀態碼: 500 Internal Server Error
範例: { "error": "Database connection failed" }
3. 檢查登入狀態
端點
方法: GET
路徑: /check_login
描述
檢查當前會話是否處於登入狀態。

參數
無需額外參數（依賴 session）。
回應
成功:
狀態碼: 200 OK
範例:
{
  "message": "User testuser is logged in."
}
錯誤:
狀態碼: 401 Unauthorized
範例: { "error": "Not logged in." }
4. 用戶登出
端點
方法: POST
路徑: /logout
描述
清除當前會話，登出用戶。

參數
無需額外參數（依賴 session）。
回應
成功:
狀態碼: 200 OK
範例:
{
  "message": "Logged out successfully!"
}
資料庫結構
表: users
id (INTEGER, 主鍵): 用戶 ID。
username (VARCHAR): 用戶名（唯一）。
password (VARCHAR): 加密後的密碼。
email (VARCHAR): 電子郵件（唯一）。
使用範例
Postman 測試流程
註冊用戶:
POST http://localhost:5501/register
Body: {"username": "testuser", "password": "password123", "email": "test@example.com"}
登入:
POST http://localhost:5501/login
Body: {"username": "testuser", "password": "password123"}
檢查登入狀態:
GET http://localhost:5501/check_login
登出:
POST http://localhost:5501/logout
注意事項
安全性: 目前使用 session 管理登入，建議未來加入 JWT 增強安全性。
資料庫連線: 確保 PostgreSQL 服務運行，且配置正確。
CORS: 已啟用，支援跨域請求。