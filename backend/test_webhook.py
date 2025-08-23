#!/usr/bin/env python3
"""
測試 Webhook 功能的獨立腳本
"""
import json
import hashlib
import hmac
from datetime import datetime

def simulate_line_webhook_payload():
    """模擬 LINE Webhook 事件"""
    
    # 模擬關注事件
    follow_event = {
        "events": [
            {
                "type": "follow",
                "mode": "active",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "source": {
                    "type": "user",
                    "userId": "U1234567890abcdef1234567890abcdef"
                },
                "replyToken": "reply_token_123",
                "webhookEventId": "webhook_event_id_123",
                "deliveryContext": {
                    "isRedelivery": False
                }
            }
        ],
        "destination": "destination_id_123"
    }
    
    # 模擬訊息事件  
    message_event = {
        "events": [
            {
                "type": "message",
                "mode": "active",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "source": {
                    "type": "user",
                    "userId": "U1234567890abcdef1234567890abcdef"
                },
                "message": {
                    "id": "message_id_123",
                    "type": "text",
                    "text": "Hello, Bot!"
                },
                "replyToken": "reply_token_456",
                "webhookEventId": "webhook_event_id_456",
                "deliveryContext": {
                    "isRedelivery": False
                }
            }
        ],
        "destination": "destination_id_123"
    }
    
    return follow_event, message_event

def generate_line_signature(body: str, channel_secret: str) -> str:
    """生成 LINE 簽名"""
    hash_value = hmac.new(
        channel_secret.encode('utf-8'),
        body.encode('utf-8'),
        hashlib.sha256
    ).digest()
    return "sha256=" + hash_value.hex()

def test_webhook_payload():
    """測試 Webhook 負載"""
    follow_event, message_event = simulate_line_webhook_payload()
    
    print("=== 測試 Webhook 負載 ===")
    print(f"關注事件: {json.dumps(follow_event, indent=2, ensure_ascii=False)}")
    print()
    print(f"訊息事件: {json.dumps(message_event, indent=2, ensure_ascii=False)}")
    print()
    
    # 測試簽名生成
    channel_secret = "test_channel_secret_123"
    follow_body = json.dumps(follow_event)
    signature = generate_line_signature(follow_body, channel_secret)
    
    print(f"生成的簽名: {signature}")
    
    return follow_event, message_event

def test_event_processing():
    """測試事件處理邏輯"""
    follow_event, message_event = simulate_line_webhook_payload()
    
    print("=== 測試事件處理 ===")
    
    # 測試關注事件處理
    for event in follow_event["events"]:
        user_id = event.get('source', {}).get('userId')
        event_type = event.get('type')
        print(f"事件類型: {event_type}, 用戶ID: {user_id}")
    
    # 測試訊息事件處理  
    for event in message_event["events"]:
        user_id = event.get('source', {}).get('userId')
        event_type = event.get('type')
        message_data = event.get('message', {})
        message_type = message_data.get('type')
        message_content = message_data.get('text', '')
        print(f"事件類型: {event_type}, 用戶ID: {user_id}, 訊息類型: {message_type}, 內容: {message_content}")

if __name__ == "__main__":
    print("🧪 LINE Bot Webhook 測試")
    print("=" * 50)
    
    test_webhook_payload()
    print()
    test_event_processing()
    
    print()
    print("✅ 測試完成！")
    print()
    print("📋 下一步驟:")
    print("1. 確保數據庫遷移已運行")
    print("2. 在 LINE Developer Console 設置 Webhook URL")
    print("3. Webhook URL 格式: https://your-domain.com/api/v1/webhooks/{bot_id}")
    print("4. 測試真實的 LINE Bot 互動")