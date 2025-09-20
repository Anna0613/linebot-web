"""
上下文格式轉換器
將 MongoDB 的完整對話格式轉換為不同精簡程度的格式，以減少 AI API 的 token 消耗
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
import re
import logging

logger = logging.getLogger(__name__)


class ContextFormatter:
    """上下文格式轉換器"""
    
    # 格式化模式配置
    FORMAT_CONFIGS = {
        "detailed": {
            "include_header": True,
            "timestamp_format": "full",  # 2025-01-20T10:30:00Z
            "sender_format": "full",     # [用戶]
            "include_empty_messages": True,
            "include_system_messages": True,
        },
        "standard": {
            "include_header": True,
            "timestamp_format": "short", # 01/20 10:30
            "sender_format": "short",    # user/admin/bot
            "include_empty_messages": False,
            "include_system_messages": False,
        },
        "compact": {
            "include_header": False,
            "timestamp_format": "minimal", # 10:30
            "sender_format": "minimal",    # u/a/b
            "include_empty_messages": False,
            "include_system_messages": False,
        }
    }
    
    @classmethod
    def format_context(
        cls,
        messages: List[Any],
        format_mode: str = "standard"
    ) -> str:
        """
        將訊息列表格式化為指定格式的上下文字串
        
        Args:
            messages: 訊息列表（來自 MongoDB）
            format_mode: 格式化模式 (detailed/standard/compact)
            
        Returns:
            格式化後的上下文字串
        """
        if not messages:
            return "(無歷史對話)"
            
        config = cls.FORMAT_CONFIGS.get(format_mode, cls.FORMAT_CONFIGS["standard"])
        
        # 過濾訊息
        filtered_messages = cls._filter_messages(messages, config)
        
        # 格式化訊息
        formatted_lines = []
        
        # 添加標題（如果需要）
        if config["include_header"]:
            if format_mode == "detailed":
                formatted_lines.append("以下是 LINE 用戶與 LINE Bot/管理者的歷史對話摘要（依時間排序）：")
            elif format_mode == "standard":
                formatted_lines.append("對話歷史：")
            # compact 模式不添加標題
        
        # 格式化每條訊息
        for message in filtered_messages:
            formatted_line = cls._format_single_message(message, config)
            if formatted_line:
                formatted_lines.append(formatted_line)
        
        return "\n".join(formatted_lines)
    
    @classmethod
    def _filter_messages(cls, messages: List[Any], config: Dict[str, Any]) -> List[Any]:
        """過濾訊息"""
        filtered = []
        
        for message in messages:
            # 提取訊息文字內容
            text_content = cls._extract_text_content(message)
            
            # 過濾空白訊息
            if not config["include_empty_messages"] and not text_content.strip():
                continue
                
            # 過濾系統訊息
            if not config["include_system_messages"]:
                if cls._is_system_message(message, text_content):
                    continue
            
            filtered.append(message)
        
        return filtered
    
    @classmethod
    def _extract_text_content(cls, message: Any) -> str:
        """提取訊息的文字內容"""
        try:
            content = message.content or {}
            text = ""
            
            if isinstance(content, dict):
                if isinstance(content.get("text"), dict):
                    text = str(content["text"].get("text", "")).strip()
                else:
                    text = str(content.get("text") or content.get("content") or "").strip()
            else:
                text = str(content).strip()
            
            # 如果沒有文字內容，使用訊息類型作為佔位符
            if not text:
                message_type = getattr(message, 'message_type', 'message')
                if message_type in ['image', 'video', 'audio', 'file']:
                    text = f"[{message_type}]"
                elif message_type == 'sticker':
                    text = "[貼圖]"
                elif message_type == 'location':
                    text = "[位置]"
                else:
                    text = f"[{message_type}]"
            
            return text
            
        except Exception as e:
            logger.warning(f"提取訊息內容失敗: {e}")
            return ""
    
    @classmethod
    def _is_system_message(cls, message: Any, text_content: str) -> bool:
        """判斷是否為系統訊息"""
        # 判斷系統訊息的條件
        system_patterns = [
            r"^系統",
            r"^自動",
            r"^\[系統\]",
            r"^歡迎",
            r"^感謝您的使用",
        ]
        
        for pattern in system_patterns:
            if re.match(pattern, text_content):
                return True
        
        # 判斷是否為很短的無意義訊息
        if len(text_content.strip()) <= 2 and text_content.strip() in ["好", "是", "嗯", "ok", "OK"]:
            return True
            
        return False
    
    @classmethod
    def _format_single_message(cls, message: Any, config: Dict[str, Any]) -> str:
        """格式化單條訊息"""
        try:
            # 格式化時間戳
            timestamp_str = cls._format_timestamp(message.timestamp, config["timestamp_format"])
            
            # 格式化發送者
            sender_str = cls._format_sender(
                getattr(message, 'sender_type', 'user'), 
                config["sender_format"]
            )
            
            # 提取內容
            text_content = cls._extract_text_content(message)
            
            # 組合格式化字串
            if config["timestamp_format"] == "none":
                return f"{sender_str}: {text_content}"
            else:
                return f"{timestamp_str} {sender_str}: {text_content}"
                
        except Exception as e:
            logger.warning(f"格式化訊息失敗: {e}")
            return ""
    
    @classmethod
    def _format_timestamp(cls, timestamp: datetime, format_type: str) -> str:
        """格式化時間戳"""
        try:
            if format_type == "full":
                # 完整 ISO 格式：2025-01-20T10:30:00Z
                return timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp)
            elif format_type == "short":
                # 短格式：01/20 10:30
                return timestamp.strftime("%m/%d %H:%M")
            elif format_type == "minimal":
                # 最小格式：10:30
                return timestamp.strftime("%H:%M")
            elif format_type == "none":
                return ""
            else:
                return timestamp.strftime("%m/%d %H:%M")
        except Exception:
            return str(timestamp)
    
    @classmethod
    def _format_sender(cls, sender_type: str, format_type: str) -> str:
        """格式化發送者標識"""
        sender_mappings = {
            "detailed": {
                "user": "[用戶]",
                "admin": "[管理者]", 
                "bot": "[機器人]",
            },
            "standard": {
                "user": "user",
                "admin": "admin",
                "bot": "bot",
            },
            "compact": {
                "user": "u",
                "admin": "a", 
                "bot": "b",
            }
        }
        
        if format_type == "full":
            format_type = "detailed"
        elif format_type == "short":
            format_type = "standard"
        elif format_type == "minimal":
            format_type = "compact"
        
        mapping = sender_mappings.get(format_type, sender_mappings["standard"])
        return mapping.get(sender_type or "user", mapping["user"])
    
    @classmethod
    def estimate_token_savings(cls, messages: List[Any]) -> Dict[str, Dict[str, int]]:
        """估算不同格式模式的 token 節省量"""
        if not messages:
            return {}
        
        results = {}
        
        for format_mode in cls.FORMAT_CONFIGS.keys():
            formatted_text = cls.format_context(messages, format_mode)
            
            # 簡單的 token 估算（1 token ≈ 4 字符）
            estimated_tokens = len(formatted_text) // 4
            
            results[format_mode] = {
                "estimated_tokens": estimated_tokens,
                "character_count": len(formatted_text),
                "line_count": len(formatted_text.split('\n'))
            }
        
        # 計算節省比例
        if "detailed" in results:
            detailed_tokens = results["detailed"]["estimated_tokens"]
            for mode in results:
                if mode != "detailed":
                    savings = detailed_tokens - results[mode]["estimated_tokens"]
                    savings_percent = (savings / detailed_tokens * 100) if detailed_tokens > 0 else 0
                    results[mode]["token_savings"] = savings
                    results[mode]["savings_percent"] = round(savings_percent, 1)
        
        return results
