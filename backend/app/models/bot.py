"""
Bot 相關的資料模型
"""
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
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
    
    def __repr__(self):
        return f"<Bot(id={self.id}, name={self.name})>"

class FlexMessage(Base):
    """Flex 訊息模型"""
    __tablename__ = "flex_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)  # JSON 字串格式
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    user = relationship("User", back_populates="flex_messages")
    
    def __repr__(self):
        return f"<FlexMessage(id={self.id}, user_id={self.user_id})>"

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
    
    def __repr__(self):
        return f"<BotCode(id={self.id}, bot_id={self.bot_id})>" 