#!/bin/bash

# ========================================
# BotCraft 生產環境部署初始化腳本
# ========================================

set -e

echo "=========================================="
echo "BotCraft 生產環境部署初始化"
echo "=========================================="
echo ""

# 檢查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ 錯誤：未找到 Docker。請先安裝 Docker。"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 錯誤：未找到 Docker Compose。請先安裝 Docker Compose。"
    exit 1
fi

echo "✅ Docker 環境檢查通過"
echo ""

# 獲取當前目錄
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 專案目錄: $PROJECT_DIR"
echo ""

# 檢查和創建環境文件
setup_env_file() {
    local target=$1
    local source=$2
    local service=$3
    
    if [ ! -f "$target" ]; then
        if [ -f "$source" ]; then
            cp "$source" "$target"
            echo "📝 已建立 $service 環境配置檔: $target"
            echo "⚠️  請編輯 $target 並填入實際的配置值"
        else
            echo "❌ 未找到模板: $source"
            return 1
        fi
    else
        echo "✅ $service 環境配置檔已存在: $target"
    fi
}

# 設置後端環境
echo "設置後端環境..."
setup_env_file "backend/.env" "backend/.env.template" "後端"
echo ""

# 設置前端環境
echo "設置前端環境..."
setup_env_file "frontend/.env" "frontend/.env.template" "前端"
echo ""

# 檢查必要的服務
echo "檢查依賴服務..."
echo "請確認以下服務已配置："
echo "  ✓ PostgreSQL (預期主機: postgresql15)"
echo "  ✓ Redis"
echo "  ✓ (可選) MongoDB"
echo "  ✓ (可選) MinIO"
echo ""

# 詢問是否開始構建和啟動
echo "準備開始部署？"
echo "1. 構建容器映像並啟動服務"
echo "2. 只顯示配置檢查結果（不啟動）"
echo "3. 取消"
read -p "選擇 (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "開始構建和啟動容器..."
        echo "=========================================="
        
        # 構建映像
        echo "構建 Docker 映像（這可能需要幾分鐘）..."
        docker-compose build --no-cache
        
        # 啟動容器
        echo ""
        echo "啟動容器..."
        docker-compose up -d
        
        echo ""
        echo "=========================================="
        echo "✅ 容器啟動完成！"
        echo ""
        echo "檢查容器狀態："
        docker-compose ps
        echo ""
        echo "查看後端日誌："
        echo "  docker-compose logs -f backend"
        echo ""
        echo "查看前端日誌："
        echo "  docker-compose logs -f frontend"
        echo ""
        echo "🌐 訪問應用："
        echo "  後端 API: http://localhost:8001"
        echo "  前端: http://localhost:3000"
        ;;
    2)
        echo ""
        echo "配置檢查結果："
        echo "=========================================="
        echo ""
        if [ -f "backend/.env" ]; then
            echo "✅ 後端環境配置檔存在"
        else
            echo "❌ 後端環境配置檔缺失"
        fi
        
        if [ -f "frontend/.env" ]; then
            echo "✅ 前端環境配置檔存在"
        else
            echo "❌ 前端環境配置檔缺失"
        fi
        
        echo ""
        echo "下一步操作："
        echo "1. 編輯 backend/.env 填入實際配置"
        echo "2. 編輯 frontend/.env 填入實際配置"
        echo "3. 執行: docker-compose up -d"
        ;;
    3)
        echo "部署已取消"
        exit 0
        ;;
    *)
        echo "無效選擇"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "部署初始化完成！"
echo "=========================================="
