"""
AI 分析服務
整合多個 AI 提供商（Groq、Google Gemini），根據 MongoDB 中的用戶對話歷史提供分析與問答。
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

from app.config import settings
from app.models.mongodb.conversation import ConversationDocument
from app.services.groq_service import GroqService
from app.services.context_formatter import ContextFormatter

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
                model = settings.GROQ_MODEL

            answer = await GroqService.ask_groq(
                question,
                context_text=context_text,
                history=history,
                model=model,
                system_prompt=system_prompt
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
        """
        try:
            conversation = await ConversationDocument.find_one(
                {"bot_id": bot_id, "line_user_id": line_user_id}
            )
            if not conversation or not conversation.messages:
                return "(無歷史對話)"

            # 依時間範圍過濾
            messages = conversation.messages
            if time_range_days and time_range_days > 0:
                since = datetime.utcnow() - timedelta(days=time_range_days)
                messages = [m for m in messages if m.timestamp >= since]

            # 依時間排序（舊→新），然後截取最後 max_messages 筆
            messages.sort(key=lambda m: m.timestamp)
            if len(messages) > max_messages:
                messages = messages[-max_messages:]

            # 使用 ContextFormatter 進行格式化
            return ContextFormatter.format_context(messages, context_format)
        except Exception as e:
            logger.error(f"建立用戶上下文失敗: {e}")
            return "(讀取對話歷史時發生錯誤，可能無資料)"

    @staticmethod
    def _build_contents_for_gemini(
        question: str,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        建立 Gemini REST API 的請求 payload。
        - history: List[{role: 'user'|'assistant', content: str}]
        - system_prompt: 自訂系統提示詞，若未提供則使用預設值
        """
        contents: List[Dict[str, Any]] = []

        # 將歷史對話（管理者與 AI 的往返）帶入，作為多輪上下文
        if history:
            for turn in history:
                role = "user" if turn.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": str(turn.get("content", ""))}]})

        # 注入用戶歷史對話（資料上下文）
        contents.append({
            "role": "user",
            "parts": [{"text": f"對話歷史：\n{context_text}"}]
        })

        # 當前問題
        contents.append({"role": "user", "parts": [{"text": f"問題：{question}"}]})

        # 系統提示（支援自訂）
        if not system_prompt:
            system_prompt = (
                "你是一位專精客服對話洞察的分析助手。"
                "請使用繁體中文回答，聚焦於：意圖、重複問題、關鍵需求、常見痛點、情緒/情感傾向、"
                "有效回覆策略與改進建議。若資訊不足，請說明不確定並提出需要的補充資訊。"
            )

        payload: Dict[str, Any] = {
            "systemInstruction": {
                "role": "system",
                "parts": [{"text": system_prompt}]
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

        def _post() -> requests.Response:
            return requests.post(endpoint, params=params, json=payload, timeout=30)

        try:
            resp: requests.Response = await asyncio.to_thread(_post)
            if resp.status_code >= 400:
                logger.error(f"Gemini API 錯誤: {resp.status_code} {resp.text}")
                raise RuntimeError(f"Gemini API 呼叫失敗: HTTP {resp.status_code}")

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
        except Exception as e:
            logger.error(f"Gemini 呼叫失敗: {e}")
            raise

