# LineBot-Web Backend v1 - 統一 API 架構

## 概述

這是 LineBot-Web 專案的重構版本，將原本的四個微服務（LoginAPI、LINEloginAPI、PuzzleAPI、SettingAPI）整合為一個統一的 FastAPI 應用程式。

## 主要特色

- **統一 API 架構**: 使用 FastAPI 框架，提供一致的 API 設計
- **自動文檔**: 自動生成 OpenAPI/Swagger 文檔
- **類型安全**: 完整的 Python 類型提示
- **現代化**: 支援 async/await 非同步處理
- **高度組件化**: 清晰的模組分離和職責劃分

## 架構設計

```
backend/
├── app/                 # 主應用程式
│   ├── core/           # 核心功能模組
│   ├── models/         # 資料模型
│   ├── schemas/        # Pydantic 模式
│   ├── api/            # API 路由
│   ├── services/       # 業務邏輯服務
│   ├── utils/          # 工具函數
│   ├── config.py       # 配置管理
│   ├── database.py     # 資料庫連接
│   ├── dependencies.py # 依賴注入
│   └── main.py         # 主應用程式
├── scripts/            # 管理腳本
│   ├── manage_db.py    # 資料庫管理
│   ├── start.py        # 服務啟動
│   └── db_schema_generator.py # 架構生成器
├── docs/               # 專案文檔
│   └── DATABASE_GUIDE.md
├── migrations/         # 資料庫遷移
├── tests/             # 測試檔案
├── run.py             # 快速啟動
├── db.py              # 資料庫管理快捷方式
└── ...配置檔案
```

## 安裝與部署

### 本地開發

1. 安裝依賴：
```bash
pip install -r requirements.txt
```

2. 設定環境變數：
```bash
cp env.example .env
# 編輯 .env 文件設定您的配置
```

3. 啟動應用程式：
```bash
# 方法 1: 使用快速啟動腳本
python run.py

# 方法 2: 使用 scripts 目錄啟動
python scripts/start.py

# 方法 3: 直接使用 uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker 部署

```bash
docker build -t linebot-web-api .
docker run -p 8000:8000 --env-file .env linebot-web-api
```

## API 端點

### 認證相關
- `POST /api/v1/auth/register` - 用戶註冊
- `POST /api/v1/auth/login` - 用戶登入
- `POST /api/v1/auth/line-login` - LINE 登入
- `GET /api/v1/auth/line/callback` - LINE 登入回調

### 用戶管理
- `GET /api/v1/users/profile` - 取得用戶檔案
- `PUT /api/v1/users/profile` - 更新用戶檔案
- `GET /api/v1/users/avatar` - 取得用戶頭像
- `PUT /api/v1/users/avatar` - 更新用戶頭像

### Bot 管理
- `POST /api/v1/bots/` - 建立 Bot
- `GET /api/v1/bots/` - 取得 Bot 列表
- `GET /api/v1/bots/{bot_id}` - 取得特定 Bot
- `PUT /api/v1/bots/{bot_id}` - 更新 Bot
- `DELETE /api/v1/bots/{bot_id}` - 刪除 Bot

## 環境變數

參考 `env.example` 文件設定以下環境變數：

- `DB_*`: 資料庫連接設定
- `JWT_*`: JWT Token 設定
- `LINE_*`: LINE 登入設定
- `MAIL_*`: 郵件服務設定

## 相容性

此版本保持與前端應用程式的完全相容，所有原有的 API 端點和回應格式都保持不變。

## 開發指南

### 新增 API 端點

1. 在 `schemas/` 中定義 Pydantic 模式
2. 在 `services/` 中實現業務邏輯
3. 在 `api/api_v1/` 中新增路由
4. 在 `api/api_v1/api.py` 中註冊路由

### 資料庫管理

使用內建的資料庫管理工具：

```bash
# 使用快捷方式
python db.py status          # 檢查資料庫狀態
python db.py migrate         # 執行遷移
python db.py generate -m "新功能"  # 生成新遷移
python db.py schema          # 生成架構報告

# 或直接使用管理腳本
python scripts/manage_db.py status
python scripts/manage_db.py migrate

# 傳統方式（仍然支援）
alembic revision --autogenerate -m "描述"
alembic upgrade head
```

## 監控與除錯

- 訪問 `/docs` 查看 API 文檔（開發環境）
- 訪問 `/health` 進行健康檢查
- 查看日誌檔案進行問題診斷 