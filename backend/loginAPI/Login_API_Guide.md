# Login API 使用說明

## 概述
`Login API` 是一個基於 Python Flask 的後端認證服務，提供完整的用戶管理功能，包括註冊、電子郵件驗證、登入、密碼管理和登出功能。該 API 使用 PostgreSQL 資料庫儲存用戶資料，並實現了基於 JWT 的安全認證機制。

- **基礎 URL**: `https://login-api.jkl921102.org`（生產環境）
- **技術棧**: Python, Flask, PostgreSQL, JWT
- **認證機制**: 使用存儲在 HTTP-only cookies 中的 JWT 令牌
- **安全特性**: 密碼加密、安全 cookies、CORS 保護和電子郵件驗證

---

## API 端點

### 1. 註冊用戶
#### 端點
- **方法**: `POST`
- **路徑**: `/register`
#### 描述
註冊新用戶並發送電子郵件驗證連結。密碼會使用 PBKDF2-SHA256 算法加密後儲存。
#### 參數
- **請求體** (JSON, 必填):
  - `username` (字串): 用戶名
  - `password` (字串): 密碼（至少 8 個字符）
  - `email` (字串): 電子郵件
- **範例**:
  ```json
  {
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }
  ```
#### 回應
- **成功**:
  - **狀態碼**: `201 Created`
  - **範例**:
    ```json
    {
      "message": "User registered successfully! Please check your email to verify."
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "All fields are required" }`
  - **範例**: `{ "error": "Password must be at least 8 characters" }`
  - **狀態碼**: `409 Conflict`
  - **範例**: `{ "error": "Username or email already exists" }`
  - **狀態碼**: `500 Internal Server Error`
  - **範例**: `{ "error": "Database connection failed" }`

### 2. 驗證電子郵件
#### 端點
- **方法**: `GET`
- **路徑**: `/verify_email/<token>`
#### 描述
透過驗證電子郵件中的令牌來完成用戶電子郵件驗證。令牌有效期為 24 小時。
#### 參數
- **URL 參數**:
  - `token` (字串): 在註冊後發送到用戶電子郵件的驗證令牌
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Email verified successfully!"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "Verification link has expired" }`
  - **範例**: `{ "error": "Invalid verification link" }`
  - **範例**: `{ "error": "Email already verified or invalid" }`

### 3. 用戶登入
#### 端點
- **方法**: `POST`
- **路徑**: `/login`
#### 描述
驗證用戶憑證並發行 JWT 令牌。令牌將作為 HTTP-only cookie 存儲，有效期為 7 天。
#### 參數
- **請求體** (JSON, 必填):
  - `username` (字串): 用戶名
  - `password` (字串): 密碼
- **範例**:
  ```json
  {
    "username": "testuser",
    "password": "password123"
  }
  ```
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Login successful!",
      "username": "testuser",
      "email": "test@example.com"
    }
    ```
  - **Cookie**: 設置包含 JWT 令牌的 HTTP-only cookie
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "Username and password are required" }`
  - **狀態碼**: `401 Unauthorized`
  - **範例**: `{ "error": "Invalid credentials" }`
  - **狀態碼**: `403 Forbidden`
  - **範例**: `{ "error": "Please verify your email first" }`
  - **狀態碼**: `500 Internal Server Error`
  - **範例**: `{ "error": "Database connection failed" }`

### 4. 檢查登入狀態
#### 端點
- **方法**: `GET`
- **路徑**: `/check_login`
#### 描述
檢查用戶是否已經登入（JWT 令牌是否有效）。
#### 認證
- 需要有效的 JWT 令牌（存儲在 cookie 中）
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "User testuser is logged in"
    }
    ```
- **錯誤**:
  - **狀態碼**: `401 Unauthorized`
  - **範例**: `{ "error": "Token is missing" }`
  - **範例**: `{ "error": "Invalid token" }`

### 5. 忘記密碼
#### 端點
- **方法**: `POST`
- **路徑**: `/forgot_password`
#### 描述
發送密碼重置連結到用戶的電子郵件。重置連結有效期為 1 小時。
#### 參數
- **請求體** (JSON, 必填):
  - `email` (字串): 註冊時使用的電子郵件
- **範例**:
  ```json
  {
    "email": "test@example.com"
  }
  ```
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Password reset email sent!"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "Email is required" }`
  - **狀態碼**: `404 Not Found`
  - **範例**: `{ "error": "Email not found" }`
  - **狀態碼**: `500 Internal Server Error`
  - **範例**: `{ "error": "Error: [具體錯誤信息]" }`

### 6. 重置密碼
#### 端點
- **方法**: `POST`
- **路徑**: `/reset_password/<token>`
#### 描述
使用有效的重置令牌更新用戶密碼。
#### 參數
- **URL 參數**:
  - `token` (字串): 從重置郵件中獲取的令牌
- **請求體** (JSON, 必填):
  - `new_password` (字串): 新密碼（至少 8 個字符）
- **範例**:
  ```json
  {
    "new_password": "newSecurePassword123"
  }
  ```
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Password reset successfully!"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "New password must be at least 8 characters" }`
  - **範例**: `{ "error": "Reset link has expired" }`
  - **範例**: `{ "error": "Invalid reset link" }`
  - **狀態碼**: `500 Internal Server Error`
  - **範例**: `{ "error": "Database connection failed" }`

### 7. 修改密碼
#### 端點
- **方法**: `POST`
- **路徑**: `/change_password`
#### 描述
允許已登入用戶更改密碼。
#### 認證
- 需要有效的 JWT 令牌（存儲在 cookie 中）
#### 參數
- **請求體** (JSON, 必填):
  - `old_password` (字串): 當前密碼
  - `new_password` (字串): 新密碼（至少 8 個字符）
- **範例**:
  ```json
  {
    "old_password": "password123",
    "new_password": "newSecurePassword123"
  }
  ```
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Password changed successfully!"
    }
    ```
- **錯誤**:
  - **狀態碼**: `400 Bad Request`
  - **範例**: `{ "error": "Old and new passwords are required" }`
  - **範例**: `{ "error": "New password must be at least 8 characters" }`
  - **狀態碼**: `401 Unauthorized`
  - **範例**: `{ "error": "Invalid old password" }`
  - **範例**: `{ "error": "Token is missing" }`
  - **範例**: `{ "error": "Invalid token" }`
  - **狀態碼**: `500 Internal Server Error`
  - **範例**: `{ "error": "Database connection failed" }`

### 8. 用戶登出
#### 端點
- **方法**: `POST`
- **路徑**: `/logout`
#### 描述
登出用戶，清除認證 cookie。
#### 回應
- **成功**:
  - **狀態碼**: `200 OK`
  - **範例**:
    ```json
    {
      "message": "Logged out successfully!"
    }
    ```
  - **Cookie**: 清除包含 JWT 令牌的 cookie

---

## 資料庫結構
### 表: users
- `id` (INTEGER, 主鍵): 用戶 ID
- `username` (VARCHAR, 唯一): 用戶名
- `password` (VARCHAR): 加密後的密碼
- `email` (VARCHAR, 唯一): 電子郵件
- `email_verified` (BOOLEAN): 電子郵件驗證狀態

---

## 使用範例

### 完整使用流程
1. **註冊用戶**:
   ```bash
   curl -X POST https://login-api.jkl921102.org/register \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123", "email": "test@example.com"}'
   ```

2. **檢查電子郵件並點擊驗證連結**:
   連結格式：`https://login-api.jkl921102.org/verify_email/<token>`

3. **登入**:
   ```bash
   curl -X POST https://login-api.jkl921102.org/login \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123"}' \
     -c cookies.txt
   ```

4. **檢查登入狀態**:
   ```bash
   curl -X GET https://login-api.jkl921102.org/check_login \
     -b cookies.txt
   ```

5. **修改密碼**:
   ```bash
   curl -X POST https://login-api.jkl921102.org/change_password \
     -H "Content-Type: application/json" \
     -d '{"old_password": "password123", "new_password": "newSecurePassword123"}' \
     -b cookies.txt
   ```

6. **登出**:
   ```bash
   curl -X POST https://login-api.jkl921102.org/logout \
     -b cookies.txt
   ```

### 忘記密碼流程
1. **發送重置請求**:
   ```bash
   curl -X POST https://login-api.jkl921102.org/forgot_password \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **檢查電子郵件並使用重置連結**:
   ```bash
   curl -X POST https://login-api.jkl921102.org/reset_password/<token> \
     -H "Content-Type: application/json" \
     -d '{"new_password": "newSecurePassword123"}'
   ```

---

## 安全注意事項
- 所有密碼必須至少 8 個字符長度
- 電子郵件驗證連結有效期為 24 小時
- 密碼重置連結有效期為 1 小時
- JWT 令牌存儲在 HTTP-only cookie 中，減少 XSS 攻擊風險
- 必須完成電子郵件驗證才能登入
- 密碼使用 PBKDF2-SHA256 算法加鹽哈希處理
- API 使用 HTTPS 並實施同源政策
