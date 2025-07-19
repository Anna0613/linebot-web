# LineBot-Web

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/Status-Development-blue)

**LineBot-Web** 是一個現代化的 LINE Bot 管理平台，提供直觀的 Web 介面來創建、管理和配置 LINE Bot。

## ✨ 特色功能

- 🤖 **LINE Bot 管理**: 完整的 Bot 創建、編輯、刪除功能
- 🔐 **用戶認證系統**: 支援一般註冊登入和 LINE 登入
- 📝 **Flex Message 編輯器**: 視覺化編輯 LINE Flex 訊息
- 📊 **Bot 統計分析**: 即時查看 Bot 使用統計
- 🎨 **現代化介面**: 基於 React + TypeScript 的響應式設計
- ⚡ **高效後端**: FastAPI 提供的高性能 API 服務

## 🏗️ 架構概覽

```
linebot-web/
├── backend/          # FastAPI 後端服務
├── frontend/         # React TypeScript 前端
├── docs/            # 專案文檔
├── tests/           # 整合測試
├── scripts/         # 構建腳本
├── configs/         # 配置文件
└── assets/          # 靜態資源
```

## 🚀 快速開始

### 前置需求

- **後端**: Python 3.11+
- **前端**: Node.js 18+
- **資料庫**: PostgreSQL 或 MySQL
- **LINE 開發者帳號**: 用於 LINE Bot 整合

### 本地開發

1. **克隆專案**
```bash
git clone <repository-url>
cd linebot-web
```

2. **後端設置**
```bash
cd backend
pip install -r requirements.txt
cp env.example .env
# 編輯 .env 設定你的配置
uvicorn app.main:app --reload
```

3. **前端設置**
```bash
cd frontend
npm install
cp env.example .env.local
# 編輯 .env.local 設定 API 端點
npm run dev
```

### Docker 部署

```bash
# 使用 Docker Compose 一鍵啟動
docker-compose up -d
```

## 📚 文檔

- [📖 API 文檔](docs/api/) - 完整的 API 規範說明
- [🚀 部署指南](docs/deployment/) - 生產環境部署說明
- [🎨 前端開發](docs/frontend/) - 前端開發指南
- [🏗️ 架構說明](docs/architecture/) - 系統架構文檔

## 🛠️ 開發工具

### 構建腳本

```bash
# 開發環境構建
make dev-build

# 生產環境構建  
make prod-build

# 運行測試
make test

# 代碼格式化
make format
```

### 測試

```bash
# 後端測試
cd backend && python -m pytest

# 前端測試
cd frontend && npm test

# E2E 測試
npm run test:e2e
```

## 🔧 配置

### 環境變數

- **後端**: 參考 `backend/env.example`
- **前端**: 參考 `frontend/env.example`

### 資料庫配置

支援 PostgreSQL 和 MySQL，設定範例請參考配置文檔。

## 🤝 貢獻指南

1. Fork 專案
2. 創建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📄 授權

此專案使用 MIT 授權 - 詳見 [LICENSE](LICENSE) 文件

## 🆘 支援

如有問題或建議，請：

- 📧 開啟 [Issue](../../issues)
- 💬 查看 [文檔](docs/)
- 🔍 搜尋現有的 [Discussions](../../discussions)

## 🙏 致謝

感謝所有貢獻者和開源社群的支持！

---

⭐ 如果這個專案對您有幫助，請給我們一個星星！