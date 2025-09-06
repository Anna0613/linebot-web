#!/usr/bin/env python3
"""
PostgreSQL 對話資料遷移到 MongoDB 腳本

使用方法:
python scripts/migrate_conversations_to_mongo.py [選項]

選項:
--batch-size: 批次大小 (預設: 100)
--dry-run: 乾跑模式，不實際寫入 MongoDB
--bot-id: 只遷移特定 Bot 的資料
--verbose: 詳細日誌模式
--backup: 是否建立 PostgreSQL 備份
"""

import sys
import os
import argparse
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import defaultdict

# 添加專案根目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import create_engine, text
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.database import get_db
from app.database_mongo import init_mongodb
from app.models.line_user import LineBotUser
from app.models.user import User
from app.models.mongodb.conversation import ConversationDocument, MessageDocument, AdminUserInfo

# 為遷移創建臨時的 LineBotUserInteraction 模型（從已刪除的模型重建）
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class LineBotUserInteraction(Base):
    """臨時的 LINE Bot 用戶互動記錄模型（僅用於遷移）"""
    __tablename__ = "line_bot_user_interactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    line_user_id = Column(UUID(as_uuid=True), ForeignKey("line_bot_users.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)
    message_type = Column(String(50))
    message_content = Column(JSONB)
    media_path = Column(String(500))
    media_url = Column(String(500))
    sender_type = Column(String(20), default="user")
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯關係
    line_bot_user = relationship("LineBotUser")
    admin_user = relationship("User")
    
    def __repr__(self):
        return f"<LineBotUserInteraction(event_type={self.event_type}, timestamp={self.timestamp})>"

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class MigrationStats:
    """遷移統計資訊"""
    def __init__(self):
        self.total_interactions = 0
        self.total_conversations = 0
        self.migrated_conversations = 0
        self.migrated_messages = 0
        self.errors = 0
        self.skipped = 0
        self.start_time = datetime.now()
    
    def print_progress(self):
        """列印進度資訊"""
        elapsed = datetime.now() - self.start_time
        logger.info(f"進度: {self.migrated_conversations}/{self.total_conversations} 對話, "
                   f"{self.migrated_messages}/{self.total_interactions} 訊息, "
                   f"錯誤: {self.errors}, 跳過: {self.skipped}, "
                   f"用時: {elapsed}")


class ConversationMigrator:
    """對話遷移器"""
    
    def __init__(self, batch_size: int = 100, dry_run: bool = False, verbose: bool = False):
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.verbose = verbose
        self.stats = MigrationStats()
        self.db_engine = None
        self.mongo_client = None
    
    async def initialize(self):
        """初始化資料庫連接"""
        try:
            # 初始化 PostgreSQL 連接
            from app.database import engine
            self.db_engine = engine
            
            # 初始化 MongoDB 連接
            await init_mongodb()
            self.mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
            
            # 初始化 Beanie ODM
            await init_beanie(
                database=self.mongo_client[settings.MONGODB_DATABASE],
                document_models=[ConversationDocument]
            )
            
            logger.info("資料庫連接初始化完成")
            
        except Exception as e:
            logger.error(f"初始化失敗: {e}")
            raise
    
    def get_postgresql_stats(self, bot_id: Optional[str] = None) -> Dict[str, int]:
        """獲取 PostgreSQL 統計資訊"""
        with Session(self.db_engine) as db:
            # 統計對話數量（按 bot_id + line_user_id 分組）
            query = db.query(LineBotUserInteraction.line_user_id).distinct()
            if bot_id:
                query = query.join(LineBotUser).filter(LineBotUser.bot_id == bot_id)
            
            conversation_count = query.count()
            
            # 統計訊息總數
            query = db.query(LineBotUserInteraction)
            if bot_id:
                query = query.join(LineBotUser).filter(LineBotUser.bot_id == bot_id)
            
            message_count = query.count()
            
            return {
                "conversations": conversation_count,
                "messages": message_count
            }
    
    def fetch_interactions_batch(
        self, 
        db: Session, 
        offset: int, 
        limit: int,
        bot_id: Optional[str] = None
    ) -> List[LineBotUserInteraction]:
        """分批獲取互動記錄"""
        query = db.query(LineBotUserInteraction).options(
            joinedload(LineBotUserInteraction.line_bot_user),
            joinedload(LineBotUserInteraction.admin_user)
        ).order_by(LineBotUserInteraction.timestamp)
        
        if bot_id:
            query = query.join(LineBotUser).filter(LineBotUser.bot_id == bot_id)
        
        return query.offset(offset).limit(limit).all()
    
    def group_interactions_by_conversation(
        self, 
        interactions: List[LineBotUserInteraction]
    ) -> Dict[tuple, List[LineBotUserInteraction]]:
        """按對話分組互動記錄"""
        conversations = defaultdict(list)
        
        for interaction in interactions:
            if interaction.line_bot_user:
                key = (interaction.line_bot_user.bot_id, interaction.line_bot_user.line_user_id)
                conversations[key].append(interaction)
        
        return conversations
    
    def convert_interaction_to_message(self, interaction: LineBotUserInteraction) -> MessageDocument:
        """轉換 PostgreSQL 互動記錄為 MongoDB 訊息格式"""
        # 處理管理者資訊
        admin_user = None
        if interaction.sender_type == "admin" and interaction.admin_user:
            admin_user = AdminUserInfo(
                id=str(interaction.admin_user.id),
                username=interaction.admin_user.username or "unknown",
                full_name=getattr(interaction.admin_user, 'full_name', interaction.admin_user.username)
            )
        
        # 處理訊息內容
        content = interaction.message_content or {}
        if isinstance(content, str):
            try:
                import json
                content = json.loads(content)
            except json.JSONDecodeError:
                content = {"text": content}
        
        return MessageDocument(
            id=str(interaction.id),
            event_type=interaction.event_type or "message",
            message_type=interaction.message_type or "text",
            content=content,
            sender_type=interaction.sender_type or "user",
            admin_user=admin_user,
            timestamp=interaction.timestamp or datetime.utcnow(),
            media_url=interaction.media_url,
            media_path=interaction.media_path
        )
    
    async def migrate_conversation(
        self, 
        bot_id: str, 
        line_user_id: str, 
        interactions: List[LineBotUserInteraction]
    ) -> bool:
        """遷移單個對話"""
        try:
            if self.verbose:
                logger.info(f"遷移對話: bot_id={bot_id}, line_user_id={line_user_id}, messages={len(interactions)}")
            
            # 檢查是否已存在
            existing = await ConversationDocument.find_one({
                "bot_id": str(bot_id),
                "line_user_id": str(line_user_id)
            })
            
            if existing:
                logger.warning(f"對話已存在，跳過: {bot_id}/{line_user_id}")
                self.stats.skipped += 1
                return True
            
            # 轉換訊息
            messages = []
            for interaction in interactions:
                try:
                    message = self.convert_interaction_to_message(interaction)
                    messages.append(message)
                except Exception as e:
                    logger.error(f"轉換訊息失敗: {interaction.id}, 錯誤: {e}")
                    self.stats.errors += 1
                    continue
            
            if not messages:
                logger.warning(f"沒有有效訊息，跳過對話: {bot_id}/{line_user_id}")
                self.stats.skipped += 1
                return True
            
            # 按時間排序
            messages.sort(key=lambda x: x.timestamp)
            
            # 創建對話文檔
            conversation = ConversationDocument(
                bot_id=str(bot_id),
                line_user_id=str(line_user_id),
                messages=messages,
                created_at=messages[0].timestamp if messages else datetime.utcnow(),
                updated_at=messages[-1].timestamp if messages else datetime.utcnow()
            )
            
            # 保存到 MongoDB
            if not self.dry_run:
                await conversation.save()
            
            self.stats.migrated_conversations += 1
            self.stats.migrated_messages += len(messages)
            
            if self.verbose:
                logger.info(f"對話遷移成功: {bot_id}/{line_user_id}, 訊息數: {len(messages)}")
            
            return True
            
        except Exception as e:
            logger.error(f"遷移對話失敗: {bot_id}/{line_user_id}, 錯誤: {e}")
            self.stats.errors += 1
            return False
    
    async def run_migration(self, bot_id: Optional[str] = None):
        """執行遷移"""
        try:
            await self.initialize()
            
            # 獲取統計資訊
            pg_stats = self.get_postgresql_stats(bot_id)
            self.stats.total_conversations = pg_stats["conversations"]
            self.stats.total_interactions = pg_stats["messages"]
            
            logger.info(f"開始遷移 - 對話數: {self.stats.total_conversations}, 訊息數: {self.stats.total_interactions}")
            
            if self.dry_run:
                logger.info("乾跑模式 - 不會實際寫入 MongoDB")
            
            # 分批處理
            offset = 0
            with Session(self.db_engine) as db:
                while offset < self.stats.total_interactions:
                    # 獲取批次資料
                    interactions = self.fetch_interactions_batch(db, offset, self.batch_size, bot_id)
                    
                    if not interactions:
                        break
                    
                    # 按對話分組
                    conversations = self.group_interactions_by_conversation(interactions)
                    
                    # 遷移每個對話
                    for (conv_bot_id, conv_line_user_id), conv_interactions in conversations.items():
                        await self.migrate_conversation(conv_bot_id, conv_line_user_id, conv_interactions)
                    
                    offset += self.batch_size
                    
                    # 列印進度
                    if offset % (self.batch_size * 10) == 0:
                        self.stats.print_progress()
            
            # 最終統計
            elapsed = datetime.now() - self.stats.start_time
            logger.info(f"遷移完成！")
            logger.info(f"總對話數: {self.stats.migrated_conversations}")
            logger.info(f"總訊息數: {self.stats.migrated_messages}")
            logger.info(f"錯誤數: {self.stats.errors}")
            logger.info(f"跳過數: {self.stats.skipped}")
            logger.info(f"總耗時: {elapsed}")
            
            if self.stats.errors > 0:
                logger.warning(f"發生 {self.stats.errors} 個錯誤，請檢查日誌")
            
        except Exception as e:
            logger.error(f"遷移失敗: {e}")
            raise
        finally:
            # 清理資源
            if self.mongo_client:
                self.mongo_client.close()


async def main():
    """主函數"""
    parser = argparse.ArgumentParser(description='PostgreSQL 對話資料遷移到 MongoDB')
    parser.add_argument('--batch-size', type=int, default=100, help='批次大小 (預設: 100)')
    parser.add_argument('--dry-run', action='store_true', help='乾跑模式，不實際寫入 MongoDB')
    parser.add_argument('--bot-id', type=str, help='只遷移特定 Bot 的資料')
    parser.add_argument('--verbose', action='store_true', help='詳細日誌模式')
    
    args = parser.parse_args()
    
    # 設置日誌級別
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
    
    try:
        # 創建遷移器
        migrator = ConversationMigrator(
            batch_size=args.batch_size,
            dry_run=args.dry_run,
            verbose=args.verbose
        )
        
        # 執行遷移
        await migrator.run_migration(args.bot_id)
        
        logger.info("遷移腳本執行完成")
        
    except KeyboardInterrupt:
        logger.info("遷移被用戶中斷")
    except Exception as e:
        logger.error(f"遷移腳本執行失敗: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())