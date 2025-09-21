"""
批次處理服務
提供高效的批次嵌入處理和知識庫管理功能。
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple, Callable
from datetime import datetime
import time
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert

from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.embedding_manager import EmbeddingManager
from app.utils.retry_utils import async_retry, DATABASE_RETRY_CONFIG

logger = logging.getLogger(__name__)


class BatchStatus(Enum):
    """批次處理狀態"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class BatchJob:
    """批次作業資訊"""
    job_id: str
    job_type: str
    total_items: int
    processed_items: int = 0
    failed_items: int = 0
    status: BatchStatus = BatchStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    @property
    def progress_percentage(self) -> float:
        """計算進度百分比"""
        if self.total_items == 0:
            return 100.0
        return (self.processed_items / self.total_items) * 100
    
    @property
    def duration(self) -> Optional[float]:
        """計算執行時間（秒）"""
        if self.start_time is None:
            return None
        end_time = self.end_time or datetime.now()
        return (end_time - self.start_time).total_seconds()


class BatchProcessingService:
    """批次處理服務"""
    
    _active_jobs: Dict[str, BatchJob] = {}
    _job_callbacks: Dict[str, List[Callable]] = {}
    
    @classmethod
    def generate_job_id(cls, prefix: str = "batch") -> str:
        """生成作業 ID"""
        timestamp = int(time.time() * 1000)
        return f"{prefix}_{timestamp}"
    
    @classmethod
    def register_job(cls, job: BatchJob) -> str:
        """註冊批次作業"""
        cls._active_jobs[job.job_id] = job
        cls._job_callbacks[job.job_id] = []
        logger.info(f"註冊批次作業: {job.job_id} ({job.job_type})")
        return job.job_id
    
    @classmethod
    def get_job(cls, job_id: str) -> Optional[BatchJob]:
        """獲取作業資訊"""
        return cls._active_jobs.get(job_id)
    
    @classmethod
    def add_job_callback(cls, job_id: str, callback: Callable[[BatchJob], None]):
        """添加作業回調函數"""
        if job_id in cls._job_callbacks:
            cls._job_callbacks[job_id].append(callback)
    
    @classmethod
    def _notify_callbacks(cls, job_id: str):
        """通知回調函數"""
        job = cls._active_jobs.get(job_id)
        if job and job_id in cls._job_callbacks:
            for callback in cls._job_callbacks[job_id]:
                try:
                    callback(job)
                except Exception as e:
                    logger.error(f"作業回調執行失敗: {e}")
    
    @classmethod
    def update_job_progress(cls, job_id: str, processed: int, failed: int = 0):
        """更新作業進度"""
        if job_id in cls._active_jobs:
            job = cls._active_jobs[job_id]
            job.processed_items = processed
            job.failed_items = failed
            cls._notify_callbacks(job_id)
    
    @classmethod
    def complete_job(cls, job_id: str, success: bool = True, error_message: str = None):
        """完成作業"""
        if job_id in cls._active_jobs:
            job = cls._active_jobs[job_id]
            job.status = BatchStatus.COMPLETED if success else BatchStatus.FAILED
            job.end_time = datetime.now()
            if error_message:
                job.error_message = error_message
            cls._notify_callbacks(job_id)
            logger.info(f"批次作業完成: {job_id} ({'成功' if success else '失敗'})")
    
    @classmethod
    async def batch_embed_documents(
        cls,
        db: AsyncSession,
        document_ids: List[str],
        model_name: str = None,
        batch_size: int = 50,
        chunk_size: int = 1000,
        progress_callback: Optional[Callable[[BatchJob], None]] = None
    ) -> str:
        """
        批次為文檔生成嵌入向量
        
        Args:
            db: 資料庫會話
            document_ids: 文檔 ID 列表
            model_name: 嵌入模型名稱
            batch_size: 批次大小
            chunk_size: 文本分塊大小
            progress_callback: 進度回調函數
        
        Returns:
            作業 ID
        """
        # 創建批次作業
        job_id = cls.generate_job_id("embed_docs")
        
        # 獲取需要處理的知識塊
        chunks_query = select(KnowledgeChunk).where(
            KnowledgeChunk.document_id.in_(document_ids)
        )
        result = await db.execute(chunks_query)
        chunks = result.scalars().all()
        
        job = BatchJob(
            job_id=job_id,
            job_type="embed_documents",
            total_items=len(chunks),
            metadata={
                "document_ids": document_ids,
                "model_name": model_name,
                "batch_size": batch_size
            }
        )
        
        cls.register_job(job)
        if progress_callback:
            cls.add_job_callback(job_id, progress_callback)
        
        # 啟動批次處理
        asyncio.create_task(cls._process_embedding_batch(db, job, chunks, model_name, batch_size))
        
        return job_id
    
    @classmethod
    @async_retry(**DATABASE_RETRY_CONFIG)
    async def _process_embedding_batch(
        cls,
        db: AsyncSession,
        job: BatchJob,
        chunks: List[KnowledgeChunk],
        model_name: str,
        batch_size: int
    ):
        """處理嵌入批次作業"""
        try:
            job.status = BatchStatus.PROCESSING
            job.start_time = datetime.now()
            cls._notify_callbacks(job.job_id)
            
            processed_count = 0
            failed_count = 0
            
            # 分批處理
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                
                try:
                    # 提取文本內容
                    texts = [chunk.content for chunk in batch_chunks]
                    
                    # 生成嵌入向量
                    embeddings = await EmbeddingManager.embed_texts_batch(
                        texts, model_name=model_name, batch_size=batch_size
                    )
                    
                    # 更新資料庫（統一寫入 768 維 pgvector 欄位 embedding）
                    for chunk, embedding in zip(batch_chunks, embeddings):
                        await db.execute(
                            update(KnowledgeChunk)
                            .where(KnowledgeChunk.id == chunk.id)
                            .values(
                                embedding=embedding,
                                embedding_model=model_name or EmbeddingManager.DEFAULT_MODEL,
                                embedding_dimensions=str(EmbeddingManager.get_embedding_dimensions(model_name))
                            )
                        )
                    
                    await db.commit()
                    processed_count += len(batch_chunks)
                    
                except Exception as e:
                    logger.error(f"批次處理失敗: {e}")
                    failed_count += len(batch_chunks)
                    await db.rollback()
                
                # 更新進度
                cls.update_job_progress(job.job_id, processed_count, failed_count)
                
                # 短暫休息避免過載
                await asyncio.sleep(0.1)
            
            # 完成作業
            success = failed_count == 0
            cls.complete_job(job.job_id, success, 
                           f"處理失敗 {failed_count} 項" if not success else None)
            
        except Exception as e:
            logger.error(f"批次嵌入作業失敗: {e}")
            cls.complete_job(job.job_id, False, str(e))
    
    @classmethod
    async def batch_reprocess_embeddings(
        cls,
        db: AsyncSession,
        bot_id: Optional[str] = None,
        old_model: str = "all-MiniLM-L6-v2",
        new_model: str = "all-mpnet-base-v2",
        batch_size: int = 50,
        progress_callback: Optional[Callable[[BatchJob], None]] = None
    ) -> str:
        """
        批次重新處理嵌入向量（模型升級）
        
        Args:
            db: 資料庫會話
            bot_id: Bot ID（None 表示處理所有）
            old_model: 舊模型名稱
            new_model: 新模型名稱
            batch_size: 批次大小
            progress_callback: 進度回調函數
        
        Returns:
            作業 ID
        """
        # 創建批次作業
        job_id = cls.generate_job_id("reprocess_embed")
        
        # 查詢需要重新處理的知識塊
        query = select(KnowledgeChunk).where(
            (KnowledgeChunk.embedding_model == old_model) |
            (KnowledgeChunk.embedding_model.is_(None))
        )
        
        if bot_id:
            query = query.where(KnowledgeChunk.bot_id == bot_id)
        
        result = await db.execute(query)
        chunks = result.scalars().all()
        
        job = BatchJob(
            job_id=job_id,
            job_type="reprocess_embeddings",
            total_items=len(chunks),
            metadata={
                "bot_id": bot_id,
                "old_model": old_model,
                "new_model": new_model,
                "batch_size": batch_size
            }
        )
        
        cls.register_job(job)
        if progress_callback:
            cls.add_job_callback(job_id, progress_callback)
        
        # 啟動批次處理
        asyncio.create_task(cls._process_embedding_batch(db, job, chunks, new_model, batch_size))
        
        return job_id
    
    @classmethod
    def list_active_jobs(cls) -> List[Dict[str, Any]]:
        """列出活躍的批次作業"""
        jobs = []
        for job_id, job in cls._active_jobs.items():
            jobs.append({
                "job_id": job_id,
                "job_type": job.job_type,
                "status": job.status.value,
                "progress": job.progress_percentage,
                "total_items": job.total_items,
                "processed_items": job.processed_items,
                "failed_items": job.failed_items,
                "duration": job.duration,
                "metadata": job.metadata
            })
        return jobs
    
    @classmethod
    def cancel_job(cls, job_id: str) -> bool:
        """取消批次作業"""
        if job_id in cls._active_jobs:
            job = cls._active_jobs[job_id]
            if job.status in [BatchStatus.PENDING, BatchStatus.PROCESSING]:
                job.status = BatchStatus.CANCELLED
                job.end_time = datetime.now()
                cls._notify_callbacks(job_id)
                logger.info(f"批次作業已取消: {job_id}")
                return True
        return False
    
    @classmethod
    def cleanup_completed_jobs(cls, max_age_hours: int = 24):
        """清理已完成的作業"""
        current_time = datetime.now()
        to_remove = []
        
        for job_id, job in cls._active_jobs.items():
            if job.status in [BatchStatus.COMPLETED, BatchStatus.FAILED, BatchStatus.CANCELLED]:
                if job.end_time and (current_time - job.end_time).total_seconds() > max_age_hours * 3600:
                    to_remove.append(job_id)
        
        for job_id in to_remove:
            del cls._active_jobs[job_id]
            if job_id in cls._job_callbacks:
                del cls._job_callbacks[job_id]
        
        if to_remove:
            logger.info(f"清理了 {len(to_remove)} 個過期的批次作業")
