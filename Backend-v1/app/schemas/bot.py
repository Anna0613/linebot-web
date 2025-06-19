"""
Bot 相關的 Pydantic schemas
"""
from pydantic import BaseModel, validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID
import json

class BotBase(BaseModel):
    """Bot 基礎 schema"""
    name: str
    channel_token: str
    channel_secret: str

class BotCreate(BotBase):
    """Bot 創建 schema"""
    @validator('name')
    def validate_name(cls, v):
        if len(v) < 1:
            raise ValueError('Bot 名稱不能為空')
        if len(v) > 100:
            raise ValueError('Bot 名稱不能超過 100 個字元')
        return v
    
    @validator('channel_token')
    def validate_channel_token(cls, v):
        if len(v) < 10:
            raise ValueError('Channel Token 格式無效')
        return v
    
    @validator('channel_secret')
    def validate_channel_secret(cls, v):
        if len(v) < 10:
            raise ValueError('Channel Secret 格式無效')
        return v

class BotUpdate(BaseModel):
    """Bot 更新 schema"""
    name: Optional[str] = None
    channel_token: Optional[str] = None
    channel_secret: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if len(v) < 1:
                raise ValueError('Bot 名稱不能為空')
            if len(v) > 100:
                raise ValueError('Bot 名稱不能超過 100 個字元')
        return v

class BotResponse(BaseModel):
    """Bot 回應 schema"""
    id: str
    name: str
    channel_token: str
    channel_secret: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FlexMessageBase(BaseModel):
    """Flex 訊息基礎 schema"""
    content: Any  # JSON 格式的 Flex 訊息內容

class FlexMessageCreate(FlexMessageBase):
    """Flex 訊息創建 schema"""
    @validator('content')
    def validate_content(cls, v):
        try:
            # 確保內容可以序列化為 JSON
            if isinstance(v, dict):
                json.dumps(v)
            elif isinstance(v, str):
                json.loads(v)
            else:
                raise ValueError('內容必須是有效的 JSON 格式')
        except (json.JSONDecodeError, TypeError):
            raise ValueError('內容必須是有效的 JSON 格式')
        return v

class FlexMessageUpdate(BaseModel):
    """Flex 訊息更新 schema"""
    content: Optional[Any] = None
    
    @validator('content')
    def validate_content(cls, v):
        if v is not None:
            try:
                if isinstance(v, dict):
                    json.dumps(v)
                elif isinstance(v, str):
                    json.loads(v)
                else:
                    raise ValueError('內容必須是有效的 JSON 格式')
            except (json.JSONDecodeError, TypeError):
                raise ValueError('內容必須是有效的 JSON 格式')
        return v

class FlexMessageResponse(BaseModel):
    """Flex 訊息回應 schema"""
    id: str
    content: Any
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BotCodeBase(BaseModel):
    """Bot 程式碼基礎 schema"""
    bot_id: str
    code: str

class BotCodeCreate(BotCodeBase):
    """Bot 程式碼創建 schema"""
    @validator('bot_id')
    def validate_bot_id(cls, v):
        try:
            UUID(v)
        except ValueError:
            raise ValueError('無效的 Bot ID 格式')
        return v
    
    @validator('code')
    def validate_code(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('程式碼不能為空')
        return v

class BotCodeUpdate(BaseModel):
    """Bot 程式碼更新 schema"""
    code: Optional[str] = None
    
    @validator('code')
    def validate_code(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError('程式碼不能為空')
        return v

class BotCodeResponse(BaseModel):
    """Bot 程式碼回應 schema"""
    id: str
    bot_id: str
    code: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SendFlexMessage(BaseModel):
    """發送 Flex 訊息 schema"""
    bot_id: str
    message_id: str
    
    @validator('bot_id')
    def validate_bot_id(cls, v):
        try:
            UUID(v)
        except ValueError:
            raise ValueError('無效的 Bot ID 格式')
        return v
    
    @validator('message_id')
    def validate_message_id(cls, v):
        try:
            UUID(v)
        except ValueError:
            raise ValueError('無效的訊息 ID 格式')
        return v 