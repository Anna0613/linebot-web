"""
知識庫處理服務 - 優化版本
實現非同步處理、批次操作和進度追蹤
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Callable
from dataclasses import dataclass
from enum import Enum
import io

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from fastapi import UploadFile

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.services.text_chunker import recursive_split
from app.services.embedding_service import embed_texts
from app.services.file_text_extractor import extract_text_by_mime
from app.services.background_tasks import get_task_manager, TaskPriority
from app.services.minio_service import get_minio_service
from app.services.adaptive_concurrency import get_adaptive_concurrency_manager

logger = logging.getLogger(__name__)

class ProcessingStatus(Enum):
    """處理狀態"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class ProcessingJob:
    """處理任務"""
    job_id: str
    bot_id: str
    user_id: str
    status: ProcessingStatus
    progress: float = 0.0
    total_chunks: int = 0
    processed_chunks: int = 0
    error_message: Optional[str] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}

class KnowledgeProcessingService:
    """知識庫處理服務"""

    # 並發限制（更新為更高的基礎值）
    BASE_CONCURRENT_JOBS = 8  # 從 5 提升到 8
    MAX_CONCURRENT_JOBS = 15  # 最大並發數
    MAX_CHUNKS_PER_BATCH = 50
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 從 10MB 提升到 50MB

    # 活躍任務追蹤
    _active_jobs: Dict[str, ProcessingJob] = {}
    _processing_semaphore: Optional[asyncio.Semaphore] = None
    _concurrency_manager = None
    _last_semaphore_update = 0
    
    @classmethod
    def generate_job_id(cls) -> str:
        """生成任務 ID"""
        return f"knowledge_processing_{uuid.uuid4().hex}"

    @classmethod
    async def _get_processing_semaphore(cls) -> asyncio.Semaphore:
        """獲取動態調整的處理信號量"""
        import time

        # 初始化並發管理器
        if cls._concurrency_manager is None:
            cls._concurrency_manager = get_adaptive_concurrency_manager()

        current_time = time.time()

        # 每 30 秒或首次使用時更新信號量
        if (cls._processing_semaphore is None or
            current_time - cls._last_semaphore_update > 30):

            optimal_concurrency = await cls._concurrency_manager.get_optimal_concurrency()

            # 如果並發數有變化，創建新的信號量
            if (cls._processing_semaphore is None or
                cls._processing_semaphore._value != optimal_concurrency):

                old_value = cls._processing_semaphore._value if cls._processing_semaphore else cls.BASE_CONCURRENT_JOBS
                cls._processing_semaphore = asyncio.Semaphore(optimal_concurrency)
                cls._last_semaphore_update = current_time

                logger.info(f"並發信號量更新: {old_value} -> {optimal_concurrency}")

        return cls._processing_semaphore

    @classmethod
    def get_active_jobs_count(cls) -> int:
        """獲取活躍任務數量"""
        return len(cls._active_jobs)
    
    @classmethod
    async def submit_file_processing(
        cls,
        bot_id: str,
        user_id: str,
        file: UploadFile,
        scope: str = "project",
        chunk_size: int = 800,
        overlap: int = 80,
        progress_callback: Optional[Callable[[ProcessingJob], None]] = None
    ) -> str:
        """
        提交檔案處理任務
        
        Returns:
            job_id: 任務 ID
        """
        job_id = cls.generate_job_id()
        
        # 創建處理任務
        job = ProcessingJob(
            job_id=job_id,
            bot_id=bot_id,
            user_id=user_id,
            status=ProcessingStatus.PENDING,
            metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "scope": scope,
                "chunk_size": chunk_size,
                "overlap": overlap
            }
        )
        
        cls._active_jobs[job_id] = job
        
        # 提交到背景任務管理器
        task_manager = get_task_manager()
        await task_manager.add_task(
            job_id,
            f"知識庫檔案處理: {file.filename}",
            cls._process_file_async,
            kwargs={
                "job_id": job_id,
                "file_data": await file.read(),
                "progress_callback": progress_callback
            },
            priority=TaskPriority.NORMAL
        )
        
        logger.info(f"檔案處理任務已提交: {job_id} - {file.filename}")
        return job_id
    
    @classmethod
    async def submit_text_processing(
        cls,
        bot_id: str,
        user_id: str,
        content: str,
        scope: str = "project",
        auto_chunk: bool = True,
        chunk_size: int = 800,
        overlap: int = 80,
        progress_callback: Optional[Callable[[ProcessingJob], None]] = None
    ) -> str:
        """
        提交文字處理任務
        
        Returns:
            job_id: 任務 ID
        """
        job_id = cls.generate_job_id()
        
        # 創建處理任務
        job = ProcessingJob(
            job_id=job_id,
            bot_id=bot_id,
            user_id=user_id,
            status=ProcessingStatus.PENDING,
            metadata={
                "content_length": len(content),
                "scope": scope,
                "auto_chunk": auto_chunk,
                "chunk_size": chunk_size,
                "overlap": overlap
            }
        )
        
        cls._active_jobs[job_id] = job
        
        # 提交到背景任務管理器
        task_manager = get_task_manager()
        await task_manager.add_task(
            job_id,
            "知識庫文字處理",
            cls._process_text_async,
            kwargs={
                "job_id": job_id,
                "content": content,
                "progress_callback": progress_callback
            },
            priority=TaskPriority.NORMAL
        )
        
        logger.info(f"文字處理任務已提交: {job_id}")
        return job_id
    
    @classmethod
    async def get_job_status(cls, job_id: str) -> Optional[ProcessingJob]:
        """獲取任務狀態"""
        return cls._active_jobs.get(job_id)
    
    @classmethod
    async def _process_file_async(
        cls,
        job_id: str,
        file_data: bytes,
        progress_callback: Optional[Callable[[ProcessingJob], None]] = None
    ):
        """非同步處理檔案"""
        semaphore = await cls._get_processing_semaphore()
        async with semaphore:
            job = cls._active_jobs.get(job_id)
            if not job:
                logger.error(f"找不到任務: {job_id}")
                return
            
            try:
                job.status = ProcessingStatus.PROCESSING
                if progress_callback:
                    progress_callback(job)
                
                # 檔案大小檢查
                if len(file_data) > cls.MAX_FILE_SIZE:
                    raise ValueError(f"檔案大小超過 {cls.MAX_FILE_SIZE // 1024 // 1024}MB 限制")
                
                # 提取文字
                filename = job.metadata.get("filename", "")
                content_type = job.metadata.get("content_type")
                
                job.progress = 0.1
                if progress_callback:
                    progress_callback(job)
                
                # 將文字提取移至 thread pool，避免阻塞事件圈
                import asyncio as _asyncio
                text = await _asyncio.to_thread(extract_text_by_mime, filename, content_type, file_data)
                
                job.progress = 0.3
                if progress_callback:
                    progress_callback(job)
                
                # 處理文字內容
                await cls._process_extracted_text(job, text, file_data, progress_callback)
                
            except Exception as e:
                logger.error(f"檔案處理失敗 {job_id}: {e}")
                job.status = ProcessingStatus.FAILED
                job.error_message = str(e)
                if progress_callback:
                    progress_callback(job)
    
    @classmethod
    async def _process_text_async(
        cls,
        job_id: str,
        content: str,
        progress_callback: Optional[Callable[[ProcessingJob], None]] = None
    ):
        """非同步處理文字"""
        semaphore = await cls._get_processing_semaphore()
        async with semaphore:
            job = cls._active_jobs.get(job_id)
            if not job:
                logger.error(f"找不到任務: {job_id}")
                return
            
            try:
                job.status = ProcessingStatus.PROCESSING
                if progress_callback:
                    progress_callback(job)
                
                # 處理文字內容
                await cls._process_extracted_text(job, content, None, progress_callback)
                
            except Exception as e:
                logger.error(f"文字處理失敗 {job_id}: {e}")
                job.status = ProcessingStatus.FAILED
                job.error_message = str(e)
                if progress_callback:
                    progress_callback(job)
    
    @classmethod
    async def _process_extracted_text(
        cls,
        job: ProcessingJob,
        text: str,
        file_data: Optional[bytes] = None,
        progress_callback: Optional[Callable[[ProcessingJob], None]] = None
    ):
        """處理提取的文字"""
        from app.database_async import get_async_db
        
        # 獲取資料庫會話
        async for db in get_async_db():
            try:
                # 清理文字以確保資料庫相容性
                from app.services.file_text_extractor import clean_text_for_database
                text = clean_text_for_database(text)

                # 文字切塊
                chunk_size = job.metadata.get("chunk_size", 800)
                overlap = job.metadata.get("overlap", 80)
                auto_chunk = job.metadata.get("auto_chunk", True)

                if auto_chunk and len(text) > 500:
                    chunks = recursive_split(text, chunk_size=chunk_size, overlap=overlap)
                else:
                    chunks = [text]

                # 清理每個切塊
                chunks = [clean_text_for_database(chunk) for chunk in chunks]
                
                job.total_chunks = len(chunks)
                job.progress = 0.4
                if progress_callback:
                    progress_callback(job)
                
                # 批次生成嵌入向量
                embeddings = await cls._generate_embeddings_batch(chunks, job, progress_callback)
                
                # 批次插入資料庫
                await cls._batch_insert_knowledge(db, job, text, chunks, embeddings, file_data)
                
                job.status = ProcessingStatus.COMPLETED
                job.progress = 1.0
                job.completed_at = datetime.utcnow()
                if progress_callback:
                    progress_callback(job)
                
                logger.info(f"知識處理完成: {job.job_id} - {len(chunks)} 個切塊")
                
            except Exception as e:
                await db.rollback()
                raise e
            finally:
                await db.close()
    
    @classmethod
    async def _generate_embeddings_batch(
        cls,
        chunks: List[str],
        job: ProcessingJob,
        progress_callback: Optional[Callable[[ProcessingJob], None]] = None
    ) -> List[List[float]]:
        """批次生成嵌入向量"""
        embeddings = []
        
        # 分批處理以控制記憶體使用
        for i in range(0, len(chunks), cls.MAX_CHUNKS_PER_BATCH):
            batch_chunks = chunks[i:i + cls.MAX_CHUNKS_PER_BATCH]
            
            # 生成嵌入向量
            batch_embeddings = await embed_texts(batch_chunks, model_name="all-mpnet-base-v2")
            embeddings.extend(batch_embeddings)
            
            # 更新進度
            job.processed_chunks = min(i + len(batch_chunks), len(chunks))
            job.progress = 0.4 + (job.processed_chunks / len(chunks)) * 0.4  # 40%-80%
            if progress_callback:
                progress_callback(job)
            
            # 短暫休息以避免過度佔用資源
            await asyncio.sleep(0.1)
        
        return embeddings

    @classmethod
    def _clean_embedding(cls, embedding: List[float]) -> List[float]:
        """
        清理嵌入向量，移除 NaN、Infinity 等無效值

        Args:
            embedding: 原始嵌入向量

        Returns:
            清理後的嵌入向量
        """
        import math

        cleaned_embedding = []
        for value in embedding:
            if math.isnan(value) or math.isinf(value):
                cleaned_embedding.append(0.0)  # 用 0.0 替換無效值
            else:
                cleaned_embedding.append(float(value))

        return cleaned_embedding

    @classmethod
    async def _batch_insert_knowledge(
        cls,
        db: AsyncSession,
        job: ProcessingJob,
        text: str,
        chunks: List[str],
        embeddings: List[List[float]],
        file_data: Optional[bytes] = None
    ):
        """批次插入知識庫資料"""
        scope = job.metadata.get("scope", "project")
        scope_bot = job.bot_id if scope == "project" else None

        # 上傳檔案到 MinIO（如果有檔案資料）
        object_path = None
        if file_data:
            object_path = await cls._upload_to_minio(job, file_data)

        # 創建文檔記錄
        doc = KnowledgeDocument(
            bot_id=scope_bot,
            source_type="file" if file_data else "text",
            title=job.metadata.get("filename", text[:40] + ("…" if len(text) > 40 else "")),
            original_file_name=job.metadata.get("filename"),
            object_path=object_path,
            chunked=len(chunks) > 1,
            meta={
                "source_type": "file" if file_data else "text",
                "filename": job.metadata.get("filename"),
                "content_type": job.metadata.get("content_type"),
                "job_id": job.job_id
            }
        )
        db.add(doc)
        await db.flush()

        # 批次插入知識塊
        chunk_data = []
        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            # 清理嵌入向量
            cleaned_embedding = cls._clean_embedding(embedding)

            chunk_data.append({
                "id": uuid.uuid4(),
                "document_id": doc.id,
                "bot_id": scope_bot,
                "content": chunk_text,
                "embedding": cleaned_embedding,
                "embedding_model": "all-mpnet-base-v2",
                "embedding_dimensions": "768",
                "meta": {"chunk_index": i, "source_type": "file" if file_data else "text"}
            })

        # 使用批次插入提升效能
        if chunk_data:
            await db.execute(insert(KnowledgeChunk).values(chunk_data))

        await db.commit()

        # 更新進度
        job.progress = 0.9
        logger.info(f"批次插入完成: {len(chunk_data)} 個知識塊")

    @classmethod
    async def _upload_to_minio(cls, job: ProcessingJob, file_data: bytes) -> Optional[str]:
        """上傳檔案到 MinIO"""
        minio = get_minio_service()
        if not minio:
            return None

        try:
            filename = job.metadata.get("filename", "upload")
            ext = filename.split(".")[-1].lower() if "." in filename else "bin"
            scope = job.metadata.get("scope", "project")
            user_folder = job.bot_id if scope == "project" else "global"

            object_path = f"{user_folder}/knowledge/{job.job_id}.{ext}"

            await asyncio.to_thread(
                minio.client.put_object,
                minio.bucket_name,
                object_path,
                io.BytesIO(file_data),
                len(file_data),
                content_type=job.metadata.get("content_type", "application/octet-stream")
            )

            logger.info(f"檔案上傳到 MinIO 成功: {object_path}")
            return object_path

        except Exception as e:
            logger.warning(f"MinIO 上傳失敗: {e}")
            return None

    @classmethod
    async def cleanup_completed_jobs(cls, max_age_hours: int = 24):
        """清理已完成的任務"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)

        jobs_to_remove = []
        for job_id, job in cls._active_jobs.items():
            if (job.status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED] and
                job.completed_at and job.completed_at < cutoff_time):
                jobs_to_remove.append(job_id)

        for job_id in jobs_to_remove:
            del cls._active_jobs[job_id]

        if jobs_to_remove:
            logger.info(f"清理了 {len(jobs_to_remove)} 個過期任務")

    @classmethod
    def get_active_jobs_count(cls) -> int:
        """獲取活躍任務數量"""
        return len([job for job in cls._active_jobs.values()
                   if job.status == ProcessingStatus.PROCESSING])

    @classmethod
    def get_job_statistics(cls) -> Dict[str, int]:
        """獲取任務統計"""
        stats = {
            "total": len(cls._active_jobs),
            "pending": 0,
            "processing": 0,
            "completed": 0,
            "failed": 0
        }

        for job in cls._active_jobs.values():
            stats[job.status.value] += 1

        return stats
