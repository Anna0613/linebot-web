import redis

try:
    r = redis.Redis(
        host="redis.jkl921102.org",
        port=6379,
        db=0,
        password="11131230"
    )

    # 測試 PING
    if r.ping():
        print("✅ 連線成功：Redis PONG")
    else:
        print("❌ 連線失敗")
except Exception as e:
    print("⚠️ 錯誤:", e)
