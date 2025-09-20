"""
資料庫查詢優化工具（僅保留實際使用的 async 方法）
"""
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """資料庫查詢優化器"""

    @staticmethod
    async def batch_bot_analytics(bot_ids: List[str]) -> Dict[str, Dict]:
        """批次獲取多個 Bot 的分析資料（使用 MongoDB）"""
        from app.services.conversation_service import ConversationService
        from datetime import datetime, timedelta

        if not bot_ids:
            return {}

        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        analytics_data: Dict[str, Dict] = {}
        for bot_id in bot_ids:
            try:
                bot_analytics = await ConversationService.get_bot_analytics(bot_id, start_date, end_date)
                analytics_data[bot_id] = {
                    "total_users": bot_analytics.get("totalUsers", 0),
                    "active_users": bot_analytics.get("activeUsers", 0),
                    "total_interactions": bot_analytics.get("totalMessages", 0),
                }
            except Exception as e:
                logger.error(f"獲取 Bot {bot_id} 分析數據失敗: {e}")
                analytics_data[bot_id] = {
                    "total_users": 0,
                    "active_users": 0,
                    "total_interactions": 0,
                }

        return analytics_data

    @staticmethod
    async def optimize_interaction_queries(bot_id: str, time_ranges: List[Dict]) -> Dict[str, int]:
        """優化互動查詢 - 使用 MongoDB 獲取多個時間範圍的統計"""
        from app.services.conversation_service import ConversationService

        result: Dict[str, int] = {}
        for i, time_range in enumerate(time_ranges):
            alias = time_range.get("alias", f"range_{i}")
            start_date = time_range["start"]
            end_date = time_range["end"]

            try:
                analytics = await ConversationService.get_bot_analytics(bot_id, start_date, end_date)
                result[alias] = analytics.get("totalMessages", 0)
            except Exception as e:
                logger.error(f"獲取時間範圍 {alias} 統計失敗: {e}")
                result[alias] = 0

        return result
