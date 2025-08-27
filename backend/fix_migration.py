#!/usr/bin/env python3
"""
修復資料庫遷移狀態並執行媒體欄位遷移
"""
import os
import sys
from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command

# 添加當前目錄到路徑
sys.path.insert(0, os.getcwd())

from app.core.config import get_settings
from app.database import engine

def check_table_structure():
    """檢查表結構"""
    print("檢查 line_bot_user_interactions 表結構...")
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'line_bot_user_interactions' 
            ORDER BY ordinal_position
        """))
        
        columns = result.fetchall()
        if not columns:
            print("❌ 表不存在")
            return False
            
        print("現有欄位:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]}) {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
        
        # 檢查是否有 media_path 和 media_url
        column_names = [col[0] for col in columns]
        has_media_path = 'media_path' in column_names
        has_media_url = 'media_url' in column_names
        
        print(f"\n媒體欄位狀態:")
        print(f"  - media_path: {'✅ 存在' if has_media_path else '❌ 不存在'}")
        print(f"  - media_url: {'✅ 存在' if has_media_url else '❌ 不存在'}")
        
        return has_media_path and has_media_url

def fix_migration_state():
    """修復遷移狀態"""
    print("\n檢查遷移狀態...")
    
    try:
        with engine.connect() as conn:
            # 檢查 alembic_version 表是否存在
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                )
            """))
            
            has_alembic_table = result.scalar()
            
            if not has_alembic_table:
                print("創建 alembic_version 表...")
                conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"))
                conn.commit()
            
            # 檢查當前版本
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            current_version = result.scalar()
            
            print(f"當前遷移版本: {current_version}")
            
            # 設置為 add_line_bot_users (這是最後一個確定存在的遷移)
            if current_version != 'add_line_bot_users':
                print("設置遷移版本為 add_line_bot_users...")
                if current_version:
                    conn.execute(text("UPDATE alembic_version SET version_num = 'add_line_bot_users'"))
                else:
                    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('add_line_bot_users')"))
                conn.commit()
                
    except Exception as e:
        print(f"修復遷移狀態失敗: {e}")
        return False
    
    return True

def add_media_columns():
    """手動添加媒體欄位"""
    print("\n添加媒體欄位...")
    
    try:
        with engine.connect() as conn:
            # 檢查欄位是否已存在
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'line_bot_user_interactions' 
                AND column_name IN ('media_path', 'media_url')
            """))
            existing_columns = [row[0] for row in result]
            
            if 'media_path' not in existing_columns:
                print("添加 media_path 欄位...")
                conn.execute(text("ALTER TABLE line_bot_user_interactions ADD COLUMN media_path VARCHAR(500)"))
            else:
                print("media_path 欄位已存在")
                
            if 'media_url' not in existing_columns:
                print("添加 media_url 欄位...")
                conn.execute(text("ALTER TABLE line_bot_user_interactions ADD COLUMN media_url VARCHAR(500)"))
            else:
                print("media_url 欄位已存在")
            
            conn.commit()
            
            # 在單獨的連接中創建索引（避免事務問題）
            try:
                print("創建索引...")
                with engine.connect() as index_conn:
                    # 設置自動提交模式
                    index_conn.execute(text("SET autocommit = true"))
                    index_conn.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_interaction_media_path 
                        ON line_bot_user_interactions(media_path) 
                        WHERE media_path IS NOT NULL
                    """))
                    print("索引創建成功")
            except Exception as idx_error:
                print(f"創建索引失敗（可能已存在）: {idx_error}")
            
            # 更新遷移版本
            conn.execute(text("UPDATE alembic_version SET version_num = 'add_media_storage_columns'"))
            conn.commit()
            
            print("✅ 媒體欄位添加成功！")
            return True
            
    except Exception as e:
        print(f"❌ 添加媒體欄位失敗: {e}")
        return False

def main():
    print("🔧 開始修復資料庫遷移...")
    
    # 1. 檢查當前表結構
    has_media_columns = check_table_structure()
    
    if has_media_columns:
        print("✅ 媒體欄位已存在，無需遷移")
        return
    
    # 2. 修復遷移狀態
    if not fix_migration_state():
        print("❌ 無法修復遷移狀態")
        return
    
    # 3. 添加媒體欄位
    if add_media_columns():
        print("\n🎉 遷移修復完成！")
        print("現在可以重新啟動應用程序來測試資料更新功能。")
    else:
        print("\n❌ 遷移失敗")

if __name__ == "__main__":
    main()