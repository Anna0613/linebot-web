"""
Groq AI 服務
整合 Groq API，提供高效能的 AI 分析能力。
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from groq import AsyncGroq, RateLimitError, APIConnectionError, APITimeoutError, InternalServerError
from groq.types.chat import ChatCompletion

from app.config import settings
from app.utils.retry_utils import async_retry, API_RETRY_CONFIG, CircuitBreaker
from app.services.context_manager import ContextManager, MessageRole

logger = logging.getLogger(__name__)


# Groq 特定的異常類型
GROQ_RETRYABLE_EXCEPTIONS = (
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    InternalServerError
)

# Groq API 熔斷器
groq_circuit_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60.0,
    expected_exception=Exception
)


class GroqService:
    """提供 Groq AI 分析能力。"""

    # 支援的 Groq 模型配置（2025年最新，基於官方文檔驗證）
    GROQ_MODELS = {
        # === 生產級模型（Production Models）===
        "llama-3.3-70b-versatile": {
            "name": "Llama 3.3 70B Versatile",
            "description": "Meta 最新旗艦模型，卓越的推理和分析能力",
            "max_tokens": 32768,
            "context_length": 131072,
            "category": "旗艦"
        },
        "llama-3.1-8b-instant": {
            "name": "Llama 3.1 8B Instant",
            "description": "超快速回應模型，適合即時對話和簡單分析",
            "max_tokens": 131072,
            "context_length": 131072,
            "category": "快速"
        },
        "openai/gpt-oss-120b": {
            "name": "GPT-OSS 120B",
            "description": "OpenAI 開源旗艦模型，具備推理和工具調用能力",
            "max_tokens": 65536,
            "context_length": 131072,
            "category": "旗艦"
        },
        "openai/gpt-oss-20b": {
            "name": "GPT-OSS 20B",
            "description": "OpenAI 高效能開源模型，平衡速度與品質",
            "max_tokens": 65536,
            "context_length": 131072,
            "category": "高效能"
        },
        "meta-llama/llama-guard-4-12b": {
            "name": "Llama Guard 4 12B",
            "description": "Meta 最新安全防護模型，內容審核和安全檢測",
            "max_tokens": 1024,
            "context_length": 131072,
            "category": "安全"
        },

        # === 系統模型（Production Systems）===
        "groq/compound": {
            "name": "Groq Compound",
            "description": "Groq 智能系統，整合網頁搜尋和程式碼執行功能",
            "max_tokens": 8192,
            "context_length": 131072,
            "category": "系統"
        },
        "groq/compound-mini": {
            "name": "Groq Compound Mini",
            "description": "Groq 輕量智能系統，快速回應和基本工具調用",
            "max_tokens": 8192,
            "context_length": 131072,
            "category": "系統"
        },

        # === 預覽模型（Preview Models）===
        "meta-llama/llama-4-scout-17b-16e-instruct": {
            "name": "Llama 4 Scout",
            "description": "Meta 最新視覺模型，支援圖像理解和多模態分析",
            "max_tokens": 8192,
            "context_length": 131072,
            "category": "多模態"
        },
        "meta-llama/llama-4-maverick-17b-128e-instruct": {
            "name": "Llama 4 Maverick",
            "description": "Meta 高階視覺模型，專業級圖像分析能力",
            "max_tokens": 8192,
            "context_length": 131072,
            "category": "多模態"
        },
        "moonshotai/kimi-k2-instruct-0905": {
            "name": "Kimi K2 Instruct",
            "description": "月之暗面 Kimi 模型，超長上下文處理能力",
            "max_tokens": 16384,
            "context_length": 262144,
            "category": "長文本"
        },
        "qwen/qwen3-32b": {
            "name": "Qwen 3 32B",
            "description": "阿里巴巴 Qwen 3 模型，優秀的中英文理解能力",
            "max_tokens": 40960,
            "context_length": 131072,
            "category": "多語言"
        },
        "meta-llama/llama-prompt-guard-2-22m": {
            "name": "Llama Prompt Guard 2 22M",
            "description": "Meta 輕量級提示安全檢測模型",
            "max_tokens": 512,
            "context_length": 512,
            "category": "安全"
        },
        "meta-llama/llama-prompt-guard-2-86m": {
            "name": "Llama Prompt Guard 2 86M",
            "description": "Meta 提示安全檢測模型，更強的檢測能力",
            "max_tokens": 512,
            "context_length": 512,
            "category": "安全"
        }
    }

    @classmethod
    def get_available_models(cls) -> List[Dict[str, Any]]:
        """取得可用的模型列表"""
        return [
            {
                "id": model_id,
                "name": config["name"],
                "description": config["description"],
                "category": config["category"],
                "max_tokens": config["max_tokens"],
                "context_length": config["context_length"]
            }
            for model_id, config in cls.GROQ_MODELS.items()
        ]

    @staticmethod
    def _get_client(api_key: Optional[str] = None) -> AsyncGroq:
        """取得或建立可重用的 AsyncGroq 客戶端。"""
        # 模組級快取
        global _GROQ_CLIENT, _GROQ_CLIENT_KEY
        if '_GROQ_CLIENT' not in globals():
            _GROQ_CLIENT = None  # type: ignore[var-annotated]
            _GROQ_CLIENT_KEY = None  # type: ignore[var-annotated]

        key = api_key or settings.GROQ_API_KEY
        if not key:
            # 延後在呼叫端拋錯，避免 None 客戶端
            return AsyncGroq(api_key=key)

        # 若尚未建立或 API Key 改變，重建
        if _GROQ_CLIENT is None or _GROQ_CLIENT_KEY != key:  # type: ignore[name-defined]
            _GROQ_CLIENT = AsyncGroq(api_key=key)  # type: ignore[name-defined]
            _GROQ_CLIENT_KEY = key  # type: ignore[name-defined]
            logger.debug("建立新的 AsyncGroq 客戶端")

        return _GROQ_CLIENT  # type: ignore[return-value]

    @staticmethod
    def _build_messages_for_groq(
        question: str,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """
        建立 Groq API 的訊息格式（OpenAI 相容）。
        - history: List[{role: 'user'|'assistant', content: str}]
        - system_prompt: 自訂系統提示詞，若未提供則使用預設值
        """
        messages: List[Dict[str, str]] = []

        # 系統層級基礎提示詞（不可被用戶覆蓋）
        base_system_prompt = "請盡量使用 Markdown 格式輸出。"

        # 用戶自訂或預設的系統提示詞
        if not system_prompt:
            system_prompt = (
                "你是一位專精客服對話洞察的分析助手。"
                "請使用繁體中文回答，聚焦於：意圖、重複問題、關鍵需求、常見痛點、情緒/情感傾向、"
                "有效回覆策略與改進建議。若資訊不足，請說明不確定並提出需要的補充資訊。"
            )

        # 合併系統層級提示詞和用戶提示詞
        combined_system_prompt = f"{base_system_prompt}\n\n{system_prompt}"
        messages.append({"role": "system", "content": combined_system_prompt})

        # 將歷史對話（管理者與 AI 的往返）帶入，作為多輪上下文
        if history:
            for turn in history:
                role = turn.get("role", "user")
                content = str(turn.get("content", ""))
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})

        # 注入用戶歷史對話（資料上下文）
        context_message = f"對話歷史：\n{context_text}"
        messages.append({"role": "user", "content": context_message})

        # 當前問題
        messages.append({"role": "user", "content": f"問題：{question}"})

        return messages

    @staticmethod
    async def ask_groq(
        question: str,
        *,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        呼叫 Groq API 以取得答案（舊版本，建議使用 ask_groq_with_retry）。
        """
        return await GroqService.ask_groq_with_retry(
            question=question,
            context_text=context_text,
            history=history,
            model=model,
            api_key=api_key,
            system_prompt=system_prompt,
            max_tokens=max_tokens
        )

    @staticmethod
    @async_retry(
        max_attempts=API_RETRY_CONFIG["max_attempts"],
        delay=API_RETRY_CONFIG["delay"],
        backoff=API_RETRY_CONFIG["backoff"],
        max_delay=API_RETRY_CONFIG["max_delay"],
        jitter=API_RETRY_CONFIG["jitter"],
        exceptions=GROQ_RETRYABLE_EXCEPTIONS
    )
    @groq_circuit_breaker
    async def ask_groq_with_retry(
        question: str,
        *,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        帶重試機制和熔斷器的 Groq API 調用。
        """
        api_key = api_key or settings.GROQ_API_KEY
        model = model or settings.GROQ_MODEL

        if not api_key:
            raise RuntimeError("缺少 GROQ_API_KEY，請於後端 .env 設定")

        if model not in GroqService.GROQ_MODELS:
            logger.warning(f"未知的 Groq 模型: {model}，使用第一個可用模型")
            # 使用第一個可用模型
            available_models = list(GroqService.GROQ_MODELS.keys())
            if available_models:
                model = available_models[0]
            else:
                raise RuntimeError("沒有可用的 Groq 模型")

        # 建立/重用 Groq 客戶端
        client = GroqService._get_client(api_key)

        # 準備訊息
        messages = GroqService._build_messages_for_groq(question, context_text, history, system_prompt)

        # 取得模型配置
        model_config = GroqService.GROQ_MODELS.get(model)
        if not model_config:
            # 如果模型配置不存在，使用第一個可用模型的配置
            available_models = list(GroqService.GROQ_MODELS.keys())
            if available_models:
                model_config = GroqService.GROQ_MODELS[available_models[0]]
            else:
                raise RuntimeError("沒有可用的 Groq 模型配置")

        # 計算合適的 max_tokens 值
        if max_tokens is None:
            # 預設使用模型最大 tokens 的 80%，但至少 2048 tokens
            default_max_tokens = max(2048, int(model_config["max_tokens"] * 0.8))
            actual_max_tokens = min(default_max_tokens, model_config["max_tokens"])
        else:
            # 使用指定的 max_tokens，但不超過模型限制
            actual_max_tokens = min(max_tokens, model_config["max_tokens"])

        try:
            # 調用 Groq API
            completion: ChatCompletion = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=actual_max_tokens,
                top_p=0.9,
                stream=False
            )

            # 解析回應
            if completion.choices and len(completion.choices) > 0:
                choice = completion.choices[0]
                if choice.message and choice.message.content:
                    return choice.message.content.strip()

            return "(未取得模型回應)"

        except RateLimitError as e:
            logger.warning(f"Groq API 速率限制: {e}")
            raise  # 重試裝飾器會處理
        except (APIConnectionError, APITimeoutError) as e:
            logger.warning(f"Groq API 連接問題: {e}")
            raise  # 重試裝飾器會處理
        except InternalServerError as e:
            logger.warning(f"Groq API 內部錯誤: {e}")
            raise  # 重試裝飾器會處理
        except Exception as e:
            logger.error(f"Groq API 未知錯誤: {e}")
            # 非重試異常，直接拋出
            raise RuntimeError(f"Groq API 調用失敗: {str(e)}")

    @staticmethod
    def validate_model(model: str) -> bool:
        """驗證模型是否支援"""
        return model in GroqService.GROQ_MODELS

    @staticmethod
    def get_model_info(model: str) -> Optional[Dict[str, Any]]:
        """取得模型資訊"""
        return GroqService.GROQ_MODELS.get(model)

    @staticmethod
    async def ask_groq_with_context_management(
        question: str,
        *,
        context_text: str,
        conversation_id: str,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        use_conversation_history: bool = True
    ) -> str:
        """
        使用上下文管理器的 Groq API 調用

        Args:
            question: 用戶問題
            context_text: 知識庫上下文
            conversation_id: 對話 ID
            model: 模型名稱
            api_key: API 金鑰
            system_prompt: 系統提示詞
            max_tokens: 最大 token 數
            use_conversation_history: 是否使用對話歷史

        Returns:
            AI 回應
        """
        model = model or settings.GROQ_MODEL

        # 初始化上下文管理器
        context_manager = ContextManager(model_name=model)

        # 構建系統提示詞
        full_system_prompt = system_prompt or (
            "你是一個對話助理。若提供了知識片段，請優先引用並準確回答；"
            "若未提供或不足，也可依一般常識與推理能力完整作答。"
        )

        if context_text:
            full_system_prompt += f"\n\n知識庫內容：\n{context_text}"

        # 添加當前用戶問題到對話歷史
        if use_conversation_history:
            context_manager.add_message(
                conversation_id,
                MessageRole.USER,
                question
            )

        # 獲取適合的上下文訊息
        if use_conversation_history:
            messages = context_manager.get_context_for_ai(
                conversation_id,
                system_prompt=full_system_prompt
            )
        else:
            # 不使用歷史，只包含當前問題
            messages = [
                {"role": "system", "content": full_system_prompt},
                {"role": "user", "content": question}
            ]

        # 調用 Groq API
        try:
            api_key = api_key or settings.GROQ_API_KEY
            if not api_key:
                raise RuntimeError("缺少 GROQ_API_KEY")

            client = GroqService._get_client(api_key)

            # 獲取模型配置
            model_config = GroqService.GROQ_MODELS.get(model)
            if not model_config:
                available_models = list(GroqService.GROQ_MODELS.keys())
                if available_models:
                    model = available_models[0]
                    model_config = GroqService.GROQ_MODELS[model]
                else:
                    raise RuntimeError("沒有可用的 Groq 模型")

            # 計算 max_tokens
            if max_tokens is None:
                default_max_tokens = max(2048, int(model_config["max_tokens"] * 0.8))
                actual_max_tokens = min(default_max_tokens, model_config["max_tokens"])
            else:
                actual_max_tokens = min(max_tokens, model_config["max_tokens"])

            # 調用 API
            completion: ChatCompletion = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=actual_max_tokens,
                top_p=0.9,
                stream=False
            )

            # 解析回應
            if completion.choices and len(completion.choices) > 0:
                choice = completion.choices[0]
                if choice.message and choice.message.content:
                    response = choice.message.content.strip()

                    # 添加助手回應到對話歷史
                    if use_conversation_history:
                        context_manager.add_message(
                            conversation_id,
                            MessageRole.ASSISTANT,
                            response
                        )

                    return response

            return "(未取得模型回應)"

        except Exception as e:
            logger.error(f"上下文管理 Groq API 調用失敗: {e}")
            raise RuntimeError(f"Groq API 調用失敗: {str(e)}")
