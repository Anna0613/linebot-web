"""
Pydantic schemas for LINE Rich Menu management
"""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, conint
from datetime import datetime


class RichMenuSize(BaseModel):
    width: conint(strict=True, ge=2500, le=2500) = 2500
    height: conint(strict=True, ge=843, le=1686)


class RichMenuBounds(BaseModel):
    x: conint(ge=0)
    y: conint(ge=0)
    width: conint(gt=0)
    height: conint(gt=0)


class RichMenuAction(BaseModel):
    type: Literal["postback", "message", "uri", "datetimepicker", "richmenuswitch"]
    label: Optional[str] = None
    data: Optional[str] = None
    text: Optional[str] = None
    uri: Optional[str] = None
    mode: Optional[str] = None
    initial: Optional[str] = None
    max: Optional[str] = None
    min: Optional[str] = None
    richMenuAliasId: Optional[str] = None


class RichMenuArea(BaseModel):
    bounds: RichMenuBounds
    action: RichMenuAction | Dict[str, Any]


class RichMenuCreate(BaseModel):
    name: str = Field(..., min_length=1)
    chat_bar_text: str = Field(..., min_length=1, max_length=14)
    selected: bool = False
    size: RichMenuSize
    areas: List[RichMenuArea] = Field(default_factory=list)


class RichMenuUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    chat_bar_text: Optional[str] = Field(None, min_length=1, max_length=14)
    selected: Optional[bool] = None
    size: Optional[RichMenuSize] = None
    areas: Optional[List[RichMenuArea]] = None


class RichMenuResponse(BaseModel):
    id: str
    bot_id: str
    line_rich_menu_id: Optional[str] = None
    name: str
    chat_bar_text: str
    selected: bool
    size: Dict[str, Any]
    areas: List[Dict[str, Any]]
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

