# 資料庫讀寫分離功能說明

## 概述

本系統實作了資料庫讀寫分離（Read-Write Splitting）功能，可以將讀取操作路由到從庫（Replica），寫入操作路由到主庫（Primary），以提升系統效能和可擴展性。

## 功能特性

1. **自動路由**：根據操作類型自動選擇主庫或從庫
2. **事務一致性**：寫入操作後的讀取自動使用主庫，確保資料一致性
3. **降級策略**：從庫不可用時自動降級到主庫
4. **向後相容**：不影響現有程式碼，可選擇性啟用
5. **連線池管理**：主從庫各自維護獨立的連線池

## 配置說明

### 環境變數

在 `.env` 檔案中新增以下配置：

```bash
# 啟用讀寫分離功能（預設關閉）
ENABLE_READ_WRITE_SPLITTING=True

# 從庫連線設定（若未設定則使用主庫設定）
DB_REPLICA_HOST=sql.jkl921102.org  # 可選，預設使用主庫 HOST
DB_REPLICA_PORT=5433               # 從庫埠號
DB_REPLICA_NAME=LineBot_01         # 可選，預設使用主庫 NAME
DB_REPLICA_USER=11131230           # 可選，預設使用主庫 USER
DB_REPLICA_PASSWORD=11131230       # 可選，預設使用主庫 PASSWORD
```

### 配置說明

- `ENABLE_READ_WRITE_SPLITTING`：控制是否啟用讀寫分離，預設為 `False`
- 從庫配置項若未設定，會自動使用主庫的對應配置
- 通常只需要設定 `DB_REPLICA_PORT`，其他配置與主庫相同

## 使用方式

### 方式一：使用現有的 `get_async_db`（推薦用於簡單場景）

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database_async import get_async_db

router = APIRouter()

# 讀取操作（可能使用從庫）
@router.get("/users")
async def get_users(db: AsyncSession = Depends(lambda: get_async_db(use_replica=True))):
    result = await db.execute(select(User))
    return result.scalars().all()

# 寫入操作（必定使用主庫）
@router.post("/users")
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_async_db)  # 預設使用主庫
):
    new_user = User(**user_data.dict())
    db.add(new_user)
    await db.commit()
    return new_user
```

### 方式二：使用智能 Session 管理（推薦用於複雜場景）

```python
from app.db_session_context import get_smart_db_session, ReadWriteSession

# 使用智能 session（自動處理事務一致性）
async def get_user_with_posts(user_id: int):
    # 讀取操作
    async with get_smart_db_session() as db:
        user = await db.get(User, user_id)
    
    # 寫入操作
    async with get_smart_db_session(force_primary=True) as db:
        new_post = Post(user_id=user_id, content="Hello")
        db.add(new_post)
        await db.commit()
    
    # 寫入後的讀取會自動使用主庫（確保一致性）
    async with get_smart_db_session() as db:
        posts = await db.execute(select(Post).where(Post.user_id == user_id))
        return posts.scalars().all()

# 使用明確的讀寫 Session
async def example_with_explicit_sessions():
    # 讀取
    async with ReadWriteSession.read() as db:
        users = await db.execute(select(User))
    
    # 寫入
    async with ReadWriteSession.write() as db:
        db.add(new_user)
        await db.commit()
```

### 方式三：使用 FastAPI 依賴注入

```python
from app.db_session_context import get_read_db_session, get_write_db_session

# 讀取端點
@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_read_db_session)):
    result = await db.execute(select(User))
    return result.scalars().all()

# 寫入端點
@router.post("/users")
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_write_db_session)
):
    new_user = User(**user_data.dict())
    db.add(new_user)
    await db.commit()
    return new_user
```

### 方式四：使用 dependencies.py 中的輔助函數

```python
from app.dependencies import get_db_read, get_db_primary

# 讀取操作使用從庫
@router.get("/bots")
async def list_bots(db: AsyncSession = Depends(get_db_read)):
    result = await db.execute(select(Bot))
    return result.scalars().all()

# 寫入操作使用主庫
@router.post("/bots")
async def create_bot(
    bot_data: BotCreate,
    db: AsyncSession = Depends(get_db_primary)
):
    new_bot = Bot(**bot_data.dict())
    db.add(new_bot)
    await db.commit()
    return new_bot
```

## 事務一致性保證

系統使用 `ContextVar` 追蹤每個請求的寫入操作：

1. 當執行寫入操作時，會標記當前請求上下文
2. 後續的讀取操作會檢查是否有寫入標記
3. 如果有寫入標記，讀取操作會自動使用主庫，確保讀取到最新資料
4. 請求結束時，中間件會自動重置上下文

```python
# 範例：寫入後立即讀取
async with ReadWriteSession.write() as db:
    db.add(new_user)
    await db.commit()

# 這個讀取會自動使用主庫，確保能讀到剛才寫入的資料
async with ReadWriteSession.read() as db:
    user = await db.get(User, new_user.id)  # 保證能讀到
```

## 降級策略

當從庫不可用時，系統會自動降級：

1. 啟動時嘗試連線從庫
2. 如果從庫連線失敗，記錄警告並繼續使用主庫
3. 所有讀取操作會自動路由到主庫
4. 不影響系統正常運作

## 監控與日誌

系統會記錄以下資訊：

- 主從庫連線建立狀態
- 讀寫分離是否啟用
- 從庫連線失敗時的警告
- Session 路由決策（debug 模式）

查看日誌範例：

```
✅ 主庫（寫入）連線已建立
✅ 從庫（讀取）連線已建立
✅ 從庫連線測試成功
ℹ️ 讀寫分離功能已啟用
```

## 效能考量

### 適合使用從庫的場景

- 列表查詢（如用戶列表、Bot 列表）
- 統計資料查詢
- 報表生成
- 搜尋功能
- 只讀的 API 端點

### 必須使用主庫的場景

- 所有寫入操作（INSERT、UPDATE、DELETE）
- 寫入後立即讀取的場景
- 需要強一致性的查詢
- 事務性操作

### 最佳實踐

1. **明確區分讀寫操作**：在設計 API 時明確區分讀取和寫入端點
2. **使用適當的依賴注入**：讀取端點使用 `get_db_read`，寫入端點使用 `get_db_primary`
3. **注意事務一致性**：寫入後需要立即讀取時，使用 `force_primary=True`
4. **監控從庫延遲**：確保從庫複製延遲在可接受範圍內
5. **測試降級場景**：確保從庫不可用時系統仍能正常運作

## 測試

### 測試讀寫分離是否生效

```python
# 檢查配置
from app.config import settings
print(f"讀寫分離啟用: {settings.ENABLE_READ_WRITE_SPLITTING}")
print(f"主庫 URL: {settings.DATABASE_URL}")
print(f"從庫 URL: {settings.DATABASE_REPLICA_URL}")

# 檢查連線管理器
from app.db_read_write_split import db_manager
print(f"讀寫分離可用: {db_manager.is_read_write_splitting_enabled()}")
```

### 測試降級策略

1. 停止從庫服務
2. 啟動應用程式
3. 檢查日誌是否顯示降級警告
4. 驗證讀取操作仍然正常

## 故障排除

### 從庫連線失敗

**症狀**：啟動時看到從庫連線失敗的警告

**解決方案**：
1. 檢查從庫是否正在運行
2. 驗證 `DB_REPLICA_PORT` 等配置是否正確
3. 檢查網路連線和防火牆設定
4. 如果從庫暫時不可用，系統會自動降級到主庫

### 讀取到舊資料

**症狀**：寫入後立即讀取，但讀取到的是舊資料

**解決方案**：
1. 確認寫入操作使用了 `force_primary=True` 或 `get_write_db_session`
2. 檢查是否正確使用了智能 session 管理
3. 驗證從庫複製延遲是否過大

### 效能沒有提升

**症狀**：啟用讀寫分離後效能沒有明顯改善

**可能原因**：
1. 讀取操作比例較低
2. 從庫與主庫在同一台機器上
3. 網路延遲抵消了分離帶來的好處
4. 沒有正確使用從庫（所有操作仍使用主庫）

## 未來擴展

可能的擴展方向：

1. **多從庫支援**：支援多個從庫並實作負載均衡
2. **智能路由**：根據從庫負載自動選擇最佳從庫
3. **延遲監控**：監控從庫複製延遲並自動調整路由策略
4. **讀寫比例統計**：統計讀寫操作比例以優化配置

