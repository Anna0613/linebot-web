# Multi-stage build for frontend
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# 安裝依賴
RUN npm ci --only=production

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]