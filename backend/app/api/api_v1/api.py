"""
API v1 路由聚合器
將所有 API 路由統一管理
"""
from fastapi import APIRouter
from app.api.api_v1 import auth, users, bots, bot_analytics, webhook, bot_dashboard, websocket, storage_test

api_router = APIRouter()

# 認證相關路由
api_router.include_router(auth.router, prefix="/auth", tags=["認證"])

# 用戶管理路由
api_router.include_router(users.router, prefix="/users", tags=["用戶管理"])

# Bot 管理路由
api_router.include_router(bots.router, prefix="/bots", tags=["Bot 管理"])

# Bot 分析路由
api_router.include_router(bot_analytics.router, prefix="/bots", tags=["Bot 分析"])

# Bot 儀表板路由（高效能複合端點）
api_router.include_router(bot_dashboard.router, prefix="/bot_dashboard", tags=["Bot 儀表板"])

# Webhook 路由 (不需要認證)
api_router.include_router(webhook.router, prefix="", tags=["Webhook"])

# WebSocket 路由 (即時通訊)
api_router.include_router(websocket.router, prefix="", tags=["WebSocket"])

# MinIO 測試路由
api_router.include_router(storage_test.router, prefix="", tags=["MinIO 測試"])

# 已移除舊版 API 的相容別名路由，統一走 /api/v1 前綴
