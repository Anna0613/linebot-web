"""
AI 分析服務
整合多個 AI 提供商（Groq、Google Gemini），根據 MongoDB 中的用戶對話歷史提供分析與問答。
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.models.mongodb.conversation import ConversationDocument
from app.services.ai.groq_service import GroqService
from app.services.conversation.context_manager import TokenCounter
from app.services.conversation.context_formatter import ContextFormatter
from app.services.ai.prompt_templates import PromptTemplates
from app.config.redis_config import CacheService as AsyncCache, redis_manager

logger = logging.getLogger(__name__)


@dataclass
class ContextBuildResult:
    """AI 分析上下文建構結果。"""

    context_text: str
    metadata: Dict[str, Any]


class AIAnalysisService:
    """提供 AI 分析能力（支援 Groq 和 Google Gemini）。"""

    GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    ANALYSIS_PROVIDER = "groq"
    ANALYSIS_MODEL = "openai/gpt-oss-120b"
    ANALYSIS_MAX_OUTPUT_TOKENS = 4096
    ANALYSIS_SAFETY_MARGIN_TOKENS = 2048
    ANALYSIS_MAX_USER_CONTEXT_TOKENS = 32000
    ANALYSIS_MAX_CANDIDATE_MESSAGES = 500
    ANALYSIS_HISTORY_TURNS = 6
    ANALYSIS_SYSTEM_PROMPT = PromptTemplates.CUSTOMER_SERVICE_ANALYSIS_PROMPT

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
        context_kind: str = "knowledge_base",
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
                max_tokens=max_tokens,
                context_kind=context_kind,
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
                system_prompt=system_prompt,
                context_kind=context_kind,
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
        question: str = "",
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        max_output_tokens: Optional[int] = None,
        return_metadata: bool = False,
    ) -> str | ContextBuildResult:
        """
        從 MongoDB 讀取該用戶的對話歷史，整理為可供大模型理解的上下文文字。

        - 依 updated_at 取對話，若提供 time_range_days 則僅取該期間內訊息。
        - 最多讀取固定候選上限內的最新訊息（越新的訊息優先）。
        - 依模型 context window 自動控制 token 預算與格式。

        Returns:
            str 或 ContextBuildResult: 格式化的對話上下文與可選 metadata
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

            # 依時間排序（舊→新），然後取固定候選上限；真正納入 AI 的內容由 token budget 決定
            messages.sort(key=lambda m: m['timestamp'])
            candidate_limit = AIAnalysisService.ANALYSIS_MAX_CANDIDATE_MESSAGES
            if len(messages) > candidate_limit:
                messages = messages[-candidate_limit:]
                logger.debug(f"訊息候選限制: 截取最新 {candidate_limit} 筆")

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

            context_result = AIAnalysisService._build_token_aware_context(
                formatted_messages,
                question=question,
                history=history,
                model=model or AIAnalysisService.ANALYSIS_MODEL,
                system_prompt=system_prompt or AIAnalysisService.ANALYSIS_SYSTEM_PROMPT,
                max_output_tokens=max_output_tokens or AIAnalysisService.ANALYSIS_MAX_OUTPUT_TOKENS,
                total_candidate_messages=len(formatted_messages),
                cache_hit=cache_hit,
            )
            logger.info(
                "✓ 上下文建立完成: %s/%s 筆訊息, 格式: %s, 預估 tokens: %s, 快取命中: %s",
                context_result.metadata.get("included_messages"),
                context_result.metadata.get("candidate_messages"),
                context_result.metadata.get("context_format"),
                context_result.metadata.get("estimated_context_tokens"),
                cache_hit,
            )

            if return_metadata:
                return context_result
            return context_result.context_text

        except Exception as e:
            logger.error(f"建立用戶上下文失敗: {e}", exc_info=True)
            return f"(讀取對話歷史時發生錯誤: {str(e)})"

    @staticmethod
    def _trim_analysis_history(history: Optional[List[Dict[str, str]]]) -> List[Dict[str, str]]:
        """保留最近少量 AI 分析對話，避免分析聊天室本身吃掉主要 token 預算。"""
        if not history:
            return []

        cleaned: List[Dict[str, str]] = []
        for turn in history:
            role = turn.get("role")
            content = str(turn.get("content") or "").strip()
            if role not in {"user", "assistant"} or not content:
                continue
            cleaned.append({"role": role, "content": content})

        return cleaned[-AIAnalysisService.ANALYSIS_HISTORY_TURNS:]

    @staticmethod
    def _get_model_context_length(model: str) -> int:
        """取得固定分析模型的 context window，找不到時使用保守預設。"""
        model_config = GroqService.get_model_info(model) or {}
        return int(model_config.get("context_length") or 131072)

    @staticmethod
    def _calculate_user_context_budget(
        *,
        counter: TokenCounter,
        model: str,
        question: str,
        history: Optional[List[Dict[str, str]]],
        system_prompt: str,
        max_output_tokens: int,
    ) -> Dict[str, int]:
        """依模型 context window 扣除固定提示、分析歷史、問題、輸出與安全邊界。"""
        trimmed_history = AIAnalysisService._trim_analysis_history(history)
        full_system_prompt = PromptTemplates.build_system_prompt(system_prompt)
        history_text = PromptTemplates.wrap_conversation_history(trimmed_history)
        query_text = PromptTemplates.wrap_current_query(question or "")

        system_tokens = counter.count_tokens(full_system_prompt)
        history_tokens = counter.count_tokens(history_text) if history_text else 0
        question_tokens = counter.count_tokens(query_text)
        context_length = AIAnalysisService._get_model_context_length(model)

        raw_budget = (
            context_length
            - max_output_tokens
            - system_tokens
            - history_tokens
            - question_tokens
            - AIAnalysisService.ANALYSIS_SAFETY_MARGIN_TOKENS
        )
        user_context_budget = max(
            1024,
            min(raw_budget, AIAnalysisService.ANALYSIS_MAX_USER_CONTEXT_TOKENS),
        )

        return {
            "context_length": context_length,
            "max_output_tokens": max_output_tokens,
            "system_tokens": system_tokens,
            "history_tokens": history_tokens,
            "question_tokens": question_tokens,
            "safety_margin_tokens": AIAnalysisService.ANALYSIS_SAFETY_MARGIN_TOKENS,
            "user_context_budget": user_context_budget,
        }

    @staticmethod
    def _format_messages_with_budget(
        messages: List[Any],
        *,
        counter: TokenCounter,
        token_budget: int,
    ) -> Dict[str, Any]:
        """用 standard 優先、compact 備援的方式，從最新訊息往前放入 token 預算。"""
        best_result: Optional[Dict[str, Any]] = None

        for format_mode in ("standard", "compact"):
            config = ContextFormatter.FORMAT_CONFIGS.get(format_mode, ContextFormatter.FORMAT_CONFIGS["standard"])
            filtered_messages = ContextFormatter._filter_messages(messages, config)

            header_lines: List[str] = []
            if format_mode == "standard":
                header_lines.append("LINE 對話紀錄（依時間由舊到新）：")

            selected_lines: List[str] = []
            current_tokens = counter.count_tokens("\n".join(header_lines)) if header_lines else 0
            omitted_messages = 0

            for message in reversed(filtered_messages):
                line = ContextFormatter._format_single_message(message, config)
                if not line:
                    omitted_messages += 1
                    continue

                line_tokens = counter.count_tokens(line) + 1
                if current_tokens + line_tokens <= token_budget:
                    selected_lines.insert(0, line)
                    current_tokens += line_tokens
                else:
                    omitted_messages += 1

            context_text = "\n".join(header_lines + selected_lines).strip()
            result = {
                "context_text": context_text or "(無可納入的對話紀錄)",
                "context_format": format_mode,
                "included_messages": len(selected_lines),
                "omitted_messages": omitted_messages,
                "filtered_messages": len(filtered_messages),
                "estimated_context_tokens": current_tokens,
            }

            if omitted_messages == 0:
                return result
            if best_result is None or result["included_messages"] > best_result["included_messages"]:
                best_result = result

        return best_result or {
            "context_text": "(無可納入的對話紀錄)",
            "context_format": "compact",
            "included_messages": 0,
            "omitted_messages": len(messages),
            "filtered_messages": len(messages),
            "estimated_context_tokens": 0,
        }

    @staticmethod
    def _build_token_aware_context(
        messages: List[Any],
        *,
        question: str,
        history: Optional[List[Dict[str, str]]],
        model: str,
        system_prompt: str,
        max_output_tokens: int,
        total_candidate_messages: int,
        cache_hit: bool,
    ) -> ContextBuildResult:
        """建立固定模型策略下的 token-aware LINE 對話上下文。"""
        counter = TokenCounter(model)
        budget = AIAnalysisService._calculate_user_context_budget(
            counter=counter,
            model=model,
            question=question,
            history=history,
            system_prompt=system_prompt,
            max_output_tokens=max_output_tokens,
        )
        formatted = AIAnalysisService._format_messages_with_budget(
            messages,
            counter=counter,
            token_budget=budget["user_context_budget"],
        )

        metadata = {
            "context_policy": "auto_token_budget",
            "provider": AIAnalysisService.ANALYSIS_PROVIDER,
            "model": model,
            "candidate_messages": total_candidate_messages,
            "included_messages": formatted["included_messages"],
            "omitted_messages": max(0, total_candidate_messages - formatted["included_messages"]),
            "filtered_messages": formatted["filtered_messages"],
            "context_format": formatted["context_format"],
            "estimated_context_tokens": formatted["estimated_context_tokens"],
            "cache_hit": cache_hit,
            **budget,
        }

        return ContextBuildResult(
            context_text=formatted["context_text"],
            metadata=metadata,
        )

    @staticmethod
    def _build_contents_for_gemini(
        question: str,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        context_kind: str = "knowledge_base",
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

        if context_kind == "control":
            if context_text and context_text.strip():
                contents.append({
                    "role": "user",
                    "parts": [{"text": context_text.strip()}]
                })
            contents.append({
                "role": "user",
                "parts": [{"text": question.strip()}]
            })

            return {
                "systemInstruction": {
                    "role": "system",
                    "parts": [{"text": (system_prompt or "").strip()}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.0,
                    "topP": 1.0,
                    "topK": 1,
                    "maxOutputTokens": 256,
                },
            }

        # 添加對話歷史（如果有）
        if history:
            history_content = PromptTemplates.wrap_conversation_history(history)
            if history_content:
                contents.append({
                    "role": "user",
                    "parts": [{"text": history_content}]
                })

        # 添加上下文資料（如果有）
        if context_text and context_text.strip():
            if context_kind == "user_context":
                kb_content = PromptTemplates.wrap_user_context(context_text)
            else:
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

        # 建構系統提示詞（自主回覆不套用知識庫約束）
        if context_kind == "autonomous":
            full_system_prompt = PromptTemplates.build_autonomous_system_prompt(system_prompt)
        else:
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
        context_kind: str = "knowledge_base",
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
        payload = AIAnalysisService._build_contents_for_gemini(
            question,
            context_text,
            history,
            system_prompt,
            context_kind=context_kind,
        )

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
