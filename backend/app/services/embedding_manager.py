"""
嵌入模型管理器
提供多種嵌入模型的統一管理和批次處理能力。
"""
import os
import asyncio
import logging
import hashlib
from functools import lru_cache
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """嵌入模型管理器，支援多種模型和批次處理"""
    
    _models: Dict[str, SentenceTransformer] = {}
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
    def get_model(cls, model_name: str = None) -> SentenceTransformer:
        """獲取或載入嵌入模型"""
        model_name = model_name or cls.DEFAULT_MODEL
        
        if model_name not in cls._models:
            if model_name not in cls.SUPPORTED_MODELS:
                logger.warning(f"不支援的模型: {model_name}，使用預設模型: {cls.DEFAULT_MODEL}")
                model_name = cls.DEFAULT_MODEL
            
            model_config = cls.SUPPORTED_MODELS[model_name]
            logger.info(f"載入嵌入模型: {model_config['name']}")
            
            try:
                cls._models[model_name] = SentenceTransformer(model_config["name"])
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
                        cls._models[cls.DEFAULT_MODEL] = SentenceTransformer(default_config["name"])
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
    async def embed_texts_batch(
        cls,
        texts: List[str],
        model_name: str = None,
        batch_size: int = 32,
        normalize_embeddings: bool = True,
        show_progress: bool = False
    ) -> List[List[float]]:
        """批次生成嵌入向量"""
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
