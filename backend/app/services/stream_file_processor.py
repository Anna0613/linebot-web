"""
流式檔案處理器
支援大檔案分塊讀取，避免記憶體過載問題
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional, AsyncGenerator
from fastapi import UploadFile, HTTPException
import psutil

logger = logging.getLogger(__name__)


class StreamFileProcessor:
    """
    流式檔案處理器
    
    特點：
    - 支援分塊讀取，避免大檔案一次性載入記憶體
    - 在讀取過程中進行大小檢查
    - 監控系統記憶體使用情況
    - 支援檔案大小從 10MB 提升至 50MB
    """
    
    # 配置常數
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    CHUNK_SIZE = 1024 * 1024  # 1MB 分塊大小
    MEMORY_WARNING_THRESHOLD = 0.85  # 記憶體警告閾值
    MEMORY_CRITICAL_THRESHOLD = 0.95  # 記憶體危險閾值
    
    # 支援的檔案格式
    SUPPORTED_EXTENSIONS = {'.txt', '.pdf', '.docx'}
    SUPPORTED_MIME_TYPES = {
        'text/plain',
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    def __init__(self):
        """初始化流式檔案處理器"""
        self.processed_files_count = 0
        self.total_bytes_processed = 0
    
    async def check_system_memory(self) -> dict:
        """
        檢查系統記憶體使用情況
        
        Returns:
            dict: 包含記憶體使用資訊的字典
        """
        try:
            memory = psutil.virtual_memory()
            memory_info = {
                'total': memory.total,
                'available': memory.available,
                'percent': memory.percent / 100.0,
                'warning': memory.percent / 100.0 > self.MEMORY_WARNING_THRESHOLD,
                'critical': memory.percent / 100.0 > self.MEMORY_CRITICAL_THRESHOLD
            }
            
            if memory_info['critical']:
                logger.warning(f"系統記憶體使用率過高: {memory.percent:.1f}%")
            elif memory_info['warning']:
                logger.info(f"系統記憶體使用率較高: {memory.percent:.1f}%")
                
            return memory_info
        except Exception as e:
            logger.error(f"檢查系統記憶體失敗: {e}")
            return {'percent': 0.5, 'warning': False, 'critical': False}
    
    def validate_file_format(self, filename: str, content_type: Optional[str]) -> bool:
        """
        驗證檔案格式是否支援
        
        Args:
            filename: 檔案名稱
            content_type: MIME 類型
            
        Returns:
            bool: 是否支援該檔案格式
        """
        if not filename:
            return False
            
        # 檢查副檔名
        file_ext = '.' + filename.lower().split('.')[-1] if '.' in filename else ''
        if file_ext in self.SUPPORTED_EXTENSIONS:
            return True
            
        # 檢查 MIME 類型
        if content_type and content_type.lower() in self.SUPPORTED_MIME_TYPES:
            return True
            
        return False
    
    async def process_upload_stream(self, file: UploadFile) -> bytes:
        """
        流式處理上傳檔案
        
        Args:
            file: FastAPI UploadFile 物件
            
        Returns:
            bytes: 檔案內容
            
        Raises:
            HTTPException: 檔案格式不支援、檔案過大或系統記憶體不足
        """
        # 檢查檔案格式
        if not self.validate_file_format(file.filename, file.content_type):
            raise HTTPException(
                status_code=400, 
                detail="不支援的檔案格式，僅支援 .txt, .pdf, .docx 格式"
            )
        
        # 檢查系統記憶體
        memory_info = await self.check_system_memory()
        if memory_info['critical']:
            raise HTTPException(
                status_code=503,
                detail="系統記憶體不足，請稍後再試"
            )
        
        logger.info(f"開始流式處理檔案: {file.filename}")
        
        content = b""
        total_size = 0
        chunk_count = 0
        
        try:
            # 重置檔案指針到開頭
            await file.seek(0)
            
            while True:
                # 分塊讀取檔案
                chunk = await file.read(self.CHUNK_SIZE)
                if not chunk:
                    break
                
                chunk_count += 1
                chunk_size = len(chunk)
                total_size += chunk_size
                
                # 檢查檔案大小限制
                if total_size > self.MAX_FILE_SIZE:
                    logger.warning(
                        f"檔案 {file.filename} 大小超過限制: "
                        f"{total_size / 1024 / 1024:.2f}MB > {self.MAX_FILE_SIZE / 1024 / 1024}MB"
                    )
                    raise HTTPException(
                        status_code=413,
                        detail=f"檔案大小超過 {self.MAX_FILE_SIZE // 1024 // 1024}MB 限制"
                    )
                
                # 每處理 10 個分塊檢查一次記憶體
                if chunk_count % 10 == 0:
                    memory_info = await self.check_system_memory()
                    if memory_info['critical']:
                        logger.error(f"處理檔案 {file.filename} 時記憶體不足")
                        raise HTTPException(
                            status_code=503,
                            detail="系統記憶體不足，檔案處理中斷"
                        )
                
                content += chunk
                
                # 記錄進度（每 10MB 記錄一次）
                if total_size % (10 * 1024 * 1024) == 0 or chunk_count % 10 == 0:
                    logger.debug(
                        f"檔案 {file.filename} 處理進度: "
                        f"{total_size / 1024 / 1024:.2f}MB ({chunk_count} 個分塊)"
                    )
            
            # 更新統計資訊
            self.processed_files_count += 1
            self.total_bytes_processed += total_size
            
            logger.info(
                f"檔案 {file.filename} 流式處理完成: "
                f"{total_size / 1024 / 1024:.2f}MB, {chunk_count} 個分塊"
            )
            
            return content
            
        except HTTPException:
            # 重新拋出 HTTP 異常
            raise
        except Exception as e:
            logger.error(f"流式處理檔案 {file.filename} 失敗: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"檔案處理失敗: {str(e)}"
            )
        finally:
            # 確保檔案指針重置
            try:
                await file.seek(0)
            except Exception:
                pass
    
    async def get_file_chunks_async(self, file: UploadFile) -> AsyncGenerator[bytes, None]:
        """
        異步生成器，逐塊產生檔案內容
        
        Args:
            file: FastAPI UploadFile 物件
            
        Yields:
            bytes: 檔案分塊內容
        """
        try:
            await file.seek(0)
            total_size = 0
            
            while True:
                chunk = await file.read(self.CHUNK_SIZE)
                if not chunk:
                    break
                
                total_size += len(chunk)
                if total_size > self.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"檔案大小超過 {self.MAX_FILE_SIZE // 1024 // 1024}MB 限制"
                    )
                
                yield chunk
                
        except Exception as e:
            logger.error(f"生成檔案分塊失敗: {e}")
            raise
    
    def get_processing_stats(self) -> dict:
        """
        獲取處理統計資訊
        
        Returns:
            dict: 處理統計資訊
        """
        return {
            'processed_files_count': self.processed_files_count,
            'total_bytes_processed': self.total_bytes_processed,
            'total_mb_processed': self.total_bytes_processed / 1024 / 1024,
            'max_file_size_mb': self.MAX_FILE_SIZE / 1024 / 1024,
            'chunk_size_mb': self.CHUNK_SIZE / 1024 / 1024
        }


# 全域實例
_stream_processor = None

def get_stream_file_processor() -> StreamFileProcessor:
    """獲取全域流式檔案處理器實例"""
    global _stream_processor
    if _stream_processor is None:
        _stream_processor = StreamFileProcessor()
    return _stream_processor
