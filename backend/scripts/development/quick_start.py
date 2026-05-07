#!/usr/bin/env python3
"""
快速啟動檢查器
檢查必要的依賴並提供安裝指引
"""
import sys
import os

def check_dependencies():
    """檢查關鍵依賴"""
    missing_packages = []
    
    # 檢查必要套件
    required_packages = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('sqlalchemy', 'SQLAlchemy'),
        ('psycopg2', 'PostgreSQL Driver'),
    ]
    
    print("🔍 檢查必要依賴...")
    
    for package, name in required_packages:
        try:
            __import__(package)
            print(f"✅ {name}")
        except ImportError:
            print(f"❌ {name} - 缺少")
            missing_packages.append(package)
    
    # 檢查可選套件
    optional_packages = [
        ('redis', 'Redis (快取功能)'),
        ('aioredis', 'Async Redis'),
    ]
    
    print("\n🔍 檢查可選依賴...")
    
    for package, name in optional_packages:
        try:
            __import__(package)
            print(f"✅ {name}")
        except ImportError:
            print(f"⚠️  {name} - 未安裝（功能受限）")
    
    return missing_packages

def main():
    """主函數"""
    print("🚀 BotCraft Backend 啟動檢查")
    print("=" * 40)
    
    # 檢查依賴
    missing = check_dependencies()
    
    print("\n" + "=" * 40)
    
    if missing:
        print(f"❌ 缺少 {len(missing)} 個必要套件:")
        for package in missing:
            print(f"   - {package}")
        
        print("\n💡 安裝指令:")
        print("   pip install -r requirements.txt")
        print("   或")
        print(f"   pip install {' '.join(missing)}")
        
        return 1
    else:
        print("✅ 所有必要依賴已安裝")
        
        # 嘗試啟動應用程式
        try:
            print("\n🔄 測試應用程式載入...")
            
            # 設置 Python 路徑
            sys.path.insert(0, os.getcwd())
            
            # 載入應用程式
            from app.main import app
            print("✅ 應用程式載入成功")
            
            print("\n🎉 準備就緒！可以啟動伺服器:")
            print("   python run.py")
            print("   或")
            print("   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
            
            return 0
            
        except Exception as e:
            print(f"❌ 應用程式載入失敗: {e}")
            print("\n🔍 可能的原因:")
            print("   1. 資料庫配置問題（檢查 .env 檔案）")
            print("   2. 部分模組導入失敗")
            print("   3. 環境變數未正確設定")
            
            return 1

if __name__ == "__main__":
    exit(main())