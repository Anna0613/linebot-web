# LineBot-Web Makefile

.PHONY: help install dev-setup dev-build prod-build test clean docker-build docker-up docker-down format lint

# 預設目標
help:
	@echo "LineBot-Web 專案構建工具"
	@echo ""
	@echo "可用命令:"
	@echo "  install      - 安裝所有依賴"
	@echo "  dev-setup    - 設置開發環境"
	@echo "  dev-build    - 開發環境構建"
	@echo "  prod-build   - 生產環境構建"
	@echo "  test         - 運行所有測試"
	@echo "  format       - 格式化代碼"
	@echo "  lint         - 代碼檢查"
	@echo "  docker-build - 構建 Docker 映像"
	@echo "  docker-up    - 啟動 Docker 服務"
	@echo "  docker-down  - 停止 Docker 服務"
	@echo "  clean        - 清理構建文件"

# 安裝依賴
install:
	@echo "安裝後端依賴..."
	cd backend && pip install -r requirements.txt
	@echo "安裝前端依賴..."
	cd frontend && npm install

# 開發環境設置
dev-setup:
	@echo "設置開發環境..."
	@if [ ! -f backend/.env ]; then cp backend/env.example backend/.env; echo "請編輯 backend/.env 設定配置"; fi
	@if [ ! -f frontend/.env.local ]; then cp frontend/env.example frontend/.env.local; echo "請編輯 frontend/.env.local 設定配置"; fi

# 開發環境構建
dev-build:
	@echo "構建開發環境..."
	cd frontend && npm run build:dev

# 生產環境構建
prod-build:
	@echo "構建生產環境..."
	cd frontend && npm run build

# 運行測試
test:
	@echo "運行後端測試..."
	cd backend && python -m pytest tests/
	@echo "運行前端測試..."
	cd frontend && npm test
	@echo "運行整合測試..."
	cd tests && python -m pytest integration/

# 代碼格式化
format:
	@echo "格式化後端代碼..."
	cd backend && black . && isort .
	@echo "格式化前端代碼..."
	cd frontend && npm run format

# 代碼檢查
lint:
	@echo "檢查後端代碼..."
	cd backend && flake8 . && mypy .
	@echo "檢查前端代碼..."
	cd frontend && npm run lint

# Docker 相關
docker-build:
	@echo "構建 Docker 映像..."
	docker-compose build

docker-up:
	@echo "啟動 Docker 服務..."
	docker-compose up -d

docker-down:
	@echo "停止 Docker 服務..."
	docker-compose down

# 開發服務
dev-backend:
	@echo "啟動後端開發服務..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "啟動前端開發服務..."
	cd frontend && npm run dev

# 清理
clean:
	@echo "清理構建文件..."
	cd frontend && rm -rf dist/ node_modules/.cache/
	cd backend && find . -type d -name "__pycache__" -exec rm -rf {} +
	cd backend && find . -name "*.pyc" -delete
	docker-compose down --rmi all --volumes

# 部署相關
deploy-staging:
	@echo "部署到測試環境..."
	./scripts/deploy.sh staging

deploy-production:
	@echo "部署到生產環境..."
	./scripts/deploy.sh production

# 資料庫遷移
migrate:
	@echo "執行資料庫遷移..."
	cd backend && alembic upgrade head

# 生成遷移文件
migration:
	@echo "生成資料庫遷移文件..."
	cd backend && alembic revision --autogenerate -m "$(MSG)"