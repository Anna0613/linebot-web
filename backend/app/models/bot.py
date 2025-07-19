"""
Bot 相關的資料模型
"""
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Bot(Base):
    """Bot 模型"""
    __tablename__ = "bots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    channel_token = Column(String(500), nullable=False)
    channel_secret = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    user = relationship("User", back_populates="bots")
    bot_code = relationship("BotCode", back_populates="bot", uselist=False, cascade="all, delete-orphan")
    
    # 表級約束和索引
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='unique_bot_name_per_user'),
        Index('idx_bot_user_created', 'user_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Bot(id={self.id}, name={self.name})>"

class FlexMessage(Base):
    """Flex 訊息模型"""
    __tablename__ = "flex_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, default="Untitled Message")
    content = Column(JSONB, nullable=False)  # 使用 JSONB 提高查詢效能
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    user = relationship("User", back_populates="flex_messages")
    
    # 表級約束和索引
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='unique_flex_message_name_per_user'),
        Index('idx_flex_message_user_created', 'user_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<FlexMessage(id={self.id}, name={self.name})>"

class BotCode(Base):
    """Bot 程式碼模型"""
    __tablename__ = "bot_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    code = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    user = relationship("User", back_populates="bot_codes")
    bot = relationship("Bot", back_populates="bot_code")
    
    # 表級約束和索引
    __table_args__ = (
        UniqueConstraint('bot_id', name='unique_code_per_bot'),
        Index('idx_bot_code_user_updated', 'user_id', 'updated_at'),
    )
    
    def __repr__(self):
        return f"<BotCode(id={self.id}, bot_id={self.bot_id})>" 