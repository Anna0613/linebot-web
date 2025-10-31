FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴文件
COPY requirements.txt .

# 安裝 Python 依賴 (使用 CPU 版本的 PyTorch)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式碼
COPY . .

# 暴露端口（統一使用 8005）
EXPOSE 8005

# 啟動命令：使用 Gunicorn 多 worker（可透過環境變數覆蓋）
ENV WEB_CONCURRENCY=2
ENV MAX_REQUESTS=1000
ENV MAX_REQUESTS_JITTER=200
ENV KEEP_ALIVE=30
CMD gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w ${WEB_CONCURRENCY} \
    -b 0.0.0.0:8005 \
    --timeout 60 \
    --keep-alive ${KEEP_ALIVE} \
    --max-requests ${MAX_REQUESTS} \
    --max-requests-jitter ${MAX_REQUESTS_JITTER} \
    app.main:app
