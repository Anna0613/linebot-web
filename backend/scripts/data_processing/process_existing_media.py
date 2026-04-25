#!/usr/bin/env python3
"""
處理已存在的媒體訊息，補充缺失的媒體 URL
這個腳本會找到所有沒有媒體 URL 的記錄，並嘗試重新處理
"""
import asyncio
import sys
import os
from pathlib import Path
import logging

# 添加專案根目錄到 Python 路徑
current_dir = Path(__file__).parent
scripts_dir = current_dir.parent
backend_dir = scripts_dir.parent
sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal
from app.models.line_user import LineBotUser
# TODO: LineBotUserInteraction 已遷移到 MongoDB
from app.models.bot import Bot
from app.services.line.line_bot_service import LineBotService

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def process_existing_media():
    """處理已存在但未處理的媒體訊息"""
    logger.info("🚀 開始處理已存在的媒體訊息")
    
    db = SessionLocal()
    try:
        # 查找所有沒有媒體 URL 的媒體訊息
        media_interactions = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio']),
            LineBotUserInteraction.media_url.is_(None)
        ).all()
        
        logger.info(f"📊 找到 {len(media_interactions)} 個待處理的媒體訊息")
        
        if not media_interactions:
            logger.info("✅ 所有媒體訊息都已處理完畢")
            return
        
        processed = 0
        failed = 0
        
        for interaction in media_interactions:
            try:
                # 獲取關聯的 LINE 用戶和 Bot 信息
                line_user = db.query(LineBotUser).filter(
                    LineBotUser.id == interaction.line_user_id
                ).first()
                
                if not line_user:
                    logger.warning(f"⚠️ 找不到用戶記錄: {interaction.line_user_id}")
                    failed += 1
                    continue
                
                bot = db.query(Bot).filter(Bot.id == line_user.bot_id).first()
                if not bot:
                    logger.warning(f"⚠️ 找不到 Bot 記錄: {line_user.bot_id}")
                    failed += 1
                    continue
                
                # 從 message_content 中獲取 LINE message ID
                line_message_id = None
                if interaction.message_content and isinstance(interaction.message_content, dict):
                    line_message_id = (
                        interaction.message_content.get('line_message_id') or 
                        interaction.message_content.get('id')
                    )
                
                if not line_message_id:
                    logger.warning(f"⚠️ 找不到 LINE message ID: {interaction.id}")
                    failed += 1
                    continue
                
                logger.info(f"🔄 處理媒體: {interaction.message_type} (ID: {interaction.id[:8]}...)")
                
                # 創建 LINE Bot 服務
                line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
                
                # 嘗試獲取媒體內容 URL
                try:
                    content_url = await LineBotService.get_message_content_url(
                        channel_token=bot.channel_token,
                        interaction_id=str(interaction.id),
                        db_session=db,
                        line_user_id=line_user.line_user_id,
                        message_type=interaction.message_type
                    )
                    
                    if content_url:
                        logger.info(f"✅ 媒體處理成功: {interaction.message_type} -> {content_url[:50]}...")
                        processed += 1
                    else:
                        logger.error(f"❌ 媒體處理失敗: 無法獲取 URL")
                        failed += 1
                        
                except Exception as e:
                    logger.error(f"❌ 媒體處理異常: {e}")
                    failed += 1
                    
            except Exception as e:
                logger.error(f"❌ 處理互動記錄失敗 {interaction.id}: {e}")
                failed += 1
        
        logger.info("📊 處理結果總結:")
        logger.info(f"   ✅ 成功處理: {processed} 個")
        logger.info(f"   ❌ 處理失敗: {failed} 個")
        logger.info(f"   📈 成功率: {processed/(processed+failed)*100:.1f}%" if (processed+failed) > 0 else "N/A")
        
    except Exception as e:
        logger.error(f"❌ 處理過程中發生錯誤: {e}")
    finally:
        try:
            db.close()
        except:
            pass

async def check_media_status():
    """檢查媒體處理狀態"""
    logger.info("📊 檢查媒體處理狀態")
    
    db = SessionLocal()
    try:
        # 統計媒體訊息
        total_media = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio'])
        ).count()
        
        processed_media = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio']),
            LineBotUserInteraction.media_url.isnot(None)
        ).count()
        
        unprocessed_media = total_media - processed_media
        
        logger.info(f"   總媒體訊息: {total_media}")
        logger.info(f"   已處理: {processed_media}")
        logger.info(f"   待處理: {unprocessed_media}")
        logger.info(f"   處理率: {processed_media/total_media*100:.1f}%" if total_media > 0 else "N/A")
        
        # 顯示各類型統計
        for media_type in ['image', 'video', 'audio']:
            type_total = db.query(LineBotUserInteraction).filter(
                LineBotUserInteraction.message_type == media_type
            ).count()
            
            type_processed = db.query(LineBotUserInteraction).filter(
                LineBotUserInteraction.message_type == media_type,
                LineBotUserInteraction.media_url.isnot(None)
            ).count()
            
            if type_total > 0:
                logger.info(f"   {media_type}: {type_processed}/{type_total} ({type_processed/type_total*100:.1f}%)")
        
        return unprocessed_media
        
    except Exception as e:
        logger.error(f"❌ 狀態檢查失敗: {e}")
        return 0
    finally:
        try:
            db.close()
        except:
            pass

async def main():
    """主函數"""
    logger.info("🔧 媒體處理修復工具")
    logger.info("=" * 50)
    
    # 檢查當前狀態
    unprocessed_count = await check_media_status()
    
    if unprocessed_count == 0:
        logger.info("✅ 所有媒體已處理完畢！")
        return
    
    logger.info(f"\n🔄 開始處理 {unprocessed_count} 個待處理的媒體訊息...")
    
    # 處理媒體
    await process_existing_media()
    
    # 重新檢查狀態
    logger.info("\n📊 處理後狀態:")
    await check_media_status()
    
    logger.info("\n✅ 媒體處理修復完成！")
    logger.info("💡 你現在可以到後台管理頁面查看媒體內容了")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 處理被用戶中斷")
    except Exception as e:
        logger.error(f"❌ 處理過程中發生未預期錯誤: {e}")
        sys.exit(1)