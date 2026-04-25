#!/usr/bin/env python3
"""
嵌入模型升級腳本
將現有的知識庫內容從 all-MiniLM-L6-v2 (384維) 升級到 all-mpnet-base-v2 (768維)
"""
import asyncio
import logging
import sys
from pathlib import Path
from typing import List, Tuple

# 添加專案根目錄到 Python 路徑
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database_async import get_async_session
from app.models.knowledge import KnowledgeChunk
from app.services.embedding.embedding_manager import EmbeddingManager

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EmbeddingUpgrader:
    """嵌入模型升級器"""
    
    def __init__(self):
        self.old_model = "all-MiniLM-L6-v2"
        self.new_model = "all-mpnet-base-v2"
        self.batch_size = 50  # 批次處理大小
        self.processed_count = 0
        self.total_count = 0
    
    async def get_chunks_to_upgrade(self, db: AsyncSession) -> List[KnowledgeChunk]:
        """獲取需要升級的知識塊"""
        
        # 查詢所有需要升級的知識塊
        # 條件：embedding_new 為空或 embedding_model 不是新模型
        stmt = select(KnowledgeChunk).where(
            (KnowledgeChunk.embedding_new.is_(None)) |
            (KnowledgeChunk.embedding_model != self.new_model)
        ).order_by(KnowledgeChunk.created_at)
        
        result = await db.execute(stmt)
        chunks = result.scalars().all()
        
        logger.info(f"找到 {len(chunks)} 個需要升級的知識塊")
        return chunks
    
    async def upgrade_chunk_embeddings(
        self, 
        db: AsyncSession, 
        chunks: List[KnowledgeChunk]
    ) -> int:
        """批次升級知識塊的嵌入向量"""
        
        if not chunks:
            return 0
        
        # 提取文本內容
        texts = [chunk.content for chunk in chunks]
        chunk_ids = [chunk.id for chunk in chunks]
        
        try:
            # 使用新模型生成嵌入向量
            logger.info(f"正在為 {len(texts)} 個文本生成新的嵌入向量...")
            embeddings = await EmbeddingManager.embed_texts_batch(
                texts, 
                model_name=self.new_model,
                batch_size=self.batch_size
            )
            
            # 批次更新資料庫
            for i, (chunk_id, embedding) in enumerate(zip(chunk_ids, embeddings)):
                await db.execute(
                    update(KnowledgeChunk)
                    .where(KnowledgeChunk.id == chunk_id)
                    .values(
                        embedding_new=embedding,
                        embedding_model=self.new_model,
                        embedding_dimensions="768"
                    )
                )
            
            await db.commit()
            logger.info(f"成功升級 {len(chunks)} 個知識塊的嵌入向量")
            return len(chunks)
            
        except Exception as e:
            logger.error(f"升級嵌入向量失敗: {e}")
            await db.rollback()
            raise
    
    async def run_upgrade(self) -> None:
        """執行完整的升級流程"""
        
        logger.info("🚀 開始嵌入模型升級流程")
        logger.info(f"   舊模型: {self.old_model} (384維)")
        logger.info(f"   新模型: {self.new_model} (768維)")
        
        async for db in get_async_session():
            try:
                # 獲取需要升級的知識塊
                chunks = await self.get_chunks_to_upgrade(db)
                self.total_count = len(chunks)
                
                if self.total_count == 0:
                    logger.info("✅ 沒有需要升級的知識塊")
                    return
                
                # 分批處理
                for i in range(0, len(chunks), self.batch_size):
                    batch = chunks[i:i + self.batch_size]
                    batch_num = i // self.batch_size + 1
                    total_batches = (len(chunks) - 1) // self.batch_size + 1
                    
                    logger.info(f"📦 處理批次 {batch_num}/{total_batches}")
                    
                    upgraded_count = await self.upgrade_chunk_embeddings(db, batch)
                    self.processed_count += upgraded_count
                    
                    # 顯示進度
                    progress = (self.processed_count / self.total_count) * 100
                    logger.info(f"   進度: {self.processed_count}/{self.total_count} ({progress:.1f}%)")
                
                logger.info("✅ 嵌入模型升級完成！")
                logger.info(f"   總共處理: {self.processed_count} 個知識塊")
                
                # 驗證升級結果
                await self.verify_upgrade(db)
                
            except Exception as e:
                logger.error(f"❌ 升級過程中發生錯誤: {e}")
                raise
            finally:
                await db.close()
    
    async def verify_upgrade(self, db: AsyncSession) -> None:
        """驗證升級結果"""
        
        logger.info("🔍 驗證升級結果...")
        
        # 檢查新模型的知識塊數量
        new_model_count = await db.scalar(
            select(KnowledgeChunk.id)
            .where(KnowledgeChunk.embedding_model == self.new_model)
            .count()
        )
        
        # 檢查有新嵌入向量的知識塊數量
        new_embedding_count = await db.scalar(
            select(KnowledgeChunk.id)
            .where(KnowledgeChunk.embedding_new.isnot(None))
            .count()
        )
        
        logger.info(f"   使用新模型的知識塊: {new_model_count}")
        logger.info(f"   有新嵌入向量的知識塊: {new_embedding_count}")
        
        if new_model_count == new_embedding_count == self.total_count:
            logger.info("✅ 驗證通過！所有知識塊都已成功升級")
        else:
            logger.warning("⚠️  驗證發現問題，請檢查升級結果")


async def main():
    """主函數"""
    
    print("=" * 60)
    print("🔄 LINE Bot 知識庫嵌入模型升級工具")
    print("=" * 60)
    print()
    
    # 確認升級
    response = input("確定要升級嵌入模型嗎？這可能需要一些時間。(y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("❌ 升級已取消")
        return
    
    try:
        upgrader = EmbeddingUpgrader()
        await upgrader.run_upgrade()
        
        print()
        print("=" * 60)
        print("🎉 升級完成！")
        print("=" * 60)
        print()
        print("📝 後續步驟：")
        print("1. 測試新的嵌入模型效果")
        print("2. 如果效果滿意，可以考慮刪除舊的嵌入欄位")
        print("3. 更新應用程式配置以使用新模型")
        
    except Exception as e:
        logger.error(f"❌ 升級失敗: {e}")
        print()
        print("💡 故障排除建議：")
        print("1. 檢查資料庫連接")
        print("2. 確認 sentence-transformers 套件已安裝")
        print("3. 檢查系統記憶體是否足夠")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
