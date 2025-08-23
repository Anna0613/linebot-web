"""
LineBot-Web 統一 API 主應用程式
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

# 直接導入 config.py 模組中的設定
import importlib.util
import os

# 直接載入 config.py 檔案
config_path = os.path.join(os.path.dirname(__file__), 'config.py')
spec = importlib.util.spec_from_file_location("config", config_path)
config_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config_module)
settings = config_module.settings

from app.database import init_database
from app.api.api_v1.api import api_router
from app.config.redis_config import init_redis, close_redis

# 配置日誌
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    # 啟動時
    logger.info("啟動 LineBot-Web 統一 API")
    try:
        init_database()
        logger.info("資料庫初始化完成")
        
        # 初始化 Redis 連接
        await init_redis()
        logger.info("Redis 初始化完成")
    except Exception as e:
        logger.error(f"初始化失敗: {e}")
        raise
    
    yield
    
    # 關閉時
    logger.info("關閉 LineBot-Web 統一 API")
    try:
        await close_redis()
        logger.info("Redis 連接已關閉")
    except Exception as e:
        logger.error(f"關閉 Redis 失敗: {e}")

# 創建 FastAPI 應用程式
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
    max_age=3600,  # 預檢請求緩存時間
)

# 信任主機中間件
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# FastAPI 驗證錯誤處理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """處理 FastAPI 請求驗證錯誤 (422)"""
    logger.warning(f"驗證錯誤 - 請求 {request.method} {request.url}: {exc.errors()}")

    # 提取第一個錯誤信息
    error_detail = "資料驗證失敗"
    if exc.errors():
        first_error = exc.errors()[0]
        field = first_error.get('loc', ['unknown'])[-1]  # 獲取字段名
        msg = first_error.get('msg', '驗證失敗')
        error_detail = f"{field}: {msg}"

    return JSONResponse(
        status_code=422,
        content={
            "detail": error_detail,
            "message": error_detail,  # 為了前端相容性
            "errors": exc.errors()
        }
    )

# Pydantic 驗證錯誤處理
@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """處理 Pydantic 驗證錯誤"""
    logger.warning(f"Pydantic 驗證錯誤 - 請求 {request.method} {request.url}: {exc.errors()}")

    # 提取第一個錯誤信息
    error_detail = "資料驗證失敗"
    if exc.errors():
        first_error = exc.errors()[0]
        field = first_error.get('loc', ['unknown'])[-1]  # 獲取字段名
        msg = first_error.get('msg', '驗證失敗')
        error_detail = f"{field}: {msg}"

    return JSONResponse(
        status_code=422,
        content={
            "detail": error_detail,
            "message": error_detail,  # 為了前端相容性
            "errors": exc.errors()
        }
    )

# 全域異常處理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"全域異常 - 請求 {request.method} {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "內部伺服器錯誤", "error_type": type(exc).__name__}
    )

# 包含 API 路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# 根路由
@app.get("/")
async def root():
    """根路由"""
    return {
        "message": f"歡迎使用 {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs": "/docs" if settings.DEBUG else "文檔在生產環境中已禁用"
    }

@app.get("/health")
async def health_check():
    """健康檢查"""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

# 資料庫狀態檢查
@app.get("/api/database-status")
async def database_status():
    """資料庫狀態檢查（相容舊版）"""
    from app.database import check_database_connection
    try:
        check_database_connection()
        return {
            "connection": "successful",
            "status": "healthy"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"connection": "failed", "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 