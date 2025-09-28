"""
嵌入模型管理器
提供多種嵌入模型的統一管理和批次處理能力。
"""
from __future__ import annotations

import os
import asyncio
import logging
import hashlib
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
    
    # 支援的嵌入模型配置
    SUPPORTED_MODELS = {
        "all-mpnet-base-v2": {
            "name": "sentence-transformers/all-mpnet-base-v2", 
            "dimensions": 768,
            "max_seq_length": 384,
            "description": "高品質模型，更好的語義理解",
            "performance": "中等",
            "quality": "高",
            "multilingual": False
        },
        "paraphrase-multilingual-mpnet-base-v2": {
            "name": "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
            "dimensions": 768,
            "max_seq_length": 128,
            "description": "多語言釋義模型，適合中文處理",
            "performance": "中等",
            "quality": "高",
            "multilingual": True
        }
    }
    
    # 預設模型（從 all-MiniLM-L6-v2 升級到 all-mpnet-base-v2）
    DEFAULT_MODEL = "all-mpnet-base-v2"

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
                os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
                os.environ.setdefault("TRANSFORMERS_NO_FLAX", "1")
                os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

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
        """單一文本嵌入"""
        model_name = model_name or cls.DEFAULT_MODEL
        
        def _encode():
            model = cls.get_model(model_name)
            embedding = model.encode(
                [text],
                normalize_embeddings=normalize_embeddings,
                convert_to_numpy=True
            )[0]
            return embedding.tolist()
        
        return await asyncio.to_thread(_encode)
    
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
        """批次生成嵌入向量（保持向後相容性）"""
        model_name = model_name or cls.DEFAULT_MODEL

        if not texts:
            return []

        def _process_batch(batch_texts: List[str]) -> List[List[float]]:
            model = cls.get_model(model_name)
            embeddings = model.encode(
                batch_texts,
                normalize_embeddings=normalize_embeddings,
                convert_to_numpy=True,
                show_progress_bar=show_progress
            )
            return [emb.tolist() for emb in embeddings]

        # 分批處理
        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.debug(f"處理批次 {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
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


# 向後相容的函數
async def embed_text(text: str, model_name: str = None) -> List[float]:
    """向後相容的嵌入函數"""
    return await EmbeddingManager.embed_text(text, model_name)


async def embed_texts(texts: List[str], model_name: str = None) -> List[List[float]]:
    """向後相容的批次嵌入函數"""
    return await EmbeddingManager.embed_texts_batch(texts, model_name)
