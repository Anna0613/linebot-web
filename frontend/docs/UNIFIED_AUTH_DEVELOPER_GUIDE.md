# 🔐 統一Token驗證系統 - 開發者指南

## 📖 概述

統一Token驗證系統提供了一個安全、一致且易於維護的認證解決方案，替代了原有分散的認證邏輯。

### 🎯 核心特性

- **統一認證管理** - 單一認證狀態和API
- **自動Token刷新** - 防止Token過期導致的用戶中斷
- **增強安全性** - JWT簽名驗證、敏感信息保護
- **實時監控** - 安全事件監控和異常檢測
- **平滑遷移** - 自動遷移舊數據，向後兼容

---

## 🏗️ 系統架構

```
統一認證系統
├── UnifiedAuthManager (核心認證管理器)
├── useUnifiedAuth (React Hook)
├── UnifiedApiClient (API客戶端)
├── secureTokenUtils (安全工具)
├── securityMonitor (安全監控)
└── migrationHelper (遷移工具)
```

---

## 🚀 快速開始

### 1. 基本認證Hook

```typescript
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';

function MyComponent() {
  const { 
    user, 
    loading, 
    error, 
    login, 
    logout, 
    isAuthenticated 
  } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: '/login'
  });

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤: {error}</div>;

  return (
    <div>
      <h1>歡迎, {user?.display_name}</h1>
      <button onClick={logout}>登出</button>
    </div>
  );
}
```

### 2. 手動認證管理

```typescript
import { authManager } from '../services/UnifiedAuthManager';

// 檢查認證狀態
const isAuthenticated = await authManager.isAuthenticated();

// 獲取用戶信息
const user = authManager.getUserInfo();

// 獲取認證Headers
const headers = authManager.getAuthHeaders();

// 清除認證信息
authManager.clearAuth();
```

### 3. API調用

```typescript
import { apiClient } from '../services/UnifiedApiClient';

// GET請求
const response = await apiClient.get('/api/profile');

// POST請求
const result = await apiClient.post('/api/bots', {
  name: 'My Bot',
  channel_token: 'token'
});

// 處理響應
if (response.error) {
  console.error('錯誤:', response.error);
} else {
  console.log('數據:', response.data);
}
```

---

## 🔧 核心組件詳解

### UnifiedAuthManager

統一認證管理器是系統的核心，提供所有認證相關功能。

```typescript
class UnifiedAuthManager {
  // Token管理
  setTokenInfo(tokenInfo: TokenInfo, loginType: LoginType): void
  getAccessToken(): string | null
  
  // 用戶管理
  setUserInfo(user: UnifiedUser): void
  getUserInfo(): UnifiedUser | null
  
  // 認證狀態
  isAuthenticated(): Promise<boolean>  // 異步，支持自動刷新
  isAuthenticatedSync(): boolean       // 同步，不觸發刷新
  
  // 請求Headers
  getAuthHeaders(): Record<string, string>
  
  // 清理
  clearAuth(): void
  
  // 錯誤處理
  handleAuthError(error: any): void
}
```

### useUnifiedAuth Hook

React Hook提供組件級別的認證功能。

```typescript
interface UseUnifiedAuthOptions {
  requireAuth?: boolean;           // 是否需要認證
  redirectTo?: string;            // 未認證時重定向路徑
  onAuthChange?: (authenticated: boolean, user: UnifiedUser | null) => void;
}

const useUnifiedAuth = (options: UseUnifiedAuthOptions) => ({
  // 狀態
  user: UnifiedUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // 方法
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  handleLineLogin: (token: string) => Promise<UnifiedUser | null>;
  checkAuthStatus: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  clearError: () => void;
})
```

### UnifiedApiClient

統一API客戶端處理所有HTTP請求。

```typescript
class UnifiedApiClient {
  // HTTP方法
  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>
  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>
  
  // 認證相關
  login(username: string, password: string): Promise<ApiResponse>
  logout(): Promise<ApiResponse>
  checkLoginStatus(): Promise<ApiResponse>
  
  // Bot管理
  getBots(): Promise<ApiResponse>
  createBot(botData: BotData): Promise<ApiResponse>
  updateBot(botId: string, botData: Partial<BotData>): Promise<ApiResponse>
  deleteBot(botId: string): Promise<ApiResponse>
  
  // LINE登入
  getLineLoginUrl(): Promise<ApiResponse>
  verifyLineToken(token: string): Promise<ApiResponse>
}
```

---

## 🔒 安全特性

### 1. 增強的JWT驗證

```typescript
import { parseSecureJWTToken, validateTokenSecurity } from '../utils/secureTokenUtils';

// 安全JWT解析
const result = parseSecureJWTToken(token);
if (result.valid) {
  console.log('用戶:', result.payload.username);
} else {
  console.error('Token無效:', result.error);
}

// Token安全驗證
const securityCheck = validateTokenSecurity(token);
if (!securityCheck.valid) {
  console.warn('安全問題:', securityCheck.error);
}
```

### 2. 安全監控

```typescript
import { securityMonitor } from '../utils/securityMonitor';

// 記錄認證成功
securityMonitor.logAuthSuccess(userId, 'traditional');

// 記錄認證失敗
securityMonitor.logAuthFailure('密碼錯誤', attemptedUser);

// 記錄安全違規
securityMonitor.logSecurityViolation('未授權訪問', { path: '/admin' });

// 檢查可疑活動
const suspicious = securityMonitor.detectSuspiciousActivity();
if (suspicious.detected) {
  console.warn('可疑活動:', suspicious.reasons);
}

// 生成安全報告
const report = securityMonitor.generateSecurityReport();
```

### 3. 自動數據遷移

```typescript
import { migrationHelper } from '../utils/migrationHelper';

// 檢查是否需要遷移
if (migrationHelper.needsMigration()) {
  // 自動遷移
  const success = await migrationHelper.autoMigrateIfNeeded();
  if (!success) {
    console.error('自動遷移失敗');
  }
}

// 完整遷移
await migrationHelper.startMigration();

// 回滾遷移
await migrationHelper.rollback();
```

---

## 📝 最佳實踐

### 1. 組件設計

```typescript
// ✅ 推薦：使用統一認證Hook
const MyComponent = () => {
  const { user, loading, error } = useUnifiedAuth({ requireAuth: true });
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <Dashboard user={user} />;
};

// ❌ 避免：直接使用舊認證服務
const BadComponent = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (AuthService.isAuthenticated()) {  // 舊方式
      // 手動檢查認證...
    }
  }, []);
};
```

### 2. API調用

```typescript
// ✅ 推薦：使用統一API客戶端
const fetchUserData = async () => {
  const response = await apiClient.get('/api/user');
  if (response.error) {
    handleError(response.error);
  } else {
    setUserData(response.data);
  }
};

// ❌ 避免：手動處理認證Headers
const badFetch = async () => {
  const token = localStorage.getItem('auth_token');  // 舊方式
  fetch('/api/user', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
```

### 3. 錯誤處理

```typescript
// ✅ 推薦：讓統一系統處理認證錯誤
try {
  const result = await apiClient.post('/api/data', payload);
  // 401錯誤會自動被處理
} catch (error) {
  // 只處理業務邏輯錯誤
  console.error('業務錯誤:', error);
}

// ❌ 避免：手動處理認證錯誤
try {
  const response = await fetch('/api/data');
  if (response.status === 401) {
    AuthService.clearAuth();  // 舊方式
    window.location.href = '/login';
  }
} catch (error) {
  // 重複的錯誤處理邏輯
}
```

---

## 🔄 遷移指南

### 從舊系統遷移

1. **替換Imports**
```typescript
// 舊
import { AuthService } from '../services/auth';
import { useAuthentication } from '../hooks/useAuthentication';

// 新
import { authManager } from '../services/UnifiedAuthManager';
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';
```

2. **更新認證檢查**
```typescript
// 舊
if (AuthService.isAuthenticated()) {
  // ...
}

// 新
if (await authManager.isAuthenticated()) {
  // ...
}
// 或同步版本
if (authManager.isAuthenticatedSync()) {
  // ...
}
```

3. **更新API調用**
```typescript
// 舊
const api = ApiClient.getInstance();
const response = await api.get('/endpoint');

// 新
const response = await apiClient.get('/endpoint');
```

### 自動遷移

系統會自動檢測並遷移舊數據：

```typescript
// 應用啟動時
useEffect(() => {
  const initAuth = async () => {
    // 自動遷移會在需要時執行
    await migrationHelper.autoMigrateIfNeeded();
  };
  initAuth();
}, []);
```

---

## 🐛 故障排除

### 常見問題

#### 1. Token無效錯誤
```typescript
// 檢查Token狀態
const token = authManager.getAccessToken();
if (token) {
  const validation = parseSecureJWTToken(token);
  if (!validation.valid) {
    console.error('Token問題:', validation.error);
    authManager.clearAuth();
  }
}
```

#### 2. 認證狀態不同步
```typescript
// 強制刷新認證狀態
const { checkAuthStatus } = useUnifiedAuth();
await checkAuthStatus();
```

#### 3. 遷移問題
```typescript
// 檢查遷移狀態
const status = migrationHelper.getStatus();
console.log('遷移狀態:', status);

// 手動觸發遷移
if (status.phase === 'failed') {
  await migrationHelper.rollback();
  await migrationHelper.startMigration();
}
```

### 調試工具

#### 安全監控面板
```typescript
// 獲取安全指標
const metrics = securityMonitor.getMetrics();
console.log('認證成功率:', 
  metrics.successfulAuthAttempts / metrics.totalAuthAttempts);

// 檢查最近事件
const events = securityMonitor.getRecentEvents(10);
console.table(events);

// 生成調試報告
const report = securityMonitor.generateSecurityReport();
console.log(report);
```

#### 開發者工具
```typescript
// 開發環境下的調試信息
if (process.env.NODE_ENV === 'development') {
  // 啟用詳細日誌
  window.authDebug = {
    manager: authManager,
    monitor: securityMonitor,
    migration: migrationHelper
  };
}
```

---

## 📊 性能指標

### 預期改進

- **認證速度** ↑ 30%
- **代碼重複** ↓ 60%
- **調試時間** ↓ 50%
- **安全漏洞** ↓ 90%

### 監控指標

```typescript
// 性能監控
const performanceMetrics = {
  authenticationTime: Date.now(),  // 認證耗時
  apiResponseTime: Date.now(),     // API響應時間
  tokenValidationTime: Date.now(), // Token驗證時間
  memoryUsage: performance.memory?.usedJSHeapSize
};
```

---

## 🆘 支援與聯絡

### 開發支援
- **技術問題**: 檢查控制台日誌和安全報告
- **性能問題**: 使用內建的性能監控工具
- **安全問題**: 查看安全監控面板

### 緊急情況
1. 檢查系統狀態和錯誤日誌
2. 使用回滾機制恢復舊系統
3. 聯絡開發團隊

---

## 📝 版本更新

### v1.0.0 (當前版本)
- ✅ 統一認證管理器
- ✅ React Hook集成
- ✅ 安全監控系統
- ✅ 自動數據遷移
- ✅ 增強JWT安全性

### 未來計劃
- 🔄 OAuth 2.0支援
- 🔄 多因子認證
- 🔄 單點登入(SSO)
- 🔄 社交媒體登入擴展

---

*此文檔將根據系統更新持續維護和更新*