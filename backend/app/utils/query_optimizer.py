"""
資料庫查詢優化工具
提供批次查詢、預載入和快取功能
"""
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class QueryOptimizer:
    """資料庫查詢優化器"""
    
    @staticmethod
    def batch_bot_analytics(db: Session, bot_ids: List[str]) -> Dict[str, Dict]:
        """批次獲取多個 Bot 的分析資料"""
        from app.models.line_user import LineBotUser, LineBotUserInteraction
        from datetime import datetime, timedelta
        
        if not bot_ids:
            return {}
        
        # 批次查詢所有相關資料
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # 使用原生 SQL 進行高效能批次查詢
        query = text("""
            WITH bot_stats AS (
                SELECT 
                    lbu.bot_id,
                    COUNT(DISTINCT lbu.id) as total_users,
                    COUNT(DISTINCT CASE WHEN lbui.timestamp >= :start_date THEN lbu.id END) as active_users,
                    COUNT(lbui.id) as total_interactions
                FROM line_bot_users lbu
                LEFT JOIN line_bot_user_interactions lbui ON lbu.id = lbui.line_user_id
                WHERE lbu.bot_id = ANY(:bot_ids)
                GROUP BY lbu.bot_id
            )
            SELECT * FROM bot_stats;
        """)
        
        try:
            result = db.execute(query, {
                "start_date": start_date,
                "bot_ids": bot_ids
            })
            
            analytics_data = {}
            for row in result:
                analytics_data[str(row.bot_id)] = {
                    "total_users": row.total_users or 0,
                    "active_users": row.active_users or 0,
                    "total_interactions": row.total_interactions or 0
                }
            
            return analytics_data
            
        except Exception as e:
            logger.error(f"批次查詢分析資料失敗: {e}")
            return {}
    
    @staticmethod
    def prefetch_bot_data(db: Session, bot_ids: List[str]) -> Dict[str, Any]:
        """預取 Bot 相關資料以減少 N+1 查詢"""
        from app.models.bot import Bot, LogicTemplate
        
        if not bot_ids:
            return {}
        
        # 批次查詢 Bot 基本資訊
        bots = db.query(Bot).filter(Bot.id.in_(bot_ids)).all()
        bot_data = {str(bot.id): bot for bot in bots}
        
        # 批次查詢邏輯模板
        templates = db.query(LogicTemplate).filter(
            LogicTemplate.bot_id.in_(bot_ids)
        ).all()
        
        # 組織邏輯模板資料
        bot_templates = {}
        for template in templates:
            bot_id = str(template.bot_id)
            if bot_id not in bot_templates:
                bot_templates[bot_id] = []
            bot_templates[bot_id].append(template)
        
        return {
            "bots": bot_data,
            "templates": bot_templates
        }
    
    @staticmethod
    def optimize_interaction_queries(db: Session, bot_id: str, time_ranges: List[Dict]) -> Dict[str, int]:
        """優化互動查詢 - 一次查詢獲取多個時間範圍的統計"""
        from app.models.line_user import LineBotUser, LineBotUserInteraction
        
        # 構建動態 SQL 查詢以一次性獲取所有時間範圍的統計
        time_conditions = []
        params = {"bot_id": bot_id}
        
        for i, time_range in enumerate(time_ranges):
            start_key = f"start_{i}"
            end_key = f"end_{i}"
            alias = time_range.get("alias", f"range_{i}")
            
            time_conditions.append(f"""
                COUNT(CASE WHEN lbui.timestamp >= :{start_key} 
                          AND lbui.timestamp < :{end_key} 
                     THEN 1 END) as {alias}
            """)
            
            params[start_key] = time_range["start"]
            params[end_key] = time_range["end"]
        
        query_sql = f"""
            SELECT 
                {', '.join(time_conditions)}
            FROM line_bot_users lbu
            LEFT JOIN line_bot_user_interactions lbui ON lbu.id = lbui.line_user_id
            WHERE lbu.bot_id = :bot_id
        """
        
        try:
            result = db.execute(text(query_sql), params).fetchone()
            
            # 轉換結果為字典
            return {
                time_range.get("alias", f"range_{i}"): getattr(result, time_range.get("alias", f"range_{i}"), 0)
                for i, time_range in enumerate(time_ranges)
            }
            
        except Exception as e:
            logger.error(f"優化互動查詢失敗: {e}")
            return {}
    
    @staticmethod
    def get_activity_distribution_optimized(db: Session, bot_id: str) -> List[Dict]:
        """優化的活動時段分佈查詢"""
        query = text("""
            WITH hourly_activity AS (
                SELECT 
                    EXTRACT(HOUR FROM lbui.timestamp) as hour,
                    COUNT(DISTINCT lbui.line_user_id) as active_users
                FROM line_bot_users lbu
                JOIN line_bot_user_interactions lbui ON lbu.id = lbui.line_user_id
                WHERE lbu.bot_id = :bot_id
                GROUP BY EXTRACT(HOUR FROM lbui.timestamp)
            ),
            time_slots AS (
                SELECT 
                    CASE 
                        WHEN hour BETWEEN 0 AND 2 THEN '深夜 (00-03)'
                        WHEN hour BETWEEN 6 AND 8 THEN '早晨 (06-09)'
                        WHEN hour BETWEEN 9 AND 11 THEN '上午 (09-12)'
                        WHEN hour BETWEEN 12 AND 14 THEN '下午 (12-15)'
                        WHEN hour BETWEEN 15 AND 17 THEN '傍晚 (15-18)'
                        WHEN hour BETWEEN 18 AND 20 THEN '晚上 (18-21)'
                        WHEN hour BETWEEN 21 AND 23 THEN '深夜 (21-24)'
                        ELSE '其他'
                    END as time_slot,
                    SUM(active_users) as users
                FROM hourly_activity
                WHERE hour IS NOT NULL
                GROUP BY 
                    CASE 
                        WHEN hour BETWEEN 0 AND 2 THEN '深夜 (00-03)'
                        WHEN hour BETWEEN 6 AND 8 THEN '早晨 (06-09)'
                        WHEN hour BETWEEN 9 AND 11 THEN '上午 (09-12)'
                        WHEN hour BETWEEN 12 AND 14 THEN '下午 (12-15)'
                        WHEN hour BETWEEN 15 AND 17 THEN '傍晚 (15-18)'
                        WHEN hour BETWEEN 18 AND 20 THEN '晚上 (18-21)'
                        WHEN hour BETWEEN 21 AND 23 THEN '深夜 (21-24)'
                        ELSE '其他'
                    END
            )
            SELECT time_slot, users as active_users
            FROM time_slots
            WHERE time_slot != '其他'
            ORDER BY 
                CASE time_slot
                    WHEN '深夜 (00-03)' THEN 1
                    WHEN '早晨 (06-09)' THEN 2
                    WHEN '上午 (09-12)' THEN 3
                    WHEN '下午 (12-15)' THEN 4
                    WHEN '傍晚 (15-18)' THEN 5
                    WHEN '晚上 (18-21)' THEN 6
                    WHEN '深夜 (21-24)' THEN 7
                END
        """)
        
        try:
            result = db.execute(query, {"bot_id": bot_id})
            return [
                {
                    "time_slot": row.time_slot,
                    "active_users": row.active_users or 0
                }
                for row in result
            ]
            
        except Exception as e:
            logger.error(f"活動分佈查詢失敗: {e}")
            return []
    
    @staticmethod  
    def cache_warm_up(db: Session, user_id: str):
        """預熱常用查詢的快取"""
        from app.models.bot import Bot
        
        try:
            # 預載入用戶的 Bot 列表及相關資料
            bots = db.query(Bot).options(
                selectinload(Bot.logic_templates),
            ).filter(Bot.user_id == user_id).all()
            
            logger.info(f"為用戶 {user_id} 預熱了 {len(bots)} 個 Bot 的快取資料")
            return len(bots)
            
        except Exception as e:
            logger.error(f"快取預熱失敗: {e}")
            return 0