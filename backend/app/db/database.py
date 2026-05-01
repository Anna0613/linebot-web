"""
資料庫連接和會話管理模組
支援讀寫分離功能
"""
from sqlalchemy import text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import OperationalError
import tenacity
import logging

from app.config import settings
from .db_read_write_split import db_manager, DatabaseRole

logger = logging.getLogger(__name__)

# 初始化連線管理器
db_manager.initialize()

# 取得主庫引擎（向後相容）
engine = db_manager.get_engine(DatabaseRole.PRIMARY)

# 取得主庫 session factory（向後相容）
SessionLocal = db_manager.get_session_factory(DatabaseRole.PRIMARY)

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
        from app.db.schema_config import SchemaConfig
        
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

def _python_pgvector_available() -> bool:
    """確認目前 Python 環境是否會使用 pgvector SQLAlchemy 型別。"""
    try:
        import pgvector.sqlalchemy  # noqa: F401
        return True
    except Exception:
        return False

def init_database():
    """初始化資料庫"""
    try:
        # 檢查資料庫連線
        check_database_connection()
        logger.info("資料庫連線成功")
        
        # 清理未使用的 schemas
        clean_unused_schemas()
        
        # uuid-ossp 是 UUID 主鍵預設值必要依賴，必須獨立提交。
        with engine.begin() as connection:
            connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))

        # pgvector 必須獨立處理，失敗時不應 rollback 掉 uuid-ossp。
        pgvector_enabled = False
        try:
            with engine.begin() as connection:
                connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
                connection.execute(text("SELECT '[0]'::vector"))
            pgvector_enabled = True
            logger.info("pgvector 擴展已啟用")
        except Exception as _e:
            logger.warning(f"啟用 pgvector 擴展失敗（可能未安裝）: {_e}")

        if _python_pgvector_available() and not pgvector_enabled:
            raise RuntimeError(
                "PostgreSQL 未安裝 pgvector extension，無法建立完整資料庫 schema。"
                "請安裝 postgresql-15-pgvector，或使用專案的 Dockerfile.postgresql-pgvector。"
            )

        logger.info("uuid-ossp 擴展已啟用")
            
        # 創建所有表格
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("資料庫表格創建成功")
        
    except OperationalError as e:
        logger.error(f"資料庫連線失敗: {e}")
        raise
    except Exception as e:
        logger.error(f"資料庫初始化失敗: {str(e)}", exc_info=True)
        raise

def get_db(use_replica: bool = False):
    """
    取得資料庫會話

    Args:
        use_replica: 是否使用從庫（僅用於讀取操作）
    """
    role = DatabaseRole.REPLICA if use_replica else DatabaseRole.PRIMARY
    session_factory = db_manager.get_session_factory(role)
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
