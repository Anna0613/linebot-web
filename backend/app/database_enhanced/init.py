"""
資料庫初始化和遷移管理模組
提供完整的資料庫初始化、遷移檢查和修復功能
"""
import logging
import os
import sys
from typing import Optional
from sqlalchemy import create_engine, text, MetaData, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError
from alembic.config import Config
from alembic import command
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

logger = logging.getLogger(__name__)

class DatabaseInitializer:
    """資料庫初始化器"""
    
    def __init__(self, database_url: str, alembic_ini_path: str):
        self.database_url = database_url
        self.alembic_ini_path = alembic_ini_path
        self.engine = create_engine(database_url)
        
    def init_database_complete(self) -> bool:
        """完整的資料庫初始化流程"""
        try:
            # 1. 檢查資料庫連接
            if not self._check_connection():
                logger.error("資料庫連接失敗")
                return False
            
            # 2. 啟用必要的擴展
            if not self._enable_extensions():
                logger.error("啟用資料庫擴展失敗")
                return False
            
            # 3. 檢查和修復遷移狀態
            if not self._check_and_fix_migrations():
                logger.error("遷移狀態檢查失敗")
                return False
            
            # 4. 執行缺失的遷移
            if not self._run_migrations():
                logger.error("執行遷移失敗")
                return False
            
            # 5. 驗證表結構
            if not self._validate_schema():
                logger.error("資料庫結構驗證失敗")
                return False
            
            logger.info("✅ 資料庫初始化完成")
            return True
            
        except Exception as e:
            logger.error(f"資料庫初始化過程中發生錯誤: {e}", exc_info=True)
            return False
    
    def _check_connection(self) -> bool:
        """檢查資料庫連接"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ 資料庫連接正常")
            return True
        except Exception as e:
            logger.error(f"❌ 資料庫連接失敗: {e}")
            return False
    
    def _enable_extensions(self) -> bool:
        """啟用必要的資料庫擴展"""
        try:
            with self.engine.connect() as conn:
                # 啟用 UUID 擴展
                conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
                conn.commit()
            logger.info("✅ 資料庫擴展啟用成功")
            return True
        except Exception as e:
            logger.error(f"❌ 啟用資料庫擴展失敗: {e}")
            return False
    
    def _check_and_fix_migrations(self) -> bool:
        """檢查和修復遷移狀態"""
        try:
            # 檢查 alembic_version 表是否存在
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'alembic_version'
                    )
                """))
                
                has_alembic_table = result.scalar()
                
                if not has_alembic_table:
                    logger.info("創建 alembic_version 表...")
                    conn.execute(text("""
                        CREATE TABLE alembic_version (
                            version_num VARCHAR(32) NOT NULL, 
                            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                        )
                    """))
                    conn.commit()
                
                # 檢查當前版本
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                current_version = result.scalar()
                
                logger.info(f"當前遷移版本: {current_version or 'None'}")
                
                # 如果沒有版本記錄，檢查實際表結構來推斷版本
                if not current_version:
                    version = self._detect_database_version(conn)
                    if version:
                        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:version)"), 
                                   {"version": version})
                        conn.commit()
                        logger.info(f"自動檢測並設置遷移版本: {version}")
                
            return True
        except Exception as e:
            logger.error(f"❌ 檢查遷移狀態失敗: {e}")
            return False
    
    def _detect_database_version(self, conn) -> Optional[str]:
        """根據現有表結構檢測資料庫版本"""
        try:
            # 檢查是否存在主要表
            result = conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'bots', 'line_bot_users', 'line_bot_user_interactions')
                ORDER BY table_name
            """))
            
            existing_tables = [row[0] for row in result]
            
            if 'line_bot_user_interactions' in existing_tables:
                # 檢查是否有媒體欄位
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'line_bot_user_interactions' 
                    AND column_name IN ('media_path', 'media_url')
                """))
                media_columns = [row[0] for row in result]
                
                if len(media_columns) >= 2:
                    # 如果有媒體欄位，版本應該是最新的
                    return 'add_line_bot_users'  # 使用整合後的版本
                else:
                    # 沒有媒體欄位，需要升級
                    return 'add_line_bot_users'  # 將升級到包含媒體欄位的版本
            
            elif len(existing_tables) >= 2:
                # 有基本表但沒有 LINE Bot 相關表
                return '3f8a9b2c1d5e'  # 基礎版本
            
            else:
                # 全新資料庫
                return None
                
        except Exception as e:
            logger.warning(f"自動檢測資料庫版本失敗: {e}")
            return None
    
    def _run_migrations(self) -> bool:
        """執行資料庫遷移"""
        try:
            # 創建 Alembic 配置
            alembic_cfg = Config(self.alembic_ini_path)
            alembic_cfg.set_main_option("sqlalchemy.url", self.database_url)
            
            # 執行遷移到最新版本
            command.upgrade(alembic_cfg, "head")
            logger.info("✅ 資料庫遷移執行完成")
            return True
            
        except Exception as e:
            logger.error(f"❌ 執行資料庫遷移失敗: {e}")
            return False
    
    def _validate_schema(self) -> bool:
        """驗證關鍵表和欄位是否存在"""
        try:
            inspector = inspect(self.engine)
            
            # 檢查關鍵表
            required_tables = [
                'users', 'bots', 'line_bot_users', 'line_bot_user_interactions'
            ]
            
            existing_tables = inspector.get_table_names()
            
            for table in required_tables:
                if table not in existing_tables:
                    logger.error(f"❌ 缺少必要表: {table}")
                    return False
            
            # 檢查 line_bot_user_interactions 表的媒體欄位
            columns = inspector.get_columns('line_bot_user_interactions')
            column_names = [col['name'] for col in columns]
            
            required_columns = ['media_path', 'media_url']
            for column in required_columns:
                if column not in column_names:
                    logger.error(f"❌ line_bot_user_interactions 表缺少欄位: {column}")
                    return False
            
            logger.info("✅ 資料庫結構驗證通過")
            return True
            
        except Exception as e:
            logger.error(f"❌ 資料庫結構驗證失敗: {e}")
            return False
    
    def get_current_revision(self) -> Optional[str]:
        """獲取當前遷移版本"""
        try:
            with self.engine.connect() as conn:
                context = MigrationContext.configure(conn)
                return context.get_current_revision()
        except Exception as e:
            logger.warning(f"獲取當前遷移版本失敗: {e}")
            return None
    
    def get_head_revision(self) -> Optional[str]:
        """獲取最新遷移版本"""
        try:
            alembic_cfg = Config(self.alembic_ini_path)
            script_dir = ScriptDirectory.from_config(alembic_cfg)
            return script_dir.get_current_head()
        except Exception as e:
            logger.warning(f"獲取最新遷移版本失敗: {e}")
            return None
    
    def is_database_up_to_date(self) -> bool:
        """檢查資料庫是否為最新版本"""
        current = self.get_current_revision()
        head = self.get_head_revision()
        return current == head if current and head else False


def init_database_enhanced(database_url: str, project_root: str) -> bool:
    """增強的資料庫初始化函數"""
    alembic_ini_path = os.path.join(project_root, "alembic.ini")
    
    if not os.path.exists(alembic_ini_path):
        logger.error(f"找不到 alembic.ini 文件: {alembic_ini_path}")
        return False
    
    initializer = DatabaseInitializer(database_url, alembic_ini_path)
    return initializer.init_database_complete()


def create_migration_if_needed(database_url: str, project_root: str, message: str = "Auto migration") -> bool:
    """如果需要，自動創建遷移"""
    try:
        alembic_ini_path = os.path.join(project_root, "alembic.ini")
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option("sqlalchemy.url", database_url)
        
        # 檢查是否有未提交的模型更改
        command.revision(alembic_cfg, autogenerate=True, message=message, rev_id=None)
        logger.info("✅ 自動創建遷移完成")
        return True
        
    except Exception as e:
        logger.warning(f"自動創建遷移失敗: {e}")
        return False