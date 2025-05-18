from datetime import datetime, timedelta
import os
import jwt
from passlib.context import CryptContext
from typing import Optional, Dict
from jwt.exceptions import InvalidTokenError
import secrets

# JWT配置
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# 密碼加密
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """生成密碼哈希"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """創建訪問令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict:
    """驗證令牌"""
    if not token:
        raise InvalidTokenError("Token is required")
    
    payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    return payload

# Cookie配置
def get_cookie_settings(token: str):
    """獲取Cookie設置"""
    # 判斷是否在本地開發環境
    is_development = os.getenv('ENVIRONMENT', 'production').lower() == 'development'
    
    settings = {
        "key": "token",
        "value": token,
        "httponly": True,
        "max_age": ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        "path": "/",
    }
    
    # 在生產環境設置更嚴格的選項，開發環境下使用較寬鬆的設置
    if not is_development:
        settings.update({
            "secure": True,
            "samesite": "lax",  # 使用 lax 以支援現代瀏覽器
        })
        
        # 只在生產環境下設置domain
        # 注意：不要在本地開發中設置 domain，這可能會導致無法正常設置 cookie
        if os.getenv('DOMAIN'):
            settings["domain"] = os.getenv('DOMAIN')
    else:
        # 本地開發環境設置
        settings.update({
            "secure": False,  # 本地開發通常用 http
            "samesite": None,  # 允許跨域使用
        })
    
    return settings
