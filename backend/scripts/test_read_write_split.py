"""
測試資料庫讀寫分離功能
"""
import asyncio
import sys
import os

# 添加專案根目錄到 Python 路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.config import settings
from app.db_read_write_split import db_manager, DatabaseRole
from app.db_session_context import ReadWriteSession, SessionContext
from sqlalchemy import text


async def test_configuration():
    """測試配置"""
    print("\n" + "="*60)
    print("測試 1: 檢查配置")
    print("="*60)
    
    print(f"✓ 讀寫分離啟用: {settings.ENABLE_READ_WRITE_SPLITTING}")
    print(f"✓ 主庫 URL: {settings.DATABASE_URL}")
    print(f"✓ 從庫 URL: {settings.DATABASE_REPLICA_URL}")
    
    if settings.ENABLE_READ_WRITE_SPLITTING:
        if settings.DATABASE_REPLICA_URL:
            print("✅ 讀寫分離配置正確")
        else:
            print("⚠️  讀寫分離已啟用但未配置從庫 URL")
    else:
        print("ℹ️  讀寫分離功能未啟用")


async def test_connection_manager():
    """測試連線管理器"""
    print("\n" + "="*60)
    print("測試 2: 檢查連線管理器")
    print("="*60)
    
    # 確保已初始化
    if not db_manager._initialized:
        db_manager.initialize()
    
    print(f"✓ 連線管理器已初始化: {db_manager._initialized}")
    print(f"✓ 讀寫分離可用: {db_manager.is_read_write_splitting_enabled()}")
    
    # 測試主庫連線
    try:
        primary_engine = db_manager.get_async_engine(DatabaseRole.PRIMARY)
        async with primary_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"✅ 主庫連線測試成功: {row[0]}")
    except Exception as e:
        print(f"❌ 主庫連線測試失敗: {e}")
    
    # 測試從庫連線（如果啟用）
    if db_manager.is_read_write_splitting_enabled():
        try:
            replica_engine = db_manager.get_async_engine(DatabaseRole.REPLICA)
            async with replica_engine.connect() as conn:
                result = await conn.execute(text("SELECT 1 as test"))
                row = result.fetchone()
                print(f"✅ 從庫連線測試成功: {row[0]}")
        except Exception as e:
            print(f"❌ 從庫連線測試失敗: {e}")
    else:
        print("ℹ️  從庫未啟用，跳過從庫連線測試")


async def test_session_routing():
    """測試 Session 路由"""
    print("\n" + "="*60)
    print("測試 3: 測試 Session 路由")
    print("="*60)
    
    # 測試讀取 session
    try:
        async with ReadWriteSession.read() as db:
            result = await db.execute(text("SELECT current_database() as db_name"))
            row = result.fetchone()
            print(f"✅ 讀取 Session 測試成功，資料庫: {row[0]}")
    except Exception as e:
        print(f"❌ 讀取 Session 測試失敗: {e}")
    
    # 測試寫入 session
    try:
        async with ReadWriteSession.write() as db:
            result = await db.execute(text("SELECT current_database() as db_name"))
            row = result.fetchone()
            print(f"✅ 寫入 Session 測試成功，資料庫: {row[0]}")
    except Exception as e:
        print(f"❌ 寫入 Session 測試失敗: {e}")


async def test_transaction_consistency():
    """測試事務一致性"""
    print("\n" + "="*60)
    print("測試 4: 測試事務一致性")
    print("="*60)
    
    # 重置上下文
    SessionContext.reset()
    
    # 檢查初始狀態
    has_write = SessionContext.has_write_operation()
    print(f"✓ 初始狀態 - 有寫入操作: {has_write}")
    
    # 執行寫入操作
    async with ReadWriteSession.write() as db:
        result = await db.execute(text("SELECT 1"))
        print(f"✓ 執行寫入操作")
    
    # 檢查寫入後狀態
    has_write = SessionContext.has_write_operation()
    print(f"✓ 寫入後狀態 - 有寫入操作: {has_write}")
    
    if has_write:
        print("✅ 事務一致性標記正常工作")
    else:
        print("⚠️  事務一致性標記可能未正常工作")
    
    # 重置上下文
    SessionContext.reset()
    has_write = SessionContext.has_write_operation()
    print(f"✓ 重置後狀態 - 有寫入操作: {has_write}")
    
    if not has_write:
        print("✅ 上下文重置正常工作")
    else:
        print("⚠️  上下文重置可能未正常工作")


async def test_database_info():
    """測試資料庫資訊"""
    print("\n" + "="*60)
    print("測試 5: 查詢資料庫資訊")
    print("="*60)
    
    # 查詢主庫資訊
    try:
        async with ReadWriteSession.write() as db:
            # 查詢資料庫版本
            result = await db.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✓ 主庫版本: {version.split(',')[0]}")
            
            # 查詢當前連線數
            result = await db.execute(text("""
                SELECT count(*) as conn_count 
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """))
            conn_count = result.fetchone()[0]
            print(f"✓ 主庫當前連線數: {conn_count}")
            
            print("✅ 主庫資訊查詢成功")
    except Exception as e:
        print(f"❌ 主庫資訊查詢失敗: {e}")
    
    # 查詢從庫資訊（如果啟用）
    if db_manager.is_read_write_splitting_enabled():
        try:
            async with ReadWriteSession.read() as db:
                # 查詢資料庫版本
                result = await db.execute(text("SELECT version()"))
                version = result.fetchone()[0]
                print(f"✓ 從庫版本: {version.split(',')[0]}")
                
                # 查詢當前連線數
                result = await db.execute(text("""
                    SELECT count(*) as conn_count 
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """))
                conn_count = result.fetchone()[0]
                print(f"✓ 從庫當前連線數: {conn_count}")
                
                print("✅ 從庫資訊查詢成功")
        except Exception as e:
            print(f"❌ 從庫資訊查詢失敗: {e}")


async def main():
    """主測試函數"""
    print("\n" + "="*60)
    print("資料庫讀寫分離功能測試")
    print("="*60)
    
    try:
        # 執行所有測試
        await test_configuration()
        await test_connection_manager()
        await test_session_routing()
        await test_transaction_consistency()
        await test_database_info()
        
        print("\n" + "="*60)
        print("測試完成")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ 測試過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 清理連線
        await db_manager.close()
        print("\n✓ 資料庫連線已關閉")


if __name__ == "__main__":
    asyncio.run(main())

