#!/bin/bash

# LineBot-Web 部署腳本

set -e

echo "=== LineBot-Web 部署腳本 ==="

# 檢查參數
if [ $# -eq 0 ]; then
    echo "使用方法: $0 [staging|production]"
    exit 1
fi

ENV=$1

case $ENV in
    "staging")
        echo "部署到測試環境..."
        
        # 構建
        ./scripts/build.sh prod
        
        # 使用測試環境配置
        docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
        
        echo "測試環境部署完成"
        echo "URL: https://staging.linebot-web.com"
        ;;
        
    "production")
        echo "部署到生產環境..."
        
        # 安全檢查
        read -p "確定要部署到生產環境嗎？ (y/N): " confirm
        if [[ $confirm != [yY] ]]; then
            echo "部署已取消"
            exit 0
        fi
        
        # 構建
        ./scripts/build.sh prod
        
        # 使用生產環境配置
        docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
        
        echo "生產環境部署完成"
        echo "URL: https://linebot-web.com"
        ;;
        
    *)
        echo "無效參數: $ENV"
        echo "使用方法: $0 [staging|production]"
        exit 1
        ;;
esac

echo "部署完成！"