#!/usr/bin/env python3
"""
直接查詢 MongoDB
"""
import asyncio
import sys
import os
from datetime import datetime

# 添加項目根目錄到 Python 路徑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def query_mongodb():
    """查詢 MongoDB 中的最新訊息"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        # 連接 MongoDB
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client.linebot_web
        
        print("✅ MongoDB 連接成功")
        
        # 查詢對話
        bot_id = "01ea8396-2ce2-484f-983e-ab945f639405"
        line_user_id = "U07c91dc9572b42cef1876feeb16d945b"
        
        print(f"🔍 查詢對話: bot_id={bot_id}, line_user_id={line_user_id}")
        
        conversation = await db.conversations.find_one({
            "bot_id": bot_id,
            "line_user_id": line_user_id
        })
        
        if conversation:
            print(f"📋 找到對話: {conversation['_id']}")
            print(f"📊 訊息總數: {len(conversation.get('messages', []))}")
            
            messages = conversation.get('messages', [])
            if messages:
                # 按時間戳排序，獲取最新的 5 條訊息
                sorted_messages = sorted(messages, key=lambda x: x.get('timestamp', datetime.min))
                latest_messages = sorted_messages[-5:]
                
                print(f"\n📝 最新的 5 條訊息:")
                for i, msg in enumerate(latest_messages, 1):
                    timestamp = msg.get('timestamp', 'N/A')
                    sender = msg.get('sender_type', 'N/A')
                    content = msg.get('content', {})
                    
                    print(f"  {i}. [{timestamp}] {sender}: {content}")
                    
                    # 檢查是否有測試訊息
                    if isinstance(content, dict):
                        text = content.get('text', '')
                        if '測試' in text or 'test' in text.lower():
                            print(f"    🎯 測試訊息: {text}")
                
                # 檢查最新訊息
                latest = latest_messages[-1]
                print(f"\n🔍 最新訊息詳情:")
                print(f"  時間: {latest.get('timestamp')}")
                print(f"  發送者: {latest.get('sender_type')}")
                print(f"  事件類型: {latest.get('event_type')}")
                print(f"  訊息類型: {latest.get('message_type')}")
                print(f"  內容: {latest.get('content')}")
                
            else:
                print("❌ 對話中沒有訊息")
        else:
            print("❌ 沒有找到對話")
            
        # 查詢所有對話
        print(f"\n🔍 查詢所有對話...")
        all_conversations = await db.conversations.find({"bot_id": bot_id}).to_list(length=10)
        print(f"📊 Bot 的對話總數: {len(all_conversations)}")
        
        for conv in all_conversations:
            print(f"  - {conv['line_user_id']}: {len(conv.get('messages', []))} 條訊息")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ 查詢失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(query_mongodb())
    if success:
        print("\n🎉 MongoDB 查詢成功！")
    else:
        print("\n💥 MongoDB 查詢失敗！")
        sys.exit(1)
