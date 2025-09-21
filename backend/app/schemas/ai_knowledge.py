from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class AIToggleResponse(BaseModel):
    bot_id: str
    ai_takeover_enabled: bool
    provider: Optional[str] = None
    model: Optional[str] = None


class AIToggleRequest(BaseModel):
    enabled: bool
    provider: Optional[str] = None
    model: Optional[str] = None


Scope = Literal["project", "global"]


class KnowledgeCreateTextRequest(BaseModel):
    scope: Scope = Field(default="project")
    content: str
    auto_chunk: bool = Field(default=False)
    chunk_size: int = Field(default=800, ge=200, le=2000)
    overlap: int = Field(default=80, ge=0, le=400)


class KnowledgeCreateBulkRequest(BaseModel):
    scope: Scope = Field(default="project")
    content: str
    auto_chunk: bool = True
    chunk_size: int = Field(default=800, ge=200, le=2000)
    overlap: int = Field(default=80, ge=0, le=400)


class KnowledgeChunkUpdateRequest(BaseModel):
    content: str


class KnowledgeChunkResponse(BaseModel):
    id: str
    document_id: str
    bot_id: Optional[str]
    source_type: str
    content: str
    created_at: str
    updated_at: str


class KnowledgeListResponse(BaseModel):
    items: List[KnowledgeChunkResponse]
    total: int
    page: int
    page_size: int


class KnowledgeSearchResponseItem(BaseModel):
    id: str
    document_id: str
    bot_id: Optional[str]
    content: str
    score: float


class KnowledgeSearchResponse(BaseModel):
    items: List[KnowledgeSearchResponseItem]


class BatchDeleteRequest(BaseModel):
    chunk_ids: List[str]
