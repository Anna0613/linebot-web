"""
嵌入模型管理器
提供多種嵌入模型的統一管理和批次處理能力。
支援 Gemini API（優先）和本地 sentence-transformers（備用）。
"""
from __future__ import annotations

import os
import asyncio
import logging
import hashlib
import time
from functools import lru_cache
from typing import Dict, List, Optional, Any, Tuple, TYPE_CHECKING
import numpy as np
import psutil

# 僅在型別檢查時匯入，避免執行期觸發重量級相依
if TYPE_CHECKING:  # pragma: no cover
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """嵌入模型管理器，支援多種模型和批次處理"""

    _models: Dict[str, "SentenceTransformer"] = {}
    _model_cache_size = 1000  # LRU 快取大小
    _gemini_client = None  # Gemini API 客戶端
    _use_gemini = True  # 是否優先使用 Gemini API

    # 支援的嵌入模型配置
    SUPPORTED_MODELS = {
        "gemini-embedding": {
            "name": "models/text-embedding-004",
            "dimensions": 768,
            "max_seq_length": 2048,
            "description": "Google Gemini embedding API（優先使用，速度快 30 倍）",
            "performance": "極快",
            "quality": "高",
            "multilingual": True,
            "type": "api"
        },
        "all-mpnet-base-v2": {
            "name": "sentence-transformers/all-mpnet-base-v2",
            "dimensions": 768,
            "max_seq_length": 384,
            "description": "高品質模型，更好的語義理解（備用）",
            "performance": "中等",
            "quality": "高",
            "multilingual": False,
            "type": "local"
        },
        "paraphrase-multilingual-mpnet-base-v2": {
            "name": "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
            "dimensions": 768,
            "max_seq_length": 128,
            "description": "多語言釋義模型，適合中文處理（備用）",
            "performance": "中等",
            "quality": "高",
            "multilingual": True,
            "type": "local"
        }
    }

    # 預設模型（優先使用 Gemini API）
    DEFAULT_MODEL = "gemini-embedding"
    FALLBACK_MODEL = "all-mpnet-base-v2"  # 備用模型

    class _DummyModel:
        """離線或下載失敗時的替代模型，生成可重現的固定維度向量"""

        def __init__(self, dim: int) -> None:
            self.dim = dim

        def encode(
            self,
            texts: List[str],
            normalize_embeddings: bool = True,
            convert_to_numpy: bool = True,
            show_progress_bar: bool = False,
            # 與 sentence-transformers 介面對齊，忽略不支援參數
            batch_size: Optional[int] = None,
            **_: Any,
        ):
            def _embed_one(t: str) -> np.ndarray:
                # 以 MD5 作為種子，產生可重現的偽隨機向量
                h = hashlib.md5(t.encode("utf-8")).digest()
                seed = int.from_bytes(h[:8], "big", signed=False)
                rng = np.random.default_rng(seed)
                vec = rng.normal(0, 1, size=self.dim).astype(np.float32)
                if normalize_embeddings:
                    n = np.linalg.norm(vec)
                    if n > 0:
                        vec = vec / n
                return vec

            arrs = [_embed_one(x) for x in texts]
            if convert_to_numpy:
                return np.stack(arrs, axis=0)
            return [a.tolist() for a in arrs]
    
    @classmethod
    def _init_gemini_client(cls):
        """初始化 Gemini API 客戶端"""
        logger.info(f"🔧 [init_gemini] 開始初始化 Gemini 客戶端...")
        logger.info(f"🔍 [init_gemini] 當前狀態 - _gemini_client: {cls._gemini_client is not None}, _use_gemini: {cls._use_gemini}")

        if cls._gemini_client is not None:
            logger.info(f"✅ [init_gemini] 客戶端已存在，直接返回")
            return cls._gemini_client

        try:
            logger.info(f"📦 [init_gemini] 導入 google.generativeai...")
            import google.generativeai as genai
            logger.info(f"✅ [init_gemini] google.generativeai 導入成功")

            logger.info(f"🔑 [init_gemini] 檢查 GEMINI_API_KEY...")
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.error(f"❌ [init_gemini] 未找到 GEMINI_API_KEY，將使用本地模型")
                cls._use_gemini = False
                return None

            logger.info(f"✅ [init_gemini] API Key 已找到（長度: {len(api_key)} 字元）")
            logger.info(f"🔧 [init_gemini] 配置 Gemini API...")
            genai.configure(api_key=api_key)
            cls._gemini_client = genai
            logger.info(f"✅ [init_gemini] Gemini API 客戶端初始化成功")
            return cls._gemini_client

        except ImportError as e:
            logger.error(f"❌ [init_gemini] 未安裝 google-generativeai: {e}")
            cls._use_gemini = False
            return None
        except Exception as e:
            logger.error(f"❌ [init_gemini] Gemini API 初始化失敗: {type(e).__name__}: {e}")
            import traceback
            logger.error(f"🔍 [init_gemini] 堆疊追蹤:\n{traceback.format_exc()}")
            cls._use_gemini = False
            return None

    @classmethod
    async def _embed_with_gemini(
        cls,
        text: str,
        task_type: str = "retrieval_query"
    ) -> Optional[List[float]]:
        """使用 Gemini API 生成 embedding"""
        logger.info(f"🔍 [Gemini] 開始生成 embedding，文本長度: {len(text)} 字元")

        if not cls._use_gemini:
            logger.warning(f"⚠️ [Gemini] Gemini 已被禁用 (_use_gemini=False)")
            return None

        logger.info(f"🔧 [Gemini] 初始化 Gemini 客戶端...")
        init_start = time.time()
        client = cls._init_gemini_client()
        init_time = (time.time() - init_start) * 1000
        logger.info(f"⏱️ [Gemini] 客戶端初始化耗時: {init_time:.2f}ms")

        if client is None:
            logger.error(f"❌ [Gemini] 客戶端初始化失敗")
            return None

        try:
            logger.info(f"📡 [Gemini] 準備調用 API...")
            api_start = time.time()

            def _generate():
                logger.info(f"🌐 [Gemini] 正在調用 embed_content API...")
                call_start = time.time()
                result = client.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type=task_type
                )
                call_time = (time.time() - call_start) * 1000
                logger.info(f"✅ [Gemini] API 調用完成，耗時: {call_time:.2f}ms")
                return result['embedding']

            # 在線程池中執行以避免阻塞，並加入超時保護
            logger.info(f"🔄 [Gemini] 使用 asyncio.to_thread 執行 (含超時保護)...")
            thread_start = time.time()
            try:
                embedding = await asyncio.wait_for(asyncio.to_thread(_generate), timeout=8.0)
            except asyncio.TimeoutError:
                logger.warning("⏰ [Gemini] 生成超時（>8s），降級到本地模型")
                return None
            thread_time = (time.time() - thread_start) * 1000

            total_time = (time.time() - api_start) * 1000
            logger.info(f"⏱️ [Gemini] asyncio.to_thread 耗時: {thread_time:.2f}ms")
            logger.info(f"⏱️ [Gemini] API 總耗時: {total_time:.2f}ms")
            logger.info(f"✅ [Gemini] Embedding 生成成功，向量維度: {len(embedding)}")

            return embedding

        except Exception as e:
            logger.error(f"❌ [Gemini] API embedding 生成失敗: {type(e).__name__}: {e}")
            logger.error(f"📋 [Gemini] 錯誤詳情: {str(e)}")
            import traceback
            logger.error(f"🔍 [Gemini] 堆疊追蹤:\n{traceback.format_exc()}")
            cls._use_gemini = False  # 暫時禁用 Gemini
            logger.warning(f"⚠️ [Gemini] 已暫時禁用 Gemini API，後續將使用本地模型")
            return None

    @classmethod
    def get_model_info(cls, model_name: str = None) -> Dict[str, Any]:
        """獲取模型資訊"""
        model_name = model_name or cls.DEFAULT_MODEL
        return cls.SUPPORTED_MODELS.get(model_name, {})
    
    @classmethod
    def list_available_models(cls) -> List[Dict[str, Any]]:
        """列出所有可用模型"""
        models = []
        for model_id, config in cls.SUPPORTED_MODELS.items():
            models.append({
                "id": model_id,
                "name": config["name"],
                "dimensions": config["dimensions"],
                "max_seq_length": config["max_seq_length"],
                "description": config["description"],
                "performance": config["performance"],
                "quality": config["quality"],
                "multilingual": config["multilingual"]
            })
        return models
    
    @classmethod
    def get_model(cls, model_name: str = None) -> "SentenceTransformer":
        """獲取或載入嵌入模型"""
        model_name = model_name or cls.DEFAULT_MODEL
        
        if model_name not in cls._models:
            if model_name not in cls.SUPPORTED_MODELS:
                logger.warning(f"不支援的模型: {model_name}，使用預設模型: {cls.DEFAULT_MODEL}")
                model_name = cls.DEFAULT_MODEL
            
            model_config = cls.SUPPORTED_MODELS[model_name]
            logger.info(f"載入嵌入模型: {model_config['name']}")
            
            try:
                # 在匯入 transformers/sentence-transformers 前，顯式停用 TensorFlow/Flax 後端以避免不必要的相依導入
                # 注意：Transformers 主要讀取 USE_TF/USE_FLAX，故一併設定
                os.environ.setdefault("USE_TF", "0")
                os.environ.setdefault("USE_FLAX", "0")
                os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
                os.environ.setdefault("TRANSFORMERS_NO_FLAX", "1")
                os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
                # 降低 TensorFlow 相關噪音（若環境中存在 TF，也不會被載入）
                os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

                from sentence_transformers import SentenceTransformer as _SentenceTransformer

                cls._models[model_name] = _SentenceTransformer(model_config["name"])
                logger.info(f"模型載入成功: {model_name}")
            except Exception as e:
                logger.error(f"載入模型失敗: {model_name}, 錯誤: {e}")
                # 下載/網路失敗時的回退策略
                fallback_dim = cls.SUPPORTED_MODELS.get(model_name, {}).get("dimensions", 768)
                # 若不是預設模型，再嘗試加載預設模型
                if model_name != cls.DEFAULT_MODEL:
                    try:
                        logger.info(f"嘗試載入預設模型: {cls.DEFAULT_MODEL}")
                        default_config = cls.SUPPORTED_MODELS[cls.DEFAULT_MODEL]
                        from sentence_transformers import SentenceTransformer as _SentenceTransformer
                        cls._models[cls.DEFAULT_MODEL] = _SentenceTransformer(default_config["name"])  # type: ignore
                        return cls._models[cls.DEFAULT_MODEL]
                    except Exception as e2:
                        logger.warning(f"預設模型載入失敗，啟用離線替代模型: {e2}")
                        cls._models[model_name] = EmbeddingManager._DummyModel(fallback_dim)  # type: ignore
                else:
                    logger.warning("啟用離線替代模型（無法下載 sentence-transformers 權重）")
                    cls._models[model_name] = EmbeddingManager._DummyModel(fallback_dim)  # type: ignore
            
        return cls._models[model_name]
    
    @classmethod
    async def embed_text(
        cls,
        text: str,
        model_name: str = None,
        normalize_embeddings: bool = True
    ) -> List[float]:
        """
        單一文本嵌入（優先使用 Gemini API，失敗則降級到本地模型）

        Args:
            text: 要嵌入的文本
            model_name: 模型名稱（None 則使用預設模型）
            normalize_embeddings: 是否標準化嵌入向量

        Returns:
            List[float]: 嵌入向量
        """
        overall_start = time.time()
        logger.info(f"📝 [embed_text] 開始處理，文本長度: {len(text)} 字元")
        logger.info(f"🔧 [embed_text] 請求模型: {model_name}, 預設模型: {cls.DEFAULT_MODEL}, Gemini 啟用: {cls._use_gemini}")

        model_name = model_name or cls.DEFAULT_MODEL
        logger.info(f"🎯 [embed_text] 最終使用模型: {model_name}")

        # 如果指定使用 Gemini 或使用預設模型（Gemini）
        if model_name == "gemini-embedding" or (model_name == cls.DEFAULT_MODEL and cls._use_gemini):
            logger.info(f"🚀 [embed_text] 嘗試使用 Gemini API...")
            start_time = time.time()

            # 嘗試使用 Gemini API
            embedding = await cls._embed_with_gemini(text, task_type="retrieval_query")

            if embedding is not None:
                elapsed_ms = (time.time() - start_time) * 1000
                total_ms = (time.time() - overall_start) * 1000
                logger.info(f"✅ [embed_text] Gemini embedding 生成成功 (Gemini: {elapsed_ms:.2f}ms, 總計: {total_ms:.2f}ms)")
                return embedding

            # Gemini 失敗，降級到本地模型
            logger.warning(f"⚠️ [embed_text] Gemini API 不可用，降級到本地模型: {cls.FALLBACK_MODEL}")
            model_name = cls.FALLBACK_MODEL

        # 使用本地 sentence-transformers 模型
        logger.info(f"🔧 [embed_text] 使用本地模型: {model_name}")

        def _encode():
            encode_start = time.time()
            logger.info(f"📦 [embed_text] 載入模型...")
            model = cls.get_model(model_name)
            load_time = (time.time() - encode_start) * 1000
            logger.info(f"⏱️ [embed_text] 模型載入耗時: {load_time:.2f}ms")

            logger.info(f"🔄 [embed_text] 開始 encode...")
            encode_start = time.time()
            embedding = model.encode(
                [text],
                normalize_embeddings=normalize_embeddings,
                convert_to_numpy=True,
                show_progress_bar=False,
                batch_size=1
            )[0]
            encode_time = (time.time() - encode_start) * 1000
            logger.info(f"⏱️ [embed_text] encode 耗時: {encode_time:.2f}ms")

            return embedding.tolist()

        start_time = time.time()
        logger.info(f"🔄 [embed_text] 使用 asyncio.to_thread 執行本地模型...")
        result = await asyncio.to_thread(_encode)
        elapsed_ms = (time.time() - start_time) * 1000
        total_ms = (time.time() - overall_start) * 1000
        logger.info(f"✅ [embed_text] 本地模型 embedding 生成成功 (本地: {elapsed_ms:.2f}ms, 總計: {total_ms:.2f}ms)")

        return result
    
    @classmethod
    @lru_cache(maxsize=1000)
    def embed_text_cached(
        cls, 
        text: str, 
        model_name: str = None,
        normalize_embeddings: bool = True
    ) -> List[float]:
        """單一文本嵌入（帶快取）"""
        model_name = model_name or cls.DEFAULT_MODEL
        model = cls.get_model(model_name)
        embedding = model.encode(
            [text], 
            normalize_embeddings=normalize_embeddings,
            convert_to_numpy=True
        )[0]
        return embedding.tolist()
    
    @classmethod
    async def _get_system_load(cls) -> float:
        """獲取系統負載指標"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory_percent = psutil.virtual_memory().percent
            # 取 CPU 和記憶體使用率的最大值作為負載指標
            return max(cpu_percent, memory_percent) / 100.0
        except Exception as e:
            logger.warning(f"獲取系統負載失敗: {e}")
            return 0.5  # 預設中等負載

    @classmethod
    def _calculate_optimal_batch_size(
        cls,
        texts: List[str],
        base_batch_size: int = 32,
        min_batch_size: int = 8,
        max_batch_size: int = 128,
        system_load: float = 0.5
    ) -> int:
        """
        根據文本特徵和系統負載計算最佳批次大小

        Args:
            texts: 文本列表
            base_batch_size: 基礎批次大小
            min_batch_size: 最小批次大小
            max_batch_size: 最大批次大小
            system_load: 系統負載 (0.0-1.0)

        Returns:
            int: 最佳批次大小
        """
        if not texts:
            return base_batch_size

        # 計算平均文本長度
        avg_text_length = sum(len(text) for text in texts) / len(texts)

        # 根據文本長度調整批次大小
        if avg_text_length > 2000:  # 長文本
            length_factor = 0.5
        elif avg_text_length > 1000:  # 中等文本
            length_factor = 0.75
        elif avg_text_length < 200:  # 短文本
            length_factor = 1.5
        else:  # 正常文本
            length_factor = 1.0

        # 根據系統負載調整
        if system_load > 0.8:  # 高負載
            load_factor = 0.5
        elif system_load > 0.6:  # 中高負載
            load_factor = 0.75
        elif system_load < 0.3:  # 低負載
            load_factor = 1.5
        else:  # 正常負載
            load_factor = 1.0

        # 計算最佳批次大小
        optimal_size = int(base_batch_size * length_factor * load_factor)

        # 限制在合理範圍內
        optimal_size = max(min_batch_size, min(max_batch_size, optimal_size))

        logger.debug(
            f"批次大小計算: 平均文本長度={avg_text_length:.0f}, "
            f"系統負載={system_load:.2f}, 最佳批次大小={optimal_size}"
        )

        return optimal_size

    @classmethod
    async def embed_texts_adaptive_batch(
        cls,
        texts: List[str],
        model_name: str = None,
        base_batch_size: int = 32,
        min_batch_size: int = 8,
        max_batch_size: int = 128,
        normalize_embeddings: bool = True,
        show_progress: bool = False
    ) -> List[List[float]]:
        """
        自適應批次大小的向量化處理

        Args:
            texts: 要嵌入的文本列表
            model_name: 模型名稱
            base_batch_size: 基礎批次大小
            min_batch_size: 最小批次大小
            max_batch_size: 最大批次大小
            normalize_embeddings: 是否標準化嵌入向量
            show_progress: 是否顯示進度

        Returns:
            List[List[float]]: 嵌入向量列表
        """
        model_name = model_name or cls.DEFAULT_MODEL

        if not texts:
            return []

        # 獲取系統負載
        system_load = await cls._get_system_load()

        # 計算最佳批次大小
        optimal_batch_size = cls._calculate_optimal_batch_size(
            texts, base_batch_size, min_batch_size, max_batch_size, system_load
        )

        logger.info(
            f"開始自適應批次向量化: {len(texts)} 個文本, "
            f"批次大小={optimal_batch_size}, 系統負載={system_load:.2f}"
        )

        def _process_batch(batch_texts: List[str]) -> List[List[float]]:
            model = cls.get_model(model_name)
            embeddings = model.encode(
                batch_texts,
                normalize_embeddings=normalize_embeddings,
                convert_to_numpy=True,
                show_progress_bar=show_progress and len(batch_texts) > 10
            )
            return [emb.tolist() for emb in embeddings]

        # 分批處理
        all_embeddings = []
        total_batches = (len(texts) - 1) // optimal_batch_size + 1

        for i in range(0, len(texts), optimal_batch_size):
            batch = texts[i:i + optimal_batch_size]
            batch_num = i // optimal_batch_size + 1

            logger.debug(f"處理批次 {batch_num}/{total_batches} ({len(batch)} 個文本)")

            try:
                batch_embeddings = await asyncio.to_thread(_process_batch, batch)
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error(f"批次 {batch_num} 處理失敗: {e}")
                # 如果批次處理失敗，嘗試單個處理
                for text in batch:
                    try:
                        single_embedding = await cls.embed_text(text, model_name)
                        all_embeddings.append(single_embedding)
                    except Exception as single_e:
                        logger.error(f"單個文本處理失敗: {single_e}")
                        # 使用零向量作為備選
                        dimensions = cls.get_embedding_dimensions(model_name)
                        all_embeddings.append([0.0] * dimensions)

        logger.info(f"自適應批次向量化完成: {len(all_embeddings)} 個向量")
        return all_embeddings

    @classmethod
    async def embed_texts_batch(
        cls,
        texts: List[str],
        model_name: str = None,
        batch_size: int = 32,
        normalize_embeddings: bool = True,
        show_progress: bool = False
    ) -> List[List[float]]:
        """
        批次生成嵌入向量（優先使用 Gemini API，失敗則降級到本地模型）

        Args:
            texts: 要嵌入的文本列表
            model_name: 模型名稱
            batch_size: 批次大小（僅用於本地模型）
            normalize_embeddings: 是否標準化嵌入向量
            show_progress: 是否顯示進度

        Returns:
            List[List[float]]: 嵌入向量列表
        """
        model_name = model_name or cls.DEFAULT_MODEL

        if not texts:
            return []

        # 如果指定使用 Gemini 或使用預設模型（Gemini）
        if model_name == "gemini-embedding" or (model_name == cls.DEFAULT_MODEL and cls._use_gemini):
            start_time = time.time()

            # 嘗試使用 Gemini API（逐個處理，因為 Gemini 沒有批次 API）
            all_embeddings = []
            for i, text in enumerate(texts):
                embedding = await cls._embed_with_gemini(text, task_type="retrieval_document")

                if embedding is None:
                    # Gemini 失敗，降級到本地模型處理剩餘文本
                    logger.info(f"⚠️ Gemini API 在第 {i+1}/{len(texts)} 個文本失敗，降級到本地模型")
                    model_name = cls.FALLBACK_MODEL
                    break

                all_embeddings.append(embedding)

                if show_progress and (i + 1) % 10 == 0:
                    logger.info(f"Gemini embedding 進度: {i+1}/{len(texts)}")

            # 如果全部成功
            if len(all_embeddings) == len(texts):
                elapsed_ms = (time.time() - start_time) * 1000
                logger.info(f"✅ Gemini 批次 embedding 完成: {len(texts)} 個文本 ({elapsed_ms:.2f}ms)")
                return all_embeddings

            # 處理剩餘文本（從失敗的位置開始）
            remaining_texts = texts[len(all_embeddings):]
            logger.info(f"使用本地模型處理剩餘 {len(remaining_texts)} 個文本")
        else:
            remaining_texts = texts
            all_embeddings = []

        # 使用本地 sentence-transformers 模型
        def _process_batch(batch_texts: List[str]) -> List[List[float]]:
            model = cls.get_model(model_name)
            embeddings = model.encode(
                batch_texts,
                normalize_embeddings=normalize_embeddings,
                convert_to_numpy=True,
                show_progress_bar=show_progress
            )
            return [emb.tolist() for emb in embeddings]

        # 分批處理剩餘文本
        for i in range(0, len(remaining_texts), batch_size):
            batch = remaining_texts[i:i + batch_size]
            logger.debug(f"處理批次 {i//batch_size + 1}/{(len(remaining_texts)-1)//batch_size + 1}")
            batch_embeddings = await asyncio.to_thread(_process_batch, batch)
            all_embeddings.extend(batch_embeddings)

        return all_embeddings
    
    @classmethod
    def calculate_similarity(
        cls,
        embedding1: List[float],
        embedding2: List[float],
        method: str = "cosine"
    ) -> float:
        """計算兩個嵌入向量的相似度"""
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        if method == "cosine":
            # 餘弦相似度
            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return float(dot_product / (norm1 * norm2))
        
        elif method == "euclidean":
            # 歐幾里得距離（轉換為相似度）
            distance = np.linalg.norm(emb1 - emb2)
            return float(1.0 / (1.0 + distance))
        
        elif method == "dot_product":
            # 點積
            return float(np.dot(emb1, emb2))
        
        else:
            raise ValueError(f"不支援的相似度計算方法: {method}")
    
    @classmethod
    def get_embedding_dimensions(cls, model_name: str = None) -> int:
        """獲取模型的嵌入維度"""
        model_name = model_name or cls.DEFAULT_MODEL
        model_config = cls.SUPPORTED_MODELS.get(model_name)
        if model_config:
            return model_config["dimensions"]
        return 768  # 預設維度
    
    @classmethod
    def clear_cache(cls):
        """清除快取"""
        cls.embed_text_cached.cache_clear()
        logger.info("嵌入快取已清除")
    
    @classmethod
    def get_cache_info(cls) -> Dict[str, Any]:
        """獲取快取資訊"""
        cache_info = cls.embed_text_cached.cache_info()
        return {
            "hits": cache_info.hits,
            "misses": cache_info.misses,
            "maxsize": cache_info.maxsize,
            "currsize": cache_info.currsize,
            "hit_rate": cache_info.hits / (cache_info.hits + cache_info.misses) if (cache_info.hits + cache_info.misses) > 0 else 0.0
        }

    @classmethod
    def get_embedding_status(cls) -> Dict[str, Any]:
        """獲取 embedding 服務狀態"""
        return {
            "gemini_enabled": cls._use_gemini,
            "gemini_available": cls._gemini_client is not None,
            "default_model": cls.DEFAULT_MODEL,
            "fallback_model": cls.FALLBACK_MODEL,
            "api_key_configured": bool(os.getenv("GEMINI_API_KEY"))
        }

    @classmethod
    def enable_gemini(cls, enable: bool = True):
        """啟用或禁用 Gemini API"""
        cls._use_gemini = enable
        if enable:
            cls._init_gemini_client()
        logger.info(f"Gemini API {'啟用' if enable else '禁用'}")

# 注意：向後相容的函數已移至 embedding_service.py
# 請從 app.services.embedding.embedding_service 導入 embed_text 和 embed_texts
