#!/usr/bin/env python3
"""
快速測試導入
"""

def test_imports():
    print("🔍 測試導入...")
    
    try:
        # 測試基本資料庫導入
        from app.database import init_database
        print("✅ app.database.init_database")
        
        # 測試增強初始化導入
        from app.database_enhanced import init_database_enhanced
        print("✅ app.database_enhanced.init_database_enhanced")
        
        # 測試應用創建
        from app.main import app
        print("✅ app.main.app")
        
        return True
        
    except Exception as e:
        print(f"❌ 導入失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if test_imports():
        print("✅ 所有導入測試通過")
    else:
        print("❌ 導入測試失敗")