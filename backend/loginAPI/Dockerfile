# 使用 Python 3.9 作為基礎映像
FROM python:3.9

# 設定工作目錄
WORKDIR /app

# 複製應用程式檔案到容器中
COPY . .

# 安裝必要的套件
RUN pip install --no-cache-dir flask psycopg2 flask-cors werkzeug

# 暴露 Flask 預設埠
EXPOSE 5501

# 設定啟動指令
CMD ["python", "app.py"]
