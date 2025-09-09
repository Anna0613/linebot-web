#!/bin/bash

# LineBot Web 應用重新部署腳本
# 版本: 2.0
# 更新日期: 2025-09-09

set -e  # 遇到錯誤時停止執行

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查 Docker 是否運行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker 未運行或無法訪問"
        exit 1
    fi
    log_info "Docker 檢查通過"
}

# 檢查 docker-compose 是否可用
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose 未安裝"
        exit 1
    fi
    log_info "docker-compose 檢查通過"
}

# 備份當前運行的容器（可選）
backup_containers() {
    log_info "檢查現有容器..."
    if docker ps -q --filter "name=linebot-web" | grep -q .; then
        log_warning "發現現有的 linebot-web 容器"
        read -p "是否要備份現有容器的日誌？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            mkdir -p ./backup/logs/$(date +%Y%m%d_%H%M%S)
            docker logs linebot-web-backend > ./backup/logs/$(date +%Y%m%d_%H%M%S)/backend.log 2>&1 || true
            docker logs linebot-web-frontend > ./backup/logs/$(date +%Y%m%d_%H%M%S)/frontend.log 2>&1 || true
            log_success "日誌備份完成"
        fi
    fi
}

# 清理舊的映像和容器
cleanup_old_resources() {
    log_info "清理舊的 Docker 資源..."
    
    # 停止並移除現有容器
    docker-compose down 2>/dev/null || true
    
    # 移除舊的映像
    docker rmi linebot-web-frontend linebot-web-backend 2>/dev/null || true
    
    # 清理未使用的映像
    docker image prune -f
    
    log_success "清理完成"
}

# 構建新的映像
build_images() {
    log_info "開始構建 Docker 映像..."
    
    # 無快取構建以確保使用最新代碼
    if docker-compose build --no-cache; then
        log_success "映像構建成功"
    else
        log_error "映像構建失敗"
        exit 1
    fi
}

# 啟動服務
start_services() {
    log_info "啟動服務..."
    
    if docker-compose up -d; then
        log_success "服務啟動成功"
    else
        log_error "服務啟動失敗"
        exit 1
    fi
}

# 健康檢查
health_check() {
    log_info "執行健康檢查..."
    
    # 等待服務啟動
    sleep 10
    
    # 檢查後端健康狀態
    if curl -f -s http://localhost:6000/health > /dev/null; then
        log_success "後端服務健康檢查通過"
    else
        log_error "後端服務健康檢查失敗"
        docker logs linebot-web-backend --tail 20
        exit 1
    fi
    
    # 檢查前端是否可訪問
    if curl -f -s http://localhost:3000 > /dev/null; then
        log_success "前端服務健康檢查通過"
    else
        log_error "前端服務健康檢查失敗"
        docker logs linebot-web-frontend --tail 20
        exit 1
    fi
}

# 顯示部署資訊
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "=== 服務資訊 ==="
    echo "前端: http://localhost:3000"
    echo "後端 API: http://localhost:6000"
    echo "健康檢查: http://localhost:6000/health"
    echo
    echo "=== 容器狀態 ==="
    docker ps --filter "name=linebot-web" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo
    echo "=== 資源使用 ==="
    docker stats --no-stream --filter "name=linebot-web" --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# 主函數
main() {
    log_info "開始重新部署 LineBot Web 應用..."
    echo "部署時間: $(date)"
    echo
    
    # 執行部署步驟
    check_docker
    check_docker_compose
    backup_containers
    cleanup_old_resources
    build_images
    start_services
    health_check
    show_deployment_info
    
    log_success "重新部署流程完成！"
}

# 執行主函數
main "$@"
