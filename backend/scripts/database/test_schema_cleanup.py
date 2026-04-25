#!/usr/bin/env python3
"""
Schema 清理功能測試腳本
"""
import os
import sys
from pathlib import Path

# 添加專案路徑
current_dir = Path(__file__).parent
scripts_dir = current_dir.parent
backend_dir = scripts_dir.parent
sys.path.append(str(backend_dir))

from app.db.database import clean_unused_schemas, check_database_connection
from app.db.schema_config import SchemaConfig
from sqlalchemy import create_engine, text
from app.config import settings
import logging

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def list_all_schemas():
    """列出所有 schemas"""
    try:
        from app.db.database import engine
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT schema_name, 
                       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = s.schema_name) as table_count,
                       (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = s.schema_name) as function_count
                FROM information_schema.schemata s
                ORDER BY schema_name
            """))
            
            schemas = []
            for row in result:
                schemas.append({
                    'name': row[0],
                    'tables': row[1],
                    'functions': row[2]
                })
            
            return schemas
    except Exception as e:
        logger.error(f"無法列出 schemas: {e}")
        return []

def test_schema_config():
    """測試 schema 配置"""
    print("🔧 測試 Schema 配置")
    print("=" * 50)
    
    # 顯示受保護的 schemas
    protected = SchemaConfig.get_protected_schemas()
    print(f"🛡️  受保護的 schemas: {protected}")
    
    # 測試清理模式
    patterns = SchemaConfig.get_cleanup_patterns()
    print(f"🧹 清理模式: {patterns}")
    
    # 測試判斷邏輯
    test_cases = [
        'public',
        'information_schema', 
        'pg_catalog',
        'test_schema',
        'temp_backup',
        'old_data',
        'user_data'
    ]
    
    print("\n📝 Schema 判斷測試:")
    for schema in test_cases:
        should_drop = SchemaConfig.should_drop_schema(schema)
        status = "🗑️ 可刪除" if should_drop else "🛡️ 受保護"
        print(f"  {schema:<20} → {status}")

def main():
    """主函數"""
    print("🚀 PostgreSQL Schema 清理測試")
    print("=" * 60)
    
    try:
        # 檢查資料庫連線
        print("📡 檢查資料庫連線...")
        check_database_connection()
        print("✅ 資料庫連線成功")
        
        # 測試配置
        test_schema_config()
        
        # 列出當前 schemas
        print("\n📋 當前資料庫 schemas:")
        print("-" * 50)
        schemas = list_all_schemas()
        
        if schemas:
            print(f"{'Schema 名稱':<20} {'表格數':<8} {'函數數':<8} {'狀態'}")
            print("-" * 50)
            for schema in schemas:
                should_drop = SchemaConfig.should_drop_schema(schema['name'])
                status = "可清理" if should_drop and (schema['tables'] + schema['functions']) == 0 else "保留"
                print(f"{schema['name']:<20} {schema['tables']:<8} {schema['functions']:<8} {status}")
        else:
            print("❌ 無法獲取 schema 列表")
        
        # 詢問是否執行清理
        print("\n" + "=" * 60)
        response = input("🤔 是否要執行 schema 清理？(y/N): ")
        
        if response.lower() == 'y':
            print("\n🧹 執行 schema 清理...")
            clean_unused_schemas()
            
            # 再次列出 schemas
            print("\n📋 清理後的 schemas:")
            print("-" * 50)
            schemas_after = list_all_schemas()
            
            if schemas_after:
                print(f"{'Schema 名稱':<20} {'表格數':<8} {'函數數':<8}")
                print("-" * 50)
                for schema in schemas_after:
                    print(f"{schema['name']:<20} {schema['tables']:<8} {schema['functions']:<8}")
                
                print(f"\n📊 統計: 共有 {len(schemas_after)} 個 schemas")
            else:
                print("❌ 無法獲取清理後的 schema 列表")
        else:
            print("⏭️  跳過清理")
            
    except Exception as e:
        logger.error(f"測試過程中發生錯誤: {e}")
        return 1
    
    print("\n✅ 測試完成")
    return 0

if __name__ == "__main__":
    exit(main())