#!/usr/bin/env python3
"""
測試關鍵模組的導入是否正常
"""
import sys
import os

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.getcwd())

try:
    print("🔄 測試基本模組導入...")
    
    # 測試配置模組
    from app.config.redis_config import CacheService
    print("✅ Redis 配置模組導入成功")
    
    # 測試資料庫模組  
    from app.models.bot import Bot, LogicTemplate
    print("✅ Bot 模型導入成功")
    
    # 測試 LINE 用戶模組
    from app.models.line_user import LineBotUser, LineBotUserInteraction
    print("✅ LINE 用戶模型導入成功")
    
    # 測試工具模組
    from app.utils.query_optimizer import QueryOptimizer
    print("✅ 查詢優化器導入成功")
    
    from app.utils.pagination import LazyLoader
    print("✅ 分頁工具導入成功")
    
    # 測試 API 模組
    from app.api.api_v1.bot_dashboard import router
    print("✅ Bot 儀表板 API 導入成功")
    
    # 測試主應用程式
    from app.main import app
    print("✅ 主應用程式導入成功")
    
    print("\n🎉 所有模組導入測試通過！")
    
except ImportError as e:
    print(f"❌ 導入失敗: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
except Exception as e:
    print(f"❌ 未預期錯誤: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)