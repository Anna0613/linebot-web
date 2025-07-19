# LineBot-Web 專案文檔

這裡包含 LineBot-Web 專案的完整文檔。

## 📁 文檔結構

### 📖 API 文檔 (`api/`)
- `API_Documentation.md` - 統一 API 文檔
- `LineBot-Web_Backend_API_完整文檔.md` - 詳細 API 規範

### 🏗️ 架構文檔 (`architecture/`)
- `LINE_Bot_管理介面_完整架構計劃.md` - 完整架構計劃
- `LineBot-Web_Backend_API_架構分析.md` - 後端架構分析
- `後端重構計劃_統一API架構.md` - 重構計劃說明

### 🚀 部署文檔 (`deployment/`)
- `DEPLOYMENT_GUIDE.md` - 部署指南
- `郵件服務配置指南.md` - 郵件服務配置

### 🎨 前端文檔 (`frontend/`)
- `前端配置調整說明.md` - 前端配置說明

## 📋 專案狀態

此專案已完成重構，採用清晰的目錄架構：

```
linebot-web/
├── backend/          # FastAPI 後端服務
├── frontend/         # React TypeScript 前端
├── docs/            # 專案文檔 (本目錄)
├── tests/           # 整合測試
├── scripts/         # 構建腳本
├── configs/         # 配置文件
├── assets/          # 靜態資源
├── README.md        # 專案說明
├── Makefile         # 構建工具
├── docker-compose.yml # Docker 編排
└── LICENSE          # 授權文件
```

## 🔧 快速開始

1. **查看專案說明**: 參考根目錄的 `README.md`
2. **部署指南**: 參考 `deployment/DEPLOYMENT_GUIDE.md`
3. **API 文檔**: 參考 `api/` 目錄下的文檔
4. **架構理解**: 參考 `architecture/` 目錄下的文檔

## 📚 相關連結

- [專案根目錄](../) - 返回專案根目錄
- [後端服務](../backend/) - FastAPI 後端代碼
- [前端應用](../frontend/) - React TypeScript 前端代碼
- [測試套件](../tests/) - 整合測試代碼