@echo off
echo ========================================
echo 停止本地開發環境服務
echo ========================================

echo 停止所有服務...
docker-compose -f docker-compose.local.yml down

echo.
echo 檢查容器狀態...
docker-compose -f docker-compose.local.yml ps

echo.
echo ========================================
echo 所有服務已停止
echo ========================================

pause
