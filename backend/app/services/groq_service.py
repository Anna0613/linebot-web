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
from app.services.prompt_templates import PromptTemplates

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
        建立 Groq API 的訊息列表（使用優化的提示詞模板）

        Args:
            question: 當前用戶問題
            context_text: 知識庫檢索到的內容
            history: 對話歷史 [{"role": "user"|"assistant", "content": "..."}]
            system_prompt: 自訂系統提示詞（可選）

        Returns:
            Groq API 格式的訊息列表
        """
        messages: List[Dict[str, str]] = []

        # 建構系統提示詞（使用新的模板）
        full_system_prompt = PromptTemplates.build_system_prompt(system_prompt)
        messages.append({"role": "system", "content": full_system_prompt})

        # 添加對話歷史（如果有）
        if history:
            history_content = PromptTemplates.wrap_conversation_history(history)
            if history_content:
                messages.append({"role": "user", "content": history_content})

        # 添加知識庫資料（如果有）
        if context_text and context_text.strip():
            kb_content = PromptTemplates.wrap_knowledge_base(context_text)
            messages.append({"role": "user", "content": kb_content})

        # 添加當前問題
        query_content = PromptTemplates.wrap_current_query(question)
        messages.append({"role": "user", "content": query_content})

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
            completion: ChatCompletion = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=actual_max_tokens,
                    top_p=0.9,
                    stream=False
                ),
                timeout=30.0
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
            completion: ChatCompletion = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=actual_max_tokens,
                    top_p=0.9,
                    stream=False
                ),
                timeout=30.0
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

    @staticmethod
    async def generate_document_summary(
        content: str,
        filename: Optional[str] = None,
        min_length: int = 100,
        max_length: int = 200
    ) -> str:
        """
        生成文件摘要

        Args:
            content: 文件原文內容
            filename: 檔案名稱（可選）
            min_length: 摘要最小字數（預設 100 字）
            max_length: 摘要最大字數（預設 200 字）

        Returns:
            str: AI 生成的摘要
        """
        try:
            # 檢查內容長度，如果太長則截取前 8000 字元
            if len(content) > 8000:
                content = content[:8000] + "..."
                logger.info(f"文件內容過長，截取前 8000 字元進行摘要")

            # 構建系統提示詞
            system_prompt = (
                f"你是專業的文件摘要助手。請分析以下文件內容，生成 {min_length} 到 {max_length} 字的重點摘要。\n\n"
                "摘要要求：\n"
                "・使用繁體中文\n"
                f"・摘要長度必須在 {min_length} 到 {max_length} 字之間\n"
                "・簡潔明確，涵蓋文件核心內容\n"
                "・足以讓人理解文件主題和重點\n"
                "・不要使用 Markdown 格式\n"
                "・不要加上「摘要：」等前綴\n"
                "・確保摘要完整，不要在句子中間截斷"
            )

            # 構建用戶訊息
            user_message = f"【文件內容】\n{content}"
            if filename:
                user_message = f"【檔案名稱】\n{filename}\n\n{user_message}"

            # 使用 llama-3.1-8b-instant 模型（快速且高效）
            client = AsyncGroq(api_key=settings.GROQ_API_KEY)

            completion: ChatCompletion = await asyncio.wait_for(
                client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.3,
                    max_tokens=400,  # 增加 tokens 以容納 200 字的摘要
                    top_p=0.9,
                    stream=False
                ),
                timeout=30.0
            )

            # 解析回應
            if completion.choices and len(completion.choices) > 0:
                choice = completion.choices[0]
                if choice.message and choice.message.content:
                    summary = choice.message.content.strip()

                    # 檢查摘要長度
                    summary_length = len(summary)

                    # 如果摘要太短（少於最小長度），記錄警告但仍返回
                    if summary_length < min_length:
                        logger.warning(f"摘要長度 {summary_length} 字少於最小要求 {min_length} 字")

                    # 如果摘要太長，截斷到最大長度
                    if summary_length > max_length:
                        logger.warning(f"摘要長度 {summary_length} 字超過最大限制 {max_length} 字，將截斷")
                        # 找到最接近 max_length 的句號、逗號或空格，避免在句子中間截斷
                        truncate_pos = max_length
                        for i in range(max_length - 1, max(max_length - 20, 0), -1):
                            if summary[i] in ['。', '！', '？', '，', '、', ' ']:
                                truncate_pos = i + 1
                                break
                        summary = summary[:truncate_pos].rstrip()
                        if not summary.endswith(('。', '！', '？')):
                            summary += "..."

                    logger.info(f"文件摘要生成成功: {len(summary)} 字（要求 {min_length}-{max_length} 字）")
                    return summary

            # 如果沒有回應，返回預設摘要
            logger.warning("AI 未返回摘要內容，使用預設摘要")
            fallback_length = min(max_length, len(content))
            return content[:fallback_length] + ("..." if len(content) > fallback_length else "")

        except Exception as e:
            logger.error(f"生成文件摘要失敗: {e}")
            # 容錯處理：返回內容的前 max_length 字元作為摘要
            fallback_length = min(max_length, len(content))
            return content[:fallback_length] + ("..." if len(content) > fallback_length else "")
