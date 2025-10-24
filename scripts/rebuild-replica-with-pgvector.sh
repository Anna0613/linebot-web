#!/bin/bash

# PostgreSQL 從庫重建腳本（包含 pgvector 支援）
# 此腳本會重建從庫容器，使用包含 pgvector 的自定義映像

set -e

echo "=========================================="
echo "PostgreSQL 從庫重建腳本（pgvector 支援）"
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置變數
REPLICA_CONTAINER="postgresql15-replica1"
CUSTOM_IMAGE="postgres-pgvector:15"
DATA_DIR="/mnt/cache/appdata/postgresql15-replica1"

echo ""
echo -e "${YELLOW}步驟 1: 構建包含 pgvector 的自定義映像${NC}"
echo "----------------------------------------"
docker build -f Dockerfile.postgresql-pgvector -t ${CUSTOM_IMAGE} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 映像構建成功${NC}"
else
    echo -e "${RED}✗ 映像構建失敗${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}步驟 2: 停止並刪除現有從庫容器${NC}"
echo "----------------------------------------"
if docker ps -a | grep -q ${REPLICA_CONTAINER}; then
    docker stop ${REPLICA_CONTAINER}
    docker rm ${REPLICA_CONTAINER}
    echo -e "${GREEN}✓ 現有容器已刪除${NC}"
else
    echo -e "${YELLOW}! 容器不存在，跳過刪除步驟${NC}"
fi

echo ""
echo -e "${YELLOW}步驟 3: 創建新的從庫容器${NC}"
echo "----------------------------------------"
docker run -d \
  --name ${REPLICA_CONTAINER} \
  --network tcp-service \
  -p 5433:5432 \
  -v ${DATA_DIR}:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=11131230 \
  -e TZ=America/Los_Angeles \
  --restart unless-stopped \
  ${CUSTOM_IMAGE}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 從庫容器創建成功${NC}"
else
    echo -e "${RED}✗ 從庫容器創建失敗${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}步驟 4: 連接到 frontend 網路${NC}"
echo "----------------------------------------"
docker network connect frontend ${REPLICA_CONTAINER}
echo -e "${GREEN}✓ 已連接到 frontend 網路${NC}"

echo ""
echo -e "${YELLOW}步驟 5: 等待容器啟動${NC}"
echo "----------------------------------------"
sleep 5

echo ""
echo -e "${YELLOW}步驟 6: 驗證 pgvector 擴展${NC}"
echo "----------------------------------------"
docker exec ${REPLICA_CONTAINER} psql -U 11131230 -d linebot -c "\dx" | grep vector

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ pgvector 擴展已正確安裝${NC}"
else
    echo -e "${RED}✗ pgvector 擴展驗證失敗${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}步驟 7: 驗證複製狀態${NC}"
echo "----------------------------------------"
docker exec postgresql15 psql -U 11131230 -d postgres -c "SELECT application_name, client_addr, state FROM pg_stat_replication;"

echo ""
echo -e "${GREEN}=========================================="
echo "從庫重建完成！"
echo "==========================================${NC}"
echo ""
echo "容器資訊："
echo "  - 容器名稱: ${REPLICA_CONTAINER}"
echo "  - 映像: ${CUSTOM_IMAGE}"
echo "  - 端口: 5433:5432"
echo "  - 數據目錄: ${DATA_DIR}"
echo ""
echo "測試連接："
echo "  docker exec ${REPLICA_CONTAINER} psql -U 11131230 -d linebot -c 'SELECT COUNT(*) FROM knowledge_chunks;'"
echo ""

