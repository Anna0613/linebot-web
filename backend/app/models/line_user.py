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
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯關係
    line_bot_user = relationship("LineBotUser", back_populates="interactions")
    
    # 表級約束和索引 - 優化分析查詢效能
    __table_args__ = (
        Index('idx_interaction_user_timestamp', 'line_user_id', 'timestamp'),
        Index('idx_interaction_event_type', 'event_type'),
        Index('idx_interaction_timestamp', 'timestamp'),
        Index('idx_interaction_timestamp_event', 'timestamp', 'event_type'),  # 複合索引用於時間範圍和事件類型查詢
        Index('idx_interaction_time_extract', 'timestamp'),  # 針對時間擷取函數的索引
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