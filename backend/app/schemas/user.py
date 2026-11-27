"""
用戶相關的 Pydantic schemas
"""
from typing import Literal
from pydantic import ConfigDict, Field, BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """用戶基礎 schema"""
    username: str
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    """用戶創建 schema"""
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('密碼必須至少 8 個字元')
        return v

class UserUpdate(BaseModel):
    """用戶更新 schema"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    """用戶回應 schema"""
    id: str
    username: str
    email: Optional[str]
    email_verified: bool
    created_at: datetime
    avatar_updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class UserProfile(BaseModel):
    """用戶個人檔案 schema"""
    id: str
    username: str
    display_name: Optional[str] = None
    email: Optional[str]
    email_verified: bool
    avatar_updated_at: Optional[datetime]
    created_at: datetime
    
    # LINE 用戶相關欄位
    line_id: Optional[str] = None
    picture_url: Optional[str] = None
    isLineUser: bool = False
    
    model_config = ConfigDict(from_attributes=True)

class AvatarUpload(BaseModel):
    """頭像上傳 schema"""
    avatar_base64: str
    
    @field_validator('avatar_base64')
    @classmethod
    def validate_avatar(cls, v):
        import re
        import base64
        
        # 檢查是否是有效的data URL格式
        data_url_pattern = r'^data:image/(jpeg|jpg|png|gif);base64,([A-Za-z0-9+/=]+)$'
        match = re.match(data_url_pattern, v)
        
        if not match:
            raise ValueError('無效的圖片格式，只允許 JPEG、PNG 和 GIF')
        
        # 檢查大小
        base64_data = match.group(2)
        if len(base64_data) > 700000:  # 約500KB圖片的Base64編碼
            raise ValueError('圖片大小過大，最大允許 500KB')
        
        try:
            decoded = base64.b64decode(base64_data)
            if len(decoded) < 100:
                raise ValueError('無效的圖片資料')
        except Exception:
            raise ValueError('無效的 base64 編碼')
        
        return v

class LineUserResponse(BaseModel):
    """LINE 用戶回應 schema"""
    id: str
    line_id: str
    display_name: Optional[str]
    picture_url: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Feedback(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    category: Literal["錯誤回報", "功能建議", "一般意見"]
    message: str = Field(min_length=1, max_length=4000)
    contact_name: Optional[str] = Field(default=None, max_length=100)
    contact_email: Optional[EmailStr] = None
