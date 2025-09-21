#!/usr/bin/env python3
"""
檢查知識庫嵌入向量狀態
"""
import asyncio
import sys
sys.path.append('.')

from app.database_async import get_async_db
from app.models.knowledge import KnowledgeChunk
from sqlalchemy import select, text, func

async def check_embeddings():
    async for db in get_async_db():
        try:
            # 檢查知識塊總數
            total_count = await db.scalar(select(func.count(KnowledgeChunk.id)))
            print(f'總知識塊數: {total_count}')

            # 檢查有嵌入向量的知識塊數
            with_embedding = await db.scalar(
                select(func.count(KnowledgeChunk.id))
                .where(KnowledgeChunk.embedding.isnot(None))
            )
            print(f'有嵌入向量的知識塊數: {with_embedding}')
            
            # 檢查嵌入向量的維度 (pgvector)
            if with_embedding > 0:
                try:
                    result = await db.execute(
                        text('SELECT vector_dims(embedding) as dim FROM knowledge_chunks WHERE embedding IS NOT NULL LIMIT 1')
                    )
                    dim = result.scalar()
                    print(f'嵌入向量維度: {dim}')
                except Exception as e:
                    print(f'無法檢查向量維度: {e}')
            
            # 檢查 Bot ID
            result = await db.execute(
                select(KnowledgeChunk.bot_id, KnowledgeChunk.id)
                .where(KnowledgeChunk.bot_id.isnot(None))
                .limit(5)
            )
            chunks = result.all()
            print(f'知識塊 Bot ID 範例: {chunks}')
            
            # 檢查特定 Bot 的知識塊
            target_bot_id = '3b203f03-f1bd-4127-a08f-2bb0139cdbf6'
            bot_chunks = await db.scalar(
                select(func.count(KnowledgeChunk.id))
                .where(KnowledgeChunk.bot_id == target_bot_id)
            )
            print(f'Bot {target_bot_id} 的知識塊數: {bot_chunks}')

            # 檢查該 Bot 有嵌入向量的知識塊
            bot_with_embedding = await db.scalar(
                select(func.count(KnowledgeChunk.id))
                .where(
                    (KnowledgeChunk.bot_id == target_bot_id) &
                    (KnowledgeChunk.embedding.isnot(None))
                )
            )
            print(f'Bot {target_bot_id} 有嵌入向量的知識塊數: {bot_with_embedding}')
            
        except Exception as e:
            print(f'錯誤: {e}')
            import traceback
            traceback.print_exc()
        finally:
            await db.close()
            break

if __name__ == "__main__":
    asyncio.run(check_embeddings())
