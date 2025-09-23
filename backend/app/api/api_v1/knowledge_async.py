"""
非同步知識庫處理 API
提供檔案上傳、進度追蹤和批次處理功能
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database_async import get_async_db
from app.models.user import User
from app.dependencies import get_current_user_async
from app.services.knowledge_processing_service import (
    KnowledgeProcessingService, 
    ProcessingJob, 
    ProcessingStatus
)
from app.api.api_v1.ai_knowledge import _ensure_bot_owned
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# 回應模型
class ProcessingJobResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    total_chunks: int
    processed_chunks: int
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    metadata: dict

class JobStatisticsResponse(BaseModel):
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    active_jobs_count: int

def _job_to_response(job: ProcessingJob) -> ProcessingJobResponse:
    """轉換任務為回應格式"""
    return ProcessingJobResponse(
        job_id=job.job_id,
        status=job.status.value,
        progress=job.progress,
        total_chunks=job.total_chunks,
        processed_chunks=job.processed_chunks,
        error_message=job.error_message,
        created_at=job.created_at.isoformat(),
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        metadata=job.metadata
    )

@router.post("/{bot_id}/knowledge/file/async", response_model=ProcessingJobResponse)
async def upload_file_async(
    bot_id: str,
    scope: str = Form("project"),
    file: UploadFile = File(...),
    chunk_size: int = Form(800),
    overlap: int = Form(80),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    非同步檔案上傳處理
    
    - 立即返回任務 ID
    - 背景處理檔案切塊和向量化
    - 支援進度追蹤
    """
    await _ensure_bot_owned(db, bot_id, current_user.id)
    
    # 檢查檔案格式
    if not file.filename or not file.filename.lower().endswith(('.txt', '.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="僅支援 .txt, .pdf, .docx 格式")
    
    # 檢查並發限制
    active_jobs = KnowledgeProcessingService.get_active_jobs_count()
    if active_jobs >= KnowledgeProcessingService.MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429, 
            detail=f"系統繁忙，當前有 {active_jobs} 個任務正在處理，請稍後再試"
        )
    
    try:
        # 提交處理任務
        job_id = await KnowledgeProcessingService.submit_file_processing(
            bot_id=bot_id,
            user_id=str(current_user.id),
            file=file,
            scope=scope,
            chunk_size=chunk_size,
            overlap=overlap
        )
        
        # 獲取任務狀態
        job = await KnowledgeProcessingService.get_job_status(job_id)
        if not job:
            raise HTTPException(status_code=500, detail="任務創建失敗")
        
        return _job_to_response(job)
        
    except Exception as e:
        logger.error(f"檔案上傳任務創建失敗: {e}")
        raise HTTPException(status_code=500, detail=f"任務創建失敗: {str(e)}")

@router.post("/{bot_id}/knowledge/text/async", response_model=ProcessingJobResponse)
async def add_text_async(
    bot_id: str,
    content: str = Form(...),
    scope: str = Form("project"),
    auto_chunk: bool = Form(True),
    chunk_size: int = Form(800),
    overlap: int = Form(80),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    非同步文字處理
    
    - 立即返回任務 ID
    - 背景處理文字切塊和向量化
    - 支援進度追蹤
    """
    await _ensure_bot_owned(db, bot_id, current_user.id)
    
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="內容不可為空")
    
    # 檢查並發限制
    active_jobs = KnowledgeProcessingService.get_active_jobs_count()
    if active_jobs >= KnowledgeProcessingService.MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429, 
            detail=f"系統繁忙，當前有 {active_jobs} 個任務正在處理，請稍後再試"
        )
    
    try:
        # 提交處理任務
        job_id = await KnowledgeProcessingService.submit_text_processing(
            bot_id=bot_id,
            user_id=str(current_user.id),
            content=content.strip(),
            scope=scope,
            auto_chunk=auto_chunk,
            chunk_size=chunk_size,
            overlap=overlap
        )
        
        # 獲取任務狀態
        job = await KnowledgeProcessingService.get_job_status(job_id)
        if not job:
            raise HTTPException(status_code=500, detail="任務創建失敗")
        
        return _job_to_response(job)
        
    except Exception as e:
        logger.error(f"文字處理任務創建失敗: {e}")
        raise HTTPException(status_code=500, detail=f"任務創建失敗: {str(e)}")

@router.get("/{bot_id}/knowledge/jobs/{job_id}", response_model=ProcessingJobResponse)
async def get_job_status(
    bot_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    獲取處理任務狀態
    
    - 返回任務進度和狀態
    - 包含錯誤訊息（如果有）
    """
    await _ensure_bot_owned(db, bot_id, current_user.id)
    
    job = await KnowledgeProcessingService.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="任務不存在")
    
    # 檢查任務是否屬於當前用戶
    if job.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="無權限查看此任務")
    
    return _job_to_response(job)

@router.get("/{bot_id}/knowledge/jobs", response_model=list[ProcessingJobResponse])
async def list_user_jobs(
    bot_id: str,
    status: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    列出用戶的處理任務
    
    - 支援按狀態篩選
    - 分頁支援
    """
    await _ensure_bot_owned(db, bot_id, current_user.id)
    
    # 獲取用戶的任務
    user_jobs = []
    for job in KnowledgeProcessingService._active_jobs.values():
        if job.user_id == str(current_user.id) and job.bot_id == bot_id:
            if status is None or job.status.value == status:
                user_jobs.append(job)
    
    # 按創建時間排序，最新的在前
    user_jobs.sort(key=lambda x: x.created_at, reverse=True)
    
    # 限制數量
    user_jobs = user_jobs[:limit]
    
    return [_job_to_response(job) for job in user_jobs]

@router.get("/system/knowledge/statistics", response_model=JobStatisticsResponse)
async def get_system_statistics(
    current_user: User = Depends(get_current_user_async),
):
    """
    獲取系統統計資訊
    
    - 任務狀態統計
    - 系統負載資訊
    """
    # 這裡可以加入管理員權限檢查
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="需要管理員權限")
    
    stats = KnowledgeProcessingService.get_job_statistics()
    stats["active_jobs_count"] = KnowledgeProcessingService.get_active_jobs_count()
    
    return JobStatisticsResponse(**stats)

@router.delete("/{bot_id}/knowledge/jobs/{job_id}")
async def cancel_job(
    bot_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
):
    """
    取消處理任務
    
    - 只能取消待處理或處理中的任務
    - 只能取消自己的任務
    """
    await _ensure_bot_owned(db, bot_id, current_user.id)
    
    job = await KnowledgeProcessingService.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="任務不存在")
    
    # 檢查任務是否屬於當前用戶
    if job.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="無權限操作此任務")
    
    # 檢查任務狀態
    if job.status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
        raise HTTPException(status_code=400, detail="無法取消已完成或失敗的任務")
    
    # 標記為失敗（實際的取消邏輯需要在背景任務中實現）
    job.status = ProcessingStatus.FAILED
    job.error_message = "用戶取消"
    
    return {"message": "任務已取消"}

@router.post("/system/knowledge/cleanup")
async def cleanup_jobs(
    max_age_hours: int = 24,
    current_user: User = Depends(get_current_user_async),
):
    """
    清理過期任務
    
    - 清理已完成或失敗的舊任務
    - 釋放記憶體
    """
    # 這裡可以加入管理員權限檢查
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="需要管理員權限")
    
    await KnowledgeProcessingService.cleanup_completed_jobs(max_age_hours)
    
    return {"message": f"已清理超過 {max_age_hours} 小時的過期任務"}
