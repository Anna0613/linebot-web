# Email 驗證功能實現文檔

## 功能概述

實現了完整的用戶email驗證功能，包括：
1. 用戶更改email時自動發送驗證郵件
2. 在設定頁面顯示email驗證狀態
3. 提供重新發送驗證郵件功能

## 問題修復：400 Bad Request 錯誤

### 問題原因
原本的實現中，SettingAPI發送的驗證郵件連結指向loginAPI的驗證端點，但兩個API使用不同的SECRET_KEY，導致token無法正確解析，出現400錯誤。

### 解決方案
1. 在SettingAPI中添加自己的email驗證端點
2. 修改驗證郵件中的連結，指向SettingAPI而不是loginAPI
3. 修改前端EmailVerification.tsx，調用SettingAPI的驗證端點

## 後端實現 (SettingAPI)

### 1. 新增依賴
在 `backend/SettingAPI/requirements.txt` 中添加：
- `flask-mail==0.9.1` - 郵件發送功能
- `itsdangerous==2.1.2` - 安全token生成

### 2. 郵件配置
在 `backend/SettingAPI/app.py` 中添加：
```python
from flask import Flask, request, jsonify, make_response, redirect

# 郵件配置
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
mail = Mail(app)

# Token 生成器
ts = URLSafeTimedSerializer(app.config['SECRET_KEY'])
```

### 3. 修改 update_profile API
- 檢測email是否有變更
- 如果有變更，重置 `email_verified` 為 `False`
- 發送驗證郵件到新的email地址（**現在指向SettingAPI**）
- 返回是否發送了驗證郵件的狀態

### 4. 新增email驗證相關API端點

#### A. Email驗證API
```python
@app.route('/verify-email', methods=['POST'])
def verify_email_token():
    # 處理來自前端的POST請求
    # 驗證token並更新email_verified狀態
```

#### B. Email驗證重定向端點
```python
@app.route('/verify_email/<token>', methods=['GET'])
def verify_email_redirect(token):
    # 處理郵件中的GET連結點擊
    # 重定向到前端驗證頁面
```

#### C. 重新發送驗證郵件API
```python
@app.route('/resend-email-verification', methods=['POST'])
@token_required
def resend_email_verification():
    # 檢查用戶email和驗證狀態
    # 發送驗證郵件（**現在指向SettingAPI**）
    # 返回發送狀態
```

## 前端實現 (Setting頁面)

### 1. 修改EmailVerification.tsx
```typescript
// 原本調用loginAPI
const response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.VERIFY_EMAIL), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
});

// 現在調用SettingAPI
const response = await fetch(getApiUrl(API_CONFIG.SETTING.BASE_URL, '/verify-email'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
});
```

### 2. 狀態管理
新增狀態：
```typescript
const [emailVerified, setEmailVerified] = useState(false);
const [isResendingEmailVerification, setIsResendingEmailVerification] = useState(false);
```

### 3. User Interface 更新
添加 `email_verified` 欄位：
```typescript
interface User {
  email_verified?: boolean;
  // ... 其他欄位
}
```

### 4. API 服務更新
在 `frontend/src/services/api.ts` 中新增：
```typescript
async resendEmailVerification(): Promise<ApiResponse> {
  return this.post(`${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.RESEND_EMAIL_VERIFICATION}`);
}
```

### 5. UI 改進
- 在email欄位旁顯示驗證狀態標籤（已驗證/未驗證）
- 為未驗證的email顯示警告信息
- 提供重新發送驗證郵件的按鈕

## 驗證流程

1. **用戶更改email**：
   - 用戶在設定頁面編輯email並保存
   - 後端檢測到email變更，重置驗證狀態
   - 自動發送驗證郵件到新email地址（**指向SettingAPI**）
   - 前端顯示成功信息和驗證提醒

2. **email驗證**：
   - 用戶點擊郵件中的驗證連結
   - 連結指向 **SettingAPI** 的驗證端點：`https://setting-api.jkl921102.org/verify_email/{token}`
   - SettingAPI重定向到前端驗證頁面：`/verify-email?token={token}`
   - 前端調用SettingAPI的 `/verify-email` POST端點進行驗證
   - 驗證成功後更新資料庫中的 `email_verified` 狀態

3. **重新發送驗證**：
   - 用戶可以在設定頁面點擊重新發送驗證郵件
   - 系統檢查email是否已驗證
   - 如未驗證，發送新的驗證郵件（**指向SettingAPI**）

## 修復的關鍵變更

### 1. API一致性
- **之前**：SettingAPI發送郵件 → loginAPI驗證 → SECRET_KEY不一致 → 400錯誤
- **現在**：SettingAPI發送郵件 → SettingAPI驗證 → 使用相同SECRET_KEY → 成功

### 2. URL變更
```python
# 之前
verify_url = f"https://login-api.jkl921102.org/verify_email/{token}"

# 現在
verify_url = f"https://setting-api.jkl921102.org/verify_email/{token}"
```

### 3. 前端端點變更
```typescript
// 之前
getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.VERIFY_EMAIL)

// 現在
getApiUrl(API_CONFIG.SETTING.BASE_URL, '/verify-email')
```

## 視覺特性

### email狀態顯示
- **已驗證**：綠色標籤 `bg-green-100 text-green-800`
- **未驗證**：黃色標籤 `bg-yellow-100 text-yellow-800`
- **LINE用戶**：自動顯示為已驗證（綠色標籤）

### 驗證提醒
- 未驗證email顯示黃色警告文字
- 提供藍色連結樣式的重新發送按鈕
- 發送中狀態顯示 "發送中..." 並禁用按鈕

## 安全考量

1. **Token安全**：使用 `itsdangerous` 生成安全的驗證token
2. **時效性**：驗證連結24小時後失效
3. **權限檢查**：所有API都需要用戶認證
4. **錯誤處理**：郵件發送失敗不會回滾資料庫更新
5. **API一致性**：所有驗證操作都在同一個API服務中進行

## 環境變數配置

需要在 `.env` 文件中配置：
```
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:8080
```

## 測試建議

1. **功能測試**：
   - 測試更改email後是否收到驗證郵件
   - 測試點擊郵件連結是否正確重定向
   - 測試驗證過程是否成功完成
   - 測試重新發送驗證郵件功能
   - 測試驗證狀態的正確顯示

2. **邊界條件測試**：
   - 測試相同email的更新（不應發送驗證郵件）
   - 測試已驗證email的重新發送請求
   - 測試無效email格式的處理
   - 測試過期token的處理

3. **UI測試**：
   - 測試不同驗證狀態的視覺顯示
   - 測試LINE用戶和一般用戶的不同顯示
   - 測試loading狀態的正確顯示
   - 測試400錯誤已修復 