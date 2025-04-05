# 基礎映像：Node.js
FROM node:18

# 設置工作目錄
WORKDIR /app

# 複製並安裝依賴
COPY package.json .
RUN npm install

# 複製程式碼
COPY . .

# 暴露端口
EXPOSE 3000

# 設置環境變數
ENV NODE_ENV=production

# 運行 Express
CMD ["node", "index.js"]