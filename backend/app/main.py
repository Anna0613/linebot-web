"""
LineBot-Web 統一 API 主應用程式
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
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
from app.database_enhanced import init_database_enhanced
from app.database_mongo import init_mongodb, close_mongodb
from app.api.api_v1.api import api_router
from app.config.redis_config import init_redis, close_redis
from app.services.background_tasks import get_task_manager, PerformanceOptimizer
from app.services.cache_service import get_cache

# 配置日誌
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理 - 整合效能優化服務"""
    # 啟動時
    logger.info("啟動 LineBot-Web 統一 API")
    try:
        # 使用增強的資料庫初始化系統
        # __file__ = app/main.py, 所以 backend 目錄是上兩級
        project_root = os.path.dirname(os.path.dirname(__file__))
        if init_database_enhanced(settings.DATABASE_URL, project_root):
            logger.info("✅ 增強資料庫初始化完成")
        else:
            logger.warning("⚠️ 增強資料庫初始化失敗，嘗試基本初始化")
            init_database()
            logger.info("基本資料庫初始化完成")
        
        # 初始化 Redis 連接
        await init_redis()
        logger.info("Redis 初始化完成")
        
        # 初始化 MongoDB 連接
        try:
            await init_mongodb()
            logger.info("MongoDB 初始化完成")
        except Exception as e:
            logger.error(f"MongoDB 初始化失敗: {e}")
            logger.warning("繼續啟動服務器，但 MongoDB 功能將不可用")
        
        # 初始化多層快取
        cache = get_cache()
        logger.info("多層快取系統初始化完成")
        
        # 啟動背景任務管理器
        task_manager = get_task_manager()
        await task_manager.start()
        logger.info("背景任務管理器啟動完成")
        
        # 啟動效能優化器
        optimizer = PerformanceOptimizer()
        await optimizer.setup_cache_warming()
        logger.info("效能優化器設置完成")
        
        # 添加定期效能報告任務
        from app.services.background_tasks import generate_performance_report, TaskPriority
        await task_manager.add_task(
            "performance_report",
            "定期效能報告",
            generate_performance_report,
            priority=TaskPriority.LOW,
            delay=300  # 5分鐘後開始
        )
        
    except Exception as e:
        logger.error(f"初始化失敗: {e}")
        raise
    
    yield
    
    # 關閉時
    logger.info("關閉 LineBot-Web 統一 API")
    try:
        # 停止背景任務管理器
        task_manager = get_task_manager()
        await task_manager.stop()
        logger.info("背景任務管理器已停止")
        
        await close_redis()
        logger.info("Redis 連接已關閉")
        
        try:
            await close_mongodb()
            logger.info("MongoDB 連接已關閉")
        except Exception as e:
            logger.error(f"MongoDB 關閉失敗: {e}")
    except Exception as e:
        logger.error(f"關閉服務失敗: {e}")

# 創建 FastAPI 應用程式
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.SHOW_DOCS else None,
    redoc_url="/redoc" if settings.SHOW_DOCS else None,
)

# CORS 中間件 - 必須在所有其他中間件之前
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
    max_age=3600,  # 預檢請求緩存時間
)

# Gzip 壓縮中間件
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # 只壓縮大於 1KB 的響應
    compresslevel=6     # 壓縮等級 1-9，6 是效能與壓縮率的平衡點
)

# 請求日誌中間件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """記錄所有請求"""
    logger.info(f"收到請求: {request.method} {request.url}")
    logger.info(f"請求標頭: {dict(request.headers)}")

    response = await call_next(request)

    logger.info(f"回應狀態: {response.status_code}")
    return response

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

# 掛載媒體檔案靜態檔案服務
import os
media_path = os.path.join(os.path.dirname(__file__), "..", "media")
os.makedirs(media_path, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_path), name="media")

# 根路由
@app.get("/")
async def root():
    """根路由"""
    return {
        "message": f"歡迎使用 {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs": "/docs" if settings.SHOW_DOCS else "文檔已禁用"
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

# 效能監控端點
@app.get("/api/v1/performance/stats")
async def get_performance_stats():
    """獲取效能統計"""
    try:
        cache = get_cache()
        task_manager = get_task_manager()
        optimizer = PerformanceOptimizer()
        
        return {
            "cache_stats": cache.get_stats(),
            "task_manager_status": task_manager.get_status(),
            "optimization_report": optimizer.get_optimization_report()
        }
    except Exception as e:
        logger.error(f"獲取效能統計失敗: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "獲取效能統計失敗", "detail": str(e)}
        )

@app.get("/api/v1/performance/cache/clear")
async def clear_cache():
    """清除快取（管理員功能）"""
    try:
        cache = get_cache()
        
        # 清除 L1 快取
        if hasattr(cache, 'l1_cache') and cache.l1_cache:
            cache.l1_cache.clear()
        
        # 清除統計
        cache.clear_stats()
        
        return {"message": "快取清除成功"}
    except Exception as e:
        logger.error(f"清除快取失敗: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "清除快取失敗", "detail": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 