#!/usr/bin/env python3
"""
資料庫索引優化遷移腳本
為 LineBotUser 和 LineBotUserInteraction 表添加複合索引以提升查詢效能
"""

import asyncio
import asyncpg
import os
from app.config import settings

# 索引創建 SQL 語句
INDEX_STATEMENTS = [
    # LineBotUser 表的複合索引
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_line_user_bot_followed 
    ON line_bot_users (bot_id, is_followed);
    """,
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_line_user_bot_interaction 
    ON line_bot_users (bot_id, last_interaction);
    """,
    
    # LineBotUserInteraction 表的複合索引
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interaction_timestamp_event 
    ON line_bot_user_interactions (timestamp, event_type);
    """,
    
    # 針對時間函數查詢的索引
    """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interaction_hour_extract 
    ON line_bot_user_interactions (EXTRACT(HOUR FROM timestamp));
    """,
]

async def create_indexes():
    """創建索引以提升查詢效能"""
    try:
        # 連接資料庫
        conn = await asyncpg.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD,
            database=settings.DATABASE_NAME
        )
        
        print("📊 開始創建效能優化索引...")
        
        for i, statement in enumerate(INDEX_STATEMENTS, 1):
            try:
                print(f"🔄 創建索引 {i}/{len(INDEX_STATEMENTS)}...")
                await conn.execute(statement)
                print(f"✅ 索引 {i} 創建成功")
            except Exception as e:
                print(f"⚠️  索引 {i} 可能已存在或創建失敗: {e}")
        
        await conn.close()
        print("🎉 索引優化完成！")
        
    except Exception as e:
        print(f"❌ 索引創建失敗: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_indexes())