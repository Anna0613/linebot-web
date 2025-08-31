#!/usr/bin/env python3
"""
調試模型和資料庫連接
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

def test_model_imports():
    print("=== 測試模型導入 ===")
    
    try:
        from app.models.line_user import LineBotUser, LineBotUserInteraction, AdminMessage
        print("✅ 模型導入成功")
        
        # 檢查模型屬性
        print(f"LineBotUserInteraction 屬性: {[attr for attr in dir(LineBotUserInteraction) if not attr.startswith('_')]}")
        
        # 檢查是否有新欄位
        if hasattr(LineBotUserInteraction, 'sender_type'):
            print("✅ sender_type 欄位存在")
        else:
            print("❌ sender_type 欄位不存在")
            
        if hasattr(LineBotUserInteraction, 'admin_user_id'):
            print("✅ admin_user_id 欄位存在")
        else:
            print("❌ admin_user_id 欄位不存在")
            
    except Exception as e:
        print(f"❌ 模型導入失敗: {e}")

def test_database_connection():
    print("\n=== 測試資料庫連接 ===")
    
    try:
        from app.database import get_db
        from sqlalchemy import create_engine, text
        
        # 測試基本連接
        DATABASE_URL = 'postgresql://linebot:O3Z0ptKTT59Qk9kkMbWU4ETmx9jXQNfe@dpg-d273kou3jp1c73e48lvg-a.oregon-postgres.render.com/linebot_mf8v'
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ 資料庫連接成功")
            
            # 檢查表是否存在
            tables_to_check = ['line_bot_users', 'line_bot_user_interactions', 'admin_messages']
            for table in tables_to_check:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table} LIMIT 1"))
                    print(f"✅ 表 {table} 存在")
                except Exception as e:
                    print(f"❌ 表 {table} 不存在或有問題: {e}")
                    
    except Exception as e:
        print(f"❌ 資料庫連接失敗: {e}")

def test_specific_query():
    print("\n=== 測試具體查詢 ===")
    
    try:
        from app.models.line_user import LineBotUser, LineBotUserInteraction
        from app.database import get_db
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        
        DATABASE_URL = 'postgresql://linebot:O3Z0ptKTT59Qk9kkMbWU4ETmx9jXQNfe@dpg-d273kou3jp1c73e48lvg-a.oregon-postgres.render.com/linebot_mf8v'
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as db:
            # 測試查找用戶
            bot_id = "aec8a05f-6439-4470-8db5-c37310557911"
            user_id = "U923be0318da6ec3c998de3288e851de3"
            
            line_user = db.query(LineBotUser).filter(
                LineBotUser.bot_id == bot_id,
                LineBotUser.line_user_id == user_id
            ).first()
            
            if line_user:
                print(f"✅ 找到用戶: {line_user.display_name}")
                
                # 測試查詢互動記錄
                interactions = db.query(LineBotUserInteraction).filter(
                    LineBotUserInteraction.line_user_id == line_user.id
                ).limit(5).all()
                
                print(f"✅ 找到 {len(interactions)} 條互動記錄")
                
                for interaction in interactions:
                    print(f"  - 記錄: {interaction.event_type}, sender_type: {getattr(interaction, 'sender_type', 'N/A')}")
                    
            else:
                print(f"❌ 找不到用戶 {user_id}")
                
    except Exception as e:
        print(f"❌ 查詢測試失敗: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_model_imports()
    test_database_connection()
    test_specific_query()