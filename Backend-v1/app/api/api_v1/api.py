"""
API v1 路由聚合器
將所有 API 路由統一管理
"""
from fastapi import APIRouter
from app.api.api_v1 import auth, users, bots

api_router = APIRouter()

# 認證相關路由
api_router.include_router(auth.router, prefix="/auth", tags=["認證"])

# 用戶管理路由
api_router.include_router(users.router, prefix="/users", tags=["用戶管理"])

# Bot 管理路由
api_router.include_router(bots.router, prefix="/bots", tags=["Bot 管理"])

# 為了與舊版 API 保持相容，添加一些別名路由
api_router.include_router(auth.router, prefix="", tags=["認證（相容）"])  # 支援 /register, /login 等
api_router.include_router(bots.router, prefix="", tags=["Bot 管理（相容）"])  # 支援 /messages, /codes 等 