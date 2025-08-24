"""
資料庫連接和會話管理模組
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import tenacity
import logging

from .config import settings

logger = logging.getLogger(__name__)

# 創建資料庫引擎 - 進階優化連接池設定
engine = create_engine(
    settings.DATABASE_URL,
    # 連接池設定 - 效能優化
    pool_pre_ping=True,         # 連接前檢查，避免死連接
    pool_recycle=1800,          # 30分鐘回收連接，避免長時間佔用
    pool_size=25,               # 核心連接池大小 (增加至25)
    max_overflow=50,            # 最大溢出連接數 (增加至50)
    pool_timeout=20,            # 連接超時 (降至20秒，快速失敗)
    echo=settings.DEBUG,
    
    # PostgreSQL 特定優化
    connect_args={
        "application_name": "linebot-web-api",
        # 連接級別優化
        "keepalives_idle": "600",        # 10分鐘保持連接
        "keepalives_interval": "30",     # 30秒檢查間隔
        "keepalives_count": "3",         # 最多重試3次
        "tcp_user_timeout": "30000",     # TCP 用戶超時 30秒
    },
    
    # 執行選項優化
    execution_options={
        "postgresql_readonly": False,
        "postgresql_autocommit": False,
        "compiled_cache": {},            # 啟用 SQL 編譯快取
    }
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

def clean_unused_schemas():
    """清理未使用的 schemas"""
    try:
        from app.schema_config import SchemaConfig
        
        with engine.connect() as connection:
            # 獲取所有 schemas
            result = connection.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                ORDER BY schema_name
            """))
            all_schemas = [row[0] for row in result]
            
            # 獲取受保護的 schemas
            protected_schemas = SchemaConfig.get_protected_schemas()
            
            # 找出要檢查的 schemas
            schemas_to_check = [s for s in all_schemas if SchemaConfig.should_drop_schema(s)]
            
            if schemas_to_check:
                logger.info(f"檢查 {len(schemas_to_check)} 個 schemas: {schemas_to_check}")
                logger.info(f"受保護的 schemas: {protected_schemas}")
                
                dropped_count = 0
                for schema in schemas_to_check:
                    try:
                        # 檢查 schema 是否為空
                        table_check = connection.execute(text("""
                            SELECT COUNT(*) 
                            FROM information_schema.tables 
                            WHERE table_schema = :schema_name
                        """), {"schema_name": schema})
                        table_count = table_check.scalar()
                        
                        # 檢查是否有函數或其他物件
                        function_check = connection.execute(text("""
                            SELECT COUNT(*) 
                            FROM information_schema.routines 
                            WHERE routine_schema = :schema_name
                        """), {"schema_name": schema})
                        function_count = function_check.scalar()
                        
                        total_objects = table_count + function_count
                        
                        if total_objects == 0:
                            # 如果 schema 為空，則刪除
                            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
                            connection.commit()
                            logger.info(f"✅ 已刪除空的 schema: {schema}")
                            dropped_count += 1
                        else:
                            logger.info(f"⏭️  Schema '{schema}' 包含 {table_count} 個表格和 {function_count} 個函數，保留")
                            
                    except Exception as e:
                        logger.warning(f"⚠️  清理 schema '{schema}' 時發生錯誤: {e}")
                        continue
                
                if dropped_count > 0:
                    logger.info(f"🧹 Schema 清理完成，共刪除 {dropped_count} 個空的 schemas")
                else:
                    logger.info("✨ 沒有發現需要清理的空 schemas")
            else:
                logger.info("📝 所有 schemas 都在受保護列表中，無需清理")
                
    except Exception as e:
        logger.warning(f"❌ 清理 schemas 時發生錯誤: {e}")

def init_database():
    """初始化資料庫"""
    try:
        # 檢查資料庫連線
        check_database_connection()
        logger.info("資料庫連線成功")
        
        # 清理未使用的 schemas
        clean_unused_schemas()
        
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