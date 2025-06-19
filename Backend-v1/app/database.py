"""
資料庫連接和會話管理模組
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import tenacity
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# 創建資料庫引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG
)

# 創建會話工廠
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 創建基礎模型類別
Base = declarative_base()

# 重試機制
@tenacity.retry(
    stop=tenacity.stop_after_attempt(3),
    wait=tenacity.wait_fixed(2),
    retry=tenacity.retry_if_exception_type(OperationalError),
    before_sleep=lambda retry_state: logger.debug(f"重試資料庫連接: 第 {retry_state.attempt_number} 次嘗試")
)
def check_database_connection():
    """檢查資料庫連接"""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return True

def init_database():
    """初始化資料庫"""
    try:
        # 檢查資料庫連線
        check_database_connection()
        logger.info("資料庫連線成功")
        
        # 啟用 uuid-ossp 擴展
        with engine.connect() as connection:
            connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            connection.commit()
            logger.info("uuid-ossp 擴展已啟用")
            
        # 創建所有表格
        Base.metadata.create_all(bind=engine)
        logger.info("資料庫表格創建成功")
        
    except OperationalError as e:
        logger.error(f"資料庫連線失敗: {e}")
        raise
    except Exception as e:
        logger.error(f"資料庫初始化失敗: {str(e)}", exc_info=True)
        raise

def get_db():
    """取得資料庫會話"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 