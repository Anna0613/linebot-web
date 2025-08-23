#!/usr/bin/env python3
"""
最小化測試腳本
測試關鍵模組的導入
"""
import sys
import os

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.getcwd())

print("🔄 測試模組導入...")

try:
    # 測試設定導入
    print("測試 settings 導入...")
    try:
        from app.config import settings
        print("✅ 從 app.config 導入 settings 成功")
    except ImportError:
        from app.config import settings  # 備用導入
        print("✅ 從 app.config 模組導入 settings 成功")
    
    print(f"✅ 項目名稱: {settings.PROJECT_NAME}")
    print(f"✅ API 前綴: {settings.API_V1_PREFIX}")
    
    print("\n🎉 配置模組測試通過！")
    
except Exception as e:
    print(f"❌ 測試失敗: {e}")
    import traceback
    traceback.print_exc()