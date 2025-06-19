"""
認證相關的 Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, validator
from typing import Optional

class UserRegister(BaseModel):
    """用戶註冊 schema"""
    username: str
    password: str
    email: Optional[EmailStr] = None
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('用戶名稱必須至少 3 個字元')
        if len(v) > 50:
            raise ValueError('用戶名稱不能超過 50 個字元')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('密碼必須至少 8 個字元')
        return v

class UserLogin(BaseModel):
    """用戶登入 schema"""
    username: str
    password: str

class Token(BaseModel):
    """JWT token schema"""
    access_token: str
    token_type: str = "bearer"
    user: Optional[dict] = None

class TokenData(BaseModel):
    """Token 解析資料 schema"""
    username: Optional[str] = None
    login_type: Optional[str] = None

class PasswordReset(BaseModel):
    """密碼重設 schema"""
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('新密碼必須至少 8 個字元')
        return v

class PasswordChange(BaseModel):
    """密碼變更 schema"""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('新密碼必須至少 8 個字元')
        return v

class EmailVerification(BaseModel):
    """郵件驗證 schema"""
    token: str

class ForgotPassword(BaseModel):
    """忘記密碼 schema"""
    email: EmailStr 