# Token驗證系統統一化遷移指南

## 🎯 遷移目標

將分散的token驗證邏輯統一到安全、一致的認證系統中。

## 📋 遷移步驟

### 第一階段：核心服務替換

#### 1. 替換認證服務
```typescript
// ❌ 舊代碼
import { AuthService } from './services/auth';
import { AuthenticationService } from './services/AuthenticationService';

// ✅ 新代碼
import { authManager } from './services/UnifiedAuthManager';
```

#### 2. 替換API客戶端
```typescript
// ❌ 舊代碼
import { ApiClient } from './services/api';

// ✅ 新代碼
import { apiClient } from './services/UnifiedApiClient';
```

#### 3. 替換認證Hook
```typescript
// ❌ 舊代碼
import { useAuthentication } from './hooks/useAuthentication';
import { useAuthGuard } from './hooks/useAuthGuard';

// ✅ 新代碼
import { useUnifiedAuth } from './hooks/useUnifiedAuth';
```

### 第二階段：代碼修改對照

#### Token獲取和設置
```typescript
// ❌ 舊代碼
localStorage.getItem('auth_token')
localStorage.setItem('auth_token', token)
AuthService.getToken()
AuthService.setToken(token)

// ✅ 新代碼
authManager.getAccessToken()
authManager.setTokenInfo({ access_token: token, token_type: 'Bearer' }, 'traditional')
```

#### 認證狀態檢查
```typescript
// ❌ 舊代碼
AuthService.isAuthenticated()
useAuthentication({ requireAuth: true })

// ✅ 新代碼
await authManager.isAuthenticated() // 異步，支持自動刷新
authManager.isAuthenticatedSync()   // 同步，不觸發刷新
useUnifiedAuth({ requireAuth: true })
```

#### 用戶信息管理
```typescript
// ❌ 舊代碼
localStorage.getItem('username')
localStorage.setItem('email', email)
AuthService.getUser()
AuthService.setUser({ username, email })

// ✅ 新代碼
authManager.getUserInfo()
authManager.setUserInfo({
  id: userId,
  username,
  email,
  display_name,
  login_type: 'traditional'
})
```

#### 認證清除
```typescript
// ❌ 舊代碼
AuthService.clearAuth()
AuthService.removeToken()
localStorage.clear()

// ✅ 新代碼
authManager.clearAuth() // 統一清除所有認證信息
```

#### API請求headers
```typescript
// ❌ 舊代碼
const headers = new Headers({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
});

// ✅ 新代碼
const headers = authManager.getAuthHeaders();
// 或使用統一API客戶端
const response = await apiClient.get('/api/endpoint');
```

### 第三階段：具體文件修改

#### 1. 修改 `src/pages/LoginPage.tsx`
```typescript
// ❌ 舊代碼
const { login, loading, error } = useAuthForm();

// ✅ 新代碼
const { login, loading, error } = useUnifiedAuth();
```

#### 2. 修改 `src/components/layout/DashboardNavbar.tsx`
```typescript
// ❌ 舊代碼
const { logout } = useAuthentication();

// ✅ 新代碼
const { logout, user } = useUnifiedAuth();
```

#### 3. 修改 `src/pages/DashboardPage.tsx`
```typescript
// ❌ 舊代碼
const { user, loading } = useAuthentication({ requireAuth: true });

// ✅ 新代碼
const { user, loading } = useUnifiedAuth({ requireAuth: true });
```

#### 4. 修改Bot管理相關頁面
```typescript
// ❌ 舊代碼
const api = ApiClient.getInstance();
const response = await api.getBots();

// ✅ 新代碼
const response = await apiClient.getBots();
```

### 第四階段：清理舊代碼

#### 1. 刪除或標記為廢棄的文件
```
src/services/auth.ts                  -> 可以保留作為備份
src/services/AuthenticationService.ts -> 可以保留作為備份
src/services/api.ts                   -> 可以保留作為備份
src/hooks/useAuthentication.ts        -> 可以保留作為備份
src/hooks/useAuthGuard.ts             -> 可以保留作為備份
src/utils/tokenUtils.ts               -> 替換為 secureTokenUtils.ts
```

#### 2. 清理localStorage中的舊數據
統一認證管理器會自動遷移舊數據，但建議在用戶下次登錄時清理：
```typescript
// 在應用啟動時運行一次
const cleanupOldStorage = () => {
  const oldKeys = [
    'auth_token', 'line_token', 'username', 
    'email', 'display_name', 'user_data'
  ];
  
  oldKeys.forEach(key => {
    if (localStorage.getItem(key) && localStorage.getItem('unified_access_token')) {
      localStorage.removeItem(key);
    }
  });
};
```

## 🔒 安全改進

### 1. Token驗證增強
- JWT簽名驗證（基礎檢查）
- 過期時間檢查
- 算法驗證（拒絕'none'算法）
- Payload完整性檢查

### 2. 存儲安全
- 統一的存儲鍵名
- 自動清理舊數據
- Cookie和localStorage雙重清理

### 3. 日誌安全
- 敏感信息混淆
- 開發/生產環境區分
- 結構化錯誤處理

## 🧪 測試要點

### 1. 認證流程測試
- [ ] 傳統登錄流程
- [ ] LINE登錄流程
- [ ] 自動token刷新
- [ ] 登出清理

### 2. 安全性測試
- [ ] 過期token處理
- [ ] 無效token處理
- [ ] 跨標籤頁同步
- [ ] 瀏覽器重啟後狀態

### 3. 兼容性測試
- [ ] 舊用戶數據遷移
- [ ] API響應格式兼容
- [ ] 錯誤處理一致性

## 📅 遷移時間表

### 第一週：核心服務實現
- [x] UnifiedAuthManager實現
- [x] UnifiedApiClient實現
- [x] useUnifiedAuth Hook實現
- [x] secureTokenUtils實現

### 第二週：逐步替換
- [ ] 關鍵頁面遷移（登錄、儀表板）
- [ ] API調用統一化
- [ ] 測試和修復問題

### 第三週：全面替換和清理
- [ ] 所有組件遷移完成
- [ ] 舊代碼清理
- [ ] 完整測試

## 🚨 注意事項

1. **向後兼容**：新系統會自動遷移舊數據，確保平滑過渡
2. **測試環境優先**：先在測試環境完成遷移和測試
3. **分階段部署**：可以逐步替換，新舊系統可並存一段時間
4. **監控日誌**：密切關注遷移期間的錯誤日誌
5. **回滾準備**：保留舊代碼以便必要時回滾

## 📞 支持聯繫

如遇到遷移問題，請參考：
- 檢查瀏覽器控制台錯誤
- 確認token格式正確性
- 驗證API端點配置
- 查看網絡請求響應