@echo off
echo ========================================
echo 切換到本地開發環境
echo ========================================

cd /d "%~dp0\.."

echo 備份當前 .env 文件...
if exist "backend\.env" (
    copy "backend\.env" "backend\.env.backup" >nul
    echo 已備份當前 .env 為 .env.backup
)

echo 切換到本地環境配置...
copy "backend\.env.local" "backend\.env" >nul

echo.
echo ========================================
echo 環境切換完成！
echo ========================================
echo 當前使用本地 Docker 服務：
echo - PostgreSQL: localhost:5432
echo - Redis: localhost:6379  
echo - MinIO: localhost:9000
echo - MongoDB: localhost:27017
echo.
echo 如需切換回原環境，請手動恢復 .env.backup
echo ========================================

pause
