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
    bot = relationship("Bot", backref="line_bot_users")
    interactions = relationship("LineBotUserInteraction", back_populates="line_bot_user", cascade="all, delete-orphan")
    
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

class LineBotUserInteraction(Base):
    """LINE Bot 用戶互動記錄模型"""
    __tablename__ = "line_bot_user_interactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    line_user_id = Column(UUID(as_uuid=True), ForeignKey("line_bot_users.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # message, follow, unfollow, postback, etc.
    message_type = Column(String(50))  # text, image, audio, video, file, location, sticker
    message_content = Column(JSONB)  # 訊息內容的 JSON
    media_path = Column(String(500))  # MinIO 媒體檔案路徑
    media_url = Column(String(500))   # 媒體檔案公開訪問 URL
    sender_type = Column(String(20), default="user")  # user, admin - 用來區分是用戶發送還是管理者發送
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # 如果是管理者發送，記錄管理者ID
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯關係
    line_bot_user = relationship("LineBotUser", back_populates="interactions")
    admin_user = relationship("User", backref="sent_interactions")  # 管理者發送的互動記錄
    
    # 表級約束和索引 - 優化分析查詢效能
    __table_args__ = (
        Index('idx_interaction_user_timestamp', 'line_user_id', 'timestamp'),
        Index('idx_interaction_event_type', 'event_type'),
        Index('idx_interaction_timestamp', 'timestamp'),
        Index('idx_interaction_timestamp_event', 'timestamp', 'event_type'),  # 複合索引用於時間範圍和事件類型查詢
        Index('idx_interaction_time_extract', 'timestamp'),  # 針對時間擷取函數的索引
        Index('idx_interaction_sender_type', 'sender_type'),  # 新增：發送者類型索引
        Index('idx_interaction_admin_user', 'admin_user_id'),  # 新增：管理者用戶索引
        Index('idx_interaction_user_sender', 'line_user_id', 'sender_type', 'timestamp'),  # 新增：複合索引用於聊天記錄查詢
    )
    
    def __repr__(self):
        return f"<LineBotUserInteraction(event_type={self.event_type}, timestamp={self.timestamp})>"

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
    bot = relationship("Bot", backref="rich_menus")
    
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
    bot = relationship("Bot", backref="admin_messages")
    admin_user = relationship("User", backref="admin_messages")
    
    # 表級約束和索引
    __table_args__ = (
        Index('idx_admin_message_bot_user', 'bot_id', 'line_user_id'),
        Index('idx_admin_message_admin', 'admin_user_id'),
        Index('idx_admin_message_created', 'created_at'),
        Index('idx_admin_message_status', 'sent_status'),
    )
    
    def __repr__(self):
        return f"<AdminMessage(line_user_id={self.line_user_id}, message_type={self.message_type})>"