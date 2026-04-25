#!/usr/bin/env python3
"""
手動更新媒體信息
"""
import asyncio
import sys
import os

# 添加項目根目錄到 Python 路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
scripts_dir = os.path.dirname(current_dir)
backend_dir = os.path.dirname(scripts_dir)
sys.path.append(backend_dir)

async def update_media_info():
    """手動更新媒體信息"""
    try:
        print("🔍 開始更新媒體信息...")
        
        # 初始化數據庫
        from app.db.database_mongo import mongodb_manager
        from app.services.conversation.conversation_service import ConversationService
        
        # 連接 MongoDB
        await mongodb_manager.connect()
        print("✅ MongoDB 連接成功")
        
        # 最新圖片的信息
        message_id = "68bc8d939df0031f1289ad1f"
        media_path = "U07c91dc9572b42cef1876feeb16d945b/img/71b32a7c1cac423484d070a78a22c540jpg"
        media_url = "http://10.1.1.184:9768/api/v1/minio/proxy?object_path=U07c91dc9572b42cef1876feeb16d945b/img/71b32a7c1cac423484d070a78a22c540jpg"
        
        print(f"📝 更新參數:")
        print(f"  Message ID: {message_id}")
        print(f"  Media Path: {media_path}")
        print(f"  Media URL: {media_url}")
        
        # 更新媒體信息
        print("🔄 開始更新 MongoDB...")
        success = await ConversationService.update_message_media(
            message_id=message_id,
            media_path=media_path,
            media_url=media_url
        )
        
        if success:
            print("✅ 媒體信息更新成功！")
            
            # 驗證更新結果
            print("🔍 驗證更新結果...")
            bot_id = "01ea8396-2ce2-484f-983e-ab945f639405"
            line_user_id = "U07c91dc9572b42cef1876feeb16d945b"
            
            chat_history, total_count = await ConversationService.get_chat_history(
                bot_id=bot_id,
                line_user_id=line_user_id,
                limit=1,
                offset=0
            )
            
            if chat_history:
                latest_message = chat_history[0]
                print(f"📝 最新訊息:")
                print(f"  ID: {latest_message.get('id')}")
                print(f"  類型: {latest_message.get('message_type')}")
                print(f"  媒體路徑: {latest_message.get('media_path')}")
                print(f"  媒體 URL: {latest_message.get('media_url')}")
                
                if latest_message.get('media_url'):
                    print("🎉 媒體 URL 已成功設定！")
                    return True
                else:
                    print("❌ 媒體 URL 仍然為空")
                    return False
            else:
                print("❌ 沒有找到聊天記錄")
                return False
        else:
            print("❌ 媒體信息更新失敗")
            return False
        
    except Exception as e:
        print(f"❌ 更新失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(update_media_info())
    if success:
        print("\n🎉 媒體信息更新成功！")
    else:
        print("\n💥 媒體信息更新失敗！")
        sys.exit(1)
