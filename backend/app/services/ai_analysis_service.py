"""
AI 分析服務
整合多個 AI 提供商（Groq、Google Gemini），根據 MongoDB 中的用戶對話歷史提供分析與問答。
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.models.mongodb.conversation import ConversationDocument
from app.services.groq_service import GroqService
from app.services.context_formatter import ContextFormatter
from app.services.prompt_templates import PromptTemplates
from app.config.redis_config import CacheService as AsyncCache, redis_manager

logger = logging.getLogger(__name__)


class AIAnalysisService:
    """提供 AI 分析能力（支援 Groq 和 Google Gemini）。"""

    GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    @staticmethod
    async def ask_ai(
        question: str,
        *,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        統一的 AI 調用介面，根據配置選擇 AI 提供商。

        Returns:
            Dict containing:
            - answer: str - AI 回答
            - model: str - 使用的模型
            - provider: str - 使用的提供商
        """
        provider = provider or settings.AI_PROVIDER

        if provider == "groq":
            # 使用 Groq
            if not model:
                # 如果沒有指定模型，使用支援列表中的第一個可用模型
                available_models = GroqService.get_available_models()
                if available_models:
                    model = available_models[0]["id"]
                else:
                    # 如果沒有可用模型，使用預設值
                    model = settings.GROQ_MODEL

            answer = await GroqService.ask_groq_with_retry(
                question,
                context_text=context_text,
                history=history,
                model=model,
                system_prompt=system_prompt,
                max_tokens=max_tokens
            )

            return {
                "answer": answer,
                "model": model,
                "provider": "groq"
            }

        elif provider == "gemini":
            # 使用 Gemini（向後相容）
            if not model:
                model = settings.GEMINI_MODEL

            answer = await AIAnalysisService.ask_gemini(
                question,
                context_text=context_text,
                history=history,
                model=model,
                system_prompt=system_prompt
            )

            return {
                "answer": answer,
                "model": model,
                "provider": "gemini"
            }
        else:
            raise ValueError(f"不支援的 AI 提供商: {provider}")

    @staticmethod
    def get_available_models(provider: Optional[str] = None) -> List[Dict[str, Any]]:
        """取得可用的模型列表"""
        provider = provider or settings.AI_PROVIDER

        if provider == "groq":
            return GroqService.get_available_models()
        elif provider == "gemini":
            return [
                {
                    "id": "gemini-1.5-flash",
                    "name": "Gemini 1.5 Flash",
                    "description": "快速回應的 Google AI 模型",
                    "category": "Google",
                    "max_tokens": 1024,
                    "context_length": 1000000
                },
                {
                    "id": "gemini-1.5-pro",
                    "name": "Gemini 1.5 Pro",
                    "description": "高品質的 Google AI 模型",
                    "category": "Google",
                    "max_tokens": 8192,
                    "context_length": 2000000
                }
            ]
        else:
            return []

    @staticmethod
    async def build_user_context(
        bot_id: str,
        line_user_id: str,
        *,
        time_range_days: Optional[int] = None,
        max_messages: int = 200,
        context_format: str = "standard",
    ) -> str:
        """
        從 MongoDB 讀取該用戶的對話歷史，整理為可供大模型理解的上下文文字。

        - 依 updated_at 取對話，若提供 time_range_days 則僅取該期間內訊息。
        - 最多包含 max_messages 筆（越新的訊息優先）。
        - 使用 ContextFormatter 進行格式優化以減少 token 消耗。

        Returns:
            str: 格式化的對話上下文，如果沒有對話則返回提示訊息
        """
        try:
            # 先嘗試從快取獲取對話歷史（改為非同步 Redis 方案）
            messages = None
            cache_hit = False

            if redis_manager.is_connected:
                try:
                    cache_key = f"conversation:{bot_id}:{line_user_id}"
                    cached_obj = await AsyncCache.get(cache_key)
                    if isinstance(cached_obj, dict):
                        messages = cached_obj.get('messages')
                        if messages is not None:
                            cache_hit = True
                            logger.debug(f"✓ 使用快取的對話歷史: {bot_id}:{line_user_id}, 訊息數: {len(messages)}")
                except Exception as cache_err:
                    logger.warning(f"讀取對話快取失敗: {cache_err}")

            if messages is None:
                # 快取不存在，從 MongoDB 讀取
                logger.debug(f"從 MongoDB 讀取對話歷史: {bot_id}:{line_user_id}")

                try:
                    conversation = await ConversationDocument.find_one(
                        {"bot_id": bot_id, "line_user_id": line_user_id}
                    )
                except Exception as db_err:
                    logger.error(f"MongoDB 查詢失敗: {db_err}")
                    return "(無法連接到資料庫，請稍後再試)"

                # 檢查對話是否存在
                if not conversation:
                    logger.info(f"未找到對話記錄: bot_id={bot_id}, line_user_id={line_user_id}")
                    return "(此用戶尚無對話記錄，請先與用戶進行互動後再進行分析)"

                # 檢查訊息是否存在
                if not conversation.messages or len(conversation.messages) == 0:
                    logger.info(f"對話記錄為空: bot_id={bot_id}, line_user_id={line_user_id}")
                    return "(此用戶的對話記錄為空，請先與用戶進行互動後再進行分析)"

                # 將 MongoDB 文檔轉換為字典格式以便快取
                messages = []
                for msg in conversation.messages:
                    try:
                        # 確保 timestamp 是 datetime 物件
                        timestamp = msg.timestamp
                        if isinstance(timestamp, str):
                            try:
                                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                            except (ValueError, AttributeError):
                                timestamp = datetime.utcnow()

                        message_dict = {
                            'sender_type': msg.sender_type,
                            'content': msg.content,
                            'timestamp': timestamp.isoformat() if isinstance(timestamp, datetime) else str(timestamp),
                            'message_type': getattr(msg, 'message_type', 'text')
                        }
                        messages.append(message_dict)
                    except Exception as msg_err:
                        logger.warning(f"訊息轉換失敗，跳過: {msg_err}")
                        continue

                logger.info(f"✓ 從 MongoDB 載入對話: bot_id={bot_id}, line_user_id={line_user_id}, 訊息數: {len(messages)}")

                # 設定快取（30 分鐘，非同步 Redis）
                if redis_manager.is_connected and messages:
                    try:
                        cache_key = f"conversation:{bot_id}:{line_user_id}"
                        cache_data = {
                            'messages': messages,
                            'cached_at': datetime.now().isoformat(),
                            'message_count': len(messages)
                        }
                        await AsyncCache.set(cache_key, cache_data, ttl=1800)
                        logger.debug(f"✓ 對話快取已設定: {cache_key}")
                    except Exception as cache_err:
                        logger.warning(f"設定對話快取失敗: {cache_err}")

            # 再次檢查訊息列表
            if not messages or len(messages) == 0:
                return "(對話記錄為空，無法進行分析)"

            # 標準化時間戳格式（確保都是 datetime 物件）
            for msg in messages:
                if isinstance(msg['timestamp'], str):
                    try:
                        # 嘗試解析 ISO 格式的時間戳
                        msg['timestamp'] = datetime.fromisoformat(msg['timestamp'].replace('Z', '+00:00'))
                    except (ValueError, AttributeError) as e:
                        logger.warning(f"時間戳解析失敗: {msg.get('timestamp')}, 錯誤: {e}")
                        # 使用當前時間作為後備
                        msg['timestamp'] = datetime.utcnow()

            # 依時間範圍過濾
            original_count = len(messages)
            if time_range_days and time_range_days > 0:
                since = datetime.utcnow() - timedelta(days=time_range_days)
                messages = [m for m in messages if m['timestamp'] >= since]
                logger.debug(f"時間範圍過濾: {original_count} -> {len(messages)} 筆訊息 (最近 {time_range_days} 天)")

            # 依時間排序（舊→新），然後截取最後 max_messages 筆
            messages.sort(key=lambda m: m['timestamp'])
            if len(messages) > max_messages:
                messages = messages[-max_messages:]
                logger.debug(f"訊息數量限制: 截取最新 {max_messages} 筆")

            # 最終檢查
            if not messages:
                return f"(在指定的時間範圍內沒有找到對話記錄)"

            # 轉換為適合 ContextFormatter 的格式
            formatted_messages = []
            for msg in messages:
                try:
                    # 建立模擬的訊息物件
                    class MockMessage:
                        def __init__(self, data):
                            self.sender_type = data['sender_type']
                            self.content = data['content']
                            self.timestamp = data['timestamp']
                            self.message_type = data.get('message_type', 'text')

                    formatted_messages.append(MockMessage(msg))
                except Exception as format_err:
                    logger.warning(f"訊息格式化失敗，跳過: {format_err}")
                    continue

            if not formatted_messages:
                return "(訊息格式化失敗，無法進行分析)"

            # 使用 ContextFormatter 進行格式化
            context_text = ContextFormatter.format_context(formatted_messages, context_format)
            logger.info(f"✓ 上下文建立完成: {len(formatted_messages)} 筆訊息, 格式: {context_format}, 快取命中: {cache_hit}")

            return context_text

        except Exception as e:
            logger.error(f"建立用戶上下文失敗: {e}", exc_info=True)
            return f"(讀取對話歷史時發生錯誤: {str(e)})"

    @staticmethod
    def _build_contents_for_gemini(
        question: str,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        建立 Gemini REST API 的請求 payload（使用優化的提示詞模板）

        Args:
            question: 當前用戶問題
            context_text: 知識庫檢索到的內容
            history: 對話歷史 [{"role": "user"|"assistant", "content": "..."}]
            system_prompt: 自訂系統提示詞（可選）

        Returns:
            Gemini API 格式的 payload
        """
        contents: List[Dict[str, Any]] = []

        # 添加對話歷史（如果有）
        if history:
            history_content = PromptTemplates.wrap_conversation_history(history)
            if history_content:
                contents.append({
                    "role": "user",
                    "parts": [{"text": history_content}]
                })

        # 添加知識庫資料（如果有）
        if context_text and context_text.strip():
            kb_content = PromptTemplates.wrap_knowledge_base(context_text)
            contents.append({
                "role": "user",
                "parts": [{"text": kb_content}]
            })

        # 添加當前問題
        query_content = PromptTemplates.wrap_current_query(question)
        contents.append({
            "role": "user",
            "parts": [{"text": query_content}]
        })

        # 建構系統提示詞
        full_system_prompt = PromptTemplates.build_system_prompt(system_prompt)

        payload: Dict[str, Any] = {
            "systemInstruction": {
                "role": "system",
                "parts": [{"text": full_system_prompt}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3,
                "topP": 0.9,
                "topK": 40,
                "maxOutputTokens": 1024,
            },
        }
        return payload

    @staticmethod
    async def ask_gemini(
        question: str,
        *,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        呼叫 Google Gemini 以取得答案。若設定缺失，拋出例外。
        """
        api_key = api_key or settings.__dict__.get("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
        model = model or settings.__dict__.get("GEMINI_MODEL", "gemini-1.5-flash") or getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

        if not api_key:
            raise RuntimeError("缺少 GEMINI_API_KEY，請於後端 .env 設定")

        endpoint = AIAnalysisService.GEMINI_ENDPOINT.format(model=model)
        params = {"key": api_key}
        payload = AIAnalysisService._build_contents_for_gemini(question, context_text, history, system_prompt)

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(endpoint, params=params, json=payload)
                resp.raise_for_status()
                data = resp.json()
            # 依據 Google Generative Language API 結構抽取文字
            # data.candidates[0].content.parts[0].text
            candidates = (data or {}).get("candidates") or []
            if not candidates:
                return "(未取得模型回應)"
            content = (candidates[0] or {}).get("content") or {}
            parts = content.get("parts") or []
            for p in parts:
                if isinstance(p, dict) and p.get("text"):
                    return str(p["text"]).strip()
            return "(未解析到文字回應)"
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini API 錯誤: {e.response.status_code} {e.response.text}")
            raise RuntimeError(f"Gemini API 呼叫失敗: HTTP {e.response.status_code}")
        except Exception as e:
            logger.error(f"Gemini 呼叫失敗: {e}")
            raise

