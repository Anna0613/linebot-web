@echo off
echo ========================================
echo 啟動本地開發環境服務
echo ========================================

echo 檢查 Docker 是否運行中...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 錯誤: Docker 未安裝或未運行
    echo 請先安裝並啟動 Docker Desktop
    pause
    exit /b 1
)

echo Docker 已就緒，開始啟動服務...

echo.
echo 停止並移除現有容器（如果存在）...
docker-compose -f docker-compose.local.yml down

echo.
echo 拉取最新映像...
docker-compose -f docker-compose.local.yml pull

echo.
echo 啟動所有服務...
docker-compose -f docker-compose.local.yml up -d

echo.
echo 等待服務啟動完成...
timeout /t 30 /nobreak >nul

echo.
echo 檢查服務狀態...
docker-compose -f docker-compose.local.yml ps

echo.
echo ========================================
echo 服務啟動完成！
echo ========================================
echo PostgreSQL: localhost:5432
echo   - 資料庫: linebot
echo   - 用戶: linebot_user
echo   - 密碼: linebot_password
echo.
echo Redis: localhost:6379
echo   - 密碼: redis_password
echo.
echo MinIO: 
echo   - API: http://localhost:9000
echo   - Console: http://localhost:9001
echo   - 用戶: minioadmin
echo   - 密碼: minioadmin123
echo.
echo MongoDB: localhost:27017
echo   - 用戶: mongo_user
echo   - 密碼: mongo_password
echo   - 資料庫: linebot_conversations
echo ========================================

pause
