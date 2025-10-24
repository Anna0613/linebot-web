"""
MinIO 文件儲存服務
處理 LINE Bot 媒體文件的上傳、存儲和管理
"""
import logging
import asyncio
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

try:
    from linebot.v3.messaging import Configuration, ApiClient, MessagingApiBlob
except ImportError:
    Configuration = None
    ApiClient = None
    MessagingApiBlob = None

from app.config import settings

logger = logging.getLogger(__name__)

class MinIOService:
    """MinIO 文件儲存服務類"""
    
    def __init__(self):
        """初始化 MinIO 服務"""
        if not Minio:
            raise ImportError("請安裝 minio 套件: pip install minio")
        
        http_client = None
        # 建立 http_client 規則：
        # 1) 若提供自訂 CA -> 強制驗證且使用 CA 檔案
        # 2) 若關閉憑證檢查 -> 設為 CERT_NONE（僅限測試環境）
        # 3) 其他 -> 使用預設（系統/Certifi）
        try:
            import urllib3  # 由 minio 依賴帶入
            if settings.MINIO_CA_CERT_FILE:
                http_client = urllib3.PoolManager(
                    cert_reqs='CERT_REQUIRED',
                    ca_certs=settings.MINIO_CA_CERT_FILE
                )
                logger.info(f"使用自訂 CA 憑證: {settings.MINIO_CA_CERT_FILE}")
            elif not settings.MINIO_CERT_CHECK:
                # 關閉憑證驗證（僅限開發測試使用）
                urllib3.disable_warnings()  # 抑制 InsecureRequestWarning
                http_client = urllib3.PoolManager(cert_reqs='CERT_NONE')
                logger.warning("已關閉 HTTPS 憑證檢查（MINIO_CERT_CHECK=false）")
        except Exception as e:
            # 若 urllib3 初始化失敗則沿用預設 http_client=None
            logger.warning(f"建立客製 http_client 失敗，改用預設: {e}")
            http_client = None

        # 初始化 MinIO Client，優先嘗試使用 cert_check 參數，若不支援則回退
        try:
            self.client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
                cert_check=settings.MINIO_CERT_CHECK,
                http_client=http_client
            )
        except TypeError:
            # 舊版 minio SDK 無 cert_check 參數
            logger.info("當前 minio 套件不支援 cert_check 參數，使用回退初始化方式")
            self.client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
                http_client=http_client
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
        """生成 MinIO 對象路徑 - 格式: {userid}/{media_type}/{filename}"""
        folder = self._get_media_folder(message_type)
        filename = f"{uuid.uuid4().hex}{file_extension}"
        # 確保路徑格式為: {userid}/{img|video|audio}/{filename}
        object_path = f"{user_id}/{folder}/{filename}"
        logger.debug(f"生成媒體檔案路徑: {object_path}")
        return object_path
    
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
            logger.info(f"開始下載媒體檔案: user_id={line_user_id}, type={message_type}, message_id={line_message_id}")

            # 使用 LINE Bot SDK 下載媒體文件
            if not all([Configuration, ApiClient, MessagingApiBlob]):
                logger.error("LINE Bot SDK 未正確安裝，回退到 HTTP 方式")
                return await self._download_media_http(channel_token, line_message_id, line_user_id, message_type)

            # 使用官方 SDK
            configuration = Configuration(access_token=channel_token)

            try:
                with ApiClient(configuration) as api_client:
                    line_bot_blob_api = MessagingApiBlob(api_client)
                    file_data = await asyncio.to_thread(
                        lambda: line_bot_blob_api.get_message_content(message_id=line_message_id)
                    )

                    if not file_data:
                        logger.error("從 LINE API 獲取的文件數據為空")
                        return None, None

                    logger.info(f"成功下載媒體檔案，大小: {len(file_data)} bytes")

            except Exception as sdk_error:
                logger.warning(f"SDK 下載失敗，回退到 HTTP 方式: {sdk_error}")
                return await self._download_media_http(channel_token, line_message_id, line_user_id, message_type)

            # 生成存儲路徑 - 根據消息類型推斷文件擴展名
            file_extension = self._get_file_extension_by_type(message_type)
            object_path = self._generate_object_path(line_user_id, message_type, file_extension)

            # 上傳到 MinIO
            file_stream = BytesIO(file_data)
            file_size = len(file_data)

            # 根據消息類型設置 content_type
            content_type = self._get_content_type_by_type(message_type)

            await asyncio.to_thread(
                self.client.put_object,
                self.bucket_name,
                object_path,
                file_stream,
                file_size,
                content_type=content_type,
            )

            # 生成代理訪問 URL
            proxy_url = self.get_presigned_url(object_path)

            logger.info(f"媒體文件上傳成功: {object_path}")
            return object_path, proxy_url
            
        except Exception as e:
            logger.error(f"上傳媒體文件到 MinIO 失敗: {e}")
            return None, None
    
    def get_presigned_url(self, object_path: str, expires: timedelta = timedelta(days=7)) -> Optional[str]:
        """
        獲取對象的訪問 URL

        由於 Cloudflare tunnel 的簽名問題，改用代理 API 方式

        Args:
            object_path: MinIO 對象路徑
            expires: URL 有效期（此參數保留兼容性，實際不使用）

        Returns:
            代理訪問 URL，失敗則返回 None
        """
        try:
            # 使用代理 API 生成 URL，避免預簽名 URL 的簽名問題
            from urllib.parse import quote

            # 對 object_path 進行 URL 編碼
            encoded_path = quote(object_path, safe='/')

            # 生成代理 URL
            if settings.MINIO_PUBLIC_URL:
                # 使用外部域名的 API 代理
                base_url = settings.MINIO_PUBLIC_URL.replace('minio.', 'api.')
                proxy_url = f"{base_url}/api/v1/minio/proxy?object_path={encoded_path}"
            else:
                # 回退到內部地址
                proxy_url = f"http://localhost:8005/api/v1/minio/proxy?object_path={encoded_path}"

            logger.debug(f"生成代理 URL: {object_path} -> {proxy_url}")
            return proxy_url

        except Exception as e:
            logger.error(f"生成代理 URL 失敗: {object_path}, 錯誤: {e}")
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

    def _get_file_extension_by_type(self, message_type: str) -> str:
        """根據消息類型獲取文件擴展名"""
        type_mapping = {
            'image': 'jpg',
            'video': 'mp4',
            'audio': 'm4a'
        }
        return type_mapping.get(message_type, 'bin')

    def _get_content_type_by_type(self, message_type: str) -> str:
        """根據消息類型獲取 Content-Type"""
        type_mapping = {
            'image': 'image/jpeg',
            'video': 'video/mp4',
            'audio': 'audio/mp4'
        }
        return type_mapping.get(message_type, 'application/octet-stream')

    async def upload_logic_template_image(
        self,
        bot_id: str,
        file_data: bytes,
        filename: str,
        content_type: str = 'image/jpeg'
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        上傳邏輯模板圖片到 MinIO

        Args:
            bot_id: Bot ID
            file_data: 圖片檔案數據
            filename: 原始檔案名稱
            content_type: 檔案 MIME 類型

        Returns:
            Tuple[object_path, proxy_url]: MinIO 路徑和公開 URL，失敗則返回 None
        """
        try:
            import time
            from pathlib import Path

            # 生成唯一檔案名
            timestamp = int(time.time() * 1000)
            file_ext = Path(filename).suffix or '.jpg'
            unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}{file_ext}"

            # 生成儲存路徑：{bot_id}/logic-template-images/{timestamp}_{filename}
            object_path = f"{bot_id}/logic-template-images/{unique_filename}"

            logger.info(f"開始上傳邏輯模板圖片: bot_id={bot_id}, filename={filename}, size={len(file_data)} bytes")

            # 上傳到 MinIO
            file_stream = BytesIO(file_data)
            file_size = len(file_data)

            await asyncio.to_thread(
                self.client.put_object,
                self.bucket_name,
                object_path,
                file_stream,
                file_size,
                content_type=content_type,
            )

            # 生成代理訪問 URL
            proxy_url = self.get_presigned_url(object_path)

            logger.info(f"邏輯模板圖片上傳成功: path={object_path}, url={proxy_url}")
            return object_path, proxy_url

        except Exception as e:
            logger.error(f"上傳邏輯模板圖片失敗: {e}")
            import traceback
            logger.error(f"詳細錯誤: {traceback.format_exc()}")
            return None, None

    async def _download_media_http(self, channel_token: str, line_message_id: str,
                                 line_user_id: str, message_type: str) -> Tuple[Optional[str], Optional[str]]:
        """使用 HTTP 方式下載媒體檔案（回退方案）"""
        try:
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

                    logger.info(f"HTTP 方式下載成功，大小: {len(file_data)} bytes")

            # 生成存儲路徑
            file_extension = self._get_file_extension(content_type)
            object_path = self._generate_object_path(line_user_id, message_type, file_extension)

            # 上傳到 MinIO
            file_stream = BytesIO(file_data)
            file_size = len(file_data)

            await asyncio.to_thread(
                self.client.put_object,
                self.bucket_name,
                object_path,
                file_stream,
                file_size,
                content_type=content_type,
            )

            # 生成代理訪問 URL
            proxy_url = self.get_presigned_url(object_path)

            logger.info(f"HTTP 方式媒體文件上傳成功: {object_path}")
            return object_path, proxy_url

        except Exception as e:
            logger.error(f"HTTP 方式下載媒體失敗: {e}")
            return None, None

# 創建全局 MinIO 服務實例（改為延遲初始化）
minio_service: Optional[MinIOService] = None
_minio_init_error: Optional[str] = None

def init_minio_service(force: bool = False) -> Tuple[Optional[MinIOService], Optional[str]]:
    """嘗試初始化 MinIO 服務並回傳狀態。

    Args:
        force: 是否強制重新初始化

    Returns:
        (service, error_message)
    """
    global minio_service, _minio_init_error
    if minio_service is not None and not force:
        return minio_service, None
    try:
        svc = MinIOService()
        minio_service = svc
        _minio_init_error = None
        logger.info("MinIO 服務初始化成功")
        return minio_service, None
    except (ImportError, Exception) as e:
        _minio_init_error = f"{type(e).__name__}: {e}"
        logger.warning(f"MinIO 服務初始化失敗: {_minio_init_error}")
        minio_service = None
        return None, _minio_init_error

def get_minio_service() -> Optional[MinIOService]:
    """獲取 MinIO 服務實例（若尚未初始化會嘗試初始化一次）"""
    svc, _ = init_minio_service(force=False)
    return svc

def get_minio_last_error() -> Optional[str]:
    """取得最近一次初始化錯誤訊息"""
    return _minio_init_error
