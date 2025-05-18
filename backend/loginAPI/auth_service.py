from datetime import datetime, timedelta
import os
import jwt
from passlib.context import CryptContext
from typing import Optional
import secrets
from flask import jsonify

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

def verify_token(token: str) -> dict:
    """驗證令牌"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        return None

# Cookie配置
def get_cookie_settings(token: str):
    """獲取Cookie設置"""
    return {
        "key": "token",
        "value": token,
        "httponly": True,
        "secure": True,
        "samesite": "none",
        "max_age": ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        "path": "/",
    }
