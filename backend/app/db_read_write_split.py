"""
資料庫讀寫分離模組
提供主從庫連線管理和自動路由功能
"""
from __future__ import annotations

import logging
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine, AsyncEngine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, Engine, text
from sqlalchemy.exc import OperationalError
import tenacity

from .config import settings

logger = logging.getLogger(__name__)


class DatabaseRole(str, Enum):
    """資料庫角色"""
    PRIMARY = "primary"  # 主庫（寫入）
    REPLICA = "replica"  # 從庫（讀取）


class DatabaseConnectionManager:
    """資料庫連線管理器 - 支援讀寫分離"""
    
    def __init__(self):
        self._primary_engine: Optional[Engine] = None
        self._replica_engine: Optional[Engine] = None
        self._async_primary_engine: Optional[AsyncEngine] = None
        self._async_replica_engine: Optional[AsyncEngine] = None
        self._primary_session_factory: Optional[sessionmaker] = None
        self._replica_session_factory: Optional[sessionmaker] = None
        self._async_primary_session_factory: Optional[async_sessionmaker] = None
        self._async_replica_session_factory: Optional[async_sessionmaker] = None
        self._initialized = False
    
    def _create_engine_config(self) -> dict:
        """建立引擎配置（共用設定）"""
        return {
            "pool_pre_ping": True,
            "pool_recycle": 1800,
            "pool_size": 25,
            "max_overflow": 50,
            "pool_timeout": 20,
            "echo": settings.SQL_ECHO,
            "connect_args": {
                "application_name": "linebot-web-api",
                "keepalives_idle": "600",
                "keepalives_interval": "30",
                "keepalives_count": "3",
                "tcp_user_timeout": "30000",
            },
            "execution_options": {
                "postgresql_readonly": False,
                "postgresql_autocommit": False,
                "compiled_cache": {},
            }
        }
    
    def _build_async_url(self, url: str) -> str:
        """轉換為 asyncpg URL"""
        if url.startswith("postgresql+asyncpg://"):
            return url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    def initialize(self):
        """初始化資料庫連線"""
        if self._initialized:
            logger.warning("資料庫連線管理器已初始化，跳過重複初始化")
            return
        
        try:
            # 建立主庫連線
            engine_config = self._create_engine_config()
            self._primary_engine = create_engine(settings.DATABASE_URL, **engine_config)
            self._primary_session_factory = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self._primary_engine
            )
            logger.info("✅ 主庫（寫入）連線已建立")
            
            # 建立主庫 async 連線
            async_url = self._build_async_url(settings.DATABASE_URL)
            async_config = {
                "pool_pre_ping": True,
                "pool_size": 25,
                "max_overflow": 50,
                "pool_recycle": 1800,
                "echo": settings.SQL_ECHO,
            }
            self._async_primary_engine = create_async_engine(async_url, **async_config)
            self._async_primary_session_factory = async_sessionmaker(
                bind=self._async_primary_engine,
                expire_on_commit=False,
                class_=AsyncSession,
            )
            logger.info("✅ 主庫（寫入）async 連線已建立")
            
            # 如果啟用讀寫分離且有從庫設定，建立從庫連線
            if settings.ENABLE_READ_WRITE_SPLITTING and settings.DATABASE_REPLICA_URL:
                try:
                    # 建立從庫連線
                    replica_config = self._create_engine_config()
                    # 從庫設為唯讀模式
                    replica_config["execution_options"]["postgresql_readonly"] = True
                    
                    self._replica_engine = create_engine(
                        settings.DATABASE_REPLICA_URL, 
                        **replica_config
                    )
                    self._replica_session_factory = sessionmaker(
                        autocommit=False, 
                        autoflush=False, 
                        bind=self._replica_engine
                    )
                    logger.info("✅ 從庫（讀取）連線已建立")
                    
                    # 建立從庫 async 連線
                    async_replica_url = self._build_async_url(settings.DATABASE_REPLICA_URL)
                    self._async_replica_engine = create_async_engine(
                        async_replica_url, 
                        **async_config
                    )
                    self._async_replica_session_factory = async_sessionmaker(
                        bind=self._async_replica_engine,
                        expire_on_commit=False,
                        class_=AsyncSession,
                    )
                    logger.info("✅ 從庫（讀取）async 連線已建立")
                    
                    # 測試從庫連線
                    self._check_replica_connection()
                    
                except Exception as e:
                    logger.warning(f"⚠️ 從庫連線建立失敗，將使用主庫處理所有請求: {e}")
                    self._replica_engine = None
                    self._replica_session_factory = None
                    self._async_replica_engine = None
                    self._async_replica_session_factory = None
            else:
                logger.info("ℹ️ 讀寫分離功能未啟用，所有操作將使用主庫")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"❌ 資料庫連線初始化失敗: {e}")
            raise
    
    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_fixed(2),
        retry=tenacity.retry_if_exception_type(OperationalError),
        before_sleep=lambda retry_state: logger.debug(f"重試從庫連接: 第 {retry_state.attempt_number} 次嘗試")
    )
    def _check_replica_connection(self):
        """檢查從庫連線"""
        if self._replica_engine:
            with self._replica_engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("✅ 從庫連線測試成功")
    
    def get_engine(self, role: DatabaseRole = DatabaseRole.PRIMARY) -> Engine:
        """取得資料庫引擎"""
        if not self._initialized:
            self.initialize()
        
        if role == DatabaseRole.REPLICA and self._replica_engine:
            return self._replica_engine
        return self._primary_engine
    
    def get_async_engine(self, role: DatabaseRole = DatabaseRole.PRIMARY) -> AsyncEngine:
        """取得 async 資料庫引擎"""
        if not self._initialized:
            self.initialize()
        
        if role == DatabaseRole.REPLICA and self._async_replica_engine:
            return self._async_replica_engine
        return self._async_primary_engine
    
    def get_session_factory(self, role: DatabaseRole = DatabaseRole.PRIMARY) -> sessionmaker:
        """取得 session factory"""
        if not self._initialized:
            self.initialize()
        
        if role == DatabaseRole.REPLICA and self._replica_session_factory:
            return self._replica_session_factory
        return self._primary_session_factory
    
    def get_async_session_factory(self, role: DatabaseRole = DatabaseRole.PRIMARY) -> async_sessionmaker:
        """取得 async session factory"""
        if not self._initialized:
            self.initialize()
        
        if role == DatabaseRole.REPLICA and self._async_replica_session_factory:
            return self._async_replica_session_factory
        return self._async_primary_session_factory
    
    def is_read_write_splitting_enabled(self) -> bool:
        """檢查讀寫分離是否啟用且可用"""
        return (
            self._initialized and 
            settings.ENABLE_READ_WRITE_SPLITTING and 
            self._replica_engine is not None
        )
    
    async def close(self):
        """關閉所有資料庫連線"""
        if self._async_primary_engine:
            await self._async_primary_engine.dispose()
            logger.info("主庫 async 連線已關閉")
        
        if self._async_replica_engine:
            await self._async_replica_engine.dispose()
            logger.info("從庫 async 連線已關閉")
        
        if self._primary_engine:
            self._primary_engine.dispose()
            logger.info("主庫連線已關閉")
        
        if self._replica_engine:
            self._replica_engine.dispose()
            logger.info("從庫連線已關閉")
        
        self._initialized = False


# 全域連線管理器實例
db_manager = DatabaseConnectionManager()


# 向後相容的函數
def get_db(use_replica: bool = False):
    """
    取得資料庫 session（同步版本）
    
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


async def get_async_db(use_replica: bool = False) -> AsyncGenerator[AsyncSession, None]:
    """
    取得 async 資料庫 session
    
    Args:
        use_replica: 是否使用從庫（僅用於讀取操作）
    """
    role = DatabaseRole.REPLICA if use_replica else DatabaseRole.PRIMARY
    session_factory = db_manager.get_async_session_factory(role)
    
    async with session_factory() as session:
        try:
            yield session
        finally:
            pass


@asynccontextmanager
async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    """取得讀取專用的 session（優先使用從庫）"""
    async for session in get_async_db(use_replica=True):
        yield session


@asynccontextmanager
async def get_write_session() -> AsyncGenerator[AsyncSession, None]:
    """取得寫入專用的 session（必定使用主庫）"""
    async for session in get_async_db(use_replica=False):
        yield session

