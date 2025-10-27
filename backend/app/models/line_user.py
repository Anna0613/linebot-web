"""
LINE Bot 用戶互動記錄模型
"""
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class LineBotUser(Base):
    """LINE Bot 用戶記錄模型"""
    __tablename__ = "line_bot_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    line_user_id = Column(String(255), nullable=False)  # LINE 平台的用戶 ID
    display_name = Column(String(255))
    picture_url = Column(Text)
    status_message = Column(Text)
    language = Column(String(10))
    is_followed = Column(Boolean, default=True)  # 是否還在關注
    first_interaction = Column(DateTime(timezone=True), server_default=func.now())
    last_interaction = Column(DateTime(timezone=True), server_default=func.now())
    interaction_count = Column(String(50), default="1")  # 互動次數
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    bot = relationship("Bot", back_populates="line_bot_users")
    
    # 表級約束和索引 - 優化查詢效能
    __table_args__ = (
        Index('idx_line_user_bot_line_id', 'bot_id', 'line_user_id', unique=True),
        Index('idx_line_user_last_interaction', 'last_interaction'),
        Index('idx_line_user_followed', 'is_followed'),
        Index('idx_line_user_bot_followed', 'bot_id', 'is_followed'),  # 複合索引用於 Bot 用戶統計
        Index('idx_line_user_bot_interaction', 'bot_id', 'last_interaction'),  # 複合索引用於活躍用戶查詢
    )
    
    def __repr__(self):
        return f"<LineBotUser(line_user_id={self.line_user_id}, display_name={self.display_name})>"


class RichMenu(Base):
    """Rich Menu 模型"""
    __tablename__ = "rich_menus"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    line_rich_menu_id = Column(String(255))  # LINE 平台的 Rich Menu ID
    name = Column(String(255), nullable=False)
    chat_bar_text = Column(String(14), nullable=False)  # Rich Menu 的聊天條文字
    selected = Column(Boolean, default=False)  # 是否為選中的 Rich Menu
    size = Column(JSONB, nullable=False)  # {"width": 2500, "height": 1686}
    areas = Column(JSONB, nullable=False)  # Rich Menu 的區域設定
    image_url = Column(Text)  # Rich Menu 圖片 URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    bot = relationship("Bot", back_populates="rich_menus")
    
    # 表級約束和索引
    __table_args__ = (
        Index('idx_rich_menu_bot_id', 'bot_id'),
        Index('idx_rich_menu_selected', 'bot_id', 'selected'),
    )
    
    def __repr__(self):
        return f"<RichMenu(name={self.name}, selected={self.selected})>"

class AdminMessage(Base):
    """管理者發送訊息記錄模型"""
    __tablename__ = "admin_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    line_user_id = Column(String(255), nullable=False)  # LINE 平台的用戶 ID
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 發送訊息的管理者
    message_content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")  # text, image, audio, video, file, location, sticker
    message_metadata = Column(JSONB)  # 額外的訊息資訊（如媒體URL等）
    sent_status = Column(String(20), default="pending")  # pending, sent, failed
    line_message_id = Column(String(255))  # LINE 平台返回的訊息 ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 關聯關係
    bot = relationship("Bot", back_populates="admin_messages")
    admin_user = relationship("User", back_populates="admin_messages")
    
    # 表級約束和索引
    __table_args__ = (
        Index('idx_admin_message_bot_user', 'bot_id', 'line_user_id'),
        Index('idx_admin_message_admin', 'admin_user_id'),
        Index('idx_admin_message_created', 'created_at'),
        Index('idx_admin_message_status', 'sent_status'),
    )
    
    def __repr__(self):
        return f"<AdminMessage(line_user_id={self.line_user_id}, message_type={self.message_type})>"