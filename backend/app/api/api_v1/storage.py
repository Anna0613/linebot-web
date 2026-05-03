"""
Storage proxy routes.
"""
import logging
import asyncio
from typing import Optional, Tuple

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse

from app.services.storage.minio_service import get_minio_service

try:
    from minio.error import S3Error
except ImportError:
    S3Error = Exception

logger = logging.getLogger(__name__)

router = APIRouter()

# 串流分塊大小（64KB）— 大型檔案 TTFB 更佳
CHUNK_SIZE = 64 * 1024
# 物件路徑包含 uuid + timestamp，內容不會變動，可長期快取
CACHE_CONTROL = "public, max-age=31536000, immutable"


def _parse_range(range_header: Optional[str]) -> Optional[Tuple[int, Optional[int]]]:
    """解析 HTTP Range header（僅支援單一 bytes=start-end 形式）"""
    if not range_header or not range_header.startswith("bytes="):
        return None
    try:
        spec = range_header[6:].split(",", 1)[0].strip()
        start_s, end_s = spec.split("-", 1)
        start = int(start_s) if start_s else 0
        end = int(end_s) if end_s else None
        if end is not None and end < start:
            return None
        return (start, end)
    except Exception:
        return None


def _etag_matches(if_none_match: str, etag: str) -> bool:
    """判斷 If-None-Match 是否命中（支援 *、W/、多個值）"""
    if not if_none_match or not etag:
        return False
    normalized = if_none_match.strip()
    if normalized == "*":
        return True
    for token in normalized.split(","):
        t = token.strip()
        if t.startswith("W/"):
            t = t[2:]
        if t.strip('"') == etag:
            return True
    return False


async def _safe_close(response) -> None:
    if response is None:
        return
    try:
        await asyncio.to_thread(response.close)
        await asyncio.to_thread(response.release_conn)
    except Exception:
        pass


@router.get("/minio/proxy")
@router.head("/minio/proxy")
async def get_minio_file_proxy(
    request: Request,
    object_path: str = Query(..., description="MinIO 物件路徑"),
):
    """
    直接從 MinIO 取得文件內容（代理訪問）

    優化點：
    - 移除預先 object_exists 檢查，少一次 round-trip
    - 真正分塊串流，TTFB 不再等到整檔下載完成
    - 支援 ETag / If-None-Match 條件請求（命中回 304，零流量）
    - 長期不可變快取（Cache-Control immutable）
    - 支援 Range 請求（影片/音訊拖曳）
    """
    minio_service = get_minio_service()
    if not minio_service:
        raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

    if_none_match = request.headers.get("if-none-match")
    parsed_range = _parse_range(request.headers.get("range"))

    # 僅針對「取得物件」階段做重試（暫態網路錯誤）
    max_retries = 3
    base_delay = 0.5
    response = None
    last_exception: Optional[BaseException] = None

    for attempt in range(max_retries):
        try:
            kwargs = {}
            if parsed_range:
                start, end = parsed_range
                kwargs["offset"] = start
                if end is not None:
                    kwargs["length"] = end - start + 1

            response = await asyncio.to_thread(
                minio_service.client.get_object,
                minio_service.bucket_name,
                object_path,
                **kwargs,
            )
            break
        except S3Error as e:
            await _safe_close(response)
            response = None
            code = getattr(e, "code", "")
            if code in ("NoSuchKey", "NoSuchBucket"):
                raise HTTPException(status_code=404, detail="文件不存在")
            last_exception = e
        except Exception as e:
            await _safe_close(response)
            response = None
            last_exception = e

        if attempt < max_retries - 1:
            delay = base_delay * (2 ** attempt)
            logger.warning(
                f"獲取 MinIO 文件失敗 (嘗試 {attempt + 1}/{max_retries}): "
                f"{object_path}, {delay}s 後重試, err={last_exception}"
            )
            await asyncio.sleep(delay)
    else:
        logger.error(f"所有重試均失敗，無法獲取文件: {object_path}, err={last_exception}")
        raise HTTPException(
            status_code=502,
            detail=f"無法獲取文件，已重試 {max_retries} 次: {last_exception}",
        )

    # 從 MinIO 回應中取出 metadata（避免額外計算 ETag）
    raw_etag = (response.headers.get("ETag") or "").strip('"')
    last_modified = response.headers.get("Last-Modified")
    content_length = response.headers.get("Content-Length")
    content_type = (
        response.headers.get("Content-Type")
        or get_content_type_by_extension(object_path)
    )

    # 條件請求命中 → 304 Not Modified（瀏覽器使用本地快取）
    if _etag_matches(if_none_match or "", raw_etag):
        await _safe_close(response)
        return Response(
            status_code=304,
            headers={
                "ETag": f'"{raw_etag}"',
                "Cache-Control": CACHE_CONTROL,
            },
        )

    headers = {
        "Cache-Control": CACHE_CONTROL,
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
    }
    if raw_etag:
        headers["ETag"] = f'"{raw_etag}"'
    if last_modified:
        headers["Last-Modified"] = last_modified
    if content_length:
        headers["Content-Length"] = content_length

    status_code = 200
    if parsed_range:
        content_range = response.headers.get("Content-Range")
        if content_range:
            headers["Content-Range"] = content_range
            status_code = 206

    # HEAD 請求不需 body
    if request.method == "HEAD":
        await _safe_close(response)
        return Response(status_code=status_code, headers=headers, media_type=content_type)

    # 真正分塊串流：第一塊資料即可送出，TTFB 大幅下降
    captured = response

    async def body_iter():
        try:
            while True:
                chunk = await asyncio.to_thread(captured.read, CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
        finally:
            await _safe_close(captured)

    return StreamingResponse(
        body_iter(),
        status_code=status_code,
        media_type=content_type,
        headers=headers,
    )


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
