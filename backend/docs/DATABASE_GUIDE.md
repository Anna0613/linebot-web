# 📚 LineBot-Web 資料庫管理指南

本專案使用 **SQLAlchemy + Alembic** 提供類似 Prisma 的 ORM 體驗，完整支援資料庫架構管理、Migration 和資料操作。

## 🚀 快速開始

### 1. 檢查資料庫狀態
```bash
python manage_db.py status
```

### 2. 應用 Migration
```bash
python manage_db.py migrate
```

### 3. 生成架構報告
```bash
python manage_db.py schema
```

## 📋 完整命令列表

| 命令 | 說明 | 類似 Prisma |
|------|------|------------|
| `python manage_db.py status` | 檢查資料庫狀態 | `prisma db status` |
| `python manage_db.py migrate` | 應用 migration | `prisma db push` |
| `python manage_db.py generate "message"` | 生成新 migration | `prisma db push` + generate |
| `python manage_db.py reset` | 重置資料庫 | `prisma db reset` |
| `python manage_db.py seed` | 填充測試資料 | `prisma db seed` |
| `python manage_db.py schema` | 生成架構報告 | `prisma db pull` |
| `python manage_db.py history` | 顯示 migration 歷史 | - |

## 🏗️ 資料庫架構

### 核心表格

#### 👤 **users** - 使用者資料
```sql
- id (UUID, PK)
- username (VARCHAR, UNIQUE)
- email (VARCHAR, UNIQUE) 
- password (VARCHAR)
- email_verified (BOOLEAN)
- created_at (TIMESTAMP)
- avatar_base64 (TEXT)
- avatar_updated_at (TIMESTAMP)
- last_verification_sent (TIMESTAMP)
```

#### 📱 **line_users** - LINE 帳號綁定
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- line_id (VARCHAR, UNIQUE)
- display_name (VARCHAR)
- picture_url (VARCHAR)
- created_at (TIMESTAMP)
```

#### 🤖 **bots** - 機器人設定
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- name (VARCHAR)
- channel_token (VARCHAR)
- channel_secret (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 💬 **flex_messages** - Flex 訊息範本
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- name (VARCHAR)
- content (JSONB) # 優化：使用 JSONB 提升查詢效能
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 📝 **bot_codes** - 機器人程式碼
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- bot_id (UUID, FK → bots.id)
- code (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 🎯 索引優化

#### 複合索引
- `idx_user_email_verified` - 快速查詢已驗證的 email 用戶
- `idx_user_created_verified` - 按註冊時間和驗證狀態排序
- `idx_bot_user_created` - 按用戶和創建時間查詢機器人
- `idx_flex_message_user_created` - 按用戶和創建時間查詢 Flex 訊息
- `idx_bot_code_user_updated` - 按用戶和更新時間查詢程式碼

#### 唯一約束
- `unique_bot_name_per_user` - 每個用戶的機器人名稱唯一
- `unique_flex_message_name_per_user` - 每個用戶的 Flex 訊息名稱唯一
- `unique_code_per_bot` - 每個機器人只能有一個程式碼

## 🔄 Development Workflow

### 修改資料模型
1. 編輯 `app/models/` 中的模型檔案
2. 生成 migration: `python manage_db.py generate "描述變更"`
3. 檢查生成的 migration 檔案
4. 應用變更: `python manage_db.py migrate`

### 範例：新增欄位
```python
# 在 app/models/user.py 中新增欄位
class User(Base):
    # ... 現有欄位 ...
    phone = Column(String(20), nullable=True)
```

```bash
# 生成並應用 migration
python manage_db.py generate "Add phone field to users"
python manage_db.py migrate
```

## 🛠️ 開發工具

### 1. 資料清理腳本
```bash
python data_cleanup.py
```
- 自動處理重複資料
- 修復資料完整性問題
- 安全的資料遷移

### 2. 架構生成器
```bash
python db_schema_generator.py
```
- 生成完整的資料庫文檔
- 檢測資料完整性問題
- 導出架構 Markdown 報告

### 3. 測試資料
```bash
python manage_db.py seed
```
- 填充開發用測試資料
- 可重複執行，自動檢查重複

## 🔒 安全最佳實踐

### 1. 密碼處理
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 儲存密碼
hashed_password = pwd_context.hash("user_password")

# 驗證密碼  
pwd_context.verify("user_password", hashed_password)
```

### 2. 資料庫連接
- 使用環境變數儲存資料庫 URL
- 支援連接池和重試機制
- 自動啟用 uuid-ossp 擴展

### 3. Migration 安全
- 所有 Migration 都有 rollback 功能
- 自動備份重要變更
- 支援預覽模式 (`--sql` flag)

## 📊 效能監控

### 查詢最佳化
- 所有外鍵都有對應索引
- 複合索引覆蓋常用查詢
- JSONB 支援高效 JSON 查詢

### 監控指標
```python
# 查詢效能範例
from sqlalchemy import func

# 使用索引的高效查詢
verified_users = session.query(User).filter(
    User.email_verified == True,
    User.created_at > datetime.now() - timedelta(days=30)
).all()

# JSONB 查詢範例  
flex_with_buttons = session.query(FlexMessage).filter(
    FlexMessage.content['body']['contents'].contains([{'type': 'button'}])
).all()
```

## 🆘 疑難排解

### 常見問題

#### 1. Migration 失敗
```bash
# 檢查當前狀態
python manage_db.py status

# 查看詳細錯誤
python -m alembic upgrade head --sql

# 強制重置 (謹慎使用)
python manage_db.py reset
```

#### 2. 資料重複
```bash
# 執行資料清理
python data_cleanup.py

# 檢查資料完整性
python manage_db.py schema
```

#### 3. 連接問題
```bash
# 檢查環境變數
echo $DATABASE_URL

# 測試連接
python -c "from app.database import init_database; init_database()"
```

## 📈 生產環境部署

### 1. Migration 部署
```bash
# 生產環境 migration
python manage_db.py migrate

# 生成備份
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 監控設置
- 啟用 SQL 查詢日志
- 設置連接池監控
- 配置慢查詢警告

### 3. 備份策略
- 每日自動備份
- Migration 前手動備份
- 保留 30 天備份歷史

---

## 🎉 總結

此系統提供了完整的資料庫 ORM 管理功能，相當於 Python 版的 Prisma：

✅ **類型安全的模型定義**  
✅ **自動 Migration 生成與管理**  
✅ **完整的資料庫架構文檔化**  
✅ **資料完整性檢查與修復**  
✅ **效能優化的索引策略**  
✅ **開發友善的管理工具**

使用 `python manage_db.py --help` 查看所有可用命令！