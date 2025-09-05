# 使用 Node.js 作為基礎映像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製源代碼
COPY . .

# 構建應用
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 啟動 Vite 預覽服務器
CMD ["pnpm", "run", "preview", "--host", "0.0.0.0", "--port", "3000"]