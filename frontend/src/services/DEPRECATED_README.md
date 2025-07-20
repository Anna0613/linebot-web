# ⚠️ 廢棄代碼說明

本目錄中的以下文件已被標記為**廢棄**，將在未來版本中移除。

## 🚫 廢棄文件列表

### 認證服務 (已被 UnifiedAuthManager 替代)
- ❌ `auth.ts` - 舊的認證服務
- ❌ `AuthenticationService.ts` - 舊的認證服務類
- ❌ `api.ts` - 舊的API客戶端

### 原因
這些文件存在以下問題：
1. **安全漏洞** - JWT驗證不完整
2. **代碼重複** - 多套認證邏輯
3. **維護困難** - 分散的認證狀態管理
4. **用戶體驗** - 不一致的認證行為

## ✅ 新系統替代

| 廢棄文件 | 新替代 | 遷移狀態 |
|----------|--------|----------|
| `auth.ts` | `UnifiedAuthManager.ts` | ✅ 完成 |
| `AuthenticationService.ts` | `UnifiedAuthManager.ts` | ✅ 完成 |
| `api.ts` | `UnifiedApiClient.ts` | ✅ 完成 |

## 📅 移除時間表

- **階段1** (當前) - 標記為廢棄，保留向後兼容
- **階段2** (1個月後) - 添加廢棄警告
- **階段3** (2個月後) - 完全移除

## 🔄 遷移指南

請參考 [統一認證系統開發者指南](../docs/UNIFIED_AUTH_DEVELOPER_GUIDE.md) 進行遷移。

---
*生成時間: 2025-07-20*