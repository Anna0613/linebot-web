"""
混合搜尋服務
結合向量搜尋和 BM25 全文搜尋，使用 RRF (Reciprocal Rank Fusion) 融合演算法。
"""
import asyncio
import logging
from typing import List, Tuple, Optional, Dict, Any
import math
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sql_text, select

from app.models.knowledge import KnowledgeChunk
from app.services.embedding_service import embed_text

logger = logging.getLogger(__name__)


class BM25Calculator:
    """BM25 計算器"""
    
    def __init__(self, k1: float = 1.2, b: float = 0.75):
        """
        初始化 BM25 參數
        
        Args:
            k1: 詞頻飽和參數
            b: 長度正規化參數
        """
        self.k1 = k1
        self.b = b
    
    @staticmethod
    def tokenize(text: str) -> List[str]:
        """簡單的分詞函數"""
        import re
        # 移除標點符號並轉為小寫
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        # 分割並過濾空字串
        tokens = [token for token in text.split() if token.strip()]
        return tokens
    
    def calculate_bm25_score(
        self,
        query_terms: List[str],
        document_terms: List[str],
        corpus_stats: Dict[str, Any]
    ) -> float:
        """
        計算 BM25 分數
        
        Args:
            query_terms: 查詢詞列表
            document_terms: 文檔詞列表
            corpus_stats: 語料庫統計資訊
        
        Returns:
            BM25 分數
        """
        if not query_terms or not document_terms:
            return 0.0
        
        # 文檔長度
        doc_len = len(document_terms)
        avg_doc_len = corpus_stats.get('avg_doc_len', doc_len)
        total_docs = corpus_stats.get('total_docs', 1)
        
        # 計算詞頻
        term_freq = defaultdict(int)
        for term in document_terms:
            term_freq[term] += 1
        
        score = 0.0
        for term in query_terms:
            if term in term_freq:
                tf = term_freq[term]
                df = corpus_stats.get('doc_freq', {}).get(term, 1)
                
                # IDF 計算
                idf = math.log((total_docs - df + 0.5) / (df + 0.5))
                
                # BM25 公式
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / avg_doc_len))
                
                score += idf * (numerator / denominator)
        
        return score


class HybridSearchService:
    """混合搜尋服務"""
    
    def __init__(self):
        self.bm25_calculator = BM25Calculator()
    
    async def hybrid_search(
        self,
        db: AsyncSession,
        bot_id: str,
        query: str,
        vector_weight: float = 0.7,
        bm25_weight: float = 0.3,
        top_k: int = 10,
        vector_threshold: float = 0.7,
        model_name: Optional[str] = None
    ) -> List[Tuple[KnowledgeChunk, float, Dict[str, float]]]:
        """
        混合搜尋：結合向量搜尋和全文搜尋
        
        Args:
            db: 資料庫會話
            bot_id: Bot ID
            query: 查詢文本
            vector_weight: 向量搜尋權重
            bm25_weight: BM25 搜尋權重
            top_k: 返回結果數量
            vector_threshold: 向量相似度門檻
            model_name: 嵌入模型名稱
        
        Returns:
            混合搜尋結果，格式為 [(chunk, combined_score, score_details), ...]
        """
        # 並行執行向量搜尋和全文搜尋
        vector_task = self._vector_search(db, bot_id, query, top_k * 2, vector_threshold, model_name)
        fulltext_task = self._fulltext_search(db, bot_id, query, top_k * 2)
        
        vector_results, fulltext_results = await asyncio.gather(vector_task, fulltext_task)
        
        # RRF 融合
        return self._rrf_fusion(
            vector_results, fulltext_results, 
            vector_weight, bm25_weight, top_k
        )
    
    async def _vector_search(
        self,
        db: AsyncSession,
        bot_id: str,
        query: str,
        top_k: int,
        threshold: float,
        model_name: Optional[str] = None
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """向量搜尋"""
        try:
            # 生成查詢向量
            query_embedding = await embed_text(query, model_name=model_name)
            if not query_embedding:
                logger.warning(f"無法為查詢生成向量: {query}")
                return []

            # 轉換為 pgvector 格式
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

            # 執行向量相似度搜尋
            sql = sql_text("""
                SELECT
                    id, bot_id, title, content, metadata, created_at, updated_at,
                    1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
                FROM knowledge_chunks
                WHERE bot_id = CAST(:bot_id AS UUID)
                    AND (1 - (embedding <=> CAST(:embedding AS vector))) >= :threshold
                ORDER BY similarity DESC
                LIMIT :top_k
            """)

            result = await db.execute(sql, {
                "embedding": embedding_str,
                "bot_id": bot_id,
                "threshold": threshold,
                "top_k": top_k
            })

            chunks_with_scores = []
            for row in result.fetchall():
                chunk = KnowledgeChunk(
                    id=row.id,
                    bot_id=row.bot_id,
                    title=row.title,
                    content=row.content,
                    metadata=row.metadata,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
                chunks_with_scores.append((chunk, float(row.similarity)))

            logger.info(f"向量搜尋找到 {len(chunks_with_scores)} 個相關片段")
            return chunks_with_scores

        except Exception as e:
            logger.error(f"向量搜尋失敗: {e}")
            return []
    
    async def _fulltext_search(
        self,
        db: AsyncSession,
        bot_id: str,
        query: str,
        top_k: int
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """PostgreSQL 全文搜尋"""
        
        # 使用 PostgreSQL 的全文搜尋功能
        sql = sql_text("""
            SELECT kc.*, 
                   ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', :query)) as score
            FROM knowledge_chunks kc
            WHERE (kc.bot_id = :bot_id OR kc.bot_id IS NULL)
              AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', :query)
            ORDER BY score DESC
            LIMIT :k
        """)
        
        rows = (await db.execute(sql, {
            "query": query, 
            "bot_id": bot_id, 
            "k": top_k
        })).mappings().all()
        
        results = []
        for r in rows:
            kc = KnowledgeChunk()
            kc.id = r["id"]
            kc.document_id = r["document_id"]
            kc.bot_id = r["bot_id"]
            kc.content = r["content"]
            kc.created_at = r["created_at"]
            kc.updated_at = r["updated_at"]
            results.append((kc, float(r["score"])))
        
        return results
    
    async def _bm25_search(
        self,
        db: AsyncSession,
        bot_id: str,
        query: str,
        top_k: int
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """BM25 搜尋（自實作版本）"""
        
        # 獲取所有相關文檔
        stmt = select(KnowledgeChunk).where(
            (KnowledgeChunk.bot_id == bot_id) | 
            (KnowledgeChunk.bot_id.is_(None))
        )
        result = await db.execute(stmt)
        chunks = result.scalars().all()
        
        if not chunks:
            return []
        
        # 分詞
        query_terms = self.bm25_calculator.tokenize(query)
        
        # 計算語料庫統計
        corpus_stats = await self._calculate_corpus_stats(chunks)
        
        # 計算每個文檔的 BM25 分數
        scored_chunks = []
        for chunk in chunks:
            doc_terms = self.bm25_calculator.tokenize(chunk.content)
            score = self.bm25_calculator.calculate_bm25_score(
                query_terms, doc_terms, corpus_stats
            )
            if score > 0:
                scored_chunks.append((chunk, score))
        
        # 排序並返回 top_k
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]
    
    async def _calculate_corpus_stats(self, chunks: List[KnowledgeChunk]) -> Dict[str, Any]:
        """計算語料庫統計資訊"""
        
        def _calculate_stats():
            total_docs = len(chunks)
            total_terms = 0
            doc_freq = defaultdict(int)
            
            for chunk in chunks:
                terms = self.bm25_calculator.tokenize(chunk.content)
                total_terms += len(terms)
                
                # 計算文檔頻率
                unique_terms = set(terms)
                for term in unique_terms:
                    doc_freq[term] += 1
            
            avg_doc_len = total_terms / total_docs if total_docs > 0 else 0
            
            return {
                'total_docs': total_docs,
                'avg_doc_len': avg_doc_len,
                'doc_freq': dict(doc_freq)
            }
        
        return await asyncio.to_thread(_calculate_stats)
    
    def _rrf_fusion(
        self,
        vector_results: List[Tuple[KnowledgeChunk, float]],
        fulltext_results: List[Tuple[KnowledgeChunk, float]],
        vector_weight: float,
        bm25_weight: float,
        top_k: int,
        k: int = 60  # RRF 參數
    ) -> List[Tuple[KnowledgeChunk, float, Dict[str, float]]]:
        """
        Reciprocal Rank Fusion 融合演算法
        
        Args:
            vector_results: 向量搜尋結果
            fulltext_results: 全文搜尋結果
            vector_weight: 向量搜尋權重
            bm25_weight: BM25 搜尋權重
            top_k: 返回結果數量
            k: RRF 參數
        
        Returns:
            融合後的搜尋結果
        """
        scores = {}
        chunk_map = {}
        
        # 向量搜尋結果的 RRF 分數
        for rank, (chunk, vector_score) in enumerate(vector_results):
            chunk_id = str(chunk.id)
            rrf_score = vector_weight / (k + rank + 1)
            scores[chunk_id] = {
                'rrf_score': rrf_score,
                'vector_score': vector_score,
                'bm25_score': 0.0,
                'vector_rank': rank + 1,
                'bm25_rank': None
            }
            chunk_map[chunk_id] = chunk
        
        # 全文搜尋結果的 RRF 分數
        for rank, (chunk, bm25_score) in enumerate(fulltext_results):
            chunk_id = str(chunk.id)
            rrf_score = bm25_weight / (k + rank + 1)
            
            if chunk_id in scores:
                scores[chunk_id]['rrf_score'] += rrf_score
                scores[chunk_id]['bm25_score'] = bm25_score
                scores[chunk_id]['bm25_rank'] = rank + 1
            else:
                scores[chunk_id] = {
                    'rrf_score': rrf_score,
                    'vector_score': 0.0,
                    'bm25_score': bm25_score,
                    'vector_rank': None,
                    'bm25_rank': rank + 1
                }
                chunk_map[chunk_id] = chunk
        
        # 按融合分數排序
        sorted_items = sorted(scores.items(), key=lambda x: x[1]['rrf_score'], reverse=True)
        
        # 返回 top_k 結果
        final_results = []
        for chunk_id, score_details in sorted_items[:top_k]:
            if chunk_id in chunk_map:
                chunk = chunk_map[chunk_id]
                combined_score = score_details['rrf_score']
                
                # 準備詳細分數資訊
                details = {
                    'combined_score': combined_score,
                    'vector_score': score_details['vector_score'],
                    'bm25_score': score_details['bm25_score'],
                    'vector_rank': score_details['vector_rank'],
                    'bm25_rank': score_details['bm25_rank'],
                    'vector_weight': vector_weight,
                    'bm25_weight': bm25_weight
                }
                
                final_results.append((chunk, combined_score, details))
        
        return final_results
    
    async def search_with_explanation(
        self,
        db: AsyncSession,
        bot_id: str,
        query: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        帶解釋的混合搜尋
        
        Returns:
            包含搜尋結果和詳細解釋的字典
        """
        # 執行混合搜尋
        results = await self.hybrid_search(db, bot_id, query, **kwargs)
        
        # 準備解釋資訊
        explanation = {
            'query': query,
            'search_method': 'hybrid_rrf',
            'vector_weight': kwargs.get('vector_weight', 0.7),
            'bm25_weight': kwargs.get('bm25_weight', 0.3),
            'total_results': len(results),
            'results': []
        }
        
        for chunk, score, details in results:
            result_info = {
                'chunk_id': str(chunk.id),
                'content_preview': chunk.content[:200] + '...' if len(chunk.content) > 200 else chunk.content,
                'combined_score': score,
                'score_breakdown': details
            }
            explanation['results'].append(result_info)
        
        return {
            'results': results,
            'explanation': explanation
        }
