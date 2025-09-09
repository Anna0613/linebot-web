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
    """Flex 訊息基礎 schema
    - content: 編譯後的合法 Flex JSON（bubble/carousel 或其字串）或設計器格式（含 blocks）
    - design_blocks: 可選，編輯器 blocks，與 content 併行保存
    """
    name: str
    content: Any
    design_blocks: Optional[Any] = None

class FlexMessageCreate(FlexMessageBase):
    """Flex 訊息創建 schema"""
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('FLEX 訊息名稱不能為空')
        if len(v) > 255:
            raise ValueError('FLEX 訊息名稱不能超過 255 個字元')
        return v
        
    @validator('content')
    def validate_content(cls, v):
        """驗證內容格式（不修改數據本身）"""
        try:
            # 確保內容可以序列化為 JSON，但不實際序列化
            if isinstance(v, dict):
                json.dumps(v)
            elif isinstance(v, str):
                json.loads(v)
            else:
                raise ValueError('內容必須是有效的 JSON 格式')
        except (json.JSONDecodeError, TypeError):
            raise ValueError('內容必須是有效的 JSON 格式')
        # 關鍵：返回原始數據
        return v
    
    @validator('design_blocks')
    def validate_design_blocks(cls, v):
        if v is None:
            return v
        try:
            if isinstance(v, dict) or isinstance(v, list):
                json.dumps(v)
            elif isinstance(v, str):
                json.loads(v)
            else:
                raise ValueError('design_blocks 必須是有效的 JSON 格式')
        except (json.JSONDecodeError, TypeError):
            raise ValueError('design_blocks 必須是有效的 JSON 格式')
        return v

class FlexMessageUpdate(BaseModel):
    """Flex 訊息更新 schema"""
    name: Optional[str] = None
    content: Optional[Any] = None
    design_blocks: Optional[Any] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if len(v.strip()) == 0:
                raise ValueError('FLEX 訊息名稱不能為空')
            if len(v) > 255:
                raise ValueError('FLEX 訊息名稱不能超過 255 個字元')
        return v
    
    @validator('content')
    def validate_content(cls, v):
        """驗證內容格式（不修改數據本身）"""
        if v is not None:
            try:
                if isinstance(v, dict):
                    # 只測試是否可以序列化，不實際序列化
                    json.dumps(v)
                elif isinstance(v, str):
                    # 只測試是否可以反序列化，不實際反序列化
                    json.loads(v)
                else:
                    raise ValueError('內容必須是有效的 JSON 格式')
            except (json.JSONDecodeError, TypeError):
                raise ValueError('內容必須是有效的 JSON 格式')
        # 關鍵：返回原始數據
        return v
    
    @validator('design_blocks')
    def validate_design_blocks(cls, v):
        if v is not None:
            try:
                if isinstance(v, dict) or isinstance(v, list):
                    json.dumps(v)
                elif isinstance(v, str):
                    json.loads(v)
                else:
                    raise ValueError('design_blocks 必須是有效的 JSON 格式')
            except (json.JSONDecodeError, TypeError):
                raise ValueError('design_blocks 必須是有效的 JSON 格式')
        return v

class FlexMessageResponse(BaseModel):
    """Flex 訊息回應 schema"""
    id: str
    name: str
    content: Any
    design_blocks: Optional[Any] = None
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

class VisualEditorData(BaseModel):
    """視覺化編輯器數據 schema"""
    bot_id: str
    logic_blocks: Any  # JSON 格式的邏輯積木數據
    flex_blocks: Any   # JSON 格式的 Flex 積木數據
    generated_code: Optional[str] = None  # 生成的程式碼
    
    @validator('bot_id')
    def validate_bot_id(cls, v):
        try:
            UUID(v)
        except ValueError:
            raise ValueError('無效的 Bot ID 格式')
        return v
    
    @validator('logic_blocks')
    def validate_logic_blocks(cls, v):
        """驗證邏輯積木數據格式（不修改數據本身）"""
        try:
            if isinstance(v, dict) or isinstance(v, list):
                # 只測試是否可以序列化，不實際執行序列化
                json.dumps(v)
            elif isinstance(v, str):
                # 只測試是否可以反序列化，不實際執行反序列化
                json.loads(v)
            else:
                raise ValueError('邏輯積木數據必須是有效的 JSON 格式')
        except (json.JSONDecodeError, TypeError):
            raise ValueError('邏輯積木數據必須是有效的 JSON 格式')
        # 關鍵：返回原始數據，不返回序列化結果
        return v
    
    @validator('flex_blocks')
    def validate_flex_blocks(cls, v):
        """驗證Flex積木數據格式（不修改數據本身）"""
        try:
            if isinstance(v, dict) or isinstance(v, list):
                # 只測試是否可以序列化，不實際執行序列化
                json.dumps(v)
            elif isinstance(v, str):
                # 只測試是否可以反序列化，不實際執行反序列化
                json.loads(v)
            else:
                raise ValueError('Flex積木數據必須是有效的 JSON 格式')
        except (json.JSONDecodeError, TypeError):
            raise ValueError('Flex積木數據必須是有效的 JSON 格式')
        # 關鍵：返回原始數據，不返回序列化結果
        return v

class VisualEditorResponse(BaseModel):
    """視覺化編輯器回應 schema"""
    bot_id: str
    logic_blocks: Any
    flex_blocks: Any
    generated_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LogicTemplateBase(BaseModel):
    """邏輯模板基礎 schema"""
    name: str
    description: Optional[str] = None
    logic_blocks: Any  # JSON 格式的邏輯積木數據
    is_active: Optional[str] = "false"

class LogicTemplateCreate(LogicTemplateBase):
    """邏輯模板創建 schema"""
    bot_id: str
    
    @validator('bot_id')
    def validate_bot_id(cls, v):
        try:
            UUID(v)
        except ValueError:
            raise ValueError('無效的 Bot ID 格式')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) == 0:
            raise ValueError('邏輯模板名稱不能為空')
        if len(v) > 255:
            raise ValueError('邏輯模板名稱不能超過 255 個字元')
        return v
    
    @validator('logic_blocks')
    def validate_logic_blocks(cls, v):
        """驗證邏輯積木數據格式（不修改數據本身）"""
        try:
            if isinstance(v, dict) or isinstance(v, list):
                # 只測試是否可以序列化，不實際執行序列化
                json.dumps(v)
            elif isinstance(v, str):
                # 只測試是否可以反序列化，不實際執行反序列化
                json.loads(v)
            else:
                raise ValueError('邏輯積木數據必須是有效的 JSON 格式')
        except (json.JSONDecodeError, TypeError):
            raise ValueError('邏輯積木數據必須是有效的 JSON 格式')
        # 關鍵：返回原始數據，不返回序列化結果
        return v

class LogicTemplateUpdate(BaseModel):
    """邏輯模板更新 schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    logic_blocks: Optional[Any] = None
    is_active: Optional[str] = None
    generated_code: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if len(v.strip()) == 0:
                raise ValueError('邏輯模板名稱不能為空')
            if len(v) > 255:
                raise ValueError('邏輯模板名稱不能超過 255 個字元')
        return v
    
    @validator('logic_blocks')
    def validate_logic_blocks(cls, v):
        """驗證邏輯積木數據格式（不修改數據本身）"""
        if v is not None:
            try:
                if isinstance(v, dict) or isinstance(v, list):
                    # 只測試是否可以序列化，不實際執行序列化
                    json.dumps(v)
                elif isinstance(v, str):
                    # 只測試是否可以反序列化，不實際執行反序列化
                    json.loads(v)
                else:
                    raise ValueError('邏輯積木數據必須是有效的 JSON 格式')
            except (json.JSONDecodeError, TypeError):
                raise ValueError('邏輯積木數據必須是有效的 JSON 格式')
        # 關鍵：返回原始數據，不返回序列化結果
        return v

class LogicTemplateResponse(BaseModel):
    """邏輯模板回應 schema"""
    id: str
    name: str
    description: Optional[str]
    logic_blocks: Any
    is_active: str
    bot_id: str
    user_id: str
    generated_code: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LogicTemplateSummary(BaseModel):
    """邏輯模板摘要 schema - 用於下拉選單"""
    id: str
    name: str
    description: Optional[str]
    is_active: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class FlexMessageSummary(BaseModel):
    """FLEX 訊息摘要 schema - 用於下拉選單"""
    id: str
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class BotSummary(BaseModel):
    """Bot 摘要信息 schema - 用於下拉選單"""
    id: str
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True 
