"""
MinIO 文件儲存服務
處理 LINE Bot 媒體文件的上傳、存儲和管理
"""
import logging
from typing import Optional, Tuple
from io import BytesIO
from pathlib import Path
import uuid
import aiofiles
import aiohttp
from datetime import timedelta

try:
    from minio import Minio
    from minio.error import S3Error
except ImportError:
    Minio = None
    S3Error = Exception

from app.config import settings

logger = logging.getLogger(__name__)

class MinIOService:
    """MinIO 文件儲存服務類"""
    
    def __init__(self):
        """初始化 MinIO 服務"""
        if not Minio:
            raise ImportError("請安裝 minio 套件: pip install minio")
        
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """確保 bucket 存在"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"創建 MinIO bucket: {self.bucket_name}")
            else:
                logger.info(f"MinIO bucket 已存在: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"MinIO bucket 操作失敗: {e}")
            raise
    
    def _get_file_extension(self, content_type: str) -> str:
        """根據 content type 獲取文件副檔名"""
        extension_map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'video/mp4': '.mp4',
            'video/quicktime': '.mov',
            'video/x-msvideo': '.avi',
            'audio/mp4': '.m4a',
            'audio/aac': '.aac',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'application/octet-stream': '.bin'
        }
        return extension_map.get(content_type, '.bin')
    
    def _get_media_folder(self, message_type: str) -> str:
        """根據消息類型獲取存儲資料夾"""
        folder_map = {
            'image': 'img',
            'video': 'video', 
            'audio': 'audio',
            'file': 'files'
        }
        return folder_map.get(message_type, 'misc')
    
    def _generate_object_path(self, user_id: str, message_type: str, file_extension: str) -> str:
        """生成 MinIO 對象路徑"""
        folder = self._get_media_folder(message_type)
        filename = f"{uuid.uuid4().hex}{file_extension}"
        return f"{user_id}/{folder}/{filename}"
    
    async def upload_media_from_line(
        self, 
        line_user_id: str, 
        message_type: str, 
        channel_token: str, 
        line_message_id: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        從 LINE API 下載媒體文件並上傳到 MinIO
        
        Args:
            line_user_id: LINE 用戶 ID
            message_type: 消息類型 (image, video, audio)
            channel_token: LINE Bot channel token
            line_message_id: LINE 消息 ID
            
        Returns:
            Tuple[media_path, media_url]: MinIO 路徑和公開 URL，失敗則返回 None
        """
        try:
            # 從 LINE API 下載媒體文件
            line_api_url = f"https://api.line.me/v2/bot/message/{line_message_id}/content"
            headers = {
                "Authorization": f"Bearer {channel_token}",
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(line_api_url, headers=headers) as response:
                    if response.status != 200:
                        logger.error(f"從 LINE API 下載媒體失敗: {response.status}")
                        return None, None
                    
                    # 獲取文件內容和類型
                    content_type = response.headers.get('Content-Type', 'application/octet-stream')
                    file_data = await response.read()
                    
                    if not file_data:
                        logger.error("從 LINE API 獲取的文件數據為空")
                        return None, None
                    
            # 生成存儲路徑
            file_extension = self._get_file_extension(content_type)
            object_path = self._generate_object_path(line_user_id, message_type, file_extension)
            
            # 上傳到 MinIO
            file_stream = BytesIO(file_data)
            file_size = len(file_data)
            
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_path,
                data=file_stream,
                length=file_size,
                content_type=content_type
            )
            
            # 生成預簽名 URL (7天有效期)
            presigned_url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_path,
                expires=timedelta(days=7)
            )
            
            logger.info(f"媒體文件上傳成功: {object_path}")
            return object_path, presigned_url
            
        except Exception as e:
            logger.error(f"上傳媒體文件到 MinIO 失敗: {e}")
            return None, None
    
    def get_presigned_url(self, object_path: str, expires: timedelta = timedelta(days=7)) -> Optional[str]:
        """
        獲取對象的預簽名 URL
        
        Args:
            object_path: MinIO 對象路徑
            expires: URL 有效期，默認 7 天
            
        Returns:
            預簽名 URL，失敗則返回 None
        """
        try:
            presigned_url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_path,
                expires=expires
            )
            return presigned_url
        except S3Error as e:
            logger.error(f"生成預簽名 URL 失敗: {e}")
            return None
    
    def delete_object(self, object_path: str) -> bool:
        """
        刪除 MinIO 中的對象
        
        Args:
            object_path: MinIO 對象路徑
            
        Returns:
            成功返回 True，失敗返回 False
        """
        try:
            self.client.remove_object(self.bucket_name, object_path)
            logger.info(f"媒體文件刪除成功: {object_path}")
            return True
        except S3Error as e:
            logger.error(f"刪除媒體文件失敗: {e}")
            return False
    
    def object_exists(self, object_path: str) -> bool:
        """
        檢查對象是否存在
        
        Args:
            object_path: MinIO 對象路徑
            
        Returns:
            存在返回 True，不存在返回 False
        """
        try:
            self.client.stat_object(self.bucket_name, object_path)
            return True
        except S3Error:
            return False

# 創建全局 MinIO 服務實例
try:
    minio_service = MinIOService()
except (ImportError, Exception) as e:
    logger.warning(f"MinIO 服務初始化失敗: {e}")
    minio_service = None

def get_minio_service() -> Optional[MinIOService]:
    """獲取 MinIO 服務實例"""
    return minio_service