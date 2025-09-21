"""
重排序服務
使用 Cross-encoder 模型對檢索結果進行重排序，提升檢索質量。
"""
import asyncio
import logging
from typing import List, Tuple, Optional, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)


class RerankService:
    """重排序服務，使用 Cross-encoder 模型提升檢索質量"""
    
    _models: Dict[str, Any] = {}
    
    # 支援的重排序模型
    SUPPORTED_MODELS = {
        "ms-marco-MiniLM-L-6-v2": {
            "name": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "description": "輕量級重排序模型，適合快速處理",
            "max_length": 512,
            "performance": "快速",
            "quality": "中等"
        },
        "ms-marco-MiniLM-L-12-v2": {
            "name": "cross-encoder/ms-marco-MiniLM-L-12-v2", 
            "description": "平衡型重排序模型，品質與速度兼顧",
            "max_length": 512,
            "performance": "中等",
            "quality": "高"
        },
        "ms-marco-electra-base": {
            "name": "cross-encoder/ms-marco-electra-base",
            "description": "高品質重排序模型，適合精確檢索",
            "max_length": 512,
            "performance": "慢",
            "quality": "很高"
        }
    }
    
    # 預設模型
    DEFAULT_MODEL = "ms-marco-MiniLM-L-6-v2"
    
    @classmethod
    def get_model(cls, model_name: str = None) -> Any:
        """獲取或載入重排序模型"""
        model_name = model_name or cls.DEFAULT_MODEL
        
        if model_name not in cls._models:
            if model_name not in cls.SUPPORTED_MODELS:
                logger.warning(f"不支援的重排序模型: {model_name}，使用預設模型: {cls.DEFAULT_MODEL}")
                model_name = cls.DEFAULT_MODEL
            
            model_config = cls.SUPPORTED_MODELS[model_name]
            logger.info(f"載入重排序模型: {model_config['name']}")
            
            try:
                from sentence_transformers import CrossEncoder
                cls._models[model_name] = CrossEncoder(model_config["name"])
                logger.info(f"重排序模型載入成功: {model_name}")
            except ImportError:
                logger.error("請安裝 sentence-transformers 套件以使用重排序功能")
                raise ImportError("缺少 sentence-transformers 套件")
            except Exception as e:
                logger.error(f"載入重排序模型失敗: {model_name}, 錯誤: {e}")
                raise
        
        return cls._models[model_name]
    
    @classmethod
    def list_available_models(cls) -> List[Dict[str, Any]]:
        """列出所有可用的重排序模型"""
        models = []
        for model_id, config in cls.SUPPORTED_MODELS.items():
            models.append({
                "id": model_id,
                "name": config["name"],
                "description": config["description"],
                "max_length": config["max_length"],
                "performance": config["performance"],
                "quality": config["quality"]
            })
        return models
    
    @classmethod
    async def rerank(
        cls,
        query: str,
        documents: List[Tuple[str, float]],
        model_name: str = None,
        top_k: int = 5,
        score_threshold: float = 0.0
    ) -> List[Tuple[str, float]]:
        """
        使用 Cross-encoder 重排序檢索結果
        
        Args:
            query: 查詢文本
            documents: 文檔列表，格式為 [(content, original_score), ...]
            model_name: 重排序模型名稱
            top_k: 返回的文檔數量
            score_threshold: 分數門檻
        
        Returns:
            重排序後的文檔列表，格式為 [(content, rerank_score), ...]
        """
        if not documents:
            return []
        
        model_name = model_name or cls.DEFAULT_MODEL
        
        def _rerank_sync() -> List[Tuple[str, float]]:
            model = cls.get_model(model_name)
            
            # 準備輸入對
            pairs = [(query, doc[0]) for doc in documents]
            
            # 計算重排序分數
            scores = model.predict(pairs)
            
            # 結合原始文檔和新分數
            reranked = []
            for i, (doc_content, _) in enumerate(documents):
                rerank_score = float(scores[i])
                if rerank_score >= score_threshold:
                    reranked.append((doc_content, rerank_score))
            
            # 按分數排序並返回 top_k
            reranked.sort(key=lambda x: x[1], reverse=True)
            return reranked[:top_k]
        
        return await asyncio.to_thread(_rerank_sync)
    
    @classmethod
    async def rerank_with_metadata(
        cls,
        query: str,
        documents: List[Dict[str, Any]],
        content_field: str = "content",
        model_name: str = None,
        top_k: int = 5,
        score_threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        重排序帶有元數據的文檔
        
        Args:
            query: 查詢文本
            documents: 文檔列表，每個文檔是包含內容和元數據的字典
            content_field: 文檔內容的欄位名稱
            model_name: 重排序模型名稱
            top_k: 返回的文檔數量
            score_threshold: 分數門檻
        
        Returns:
            重排序後的文檔列表，每個文檔包含原始元數據和新的重排序分數
        """
        if not documents:
            return []
        
        model_name = model_name or cls.DEFAULT_MODEL
        
        def _rerank_with_metadata_sync() -> List[Dict[str, Any]]:
            model = cls.get_model(model_name)
            
            # 準備輸入對
            pairs = [(query, doc[content_field]) for doc in documents]
            
            # 計算重排序分數
            scores = model.predict(pairs)
            
            # 結合原始文檔和新分數
            reranked = []
            for i, doc in enumerate(documents):
                rerank_score = float(scores[i])
                if rerank_score >= score_threshold:
                    # 複製原始文檔並添加重排序分數
                    new_doc = doc.copy()
                    new_doc["rerank_score"] = rerank_score
                    reranked.append(new_doc)
            
            # 按分數排序並返回 top_k
            reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
            return reranked[:top_k]
        
        return await asyncio.to_thread(_rerank_with_metadata_sync)
    
    @classmethod
    async def calculate_relevance_score(
        cls,
        query: str,
        document: str,
        model_name: str = None
    ) -> float:
        """
        計算單一文檔與查詢的相關性分數
        
        Args:
            query: 查詢文本
            document: 文檔內容
            model_name: 重排序模型名稱
        
        Returns:
            相關性分數
        """
        model_name = model_name or cls.DEFAULT_MODEL
        
        def _calculate_score_sync() -> float:
            model = cls.get_model(model_name)
            score = model.predict([(query, document)])
            return float(score[0])
        
        return await asyncio.to_thread(_calculate_score_sync)
    
    @classmethod
    def get_model_info(cls, model_name: str = None) -> Dict[str, Any]:
        """獲取模型資訊"""
        model_name = model_name or cls.DEFAULT_MODEL
        return cls.SUPPORTED_MODELS.get(model_name, {})


class HybridRanker:
    """混合排序器，結合向量相似度和重排序分數"""
    
    @staticmethod
    def combine_scores(
        vector_score: float,
        rerank_score: float,
        vector_weight: float = 0.3,
        rerank_weight: float = 0.7
    ) -> float:
        """
        結合向量相似度分數和重排序分數
        
        Args:
            vector_score: 向量相似度分數 (0-1)
            rerank_score: 重排序分數 (通常 -10 到 10)
            vector_weight: 向量分數權重
            rerank_weight: 重排序分數權重
        
        Returns:
            結合後的分數
        """
        # 將重排序分數標準化到 0-1 範圍
        normalized_rerank = (rerank_score + 10) / 20  # 假設範圍是 -10 到 10
        normalized_rerank = max(0, min(1, normalized_rerank))
        
        # 加權平均
        combined_score = (vector_weight * vector_score) + (rerank_weight * normalized_rerank)
        return combined_score
    
    @staticmethod
    async def hybrid_rerank(
        query: str,
        documents: List[Tuple[str, float]],  # (content, vector_score)
        rerank_model: str = None,
        vector_weight: float = 0.3,
        rerank_weight: float = 0.7,
        top_k: int = 5
    ) -> List[Tuple[str, float, Dict[str, float]]]:
        """
        混合重排序：結合向量相似度和重排序分數
        
        Returns:
            List of (content, combined_score, score_details)
        """
        if not documents:
            return []
        
        # 獲取重排序分數
        reranked = await RerankService.rerank(
            query, documents, rerank_model, top_k=len(documents)
        )
        
        # 建立重排序分數映射
        rerank_scores = {content: score for content, score in reranked}
        
        # 結合分數
        combined_results = []
        for content, vector_score in documents:
            rerank_score = rerank_scores.get(content, 0.0)
            combined_score = HybridRanker.combine_scores(
                vector_score, rerank_score, vector_weight, rerank_weight
            )
            
            score_details = {
                "vector_score": vector_score,
                "rerank_score": rerank_score,
                "combined_score": combined_score
            }
            
            combined_results.append((content, combined_score, score_details))
        
        # 按結合分數排序
        combined_results.sort(key=lambda x: x[1], reverse=True)
        return combined_results[:top_k]
