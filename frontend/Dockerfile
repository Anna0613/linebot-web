# 使用 Node.js 作為基礎映像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package files
COPY frontend/package*.json ./
COPY frontend/pnpm-lock.yaml* ./

# 安裝依賴
RUN pnpm install --no-frozen-lockfile

# 複製前端源代碼（排除 node_modules）
COPY frontend/src ./src/
COPY frontend/public ./public/
COPY frontend/*.js ./
COPY frontend/*.ts ./
COPY frontend/*.json ./
COPY frontend/*.html ./
COPY frontend/*.md ./

# 複製 assets 目錄（從專案根目錄）
COPY assets/ ./assets/

# 設定構建時環境變數
ARG VITE_UNIFIED_API_URL
ARG VITE_WEBHOOK_DOMAIN
ARG VITE_DOMAIN
ARG REACT_APP_DOMAIN
ARG VITE_ALLOWED_HOSTS
ARG VITE_DEV_SERVER_HOST
ARG VITE_DEV_SERVER_PORT
ARG VITE_PROXY_SECURE
ARG VITE_PROXY_CHANGE_ORIGIN

# 動態生成 .env 文件（Vite 構建時需要讀取）
# 這確保了 Vite 在構建時能夠讀取正確的環境變數
RUN echo "VITE_UNIFIED_API_URL=${VITE_UNIFIED_API_URL}" > .env && \
    echo "VITE_WEBHOOK_DOMAIN=${VITE_WEBHOOK_DOMAIN}" >> .env && \
    echo "VITE_DOMAIN=${VITE_DOMAIN}" >> .env && \
    echo "REACT_APP_DOMAIN=${REACT_APP_DOMAIN}" >> .env && \
    echo "VITE_ALLOWED_HOSTS=${VITE_ALLOWED_HOSTS}" >> .env && \
    echo "VITE_DEV_SERVER_HOST=${VITE_DEV_SERVER_HOST}" >> .env && \
    echo "VITE_DEV_SERVER_PORT=${VITE_DEV_SERVER_PORT}" >> .env && \
    echo "VITE_PROXY_SECURE=${VITE_PROXY_SECURE}" >> .env && \
    echo "VITE_PROXY_CHANGE_ORIGIN=${VITE_PROXY_CHANGE_ORIGIN}" >> .env && \
    echo "# 環境變數已在構建時注入" >> .env && \
    cat .env

# 構建應用（使用環境變數）
RUN VITE_UNIFIED_API_URL=${VITE_UNIFIED_API_URL} \
    VITE_WEBHOOK_DOMAIN=${VITE_WEBHOOK_DOMAIN} \
    VITE_DOMAIN=${VITE_DOMAIN} \
    REACT_APP_DOMAIN=${REACT_APP_DOMAIN} \
    VITE_ALLOWED_HOSTS=${VITE_ALLOWED_HOSTS} \
    VITE_DEV_SERVER_HOST=${VITE_DEV_SERVER_HOST} \
    VITE_DEV_SERVER_PORT=${VITE_DEV_SERVER_PORT} \
    VITE_PROXY_SECURE=${VITE_PROXY_SECURE} \
    VITE_PROXY_CHANGE_ORIGIN=${VITE_PROXY_CHANGE_ORIGIN} \
    pnpm run build

# 安裝 serve 用於提供靜態文件（更穩定的生產環境方案）
RUN npm install -g serve

# 暴露端口
EXPOSE 3000

# 使用 serve 提供靜態文件
# -s: 單頁應用模式（所有路由都返回 index.html）
# -l: 監聽端口
# --no-port-switching: 如果端口被佔用則失敗而不是切換端口
# --no-clipboard: 不複製到剪貼板
CMD ["serve", "-s", "dist", "-l", "3000", "--no-port-switching", "--no-clipboard"]