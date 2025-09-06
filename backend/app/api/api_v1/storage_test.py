"""
MinIO 測試路由
提供簡單的上傳與讀取（預簽名 URL）測試
"""
import io
import uuid
import time
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse

from app.services.minio_service import get_minio_service, init_minio_service, get_minio_last_error
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/minio/ping")
async def minio_ping():
    """檢查 MinIO 服務連線與 bucket 狀態。"""
    svc, err = init_minio_service(force=False)
    if not svc:
        # 回傳更完整的錯誤資訊
        raise HTTPException(status_code=500, detail=f"MinIO 服務未初始化: {err or get_minio_last_error() or 'unknown error'}")
    try:
        exists = svc.client.bucket_exists(svc.bucket_name)
        return {
            # 避免讀取 MinIO 私有屬性，使用設定值回傳
            "endpoint": settings.MINIO_ENDPOINT,
            "bucket": svc.bucket_name,
            "bucket_exists": bool(exists),
            "secure": settings.MINIO_SECURE,
            "cert_check": settings.MINIO_CERT_CHECK,
            "public_url": settings.MINIO_PUBLIC_URL,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ping 失敗: {type(e).__name__}: {e}")

@router.get("/minio/list")
async def minio_list(prefix: str = "", limit: int = 20):
    """列出 bucket 內的物件（最多 limit 筆）。"""
    minio_service = get_minio_service()
    if not minio_service:
        # 嘗試初始化一次
        svc, err = init_minio_service(force=False)
        if not svc:
            raise HTTPException(status_code=500, detail=f"MinIO 服務未初始化: {err or get_minio_last_error() or 'unknown error'}")
        minio_service = svc
    try:
        objects = []
        for i, obj in enumerate(minio_service.client.list_objects(minio_service.bucket_name, prefix=prefix, recursive=True)):
            objects.append({
                "object_name": obj.object_name,
                "size": getattr(obj, "size", None),
                "last_modified": getattr(obj, "last_modified", None).isoformat() if getattr(obj, "last_modified", None) else None,
            })
            if i + 1 >= max(1, min(100, limit)):
                break
        return {"bucket": minio_service.bucket_name, "prefix": prefix, "count": len(objects), "objects": objects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List 失敗: {type(e).__name__}: {e}")


@router.post("/minio/test-upload")
async def minio_test_upload(
    user_id: str = Form("test"),
    message_type: str = Form("file"),
    file: Optional[UploadFile] = File(None),
):
    """
    將測試檔案上傳到 MinIO。

    - 若提供 `file` 則上傳該檔案
    - 否則上傳一個文字檔，內容為 Hello MinIO + timestamp
    """
    minio_service = get_minio_service()
    if not minio_service:
        svc, err = init_minio_service(force=False)
        if not svc:
            raise HTTPException(status_code=500, detail=f"MinIO 服務未初始化: {err or get_minio_last_error() or 'unknown error'}")
        minio_service = svc

    # 準備內容
    if file is not None:
        data = await file.read()
        content_type = file.content_type or "application/octet-stream"
        original_ext = (
            "." + file.filename.split(".")[-1] if file.filename and "." in file.filename else ""
        )
        if not original_ext:
            # 根據 content type 粗略推斷
            original_ext = minio_service._get_file_extension(content_type)
    else:
        payload = f"Hello MinIO @ {int(time.time())}\n".encode("utf-8")
        data = payload
        content_type = "text/plain"
        original_ext = ".txt"

    # 目標路徑：<user_id>/test/<uuid>.<ext>
    object_name = f"{user_id}/test/{uuid.uuid4().hex}{original_ext}"

    # 上傳
    bytes_stream = io.BytesIO(data)
    length = len(data)

    try:
        minio_service.client.put_object(
            bucket_name=minio_service.bucket_name,
            object_name=object_name,
            data=bytes_stream,
            length=length,
            content_type=content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上傳失敗: {e}")

    # 建立預簽名 URL
    url = minio_service.get_presigned_url(object_name)

    # 簡單讀取驗證（stat）
    size: Optional[int] = None
    try:
        stat = minio_service.client.stat_object(minio_service.bucket_name, object_name)
        size = getattr(stat, "size", None)
    except Exception:
        pass

    return JSONResponse(
        content={
            "bucket": minio_service.bucket_name,
            "object_path": object_name,
            "content_type": content_type,
            "size": size or length,
            "presigned_url": url,
        }
    )


@router.get("/minio/test-download")
async def minio_test_download(object_path: str = Query(..., description="MinIO 物件路徑")):
    """
    取得指定物件的預簽名下載 URL。
    """
    minio_service = get_minio_service()
    if not minio_service:
        raise HTTPException(status_code=500, detail="MinIO 服務未初始化，請確認 minio 套件與環境變數設定")

    url = minio_service.get_presigned_url(object_path)
    if not url:
        raise HTTPException(status_code=404, detail="物件不存在或無法產生連結")

    return {"bucket": minio_service.bucket_name, "object_path": object_path, "presigned_url": url}


@router.post("/minio/refresh-all-urls")
async def refresh_all_media_urls():
    """
    批量更新所有媒體檔案的 URL 為新的代理 URL
    """
    from app.database import get_db
    from app.models.line_user import LineBotUserInteraction
    from sqlalchemy.orm import Session

    minio_service = get_minio_service()
    if not minio_service:
        raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

    # 獲取資料庫連接
    db_gen = get_db()
    db: Session = next(db_gen)

    try:
        # 查找所有有 media_path 的媒體記錄
        media_records = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio']),
            LineBotUserInteraction.media_path.isnot(None)
        ).all()

        if not media_records:
            return {"message": "沒有需要更新的媒體檔案", "updated": 0}

        updated_count = 0
        failed_count = 0

        for interaction in media_records:
            try:
                # 重新生成代理 URL
                new_url = minio_service.get_presigned_url(interaction.media_path)
                if new_url:
                    interaction.media_url = new_url
                    updated_count += 1
                    logger.info(f"更新媒體 URL 成功: {interaction.id}")
                else:
                    failed_count += 1
                    logger.error(f"生成代理 URL 失敗: {interaction.id}")
            except Exception as e:
                failed_count += 1
                logger.error(f"更新媒體 URL 異常: {interaction.id}, 錯誤: {e}")

        # 批量提交更新
        db.commit()

        return {
            "message": f"媒體 URL 更新完成",
            "total": len(media_records),
            "updated": updated_count,
            "failed": failed_count
        }

    except Exception as e:
        db.rollback()
        logger.error(f"批量更新媒體 URL 失敗: {e}")
        raise HTTPException(status_code=500, detail=f"更新失敗: {str(e)}")
    finally:
        db.close()


@router.get("/minio/proxy")
async def get_minio_file_proxy(object_path: str = Query(..., description="MinIO 物件路徑")):
    """
    直接從 MinIO 獲取文件內容（代理訪問）
    避免預簽名 URL 的簽名問題
    """
    from fastapi.responses import StreamingResponse
    import io

    minio_service = get_minio_service()
    if not minio_service:
        raise HTTPException(status_code=500, detail="MinIO 服務未初始化")

    try:
        # 檢查對象是否存在
        if not minio_service.object_exists(object_path):
            raise HTTPException(status_code=404, detail="文件不存在")

        # 直接從 MinIO 獲取對象
        response = minio_service.client.get_object(
            bucket_name=minio_service.bucket_name,
            object_name=object_path
        )

        # 讀取文件內容
        file_data = response.read()

        # 根據文件擴展名設置 content_type
        content_type = "application/octet-stream"
        if object_path.lower().endswith(('.jpg', '.jpeg')):
            content_type = "image/jpeg"
        elif object_path.lower().endswith('.png'):
            content_type = "image/png"
        elif object_path.lower().endswith('.gif'):
            content_type = "image/gif"
        elif object_path.lower().endswith('.webp'):
            content_type = "image/webp"
        elif object_path.lower().endswith(('.mp4', '.mov')):
            content_type = "video/mp4"
        elif object_path.lower().endswith(('.mp3', '.wav')):
            content_type = "audio/mpeg"

        # 返回文件流
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Length": str(len(file_data))
            }
        )

    except Exception as e:
        logger.error(f"獲取 MinIO 文件失敗: {object_path}, 錯誤: {e}")
        raise HTTPException(status_code=500, detail=f"獲取文件失敗: {str(e)}")
    finally:
        if 'response' in locals():
            response.close()
            response.release_conn()
