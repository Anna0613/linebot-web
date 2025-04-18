import jwt
from datetime import datetime, timedelta, timezone

# 測試 jwt.encode()
token = jwt.encode(
    {
        'line_id': 'sample_line_id',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    },
    'd20b96c6eeb693baa08ba3c3ce1fdec87601d8cc066e6efc2589e80bb2c5581c',  # 用你的密鑰替換
    algorithm='HS256'
)

print(token)