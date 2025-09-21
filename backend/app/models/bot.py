"""
Bot 相關的資料模型
"""
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Index, UniqueConstraint, Boolean
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
    # AI 接管開關（預設關閉），以及 AI 模型設定
    ai_takeover_enabled = Column(Boolean, nullable=False, server_default='false')
    ai_model_provider = Column(String(50), nullable=True, server_default='groq')
    ai_model = Column(String(255), nullable=True)
    
    # 關聯關係
    user = relationship("User", back_populates="bots")
    bot_code = relationship("BotCode", back_populates="bot", uselist=False, cascade="all, delete-orphan")
    logic_templates = relationship("LogicTemplate", back_populates="bot", cascade="all, delete-orphan")
    
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
    content = Column(JSONB, nullable=False)  # 編譯後的合法 Flex JSON（bubble/carousel）
    design_blocks = Column(JSONB, nullable=True)  # 編輯器 blocks（可選，併行儲存）
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

class LogicTemplate(Base):
    """邏輯模板模型"""
    __tablename__ = "logic_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, default="主要邏輯")
    description = Column(Text, nullable=True)
    logic_blocks = Column(JSONB, nullable=False, default=list)  # 邏輯積木數據
    is_active = Column(String(10), nullable=False, default="false")  # 是否為活躍邏輯
    generated_code = Column(Text, nullable=True)  # 生成的程式碼
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    user = relationship("User", back_populates="logic_templates")
    bot = relationship("Bot", back_populates="logic_templates")
    
    # 表級約束和索引
    __table_args__ = (
        UniqueConstraint('bot_id', 'name', name='unique_logic_template_name_per_bot'),
        Index('idx_logic_template_user_created', 'user_id', 'created_at'),
        Index('idx_logic_template_bot_active', 'bot_id', 'is_active'),
    )
    
    def __repr__(self):
        return f"<LogicTemplate(id={self.id}, name={self.name}, bot_id={self.bot_id})>"

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
