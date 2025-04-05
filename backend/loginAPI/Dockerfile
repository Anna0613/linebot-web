# 基礎映像：Python
FROM python:3.9-slim

# 設置工作目錄
WORKDIR /app

# 複製並安裝依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY main.py .

# 暴露端口
EXPOSE 5501

# 設置環境變數
ENV FLASK_ENV=production

# 運行 Flask
CMD ["python", "main.py"]