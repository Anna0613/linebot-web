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

# 將 ARG 轉換為 ENV，讓構建過程和運行時可以使用
ENV VITE_UNIFIED_API_URL=$VITE_UNIFIED_API_URL
ENV VITE_WEBHOOK_DOMAIN=$VITE_WEBHOOK_DOMAIN
ENV VITE_DOMAIN=$VITE_DOMAIN
ENV REACT_APP_DOMAIN=$REACT_APP_DOMAIN
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS
ENV VITE_DEV_SERVER_HOST=$VITE_DEV_SERVER_HOST
ENV VITE_DEV_SERVER_PORT=$VITE_DEV_SERVER_PORT
ENV VITE_PROXY_SECURE=$VITE_PROXY_SECURE
ENV VITE_PROXY_CHANGE_ORIGIN=$VITE_PROXY_CHANGE_ORIGIN

# 構建應用
RUN pnpm run build

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