from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class AIToggleResponse(BaseModel):
    bot_id: str
    ai_takeover_enabled: bool
    provider: Optional[str] = None
    model: Optional[str] = None
    rag_threshold: Optional[float] = None
    rag_top_k: Optional[int] = None
    history_messages: Optional[int] = None
    system_prompt: Optional[str] = None


class AIToggleRequest(BaseModel):
    enabled: bool
    provider: Optional[str] = None
    model: Optional[str] = None
    rag_threshold: Optional[float] = None
    rag_top_k: Optional[int] = None
    history_messages: Optional[int] = None
    system_prompt: Optional[str] = None


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


class KnowledgeDocumentResponse(BaseModel):
    """知識庫文件回應"""
    id: str
    bot_id: Optional[str]
    source_type: str  # text | file | bulk
    title: Optional[str]
    original_file_name: Optional[str]
    ai_summary: Optional[str]
    chunk_count: int  # 關聯的切塊數量
    created_at: str
    updated_at: str


class KnowledgeDocumentListResponse(BaseModel):
    """知識庫文件列表回應"""
    items: List[KnowledgeDocumentResponse]
    total: int
    page: int
    page_size: int


class BatchDeleteDocumentsRequest(BaseModel):
    """批次刪除文件請求"""
    document_ids: List[str]
