"""
LINE Bot Webhook API 路由 - 重構版本
處理來自 LINE 平台的 Webhook 事件，包含重複檢查機制
"""
import json
import logging
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any

from app.database_async import get_async_db
from sqlalchemy import select
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService
from app.models.line_user import LineBotUser
from uuid import UUID as PyUUID
from sqlalchemy.sql import func
from app.services.conversation_service import ConversationService
from app.services.background_tasks import get_task_manager, TaskPriority
from app.database_async import AsyncSessionLocal

# 背景任務：AI 接管（RAG → 產生回答 → 發送 → 紀錄）
async def _ai_takeover_background_task(
    *,
    bot_id: str,
    user_id: str,
    user_query: str,
    reply_token: Optional[str],
    provider: Optional[str],
    model: Optional[str],
    threshold: Optional[float],
    top_k: Optional[int],
    hist_n: Optional[int],
    system_prompt: Optional[str],
):
    """在背景執行 AI 接管流程，避免阻塞 webhook 響應。"""
    try:
        # 延遲導入以避免循環相依
        import importlib
        rag_module = importlib.import_module('app.services.rag_service')
        RAGService = getattr(rag_module, 'RAGService')

        # 資料庫工作階段（獨立於請求生命週期）
        async with AsyncSessionLocal() as db:
            # 讀取 Bot 設定（channel token/secret 等）
            from sqlalchemy import select as _select
            from app.models.bot import Bot as BotModel
            bot_res = await db.execute(_select(BotModel).where(BotModel.id == bot_id))
            bot = bot_res.scalars().first()
            if not bot:
                logger.error(f"AI 背景任務：找不到 Bot: {bot_id}")
                return

            # 建立 LineBotService 以便回覆
            line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)

            # 產生 AI 回答
            answer = await RAGService.answer(
                db,
                bot_id,
                user_query,
                provider=provider or getattr(bot, 'ai_model_provider', None),
                model=model or getattr(bot, 'ai_model', None),
                threshold=threshold or getattr(bot, 'ai_rag_threshold', None),
                top_k=top_k or getattr(bot, 'ai_rag_top_k', None),
                line_user_id=user_id,
                history_messages=hist_n or getattr(bot, 'ai_history_messages', None),
                system_prompt=system_prompt or getattr(bot, 'ai_system_prompt', None),
            )

            if not answer:
                answer = "我在這裡，請告訴我您的問題。"

            # 發送最終 AI 回覆（僅用 push，不使用 replyToken）
            try:
                send_result = await asyncio.to_thread(
                    line_bot_service.send_text_message, user_id, answer
                )
                logger.info(f"AI 背景任務：訊息發送結果: {send_result}")
            except Exception as send_err:
                logger.error(f"AI 背景任務：發送 AI 回覆失敗: {send_err}")

            # 紀錄到 MongoDB
            try:
                await ConversationService.add_bot_message(
                    bot_id=str(bot_id),
                    line_user_id=user_id,
                    message_content={"text": answer},
                    message_type="text",
                )
                logger.info("AI 背景任務：AI 訊息已記錄到 MongoDB")
            except Exception as log_err:
                logger.warning(f"AI 背景任務：寫入 AI 訊息至 Mongo 失敗: {log_err}")

            # 推送到 WebSocket（方便前端就地更新）
            try:
                await websocket_manager.broadcast_to_bot(bot_id, {
                    'type': 'chat_message',
                    'bot_id': bot_id,
                    'line_user_id': user_id,
                    'data': {
                        'line_user_id': user_id,
                        'message': {
                            'id': None,
                            'event_type': 'message',
                            'message_type': 'text',
                            'message_content': {'text': answer},
                            'sender_type': 'bot',
                            'timestamp': datetime.now().isoformat(),
                            'media_url': None,
                            'media_path': None,
                            'admin_user': None
                        }
                    }
                })
            except Exception as ws_err:
                logger.warning(f"AI 背景任務：推送 WebSocket 失敗: {ws_err}")

    except Exception as e:
        logger.error(f"AI 背景任務失敗: {e}")

async def _schedule_ai_takeover(
    *,
    bot_id: str,
    user_id: str,
    user_query: str,
    reply_token: Optional[str],
    provider: Optional[str],
    model: Optional[str],
    threshold: Optional[float],
    top_k: Optional[int],
    hist_n: Optional[int],
    system_prompt: Optional[str],
):
    """將 AI 接管工作排入背景任務。"""
    try:
        task_manager = get_task_manager()
        # 任務 ID 盡量唯一
        import uuid
        task_id = f"ai_takeover:{bot_id}:{user_id}:{uuid.uuid4().hex}"
        await task_manager.add_task(
            task_id,
            "AI 接管回覆",
            _ai_takeover_background_task,
            kwargs={
                'bot_id': bot_id,
                'user_id': user_id,
                'user_query': user_query,
                'reply_token': reply_token,
                'provider': provider,
                'model': model,
                'threshold': threshold,
                'top_k': top_k,
                'hist_n': hist_n,
                'system_prompt': system_prompt,
            },
            priority=TaskPriority.HIGH,
            delay=0,
            max_retries=2,
        )
        logger.info(f"已排入 AI 接管背景任務: {task_id}")
    except Exception as e:
        logger.error(f"排入 AI 接管背景任務失敗: {e}")
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/webhooks/{bot_id}/test")
async def test_webhook_connection(bot_id: str):
    """測試 Webhook 連接"""
    logger.info(f"🧪 測試 Webhook 連接: Bot ID = {bot_id}")
    return {
        "status": "ok",
        "bot_id": bot_id,
        "message": "Webhook 端點正常運作",
        "timestamp": "2025-08-26T02:50:00.000Z"
    }

@router.post("/webhooks/{bot_id}")
async def handle_webhook_event(
    bot_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    x_line_signature: Optional[str] = Header(None, alias="X-Line-Signature")
):
    """
    處理 LINE Bot Webhook 事件 - 重構版本
    包含重複檢查機制，防止重複處理相同訊息

    Args:
        bot_id: Bot ID
        request: HTTP 請求對象
        db: 數據庫會話
        x_line_signature: LINE 簽名驗證頭

    Returns:
        200 OK 響應
    """
    # 強制輸出到 stdout，確保能看到
    print(f"🚀🚀🚀 WEBHOOK 開始處理: Bot ID = {bot_id}")
    print(f"🔧 測試日誌：webhook.py 已載入最新版本 - {datetime.now()}")
    logger.info(f"🚀🚀🚀 WEBHOOK 開始處理: Bot ID = {bot_id}")
    logger.info(f"🔧 測試日誌：webhook.py 已載入最新版本 - {datetime.now()}")
    try:
        # 獲取請求體
        body = await request.body()
        logger.info(f"📥 收到 Webhook 請求: Bot ID = {bot_id}, 內容長度 = {len(body)}")
        logger.info(f"📋 請求內容: {body.decode('utf-8') if body else 'Empty'}")

        # 查找對應的 Bot
        result = await db.execute(select(Bot).where(Bot.id == bot_id))
        bot = result.scalars().first()
        if not bot:
            logger.error(f"Bot 不存在: {bot_id}")
            raise HTTPException(status_code=404, detail="Bot 不存在")

        if not bot.channel_token or not bot.channel_secret:
            logger.error(f"Bot 配置不完整: {bot_id}")
            raise HTTPException(status_code=400, detail="Bot 配置不完整")

        # 初始化 LINE Bot Service
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)

        # 處理 LINE 平台驗證請求
        if not body or len(body) == 0:
            logger.info(f"收到 LINE 平台驗證請求: {bot_id}")
            return Response(status_code=200)

        # 驗證簽名
        if x_line_signature and not line_bot_service.verify_signature(body, x_line_signature):
            logger.error(f"簽名驗證失敗: {bot_id}")
            raise HTTPException(status_code=400, detail="簽名驗證失敗")

        # 解析 Webhook 事件
        try:
            webhook_data = json.loads(body.decode('utf-8'))
            events = webhook_data.get('events', [])
            print(f"📋 收到 {len(events)} 個事件")
            print(f"📋 事件內容: {events}")
            logger.info(f"📋 收到 {len(events)} 個事件")
            logger.info(f"📋 事件內容: {events}")
        except Exception as e:
            print(f"❌ 解析 webhook 內容失敗: {e}")
            logger.error(f"❌ 解析 webhook 內容失敗: {e}")
            raise HTTPException(status_code=400, detail="無效的 JSON 格式")

        # 以有限併發處理每個事件（含重複檢查），避免單一事件延遲拖慢整體
        processed_results: list[Optional[dict]] = [None] * len(events)
        concurrency = min(5, max(1, len(events)))  # 每次最多 5 個事件
        sem = asyncio.Semaphore(concurrency)

        async def _process_one(i: int, event: dict):
            async with sem:
                try:
                    print(f"🔍 處理事件 {i+1}: type={event.get('type')}")
                    logger.info(f"🔍 處理事件 {i+1}: type={event.get('type')}")
                    # 為避免 AsyncSession 並發問題，每個事件使用獨立的 session
                    async with AsyncSessionLocal() as event_db:
                        result = await process_single_event(event, bot_id, line_bot_service, event_db)
                    if result:
                        processed_results[i] = result
                        print(f"✅ 事件 {i+1} 處理成功")
                        logger.info(f"✅ 事件 {i+1} 處理成功")
                    else:
                        print(f"⏭️ 事件 {i+1} 跳過（重複或無需處理）")
                        logger.info(f"⏭️ 事件 {i+1} 跳過（重複或無需處理）")
                except Exception as e:
                    print(f"❌ 處理事件 {i+1} 失敗: {e}")
                    logger.error(f"❌ 處理事件 {i+1} 失敗: {e}")

        await asyncio.gather(*[asyncio.create_task(_process_one(i, ev)) for i, ev in enumerate(events)], return_exceptions=True)

        processed_events = [r for r in processed_results if r]

        logger.info(f"✅ Webhook 處理完成，成功處理 {len(processed_events)} 個事件")

        # 發送 WebSocket 通知（僅針對成功處理的事件）
        if processed_events:
            try:
                await send_websocket_notifications(bot_id, processed_events)
            except Exception as ws_error:
                logger.warning(f"發送 WebSocket 更新失敗: {ws_error}")

        # 返回 200 OK，告知 LINE 平台事件已處理
        return Response(status_code=200)

    except HTTPException:
        # 重新拋出 HTTP 異常
        raise
    except Exception as e:
        logger.error(f"處理 Webhook 事件時發生錯誤: {str(e)}")
        # 即使內部處理失敗，也要返回 200 給 LINE 平台
        # 避免 LINE 平台重複發送事件
        return Response(status_code=200)

@router.get("/webhooks/{bot_id}/info")
async def get_webhook_info(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    獲取 Webhook 配置信息

    Args:
        bot_id: Bot ID
        db: 數據庫會話

    Returns:
        Webhook 配置信息
    """
    try:
        # 查找對應的 Bot
        result = await db.execute(select(Bot).where(Bot.id == bot_id))
        bot = result.scalars().first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")

        # 構建完整的 Webhook URL
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')
        webhook_url = f"{webhook_domain}/api/v1/webhooks/{bot_id}"

        return {
            "bot_id": bot_id,
            "webhook_url": webhook_url,
            "configured": bool(bot.channel_token and bot.channel_secret),
            "status": "ready" if bot.channel_token and bot.channel_secret else "not_configured"
        }

    except Exception as e:
        logger.error(f"獲取 Webhook 信息失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取 Webhook 信息失敗: {str(e)}")

@router.get("/webhooks/{bot_id}/status")
async def get_webhook_status(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    獲取 Webhook 綁定狀態

    Args:
        bot_id: Bot ID
        db: 數據庫會話

    Returns:
        Webhook 綁定狀態
    """
    try:
        # 查找對應的 Bot
        result = await db.execute(select(Bot).where(Bot.id == bot_id))
        bot = result.scalars().first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")

        # 檢查基本配置
        is_configured = bool(bot.channel_token and bot.channel_secret)

        # 嘗試檢查與 LINE API 的連接狀態和 Webhook 設定
        webhook_working = False
        line_api_accessible = False
        webhook_endpoint_info = None
        last_webhook_time = None

        if is_configured:
            try:
                # 初始化 LINE Bot Service 來測試連接（改用異步版本）
                line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
                line_api_accessible, webhook_endpoint_info = await asyncio.gather(
                    line_bot_service.async_check_connection(),
                    line_bot_service.async_check_webhook_endpoint(),
                    return_exceptions=False,
                )
                webhook_working = (
                    webhook_endpoint_info.get("is_set", False) and
                    webhook_endpoint_info.get("active", False)
                )

            except Exception as e:
                logger.error(f"檢查 LINE API 連接失敗: {e}")
                line_api_accessible = False
                webhook_working = False
                webhook_endpoint_info = {"error": str(e)}

        # 判斷整體狀態
        if not is_configured:
            status = "not_configured"
            status_text = "未設定"
        elif not line_api_accessible:
            status = "configuration_error"
            status_text = "設定錯誤"
        elif webhook_working:
            status = "active"
            status_text = "已綁定"
        else:
            status = "inactive"
            status_text = "未綁定"

        from datetime import datetime

        # 獲取 webhook 域名
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')

        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "status": status,
            "status_text": status_text,
            "is_configured": is_configured,
            "line_api_accessible": line_api_accessible,
            "webhook_working": webhook_working,
            "webhook_url": f"{webhook_domain}/api/v1/webhooks/{bot_id}",
            "webhook_endpoint_info": webhook_endpoint_info,
            "last_webhook_time": last_webhook_time,
            "checked_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"獲取 Webhook 狀態失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取狀態失敗: {str(e)}")

@router.get("/webhooks/{bot_id}/debug")
async def debug_webhook_config(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    除錯 Webhook 配置

    Args:
        bot_id: Bot ID
        db: 數據庫會話

    Returns:
        除錯資訊
    """
    try:
        # 查找對應的 Bot
        result = await db.execute(select(Bot).where(Bot.id == bot_id))
        bot = result.scalars().first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")

        # 獲取 webhook 域名
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')

        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "has_channel_token": bool(bot.channel_token),
            "has_channel_secret": bool(bot.channel_secret),
            "channel_token_length": len(bot.channel_token) if bot.channel_token else 0,
            "channel_secret_length": len(bot.channel_secret) if bot.channel_secret else 0,
            "webhook_url": f"{webhook_domain}/api/v1/webhooks/{bot_id}",
            "status": "configured" if (bot.channel_token and bot.channel_secret) else "not_configured"
        }

    except Exception as e:
        logger.error(f"除錯 Webhook 配置失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"除錯失敗: {str(e)}")

@router.post("/webhooks/{bot_id}/test")
async def test_webhook_connection(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    測試 Webhook 連接

    Args:
        bot_id: Bot ID
        db: 數據庫會話

    Returns:
        測試結果
    """
    try:
        # 查找對應的 Bot
        from sqlalchemy import select
        result = await db.execute(select(Bot).where(Bot.id == bot_id))
        bot = result.scalars().first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")

        if not bot.channel_token or not bot.channel_secret:
            raise HTTPException(status_code=400, detail="Bot 配置不完整")

        # 初始化 LINE Bot Service
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)

        # 檢查連接狀態
        is_healthy = await line_bot_service.async_check_connection()

        return {
            "bot_id": bot_id,
            "connection_status": "ok" if is_healthy else "failed",
            "timestamp": "2024-08-23T12:00:00Z"
        }

    except Exception as e:
        logger.error(f"測試 Webhook 連接失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"測試連接失敗: {str(e)}")


async def process_single_event(
    event: Dict[str, Any],
    bot_id: str,
    line_bot_service: LineBotService,
    db: AsyncSession
) -> Optional[Dict[str, Any]]:
    """
    處理單個 LINE 事件（含重複檢查）

    Args:
        event: LINE 事件數據
        bot_id: Bot ID
        line_bot_service: LINE Bot 服務實例
        db: 數據庫會話

    Returns:
        處理結果，如果是重複事件則返回 None
    """
    try:
        event_type = event.get('type')
        source = event.get('source', {})
        source_type = source.get('type')
        user_id = source.get('userId')
        webhook_event_id = event.get('webhookEventId')

        reply_token = event.get('replyToken')
        logger.info(f"📬 replyToken 存在: {bool(reply_token)}")

        print(f"🔍 處理事件詳情: type={event_type}, source={source_type}, user={user_id}, webhookEventId={webhook_event_id}")
        print(f"🔍 完整事件內容: {event}")
        logger.info(f"🔍 處理事件詳情: type={event_type}, source={source_type}, user={user_id}, webhookEventId={webhook_event_id}")
        logger.info(f"🔍 完整事件內容: {event}")

        # 檢查 webhookEventId 是否已處理過（防止重複處理）
        if webhook_event_id:
            from app.config.redis_config import CacheService as AsyncCache, redis_manager
            print(f"🔍 Redis 連接狀態: {redis_manager.is_connected}")
            logger.info(f"🔍 Redis 連接狀態: {redis_manager.is_connected}")

            if redis_manager.is_connected:
                try:
                    webhook_cache_key = f"webhook_event:{bot_id}:{webhook_event_id}"
                    print(f"🔍 檢查 webhook 快取鍵: {webhook_cache_key}")
                    logger.info(f"🔍 檢查 webhook 快取鍵: {webhook_cache_key}")

                    is_processed = await AsyncCache.get(webhook_cache_key)
                    print(f"🔍 快取檢查結果: {is_processed}")
                    logger.info(f"🔍 快取檢查結果: {is_processed}")

                    if is_processed:
                        print(f"⏭️ 跳過重複的 webhook 事件: {webhook_event_id}")
                        logger.info(f"⏭️ 跳過重複的 webhook 事件: {webhook_event_id}")
                        return None

                    # 標記此事件為已處理（TTL 24小時）
                    await AsyncCache.set(webhook_cache_key, "processed", ttl=86400)
                    print(f"✅ 標記 webhook 事件為已處理: {webhook_event_id}")
                    logger.info(f"✅ 標記 webhook 事件為已處理: {webhook_event_id}")
                except Exception as cache_err:
                    print(f"⚠️ webhook 事件重複檢查失敗，繼續處理: {cache_err}")
                    logger.warning(f"⚠️ webhook 事件重複檢查失敗，繼續處理: {cache_err}")
            else:
                print(f"⚠️ Redis 未連接，跳過 webhook 事件重複檢查")
                logger.warning(f"⚠️ Redis 未連接，跳過 webhook 事件重複檢查")

        # 僅處理來自 user 的事件
        if source_type != 'user' or not user_id:
            print(f"⏭️ 跳過非使用者來源事件: source_type={source_type}")
            logger.info(f"⏭️ 跳過非使用者來源事件: source_type={source_type}")
            return None

        # 根據事件類型組裝通用欄位
        message = {}
        message_type = None
        line_message_id = None

        if event_type == 'message':
            message = event.get('message', {})
            message_type = message.get('type')
            line_message_id = message.get('id')
        elif event_type == 'postback':
            # 將 postback 當作一個 message_type='postback' 的訊息存檔，並交由邏輯引擎處理
            message = event.get('postback', {}) or {}
            message_type = 'postback'
            line_message_id = None
        elif event_type in ['follow', 'unfollow']:
            message = {}
            message_type = event_type
            line_message_id = None
        else:
            logger.info(f"⏭️ 跳過未支援事件: {event_type}")
            return None

        # 保障：若 PostgreSQL 尚無此用戶紀錄，先建立/更新，確保不會出現未知用戶
        try:
            try:
                bot_uuid = PyUUID(bot_id)
            except Exception:
                bot_uuid = None

            if bot_uuid is not None:
                from sqlalchemy import select as _select
                res_existing = await db.execute(
                    _select(LineBotUser).where(
                        LineBotUser.bot_id == bot_uuid,
                        LineBotUser.line_user_id == user_id,
                    )
                )
                existing = res_existing.scalars().first()

                if not existing:
                    profile = await asyncio.to_thread(line_bot_service.get_user_profile, user_id)
                    new_user = LineBotUser(
                        bot_id=bot_uuid,
                        line_user_id=user_id,
                        display_name=(profile or {}).get("display_name"),
                        picture_url=(profile or {}).get("picture_url"),
                        status_message=(profile or {}).get("status_message"),
                        language=(profile or {}).get("language"),
                        is_followed=True if event_type != 'unfollow' else False,
                        interaction_count="1",
                    )
                    db.add(new_user)
                    await db.commit()
                else:
                    # 更新互動次數與最後互動時間
                    existing.last_interaction = func.now()
                    try:
                        cnt = int(existing.interaction_count or "0")
                        existing.interaction_count = str(cnt + 1)
                    except Exception:
                        existing.interaction_count = "1"
                    if event_type == 'unfollow':
                        existing.is_followed = False
                    elif event_type == 'follow':
                        existing.is_followed = True
                    await db.commit()
        except Exception as upsert_err:
            logger.warning(f"同步用戶資料至 PostgreSQL 失敗: {upsert_err}")

        # 寫入 MongoDB：允許 postback/follow/unfollow 無 line_message_id 也入庫
        message_doc, is_new = await ConversationService.add_user_message(
            bot_id=bot_id,
            line_user_id=user_id,
            event_type=event_type,
            message_type=message_type,
            message_content=message,
            line_message_id=line_message_id
        )

        # 如果是重複訊息（僅針對有 line_message_id 的事件），直接跳過
        if line_message_id and (not is_new):
            logger.info(f"跳過重複訊息: {line_message_id}")
            return None

        # 如果是新訊息，處理媒體檔案
        if message_type in ['image', 'video', 'audio'] and line_message_id:
            # 異步處理媒體檔案
            asyncio.create_task(
                process_media_async(
                    bot_id=bot_id,
                    user_id=user_id,
                    message_type=message_type,
                    line_message_id=line_message_id,
                    line_bot_service=line_bot_service
                )
            )

        # 即時推送完整聊天訊息到 WebSocket，讓前端增量插入（message/postback/follow）
        if event_type in ['message', 'postback', 'follow']:
            try:
                from app.services.websocket_manager import websocket_manager
                admin_user_info = None
                await websocket_manager.broadcast_to_bot(bot_id, {
                    'type': 'chat_message',
                    'bot_id': bot_id,
                    'line_user_id': user_id,
                    'data': {
                        'line_user_id': user_id,
                        'message': {
                            'id': message_doc.id,
                            'event_type': message_doc.event_type,
                            'message_type': message_doc.message_type,
                            'message_content': message_doc.content,
                            'sender_type': message_doc.sender_type,
                            'timestamp': message_doc.timestamp.isoformat() if hasattr(message_doc.timestamp, 'isoformat') else message_doc.timestamp,
                            'media_url': message_doc.media_url,
                            'media_path': message_doc.media_path,
                            'admin_user': admin_user_info
                        }
                    }
                })
            except Exception as ws_err:
                logger.warning(f"推送用戶聊天消息到 WebSocket 失敗: {ws_err}")

        # 進行邏輯模板匹配與回覆（僅針對部分事件觸發）
        print(f"🎯 檢查是否需要邏輯處理: event_type={event_type}, 支援類型=['message', 'postback', 'follow']")
        logger.info(f"🎯 檢查是否需要邏輯處理: event_type={event_type}, 支援類型=['message', 'postback', 'follow']")
        if event_type in ['message', 'postback', 'follow']:
            print(f"✅ 事件類型符合，開始邏輯處理")
            logger.info(f"✅ 事件類型符合，開始邏輯處理")
            try:
                from app.models.bot import Bot as BotModel
                result = await db.execute(select(BotModel).where(BotModel.id == bot_id))
                bot = result.scalars().first()
                if bot:
                    print(f"🤖 開始處理 Bot {bot.name} 的事件: {event_type}")
                    logger.info(f"🤖 開始處理 Bot {bot.name} 的事件: {event_type}")
                    from app.services.logic_engine_service import LogicEngineService
                    results = await LogicEngineService.evaluate_and_reply(
                        db=db,
                        bot=bot,
                        line_bot_service=line_bot_service,
                        user_id=user_id,
                        event=event,
                    )
                    print(f"📋 邏輯模板匹配結果: {len(results) if results else 0} 個回覆")
                    logger.info(f"📋 邏輯模板匹配結果: {len(results) if results else 0} 個回覆")

                    # RAG 備援：若無符合的積木回覆、AI 接管啟用、且為文字訊息
                    ai_takeover_enabled = bool(getattr(bot, 'ai_takeover_enabled', False))
                    is_text_message = event_type == 'message' and event.get('message', {}).get('type') == 'text'
                    user_query = event.get('message', {}).get('text') or '' if is_text_message else ''

                    print(f"🔍 AI 接管檢查:")
                    print(f"  - 邏輯模板結果: {len(results) if results else 0} 個")
                    print(f"  - AI 接管啟用: {ai_takeover_enabled}")
                    print(f"  - 事件類型: {event_type}")
                    print(f"  - 是文字訊息: {is_text_message}")
                    print(f"  - 用戶訊息: '{user_query}'")
                    logger.info(f"🔍 AI 接管檢查:")
                    logger.info(f"  - 邏輯模板結果: {len(results) if results else 0} 個")
                    logger.info(f"  - AI 接管啟用: {ai_takeover_enabled}")
                    logger.info(f"  - 事件類型: {event_type}")
                    logger.info(f"  - 是文字訊息: {is_text_message}")
                    logger.info(f"  - 用戶訊息: '{user_query}'")

                    if (
                        (not results)
                        and ai_takeover_enabled
                        and is_text_message
                    ):
                        print(f"🚀 觸發 AI 接管，開始 RAG 處理...")
                        logger.info(f"🚀 觸發 AI 接管，開始 RAG 處理...")
                        try:
                            print(f"🔧 開始導入 RAGService...")
                            # 延遲導入避免循環導入問題
                            import importlib
                            rag_module = importlib.import_module('app.services.rag_service')
                            RAGService = getattr(rag_module, 'RAGService')
                            print(f"✅ RAGService 導入成功")

                            provider = getattr(bot, 'ai_model_provider', None) or 'groq'
                            model = getattr(bot, 'ai_model', None)
                            threshold = getattr(bot, 'ai_rag_threshold', None)
                            top_k = getattr(bot, 'ai_rag_top_k', None)
                            hist_n = getattr(bot, 'ai_history_messages', None)

                            print(f"🔧 RAG 參數:")
                            print(f"  - 提供商: {provider}")
                            print(f"  - 模型: {model}")
                            print(f"  - 門檻: {threshold}")
                            print(f"  - Top-K: {top_k}")
                            print(f"  - 歷史訊息數: {hist_n}")
                            logger.info(f"🔧 RAG 參數:")
                            logger.info(f"  - 提供商: {provider}")
                            logger.info(f"  - 模型: {model}")
                            logger.info(f"  - 門檻: {threshold}")
                            logger.info(f"  - Top-K: {top_k}")
                            logger.info(f"  - 歷史訊息數: {hist_n}")

                            # 改為背景任務執行，避免阻塞 webhook 回應
                            print(f"🧵 排程 AI 接管背景任務...")
                            logger.info(f"🧵 排程 AI 接管背景任務...")
                            await _schedule_ai_takeover(
                                bot_id=str(bot_id),
                                user_id=user_id,
                                user_query=user_query,
                                reply_token=reply_token,
                                provider=provider,
                                model=model,
                                threshold=threshold,
                                top_k=top_k,
                                hist_n=hist_n,
                                system_prompt=getattr(bot, 'ai_system_prompt', None),
                            )
                            print(f"✅ AI 接管背景任務已排入")
                            logger.info(f"✅ AI 接管背景任務已排入")
                        except Exception as rag_err:
                            print(f"❌ RAG 備援失敗: {rag_err}")
                            logger.error(f"❌ RAG 備援失敗: {rag_err}")
                            import traceback
                            print(f"RAG 錯誤詳情: {traceback.format_exc()}")
                            logger.error(f"RAG 錯誤詳情: {traceback.format_exc()}")
                    else:
                        print(f"⏭️ 跳過 AI 接管 (條件不符合)")
                        logger.info(f"⏭️ 跳過 AI 接管 (條件不符合)")
            except Exception as le_err:
                print(f"❌ 邏輯引擎處理失敗: {le_err}")
                logger.error(f"邏輯引擎處理失敗: {le_err}")
        else:
            print(f"⏭️ 事件類型不符合邏輯處理條件: {event_type}")
            logger.info(f"⏭️ 事件類型不符合邏輯處理條件: {event_type}")

        return {
            'event_type': event_type,
            'message_type': message_type,
            'user_id': user_id,
            'line_message_id': line_message_id,
            'timestamp': event.get('timestamp'),
            'processed': True,
            'is_new': True
        }

    except Exception as e:
        logger.error(f"處理事件失敗: {e}")
        return None


async def process_media_async(
    bot_id: str,
    user_id: str,
    message_type: str,
    line_message_id: str,
    line_bot_service: LineBotService
):
    """
    異步處理媒體檔案
    """
    try:
        logger.info(f"開始處理媒體檔案: {message_type}, {line_message_id}")

        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()

        if not minio_service:
            logger.error("MinIO 服務未初始化")
            return

        # 下載並上傳媒體檔案
        media_path, media_url = await minio_service.upload_media_from_line(
            line_user_id=user_id,
            message_type=message_type,
            channel_token=line_bot_service.channel_token,
            line_message_id=line_message_id
        )

        if media_path and media_url:
            # 更新訊息的媒體資訊
            conversation = await ConversationService.get_conversation_by_line_message_id(
                bot_id, line_message_id
            )
            if conversation:
                updated_message = None
                for message in conversation.messages:
                    if message.line_message_id == line_message_id:
                        message.media_path = media_path
                        message.media_url = media_url
                        updated_message = message
                        break
                await conversation.save()
                logger.info(f"媒體檔案處理完成: {media_path}")

                # 推送更新後的完整訊息，讓前端就地更新（不新增）
                try:
                    if updated_message is not None:
                        from app.services.websocket_manager import websocket_manager
                        await websocket_manager.broadcast_to_bot(bot_id, {
                            'type': 'chat_message',
                            'bot_id': bot_id,
                            'line_user_id': user_id,
                            'data': {
                                'line_user_id': user_id,
                                'message': {
                                    'id': updated_message.id,
                                    'event_type': updated_message.event_type,
                                    'message_type': updated_message.message_type,
                                    'message_content': updated_message.content,
                                    'sender_type': updated_message.sender_type,
                                    'timestamp': updated_message.timestamp.isoformat() if hasattr(updated_message.timestamp, 'isoformat') else updated_message.timestamp,
                                    'media_url': updated_message.media_url,
                                    'media_path': updated_message.media_path,
                                    'admin_user': None
                                }
                            }
                        })
                except Exception as ws_err:
                    logger.warning(f"推送媒體就緒消息到 WebSocket 失敗: {ws_err}")

    except Exception as e:
        logger.error(f"處理媒體檔案失敗: {e}")


async def send_websocket_notifications(bot_id: str, processed_events: list):
    """
    發送 WebSocket 通知
    """
    try:
        for event_result in processed_events:
            # 發送活動更新
            activity_data = {
                'event_type': event_result.get('event_type'),
                'timestamp': event_result.get('timestamp'),
                'user_id': event_result.get('user_id'),
                'message_type': event_result.get('message_type'),
                'line_message_id': event_result.get('line_message_id')
            }

            await websocket_manager.send_activity_update(bot_id, activity_data)

            # 發送新用戶訊息通知
            if event_result.get('event_type') == 'message':
                await websocket_manager.send_new_user_message(
                    bot_id,
                    event_result.get('user_id'),
                    {
                        'event_type': event_result.get('event_type'),
                        'message_type': event_result.get('message_type'),
                        'line_message_id': event_result.get('line_message_id'),
                        'timestamp': event_result.get('timestamp')
                    }
                )

        # 發送分析數據更新
        if processed_events:
            await websocket_manager.send_analytics_update(bot_id, {
                'updated_at': datetime.now().isoformat(),
                'trigger': 'webhook_event',
                'event_count': len(processed_events)
            })

    except Exception as e:
        logger.error(f"發送 WebSocket 通知失敗: {e}")
