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
    model: Optional[str] = Field(default=None, description="指定使用的 AI 模型")
    provider: Optional[str] = Field(default=None, description="指定使用的 AI 提供商（groq/gemini）")
    system_prompt: Optional[str] = Field(default=None, description="自訂系統提示詞")


class AIQueryResponse(BaseModel):
    answer: str = Field(..., description="AI 回答")
    model: Optional[str] = Field(default=None, description="使用的模型名")
    provider: Optional[str] = Field(default=None, description="使用的 AI 提供商")
    usage_note: Optional[str] = Field(default=None, description="使用說明或備註")


class AIModelInfo(BaseModel):
    id: str = Field(..., description="模型 ID")
    name: str = Field(..., description="模型顯示名稱")
    description: str = Field(..., description="模型描述")
    category: str = Field(..., description="模型分類")
    max_tokens: int = Field(..., description="最大輸出 tokens")
    context_length: int = Field(..., description="上下文長度")


class AIModelsResponse(BaseModel):
    models: List[AIModelInfo] = Field(..., description="可用模型列表")
    current_provider: str = Field(..., description="當前使用的提供商")

