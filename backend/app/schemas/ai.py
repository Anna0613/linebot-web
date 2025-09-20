from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class AIChatTurn(BaseModel):
    role: str = Field(..., description="'user' 或 'assistant'")
    content: str = Field(..., description="訊息內容")


class AIQueryRequest(BaseModel):
    question: str = Field(..., description="管理者的提問")
    history: Optional[List[AIChatTurn]] = Field(
        default=None, description="先前 AI 對話輪次（user/assistant）"
    )
    time_range_days: Optional[int] = Field(
        default=None, description="分析的時間範圍（天數）"
    )
    max_messages: int = Field(default=200, description="最多納入多少筆歷史訊息")


class AIQueryResponse(BaseModel):
    answer: str = Field(..., description="AI 回答")
    model: Optional[str] = Field(default=None, description="使用的模型名")
    usage_note: Optional[str] = Field(default=None, description="使用說明或備註")

