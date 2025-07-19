#!/bin/bash

# LineBot-Web 構建腳本

set -e

echo "=== LineBot-Web 構建腳本 ==="

# 檢查參數
if [ $# -eq 0 ]; then
    echo "使用方法: $0 [dev|prod]"
    exit 1
fi

ENV=$1

case $ENV in
    "dev")
        echo "構建開發環境..."
        
        # 後端開發環境
        echo "設置後端開發環境..."
        cd backend
        if [ ! -f .env ]; then
            cp env.example .env
            echo "已創建 backend/.env，請編輯配置"
        fi
        
        # 前端開發環境
        echo "設置前端開發環境..."
        cd ../frontend
        if [ ! -f .env.local ]; then
            cp env.example .env.local
            echo "已創建 frontend/.env.local，請編輯配置"
        fi
        
        npm run build:dev
        echo "開發環境構建完成"
        ;;
        
    "prod")
        echo "構建生產環境..."
        
        # 前端生產構建
        echo "構建前端生產版本..."
        cd frontend
        npm run build
        
        echo "生產環境構建完成"
        ;;
        
    *)
        echo "無效參數: $ENV"
        echo "使用方法: $0 [dev|prod]"
        exit 1
        ;;
esac

echo "構建完成！"