# 資料庫設置和管理指南

本文檔說明如何使用增強的資料庫初始化和管理系統。

## 🚀 快速開始

### 1. 初始化資料庫

```bash
# 使用管理腳本初始化（推薦）
python db_manager.py init

# 或者直接啟動應用程式（會自動初始化）
python -m uvicorn app.main:app --reload
```

### 2. 檢查資料庫狀態

```bash
# 快速檢查
python db_manager.py check

# 詳細狀態報告
python db_manager.py status
```

## 🛠️ 管理命令

### 可用命令

- `python db_manager.py init` - 完整的資料庫初始化
- `python db_manager.py check` - 檢查資料庫連接和遷移狀態
- `python db_manager.py repair` - 修復資料庫問題和遷移狀態
- `python db_manager.py status` - 顯示詳細的資料庫狀態報告
- `python db_manager.py clean` - 清理未使用的資料庫結構

### 故障排除

#### 遇到遷移錯誤時：

```bash
# 1. 檢查當前狀態
python db_manager.py status

# 2. 嘗試修復
python db_manager.py repair

# 3. 如果修復失敗，重新初始化
python db_manager.py init
```

#### 表結構問題：

```bash
# 檢查表結構是否完整
python db_manager.py status

# 如果表結構不完整，執行修復
python db_manager.py repair
```

## 🏗️ 系統架構

### 增強初始化流程

新的初始化系統包含以下步驟：

1. **連接檢查** - 驗證資料庫連接
2. **擴展啟用** - 啟用必要的 PostgreSQL 擴展（如 uuid-ossp）
3. **遷移狀態檢查** - 檢查和修復 Alembic 遷移狀態
4. **自動版本檢測** - 根據現有表結構自動檢測資料庫版本
5. **遷移執行** - 執行所有缺失的遷移
6. **結構驗證** - 驗證關鍵表和欄位是否存在

### 關鍵特性

- **自動修復** - 自動檢測和修復常見的遷移問題
- **版本檢測** - 智能檢測現有資料庫的版本狀態
- **媒體支持** - 確保 LINE Bot 互動表包含媒體欄位
- **向後兼容** - 與舊的初始化系統兼容

## 📊 資料庫結構

### 主要表格

1. **users** - 用戶基本資料
2. **bots** - LINE Bot 配置
3. **line_bot_users** - LINE Bot 用戶資料
4. **line_bot_user_interactions** - 用戶互動記錄（包含媒體欄位）
5. **rich_menus** - 豐富選單配置
6. **flex_messages** - Flex Message 模板
7. **bot_codes** - Bot 程式碼

### 媒體儲存欄位

`line_bot_user_interactions` 表包含以下媒體相關欄位：
- `media_path` - MinIO 媒體檔案路徑
- `media_url` - 媒體檔案公開訪問 URL

## 🔧 開發者指南

### 程式碼整合

```python
from app.database import init_database_enhanced

# 在應用程式啟動時使用
success = init_database_enhanced(database_url, project_root)
if success:
    print("資料庫初始化成功")
else:
    print("資料庫初始化失敗")
```

### 自訂初始化

```python
from app.database.init import DatabaseInitializer

# 創建自訂初始化器
initializer = DatabaseInitializer(database_url, alembic_ini_path)

# 執行完整初始化
if initializer.init_database_complete():
    print("初始化成功")

# 檢查是否需要更新
if not initializer.is_database_up_to_date():
    print("需要執行遷移")
```

## 📝 注意事項

1. **備份重要** - 在生產環境中執行任何資料庫操作前，請先備份資料
2. **權限要求** - 確保資料庫用戶有足夠的權限創建表格、索引和擴展
3. **網絡連接** - 確保應用程式能夠連接到 PostgreSQL 資料庫
4. **版本兼容** - 使用與專案相容的 PostgreSQL 版本

## 🚨 緊急恢復

如果遇到嚴重的資料庫問題：

1. 停止應用程式
2. 還原資料庫備份
3. 執行 `python db_manager.py init`
4. 檢查狀態 `python db_manager.py status`
5. 重新啟動應用程式

## 📞 支援

如果遇到問題，請：

1. 檢查資料庫連接設定
2. 查看應用程式日誌
3. 執行 `python db_manager.py status` 獲取詳細資訊
4. 查看 Alembic 遷移歷史

---

此文檔涵蓋了增強資料庫管理系統的主要功能和使用方法。系統設計為自動化和用戶友好，但在遇到問題時提供了充分的診斷和修復工具。