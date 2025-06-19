"""
LineBot-Web 統一 API 主應用程式
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_database
from app.api.api_v1.api import api_router

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    # 啟動時
    logger.info("啟動 LineBot-Web 統一 API")
    try:
        init_database()
        logger.info("資料庫初始化完成")
    except Exception as e:
        logger.error(f"資料庫初始化失敗: {e}")
        raise
    
    yield
    
    # 關閉時
    logger.info("關閉 LineBot-Web 統一 API")

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)

# 信任主機中間件
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# 全域異常處理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"全域異常: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "內部伺服器錯誤"}
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