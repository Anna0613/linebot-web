#!/usr/bin/env python3
"""
手動建立資料表的腳本
"""
from sqlalchemy import create_engine, text
import os

DATABASE_URL = 'postgresql://linebot:O3Z0ptKTT59Qk9kkMbWU4ETmx9jXQNfe@dpg-d273kou3jp1c73e48lvg-a.oregon-postgres.render.com/linebot_mf8v'

def create_tables_manually():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # 1. 創建 admin_messages 表
            print("創建 admin_messages 表...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS admin_messages (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
                    line_user_id VARCHAR(255) NOT NULL,
                    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    message_content TEXT NOT NULL,
                    message_type VARCHAR(50) DEFAULT 'text',
                    message_metadata JSONB,
                    sent_status VARCHAR(20) DEFAULT 'pending',
                    line_message_id VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            
            # 2. 為 admin_messages 建立索引
            print("創建 admin_messages 索引...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_admin_message_bot_user ON admin_messages(bot_id, line_user_id);
                CREATE INDEX IF NOT EXISTS idx_admin_message_admin ON admin_messages(admin_user_id);
                CREATE INDEX IF NOT EXISTS idx_admin_message_created ON admin_messages(created_at);
                CREATE INDEX IF NOT EXISTS idx_admin_message_status ON admin_messages(sent_status);
            """))
            
            # 3. 為 line_bot_user_interactions 添加新欄位
            print("添加 line_bot_user_interactions 新欄位...")
            try:
                conn.execute(text("ALTER TABLE line_bot_user_interactions ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'user'"))
                conn.execute(text("ALTER TABLE line_bot_user_interactions ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL"))
            except Exception as e:
                print(f"添加欄位時出現錯誤（可能已存在）: {e}")
            
            # 4. 為新欄位建立索引
            print("創建新欄位索引...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_interaction_sender_type ON line_bot_user_interactions(sender_type);
                CREATE INDEX IF NOT EXISTS idx_interaction_admin_user ON line_bot_user_interactions(admin_user_id);
                CREATE INDEX IF NOT EXISTS idx_interaction_user_sender ON line_bot_user_interactions(line_user_id, sender_type, timestamp);
            """))
            
            # 5. 更新現有記錄的 sender_type
            print("更新現有記錄的 sender_type...")
            conn.execute(text("UPDATE line_bot_user_interactions SET sender_type = 'user' WHERE sender_type IS NULL"))
            
            conn.commit()
            print("✅ 所有表和欄位創建完成！")
            
        except Exception as e:
            print(f"❌ 創建失敗: {e}")
            conn.rollback()

if __name__ == "__main__":
    create_tables_manually()