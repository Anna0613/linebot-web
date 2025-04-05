# 使用 Node.js 18 作為基礎映像
FROM node:18

# 設置工作目錄
WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package.json .
RUN npm install

# 複製所有程式碼
COPY . .

# 暴露端口
EXPOSE 3000

# 設置環境變數
ENV NODE_ENV=production

# 啟動應用
CMD ["node", "index.js"]