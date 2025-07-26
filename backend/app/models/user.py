"""
用戶相關的資料模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    """用戶模型"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password = Column(String(255), nullable=False)
    email_verified = Column(Boolean, default=False)
    avatar_base64 = Column(Text)
    avatar_updated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_verification_sent = Column(DateTime(timezone=True))
    
    # 關聯關係
    line_account = relationship("LineUser", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bots = relationship("Bot", back_populates="user", cascade="all, delete-orphan")
    flex_messages = relationship("FlexMessage", back_populates="user", cascade="all, delete-orphan")
    bot_codes = relationship("BotCode", back_populates="user", cascade="all, delete-orphan")
    logic_templates = relationship("LogicTemplate", back_populates="user", cascade="all, delete-orphan")

    # 複合索引
    __table_args__ = (
        Index('idx_user_email_verified', 'email', 'email_verified'),
        Index('idx_user_created_verified', 'created_at', 'email_verified'),
    )

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"

class LineUser(Base):
    """LINE 用戶模型"""
    __tablename__ = "line_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    line_id = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255))
    picture_url = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯關係
    user = relationship("User", back_populates="line_account")
    
    def __repr__(self):
        return f"<LineUser(id={self.id}, display_name={self.display_name})>" 