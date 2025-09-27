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

# 將 ARG 轉換為 ENV，讓構建過程可以使用
ENV VITE_UNIFIED_API_URL=$VITE_UNIFIED_API_URL
ENV VITE_WEBHOOK_DOMAIN=$VITE_WEBHOOK_DOMAIN
ENV VITE_DOMAIN=$VITE_DOMAIN
ENV REACT_APP_DOMAIN=$REACT_APP_DOMAIN

# 構建應用
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 啟動 Vite 預覽服務器
CMD ["pnpm", "run", "preview", "--host", "0.0.0.0", "--port", "3000"]