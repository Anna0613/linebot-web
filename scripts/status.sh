#!/bin/bash

# LineBot Web 應用狀態檢查腳本

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== LineBot Web 應用狀態檢查 ===${NC}"
echo "檢查時間: $(date)"
echo

# 檢查 Docker 容器狀態
echo -e "${BLUE}=== 容器狀態 ===${NC}"
if docker ps --filter "name=linebot-web" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "linebot-web"; then
    docker ps --filter "name=linebot-web" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo
else
    echo -e "${RED}未發現 linebot-web 容器${NC}"
    echo
fi

# 檢查服務健康狀態
echo -e "${BLUE}=== 服務健康檢查 ===${NC}"

# 後端健康檢查
if curl -f -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 後端服務 (http://localhost:8001) - 正常${NC}"
    # 獲取健康檢查詳細信息
    health_info=$(curl -s http://localhost:8001/health 2>/dev/null | head -1)
    if [ ! -z "$health_info" ]; then
        echo "  詳細信息: $health_info"
    fi
else
    echo -e "${RED}✗ 後端服務 (http://localhost:8001) - 異常${NC}"
fi

# 前端健康檢查
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端服務 (http://localhost:3000) - 正常${NC}"
else
    echo -e "${RED}✗ 前端服務 (http://localhost:3000) - 異常${NC}"
fi

echo

# 檢查資源使用情況
echo -e "${BLUE}=== 資源使用情況 ===${NC}"
if docker ps --filter "name=linebot-web" -q | grep -q .; then
    # 獲取 linebot-web 容器的 ID
    container_ids=$(docker ps --filter "name=linebot-web" -q | tr '\n' ' ')
    if [ ! -z "$container_ids" ]; then
        docker stats --no-stream $container_ids --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    fi
else
    echo -e "${YELLOW}無運行中的 linebot-web 容器${NC}"
fi

echo

# 檢查最近的日誌
echo -e "${BLUE}=== 最近日誌 (最後 5 行) ===${NC}"
if docker ps --filter "name=linebot-web-backend" -q | grep -q .; then
    echo -e "${YELLOW}後端日誌:${NC}"
    docker logs linebot-web-backend --tail 5 2>/dev/null || echo "無法獲取後端日誌"
    echo
fi

if docker ps --filter "name=linebot-web-frontend" -q | grep -q .; then
    echo -e "${YELLOW}前端日誌:${NC}"
    docker logs linebot-web-frontend --tail 5 2>/dev/null || echo "無法獲取前端日誌"
    echo
fi

# 檢查 Docker 映像
echo -e "${BLUE}=== Docker 映像 ===${NC}"
docker images --filter "reference=linebot-web*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo
echo -e "${GREEN}狀態檢查完成！${NC}"
