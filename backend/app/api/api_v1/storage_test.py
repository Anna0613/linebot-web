"""
MinIO 測試路由
提供簡單的上傳與讀取（預簽名 URL）測試
"""
import io
import uuid
import time
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse

from app.services.minio_service import get_minio_service, init_minio_service, get_minio_last_error
from app.config import settings

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
