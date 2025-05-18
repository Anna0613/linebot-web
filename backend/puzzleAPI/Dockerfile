FROM python:3.9-slim

# 設置工作目錄
WORKDIR /app

# 複製依賴文件
COPY requirements.txt .

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式代碼
COPY app.py .
COPY auth_service.py .

# 設置環境變數
ENV PYTHONUNBUFFERED=1
ENV JWT_SECRET=your_jwt_secret_key_here
ENV PORT_PUZZLE=5503
ENV HOST=0.0.0.0

# 暴露端口
EXPOSE 5503

# 運行應用
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5503"]
