# LineBot-Web API 文檔 - 繁體中文完整版

> 💡 **LineBot 網頁管理介面 API 完整使用指南**  
> 本文檔提供詳細的 API 端點說明、使用範例和最佳實踐，適用於前端開發者和系統整合人員。

## 📋 目錄

- [系統概覽](#系統概覽)
- [API 架構版本說明](#api-架構版本說明)
- [認證機制](#認證機制)
- [Backend-v1 統一架構 API](#backend-v1-統一架構-api)
- [微服務架構 API（舊版）](#微服務架構-api舊版)
- [資料庫架構](#資料庫架構)
- [前端整合指南](#前端整合指南)
- [錯誤處理](#錯誤處理)
- [最佳實踐](#最佳實踐)
- [常見問題](#常見問題)

---

## 🏗️ 系統概覽

### 技術架構

LineBot-Web 是一個現代化的 LINE Bot 管理平台，支援以下功能：

- **LINE Bot 管理**：建立、編輯、部署多個 LINE Bot
- **Flex Message 編輯器**：視覺化設計複雜的訊息模板
- **用戶認證系統**：支援傳統註冊登入與 LINE OAuth
- **程式碼管理**：Bot 邏輯程式碼的版本控制
- **個人化設定**：用戶頭像、個人資料管理

### 系統特色

| 特色 | 說明 |
|------|------|
| 🚀 **現代化架構** | 採用 FastAPI + React，提供高效能與良好用戶體驗 |
| 🔐 **安全認證** | JWT Token + Cookie 雙重認證機制 |
| 🌐 **多語言支援** | 完整的繁體中文介面與文檔 |
| 📱 **響應式設計** | 支援桌面與行動裝置 |
| 🔧 **模組化設計** | 可擴展的微服務架構 |

---

## 🔄 API 架構版本說明

### Backend-v1（推薦使用）

**採用統一架構設計**，所有 API 端點整合於單一服務中：

```
http://localhost:8000/api/v1/
├── auth/          # 認證相關
├── users/         # 用戶管理
└── bots/          # Bot 管理
```

**優點**：
- ✅ 統一的 API 設計模式
- ✅ 自動生成 OpenAPI 文檔
- ✅ 更好的效能和維護性
- ✅ 完整的型別檢查

### 微服務架構（舊版維護中）

**多服務分散式設計**，功能分別部署於不同端口：

```
http://localhost:5501/   # LoginAPI - 傳統認證
http://localhost:5502/   # LINEloginAPI - LINE OAuth
http://localhost:5503/   # PuzzleAPI - Bot 管理
http://localhost:5504/   # SettingAPI - 用戶設定
```

---

## 🔐 認證機制

### JWT Token 結構

```json
{
  "username": "使用者名稱",
  "login_type": "general|line",
  "line_id": "LINE用戶ID（僅LINE登入時存在）",
  "exp": 1640995200,
  "iat": 1640908800
}
```

### 認證方式

#### 方式一：Authorization Header（推薦）
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 方式二：Cookie（瀏覽器自動處理）
```http
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 認證流程圖

```mermaid
sequenceDiagram
    participant 前端 as 前端應用
    participant API as API 服務
    participant DB as 資料庫
    
    前端->>API: 1. 發送登入請求
    API->>DB: 2. 驗證用戶憑證
    DB-->>API: 3. 返回用戶資料
    API-->>前端: 4. 返回 JWT Token
    
    Note over 前端,API: 後續請求都需要攜帶 Token
    
    前端->>API: 5. 附帶 Token 的 API 請求
    API->>API: 6. 驗證 Token 有效性
    API-->>前端: 7. 返回請求結果
```

---

## 🚀 Backend-v1 統一架構 API

### 基本資訊

| 項目 | 值 |
|------|-----|
| **基本 URL** | `http://localhost:8000` |
| **API 版本** | v1 |
| **API 前綴** | `/api/v1` |
| **文檔 URL** | `/docs`（開發環境）|
| **健康檢查** | `/health` |

### 🔑 認證相關 API

#### 📝 用戶註冊

**端點**：`POST /api/v1/auth/register`

**說明**：註冊新用戶帳號，系統會發送驗證郵件

**請求格式**：
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123",
  "email": "john@example.com"
}
```

**參數說明**：
- `username`（必填）：用戶名稱，3-50 字元
- `password`（必填）：密碼，最少 8 字元
- `email`（選填）：電子郵件地址

**成功回應**：
```json
{
  "message": "註冊成功，請檢查您的郵箱進行驗證"
}
```

**JavaScript 實作範例**：
```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '註冊失敗');
    }

    return await response.json();
  } catch (error) {
    console.error('註冊錯誤:', error);
    throw error;
  }
};

// 使用範例
registerUser({
  username: 'john_doe',
  password: 'password123',
  email: 'john@example.com'
});
```

#### 🔓 用戶登入

**端點**：`POST /api/v1/auth/login`

**說明**：使用用戶名稱或電子郵件登入系統

**請求格式**：
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=john_doe&password=password123
```

**成功回應**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**實作範例**：
```javascript
const loginUser = async (username, password) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);

  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      body: formData,
      credentials: 'include' // 重要：處理 Cookie
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '登入失敗');
    }

    const data = await response.json();
    
    // 儲存 token 到 localStorage
    localStorage.setItem('token', data.access_token);
    
    return data;
  } catch (error) {
    console.error('登入錯誤:', error);
    throw error;
  }
};
```

#### 📱 LINE 登入

**端點**：`POST /api/v1/auth/line-login`

**說明**：取得 LINE OAuth 登入 URL

**請求格式**：
```http
POST /api/v1/auth/line-login
```

**成功回應**：
```json
{
  "login_url": "https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=..."
}
```

**實作範例**：
```javascript
const initiateLineLogin = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/line-login', {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('無法取得 LINE 登入 URL');
    }

    const data = await response.json();
    
    // 重導向到 LINE 登入頁面
    window.location.href = data.login_url;
  } catch (error) {
    console.error('LINE 登入錯誤:', error);
    throw error;
  }
};
```

#### ✅ 檢查登入狀態

**端點**：`GET /api/v1/auth/check-login`

**說明**：驗證當前用戶的登入狀態

**請求格式**：
```http
GET /api/v1/auth/check-login
Authorization: Bearer <token>
```

**成功回應**：
```json
{
  "authenticated": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### 🚪 用戶登出

**端點**：`POST /api/v1/auth/logout`

**說明**：登出當前用戶並清除 Cookie

**請求格式**：
```http
POST /api/v1/auth/logout
```

**成功回應**：
```json
{
  "message": "登出成功"
}
```

### 👤 用戶管理 API

#### 📄 取得用戶檔案

**端點**：`GET /api/v1/users/profile`

**說明**：取得當前登入用戶的詳細資料

**請求格式**：
```http
GET /api/v1/users/profile
Authorization: Bearer <token>
```

**成功回應**：
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "email": "john@example.com",
  "email_verified": true,
  "avatar_updated_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**實作範例**：
```javascript
const getUserProfile = async (token) => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '無法取得用戶資料');
    }

    return await response.json();
  } catch (error) {
    console.error('取得用戶資料錯誤:', error);
    throw error;
  }
};
```

#### ✏️ 更新用戶檔案

**端點**：`PUT /api/v1/users/profile`

**說明**：更新用戶基本資料

**請求格式**：
```http
PUT /api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "new_username",
  "email": "newemail@example.com"
}
```

**成功回應**：
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "new_username",
  "email": "newemail@example.com",
  "email_verified": false,
  "avatar_updated_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### 🖼️ 頭像管理

##### 取得頭像

**端點**：`GET /api/v1/users/avatar`

**請求格式**：
```http
GET /api/v1/users/avatar
Authorization: Bearer <token>
```

**成功回應**：
```json
{
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

##### 更新頭像

**端點**：`PUT /api/v1/users/avatar`

**請求格式**：
```http
PUT /api/v1/users/avatar
Authorization: Bearer <token>
Content-Type: application/json

{
  "avatar_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

**實作範例**：
```javascript
const updateAvatar = async (token, imageFile) => {
  // 將檔案轉換為 Base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(imageFile);
  });

  try {
    const response = await fetch('http://localhost:8000/api/v1/users/avatar', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        avatar_base64: base64
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '頭像更新失敗');
    }

    return await response.json();
  } catch (error) {
    console.error('頭像更新錯誤:', error);
    throw error;
  }
};
```

### 🤖 Bot 管理 API

#### ➕ 建立 Bot

**端點**：`POST /api/v1/bots/`

**說明**：建立新的 LINE Bot

**請求格式**：
```http
POST /api/v1/bots/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My LINE Bot",
  "channel_token": "YOUR_CHANNEL_ACCESS_TOKEN",
  "channel_secret": "YOUR_CHANNEL_SECRET"
}
```

**參數說明**：
- `name`：Bot 名稱，1-100 字元
- `channel_token`：LINE Channel Access Token
- `channel_secret`：LINE Channel Secret

**成功回應**：
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "My LINE Bot",
  "channel_token": "YOUR_CHANNEL_ACCESS_TOKEN",
  "channel_secret": "YOUR_CHANNEL_SECRET",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**實作範例**：
```javascript
const createBot = async (token, botData) => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/bots/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(botData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Bot 建立失敗');
    }

    return await response.json();
  } catch (error) {
    console.error('建立 Bot 錯誤:', error);
    throw error;
  }
};
```

#### 📋 取得所有 Bot

**端點**：`GET /api/v1/bots/`

**說明**：取得當前用戶的所有 Bot

**請求格式**：
```http
GET /api/v1/bots/
Authorization: Bearer <token>
```

**成功回應**：
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "My LINE Bot",
    "channel_token": "YOUR_CHANNEL_ACCESS_TOKEN",
    "channel_secret": "YOUR_CHANNEL_SECRET",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### 💬 Flex 訊息管理

##### 建立 Flex 訊息

**端點**：`POST /api/v1/bots/messages`

**說明**：建立新的 Flex Message 模板

**請求格式**：
```http
POST /api/v1/bots/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": {
    "type": "flex",
    "altText": "Hello Flex Message",
    "contents": {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "Hello World"
          }
        ]
      }
    }
  }
}
```

**成功回應**：
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "content": {
    "type": "flex",
    "altText": "Hello Flex Message",
    "contents": {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "Hello World"
          }
        ]
      }
    }
  },
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## 🎯 前端整合指南

### React Hook 範例

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/check-login', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          token,
          isAuthenticated: data.authenticated,
          isLoading: false
        });
      } else {
        localStorage.removeItem('token');
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('認證檢查失敗:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '登入失敗');
    }

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    
    setAuthState({
      user: data.user,
      token: data.access_token,
      isAuthenticated: true,
      isLoading: false
    });

    return data;
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:8000/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('登出請求失敗:', error);
    } finally {
      localStorage.removeItem('token');
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  };

  return { ...authState, login, logout, checkAuthStatus };
};
```

### API 客戶端封裝

```typescript
// services/apiClient.ts
class APIClient {
  private baseURL: string;
  private token: string | null;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // 認證相關
  async register(userData: {
    username: string;
    password: string;
    email?: string;
  }) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(username: string, password: string) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${this.baseURL}/api/v1/auth/login`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '登入失敗');
    }

    const data = await response.json();
    this.token = data.access_token;
    localStorage.setItem('token', data.access_token);
    return data;
  }

  async logout() {
    await this.request('/api/v1/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('token');
  }

  // 用戶相關
  async getUserProfile() {
    return this.request('/api/v1/users/profile');
  }

  async updateUserProfile(data: { username?: string; email?: string }) {
    return this.request('/api/v1/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateAvatar(avatarBase64: string) {
    return this.request('/api/v1/users/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar_base64: avatarBase64 }),
    });
  }

  // Bot 相關
  async createBot(botData: {
    name: string;
    channel_token: string;
    channel_secret: string;
  }) {
    return this.request('/api/v1/bots/', {
      method: 'POST',
      body: JSON.stringify(botData),
    });
  }

  async getBots() {
    return this.request('/api/v1/bots/');
  }

  async createFlexMessage(content: any) {
    return this.request('/api/v1/bots/messages', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
}

export const apiClient = new APIClient();
```

---

## 🚫 錯誤處理

### 統一錯誤格式

```json
{
  "detail": "錯誤描述",
  "error_code": "ERROR_TYPE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### HTTP 狀態碼說明

| 狀態碼 | 說明 | 常見原因 |
|--------|------|----------|
| `200 OK` | 請求成功 | 正常操作 |
| `201 Created` | 資源建立成功 | 新增資料成功 |
| `204 No Content` | 刪除成功 | 刪除操作完成 |
| `400 Bad Request` | 請求參數錯誤 | 缺少必要參數或格式錯誤 |
| `401 Unauthorized` | 未認證 | Token 無效或過期 |
| `403 Forbidden` | 權限不足 | Email 未驗證或無操作權限 |
| `404 Not Found` | 資源不存在 | 請求的資源不存在 |
| `409 Conflict` | 資源衝突 | 用戶名稱或 Email 已存在 |
| `422 Unprocessable Entity` | 資料驗證失敗 | 輸入資料不符合規則 |
| `429 Too Many Requests` | 請求過於頻繁 | 觸發速率限制 |
| `500 Internal Server Error` | 伺服器內部錯誤 | 系統異常 |

### 錯誤處理最佳實踐

```javascript
const handleAPIError = (error) => {
  if (error.status === 401) {
    // Token 過期，重導向到登入頁
    localStorage.removeItem('token');
    window.location.href = '/login';
  } else if (error.status === 403) {
    // 權限不足，提示用戶
    alert('您的權限不足，請先驗證電子郵件');
  } else if (error.status === 429) {
    // 請求過於頻繁
    alert('請求過於頻繁，請稍後再試');
  } else {
    // 其他錯誤
    console.error('API 錯誤:', error);
    alert('發生未知錯誤，請稍後再試');
  }
};
```

---

## 💡 最佳實踐

### 1. 安全性建議

- **Token 管理**：定期檢查 Token 有效性，及時處理過期
- **HTTPS 使用**：生產環境必須使用 HTTPS
- **敏感資料**：不要在前端儲存敏感資訊
- **CORS 設定**：正確配置跨域存取設定

### 2. 效能優化

- **請求合併**：盡量合併多個 API 請求
- **快取策略**：適當使用快取減少不必要的請求
- **分頁載入**：大量資料使用分頁載入
- **錯誤重試**：實作智能錯誤重試機制

### 3. 用戶體驗

- **載入狀態**：顯示適當的載入指示器
- **錯誤訊息**：提供友善的錯誤訊息
- **離線處理**：考慮離線狀態的處理
- **響應式設計**：確保在各種裝置上的良好體驗

---

## ❓ 常見問題

### Q1: 如何處理 Token 過期？

**A**: 實作 Token 刷新機制或自動重導向到登入頁面：

```javascript
const refreshToken = async () => {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      return data.access_token;
    }
  } catch (error) {
    console.error('Token 刷新失敗:', error);
    // 重導向到登入頁面
    window.location.href = '/login';
  }
};
```

### Q2: 如何實作檔案上傳？

**A**: 使用 Base64 編碼上傳：

```javascript
const uploadFile = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      // 使用 API 上傳 base64 編碼的檔案
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
};
```

### Q3: 如何處理併發請求？

**A**: 使用 Promise.all 處理併發請求：

```javascript
const fetchUserData = async (token) => {
  try {
    const [profile, bots, messages] = await Promise.all([
      apiClient.getUserProfile(),
      apiClient.getBots(),
      apiClient.getFlexMessages()
    ]);
    
    return { profile, bots, messages };
  } catch (error) {
    console.error('併發請求失敗:', error);
    throw error;
  }
};
```

### Q4: 如何實作即時通知？

**A**: 使用 WebSocket 或定期輪詢：

```javascript
// WebSocket 範例
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 處理即時通知
  handleNotification(data);
};

// 定期輪詢範例
setInterval(async () => {
  try {
    const notifications = await apiClient.getNotifications();
    updateNotifications(notifications);
  } catch (error) {
    console.error('獲取通知失敗:', error);
  }
}, 30000); // 每 30 秒檢查一次
```

---

## 📚 相關資源

- [LINE Bot API 官方文檔](https://developers.line.biz/en/docs/)
- [FastAPI 官方文檔](https://fastapi.tiangolo.com/)
- [React 官方文檔](https://reactjs.org/)
- [JWT 官方說明](https://jwt.io/)

---

*本文檔由 LineBot-Web 開發團隊維護，如有問題請聯繫開發者。*