# 資料庫讀寫分離實作總結

## 實作概述

本次實作為 FastAPI 後端新增了完整的資料庫讀寫分離（Read-Write Splitting）功能，支援將讀取操作路由到從庫，寫入操作路由到主庫，以提升系統效能和可擴展性。

## 實作的檔案

### 新增的檔案

1. **`app/db_read_write_split.py`** - 核心連線管理模組
   - `DatabaseConnectionManager` 類別：管理主從庫連線池
   - `DatabaseRole` 枚舉：定義主庫和從庫角色
   - `get_db()` 和 `get_async_db()` 函數：提供向後相容的 session 取得介面
   - `get_read_session()` 和 `get_write_session()` 上下文管理器

2. **`app/db_session_context.py`** - 智能 Session 管理模組
   - `SessionContext` 類別：追蹤請求的寫入操作狀態
   - `get_smart_db_session()` 函數：智能選擇主從庫
   - `ReadWriteSession` 類別：提供明確的讀寫 session 介面
   - `get_read_db_session()` 和 `get_write_db_session()`：FastAPI 依賴注入函數
   - `reset_session_context()` 函數：重置請求上下文

3. **`backend/docs/READ_WRITE_SPLITTING.md`** - 使用說明文件
   - 功能特性說明
   - 配置指南
   - 使用範例
   - 最佳實踐
   - 故障排除

4. **`backend/scripts/test_read_write_split.py`** - 測試腳本
   - 配置測試
   - 連線測試
   - Session 路由測試
   - 事務一致性測試
   - 資料庫資訊查詢測試

### 修改的檔案

1. **`app/config.py`**
   - 新增從庫配置項目：
     - `DB_REPLICA_HOST`
     - `DB_REPLICA_PORT`
     - `DB_REPLICA_NAME`
     - `DB_REPLICA_USER`
     - `DB_REPLICA_PASSWORD`
   - 新增 `ENABLE_READ_WRITE_SPLITTING` 開關
   - 新增 `DATABASE_REPLICA_URL` 屬性

2. **`app/database.py`**
   - 使用 `db_manager` 取得引擎和 session factory
   - 更新 `get_db()` 函數支援 `use_replica` 參數
   - 保持向後相容性

3. **`app/database_async.py`**
   - 使用 `db_manager` 取得 async 引擎和 session factory
   - 更新 `get_async_db()` 函數支援 `use_replica` 參數
   - 保持向後相容性

4. **`app/dependencies.py`**
   - 新增 `get_db_session()` 工廠函數
   - 新增 `get_db_primary` 和 `get_db_read` 依賴
   - 更新 `get_current_user_async()` 使用 `get_db_primary`

5. **`app/main.py`**
   - 導入 `db_manager` 和 `reset_session_context`
   - 新增 `session_context_middleware` 中間件
   - 在應用關閉時清理資料庫連線

6. **`backend/env.example`**
   - 新增讀寫分離相關的環境變數範例
   - 新增配置說明註解

## 功能特性

### 1. 自動路由
- 根據 `use_replica` 參數自動選擇主庫或從庫
- 寫入操作強制使用主庫
- 讀取操作可選擇使用從庫

### 2. 事務一致性
- 使用 `ContextVar` 追蹤每個請求的寫入操作
- 寫入操作後的讀取自動使用主庫
- 確保讀取到最新寫入的資料

### 3. 降級策略
- 從庫連線失敗時自動降級到主庫
- 不影響系統正常運作
- 記錄警告日誌便於監控

### 4. 向後相容
- 現有程式碼無需修改即可運作
- 預設使用主庫，行為與原有系統一致
- 可選擇性啟用讀寫分離功能

### 5. 連線池管理
- 主從庫各自維護獨立的連線池
- 支援同步和非同步連線
- 自動管理連線生命週期

## 配置說明

### 最小配置（僅設定從庫埠號）

```bash
ENABLE_READ_WRITE_SPLITTING=True
DB_REPLICA_PORT=5433
```

其他配置（host、database、username、password）會自動使用主庫的設定。

### 完整配置（自訂所有從庫設定）

```bash
ENABLE_READ_WRITE_SPLITTING=True
DB_REPLICA_HOST=replica.example.com
DB_REPLICA_PORT=5433
DB_REPLICA_NAME=LineBot_01
DB_REPLICA_USER=replica_user
DB_REPLICA_PASSWORD=replica_password
```

## 使用範例

### 基本使用

```python
from app.database_async import get_async_db

# 讀取操作（使用從庫）
async def get_users(db: AsyncSession = Depends(lambda: get_async_db(use_replica=True))):
    result = await db.execute(select(User))
    return result.scalars().all()

# 寫入操作（使用主庫）
async def create_user(db: AsyncSession = Depends(get_async_db)):
    db.add(new_user)
    await db.commit()
```

### 智能 Session 管理

```python
from app.db_session_context import ReadWriteSession

# 讀取
async with ReadWriteSession.read() as db:
    users = await db.execute(select(User))

# 寫入
async with ReadWriteSession.write() as db:
    db.add(new_user)
    await db.commit()
```

### FastAPI 依賴注入

```python
from app.dependencies import get_db_read, get_db_primary

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db_read)):
    # 使用從庫讀取
    pass

@router.post("/users")
async def create_user(db: AsyncSession = Depends(get_db_primary)):
    # 使用主庫寫入
    pass
```

## 測試方法

### 1. 執行測試腳本

```bash
cd linebot-web/backend
python scripts/test_read_write_split.py
```

### 2. 檢查配置

```python
from app.config import settings
print(settings.ENABLE_READ_WRITE_SPLITTING)
print(settings.DATABASE_REPLICA_URL)
```

### 3. 檢查連線管理器

```python
from app.db_read_write_split import db_manager
print(db_manager.is_read_write_splitting_enabled())
```

## 注意事項

### 1. 從庫複製延遲
- 確保從庫複製延遲在可接受範圍內
- 寫入後立即讀取應使用主庫

### 2. 連線配置
- 從庫連線數應根據讀取負載調整
- 監控連線池使用情況

### 3. 錯誤處理
- 從庫不可用時會自動降級
- 監控日誌中的警告訊息

### 4. 效能監控
- 監控主從庫的查詢分佈
- 評估讀寫分離帶來的效能提升

## 未來擴展建議

1. **多從庫支援**
   - 支援多個從庫
   - 實作負載均衡

2. **智能路由**
   - 根據從庫負載自動選擇
   - 監控從庫健康狀態

3. **延遲監控**
   - 監控從庫複製延遲
   - 延遲過大時自動切換到主庫

4. **統計分析**
   - 統計讀寫操作比例
   - 分析效能提升效果

## 相容性

- ✅ 向後相容現有程式碼
- ✅ 不影響現有 API 功能
- ✅ 測試無需修改
- ✅ 可選擇性啟用

## 總結

本次實作提供了完整的資料庫讀寫分離功能，具有以下優點：

1. **易於配置**：只需設定環境變數即可啟用
2. **自動管理**：自動處理連線路由和事務一致性
3. **安全可靠**：具備降級策略，不影響系統穩定性
4. **向後相容**：現有程式碼無需修改
5. **靈活使用**：提供多種使用方式，適應不同場景

建議在啟用讀寫分離前：
1. 確保從庫已正確配置並運行
2. 測試從庫連線是否正常
3. 監控從庫複製延遲
4. 逐步遷移讀取操作到從庫

