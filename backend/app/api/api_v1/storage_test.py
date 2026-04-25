"""
MinIO 代理路由
"""
import logging
import asyncio

from fastapi import APIRouter, HTTPException, Query

from app.services.minio_service import get_minio_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/minio/proxy")
async def get_minio_file_proxy(object_path: str = Query(..., description="MinIO 物件路徑")):
    """
    直接從 MinIO 獲取文件內容（代理訪問）- 重構版本
    包含重試機制和錯誤處理，提升穩定性
    """
    from fastapi.responses import StreamingResponse
    import io

    minio_service = get_minio_service()
    if not minio_service:
        raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

    # 重試配置
    max_retries = 3
    base_delay = 0.5  # 基礎延遲時間（秒）

    for attempt in range(max_retries):
        response = None
        try:
            logger.info(f"嘗試獲取 MinIO 文件: {object_path} (第 {attempt + 1} 次)")

            # 檢查對象是否存在
            exists = await asyncio.to_thread(minio_service.object_exists, object_path)
            if not exists:
                raise HTTPException(status_code=404, detail="文件不存在")

            # 直接從 MinIO 獲取對象
            response = await asyncio.to_thread(
                minio_service.client.get_object,
                minio_service.bucket_name,
                object_path,
            )

            # 讀取文件內容
            file_data = await asyncio.to_thread(response.read)

            if not file_data:
                raise Exception("文件內容為空")

            # 根據文件擴展名設置 content_type
            content_type = get_content_type_by_extension(object_path)

            # 設置響應頭
            headers = {
                "Cache-Control": "public, max-age=3600",  # 1小時快取
                "Content-Length": str(len(file_data)),
                "Accept-Ranges": "bytes",
                "X-Content-Type-Options": "nosniff"
            }

            # 添加 ETag 用於快取驗證
            import hashlib
            etag = hashlib.md5(file_data).hexdigest()
            headers["ETag"] = f'"{etag}"'

            logger.info(f"成功獲取 MinIO 文件: {object_path}, 大小: {len(file_data)} bytes")

            # 返回文件流
            return StreamingResponse(
                io.BytesIO(file_data),
                media_type=content_type,
                headers=headers
            )

        except HTTPException:
            # HTTP 異常直接拋出，不重試
            raise
        except Exception as e:
            logger.warning(f"獲取 MinIO 文件失敗 (嘗試 {attempt + 1}/{max_retries}): {object_path}, 錯誤: {e}")

            if attempt == max_retries - 1:  # 最後一次嘗試
                logger.error(f"所有重試均失敗，無法獲取文件: {object_path}")
                raise HTTPException(
                    status_code=500,
                    detail=f"無法獲取文件，已重試 {max_retries} 次: {str(e)}"
                )
            else:
                # 指數退避延遲
                delay = base_delay * (2 ** attempt)
                logger.info(f"等待 {delay} 秒後重試...")
                await asyncio.sleep(delay)

        finally:
            # 確保響應對象被正確關閉
            if response:
                try:
                    await asyncio.to_thread(response.close)
                    await asyncio.to_thread(response.release_conn)
                except:
                    pass


def get_content_type_by_extension(file_path: str) -> str:
    """
    根據文件擴展名獲取 Content-Type
    """
    extension = file_path.lower().split('.')[-1] if '.' in file_path else ''

    content_type_map = {
        # 圖片
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',

        # 視頻
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',

        # 音頻
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'aac': 'audio/aac',
        'm4a': 'audio/mp4',

        # 文檔
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',

        # 其他
        'json': 'application/json',
        'xml': 'application/xml',
        'zip': 'application/zip'
    }

    return content_type_map.get(extension, 'application/octet-stream')
