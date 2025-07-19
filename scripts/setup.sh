#!/bin/bash

# LineBot-Web 專案初始化腳本

set -e

echo "=== LineBot-Web 專案初始化 ==="

# 檢查 Python 版本
echo "檢查 Python 版本..."
if ! python3 --version | grep -q "3.1[1-9]"; then
    echo "錯誤: 需要 Python 3.11 或更高版本"
    exit 1
fi

# 檢查 Node.js 版本
echo "檢查 Node.js 版本..."
if ! node --version | grep -q "v1[8-9]\|v[2-9][0-9]"; then
    echo "錯誤: 需要 Node.js 18 或更高版本"
    exit 1
fi

# 安裝後端依賴
echo "安裝後端依賴..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 創建後端環境配置
if [ ! -f .env ]; then
    cp env.example .env
    echo "已創建 backend/.env，請編輯您的配置"
fi

cd ..

# 安裝前端依賴
echo "安裝前端依賴..."
cd frontend
npm install

# 創建前端環境配置
if [ ! -f .env.local ]; then
    cp env.example .env.local
    echo "已創建 frontend/.env.local，請編輯您的配置"
fi

cd ..

# 設置 Git hooks
echo "設置 Git hooks..."
if [ -d .git ]; then
    cd backend
    if [ -f venv/bin/activate ]; then
        source venv/bin/activate
        pre-commit install
    fi
    cd ..
fi

# 創建必要目錄
echo "創建必要目錄..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# 設置權限
echo "設置腳本權限..."
chmod +x scripts/*.sh

echo ""
echo "=== 初始化完成! ==="
echo ""
echo "接下來的步驟:"
echo "1. 編輯 backend/.env 設定資料庫和 API 金鑰"
echo "2. 編輯 frontend/.env.local 設定前端配置"
echo "3. 啟動開發服務器:"
echo "   - 後端: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "   - 前端: cd frontend && npm run dev"
echo ""
echo "或使用 Docker:"
echo "   docker-compose up -d"
echo ""