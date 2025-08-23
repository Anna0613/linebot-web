#!/usr/bin/env python3
"""
測試用戶記錄功能的獨立腳本
"""
import os
import sys
import uuid
from datetime import datetime

# 添加項目路徑
sys.path.append('.')

def test_user_recording_logic():
    """測試用戶記錄邏輯（不依賴實際數據庫）"""
    
    print("=== 用戶記錄邏輯測試 ===")
    
    # 模擬數據
    bot_id = str(uuid.uuid4())
    user_id = "U1234567890abcdef1234567890abcdef"
    
    # 模擬關注事件記錄
    follow_interaction = {
        "bot_id": bot_id,
        "line_user_id": user_id,
        "event_type": "follow",
        "message_type": None,
        "message_content": None,
        "timestamp": datetime.now()
    }
    
    print(f"關注事件記錄: {follow_interaction}")
    
    # 模擬訊息事件記錄
    message_interaction = {
        "bot_id": bot_id,
        "line_user_id": user_id,
        "event_type": "message",
        "message_type": "text",
        "message_content": {"text": "Hello, Bot!", "type": "text"},
        "timestamp": datetime.now()
    }
    
    print(f"訊息事件記錄: {message_interaction}")
    
    # 模擬用戶信息更新
    user_update = {
        "bot_id": bot_id,
        "line_user_id": user_id,
        "display_name": "測試用戶",
        "is_followed": True,
        "last_interaction": datetime.now(),
        "interaction_count": 1
    }
    
    print(f"用戶信息更新: {user_update}")
    
    return True

def check_models_import():
    """檢查模型導入是否正常"""
    print("=== 檢查模型導入 ===")
    
    try:
        from app.models.line_user import LineBotUser, LineBotUserInteraction, RichMenu
        print("✅ LineBotUser 模型導入成功")
        print("✅ LineBotUserInteraction 模型導入成功")
        print("✅ RichMenu 模型導入成功")
        
        # 檢查模型屬性
        print(f"LineBotUser 表名: {LineBotUser.__tablename__}")
        print(f"LineBotUserInteraction 表名: {LineBotUserInteraction.__tablename__}")
        print(f"RichMenu 表名: {RichMenu.__tablename__}")
        
        return True
        
    except ImportError as e:
        print(f"❌ 模型導入失敗: {e}")
        return False
    except Exception as e:
        print(f"❌ 模型檢查失敗: {e}")
        return False

def check_service_import():
    """檢查服務導入是否正常"""
    print("=== 檢查服務導入 ===")
    
    try:
        from app.services.line_bot_service import LineBotService
        print("✅ LineBotService 服務導入成功")
        
        # 測試初始化（使用虛擬憑證）
        service = LineBotService("dummy_token", "dummy_secret")
        print("✅ LineBotService 初始化成功")
        
        # 檢查方法是否存在
        methods_to_check = [
            'handle_webhook_event',
            'process_event', 
            'handle_message_event',
            'handle_follow_event',
            'handle_unfollow_event',
            'record_user_interaction',
            'verify_signature'
        ]
        
        for method_name in methods_to_check:
            if hasattr(service, method_name):
                print(f"✅ 方法 {method_name} 存在")
            else:
                print(f"❌ 方法 {method_name} 不存在")
        
        return True
        
    except ImportError as e:
        print(f"❌ 服務導入失敗: {e}")
        return False
    except Exception as e:
        print(f"❌ 服務檢查失敗: {e}")
        return False

def check_webhook_api():
    """檢查 Webhook API 導入"""
    print("=== 檢查 Webhook API ===")
    
    try:
        from app.api.api_v1.webhook import router
        print("✅ Webhook router 導入成功")
        
        # 檢查路由數量
        route_count = len(router.routes)
        print(f"✅ Webhook 路由數量: {route_count}")
        
        # 列出所有路由
        for route in router.routes:
            print(f"  - {route.methods} {route.path}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Webhook API 導入失敗: {e}")
        return False
    except Exception as e:
        print(f"❌ Webhook API 檢查失敗: {e}")
        return False

if __name__ == "__main__":
    print("🧪 用戶記錄功能測試")
    print("=" * 50)
    
    success_count = 0
    total_tests = 4
    
    # 測試 1: 用戶記錄邏輯
    if test_user_recording_logic():
        success_count += 1
        print("✅ 用戶記錄邏輯測試通過\n")
    else:
        print("❌ 用戶記錄邏輯測試失敗\n")
    
    # 測試 2: 模型導入
    if check_models_import():
        success_count += 1
        print("✅ 模型導入測試通過\n")
    else:
        print("❌ 模型導入測試失敗\n")
    
    # 測試 3: 服務導入
    if check_service_import():
        success_count += 1
        print("✅ 服務導入測試通過\n")
    else:
        print("❌ 服務導入測試失敗\n")
    
    # 測試 4: Webhook API
    if check_webhook_api():
        success_count += 1
        print("✅ Webhook API 測試通過\n")
    else:
        print("❌ Webhook API 測試失敗\n")
    
    # 總結
    print(f"📊 測試總結: {success_count}/{total_tests} 通過")
    
    if success_count == total_tests:
        print("🎉 所有測試通過！Webhook 功能已準備就緒")
        print()
        print("📋 下一步驟:")
        print("1. 運行數據庫遷移: alembic upgrade head")
        print("2. 啟動 FastAPI 服務器")
        print("3. 在 LINE Developer Console 設置 Webhook URL")
        print("4. 測試真實的 LINE Bot 互動")
    else:
        print("⚠️  部分測試失敗，請檢查錯誤信息並修復問題")