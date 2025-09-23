"""
批次操作 API
提供知識庫批次處理和管理功能。
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.services.batch_processing_service import BatchProcessingService, BatchJob
from app.services.embedding_manager import EmbeddingManager
from app.services.rerank_service import RerankService

router = APIRouter()


# === Pydantic 模型 ===
class BatchEmbedRequest(BaseModel):
    """批次嵌入請求"""
    model_config = ConfigDict(protected_namespaces=())

    document_ids: List[str] = Field(..., description="文檔 ID 列表")
    model_name: Optional[str] = Field(None, description="嵌入模型名稱")
    batch_size: int = Field(50, ge=1, le=200, description="批次大小")


class BatchReprocessRequest(BaseModel):
    """批次重新處理請求"""
    model_config = ConfigDict(protected_namespaces=())

    bot_id: Optional[str] = Field(None, description="Bot ID（空值表示處理所有）")
    old_model: str = Field("all-MiniLM-L6-v2", description="舊模型名稱")
    new_model: str = Field("all-mpnet-base-v2", description="新模型名稱")
    batch_size: int = Field(50, ge=1, le=200, description="批次大小")


class BatchJobResponse(BaseModel):
    """批次作業回應"""
    job_id: str
    job_type: str
    status: str
    progress: float
    total_items: int
    processed_items: int
    failed_items: int
    duration: Optional[float]
    metadata: Optional[Dict[str, Any]]


class ModelInfoResponse(BaseModel):
    """模型資訊回應"""
    id: str
    name: str
    dimensions: int
    description: str
    performance: str
    quality: str


# === API 端點 ===
@router.post("/embed-documents", response_model=Dict[str, str])
async def batch_embed_documents(
    request: BatchEmbedRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    批次為文檔生成嵌入向量
    """
    try:
        job_id = await BatchProcessingService.batch_embed_documents(
            db=db,
            document_ids=request.document_ids,
            model_name=request.model_name,
            batch_size=request.batch_size
        )
        
        return {
            "job_id": job_id,
            "message": f"批次嵌入作業已啟動，處理 {len(request.document_ids)} 個文檔"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"啟動批次嵌入失敗: {str(e)}")


@router.post("/reprocess-embeddings", response_model=Dict[str, str])
async def batch_reprocess_embeddings(
    request: BatchReprocessRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    批次重新處理嵌入向量（模型升級）
    """
    try:
        job_id = await BatchProcessingService.batch_reprocess_embeddings(
            db=db,
            bot_id=request.bot_id,
            old_model=request.old_model,
            new_model=request.new_model,
            batch_size=request.batch_size
        )
        
        scope = f"Bot {request.bot_id}" if request.bot_id else "所有 Bot"
        return {
            "job_id": job_id,
            "message": f"批次重新處理作業已啟動，範圍: {scope}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"啟動批次重新處理失敗: {str(e)}")


@router.get("/jobs", response_model=List[BatchJobResponse])
async def list_batch_jobs():
    """
    列出所有批次作業
    """
    try:
        jobs_data = BatchProcessingService.list_active_jobs()
        return [BatchJobResponse(**job) for job in jobs_data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取作業列表失敗: {str(e)}")


@router.get("/jobs/{job_id}", response_model=BatchJobResponse)
async def get_batch_job(job_id: str):
    """
    獲取特定批次作業的詳細資訊
    """
    job = BatchProcessingService.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="作業不存在")
    
    return BatchJobResponse(
        job_id=job.job_id,
        job_type=job.job_type,
        status=job.status.value,
        progress=job.progress_percentage,
        total_items=job.total_items,
        processed_items=job.processed_items,
        failed_items=job.failed_items,
        duration=job.duration,
        metadata=job.metadata
    )


@router.delete("/jobs/{job_id}")
async def cancel_batch_job(job_id: str):
    """
    取消批次作業
    """
    success = BatchProcessingService.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="作業不存在或無法取消")
    
    return {"message": f"作業 {job_id} 已取消"}


@router.post("/cleanup-jobs")
async def cleanup_completed_jobs(max_age_hours: int = 24):
    """
    清理已完成的作業
    """
    try:
        BatchProcessingService.cleanup_completed_jobs(max_age_hours)
        return {"message": f"已清理超過 {max_age_hours} 小時的已完成作業"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理作業失敗: {str(e)}")


@router.get("/embedding-models", response_model=List[ModelInfoResponse])
async def list_embedding_models():
    """
    列出可用的嵌入模型
    """
    try:
        models = EmbeddingManager.list_available_models()
        return [
            ModelInfoResponse(
                id=model["id"],
                name=model["name"],
                dimensions=model["dimensions"],
                description=model["description"],
                performance=model["performance"],
                quality=model["quality"]
            )
            for model in models
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取模型列表失敗: {str(e)}")


@router.get("/rerank-models", response_model=List[Dict[str, Any]])
async def list_rerank_models():
    """
    列出可用的重排序模型
    """
    try:
        models = RerankService.list_available_models()
        return models
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取重排序模型列表失敗: {str(e)}")


@router.get("/cache-info")
async def get_cache_info():
    """
    獲取快取資訊
    """
    try:
        cache_info = EmbeddingManager.get_cache_info()
        return {
            "embedding_cache": cache_info,
            "message": "快取資訊獲取成功"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取快取資訊失敗: {str(e)}")


@router.post("/clear-cache")
async def clear_cache():
    """
    清除嵌入快取
    """
    try:
        EmbeddingManager.clear_cache()
        return {"message": "嵌入快取已清除"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清除快取失敗: {str(e)}")


@router.get("/system-status")
async def get_system_status():
    """
    獲取系統狀態
    """
    try:
        active_jobs = BatchProcessingService.list_active_jobs()
        cache_info = EmbeddingManager.get_cache_info()
        
        # 統計作業狀態
        job_stats = {}
        for job in active_jobs:
            status = job["status"]
            job_stats[status] = job_stats.get(status, 0) + 1
        
        return {
            "active_jobs_count": len(active_jobs),
            "job_status_breakdown": job_stats,
            "cache_hit_rate": cache_info.get("hit_rate", 0),
            "cache_size": cache_info.get("currsize", 0),
            "available_embedding_models": len(EmbeddingManager.SUPPORTED_MODELS),
            "available_rerank_models": len(RerankService.SUPPORTED_MODELS),
            "system_healthy": True
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "system_healthy": False
        }
