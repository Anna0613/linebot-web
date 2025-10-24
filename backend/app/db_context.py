"""
資料庫 Session 上下文管理 - 核心類別
提供智能的讀寫分離和事務一致性管理
"""
from __future__ import annotations

import logging
from typing import Optional
from contextvars import ContextVar
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# 使用 ContextVar 追蹤當前請求是否有寫入操作
_has_write_operation: ContextVar[bool] = ContextVar('has_write_operation', default=False)
# 偏好使用從庫的請求級旗標（由中間件依 HTTP 方法設定）
_prefer_replica: ContextVar[bool] = ContextVar('prefer_replica', default=False)

# 追蹤當前請求的主 session（用於事務一致性）
_primary_session: ContextVar[Optional[AsyncSession]] = ContextVar('primary_session', default=None)


class SessionContext:
    """Session 上下文管理器 - 提供智能的讀寫分離"""
    
    @staticmethod
    def mark_write_operation():
        """標記當前請求有寫入操作"""
        _has_write_operation.set(True)
        logger.debug("已標記寫入操作,後續讀取將使用主庫")
    
    @staticmethod
    def has_write_operation() -> bool:
        """檢查當前請求是否有寫入操作"""
        return _has_write_operation.get(False)
    
    @staticmethod
    def reset():
        """重置上下文（通常在請求結束時調用）"""
        _has_write_operation.set(False)
        _primary_session.set(None)
        _prefer_replica.set(False)
    
    @staticmethod
    def set_primary_session(session: AsyncSession):
        """設定主 session"""
        _primary_session.set(session)
    
    @staticmethod
    def get_primary_session() -> Optional[AsyncSession]:
        """取得主 session"""
        return _primary_session.get(None)

    @staticmethod
    def set_prefer_replica(flag: bool):
        """設定此請求是否偏好使用從庫（僅讀場景）"""
        _prefer_replica.set(bool(flag))

    @staticmethod
    def prefer_replica() -> bool:
        """此請求是否偏好使用從庫"""
        return _prefer_replica.get(False)


# 中間件輔助函數
async def reset_session_context():
    """
    重置 session 上下文
    
    應在每個請求結束時調用（通常在中間件中）
    """
    SessionContext.reset()

