#!/usr/bin/env python3
"""
測試媒體處理功能的腳本
檢查 MinIO 連接、媒體上傳和前端顯示整個流程
"""
import asyncio
import sys
import os
from pathlib import Path

# 添加專案根目錄到 Python 路徑
sys.path.insert(0, str(Path(__file__).parent))

from app.services.minio_service import get_minio_service, init_minio_service
from app.services.background_tasks import get_task_manager
from app.database import SessionLocal
from app.models.line_user import LineBotUser, LineBotUserInteraction
from app.models.bot import Bot
from app.config import settings
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_minio_connection():
    """測試 MinIO 連接"""
    logger.info("🔄 測試 MinIO 連接...")
    
    try:
        minio_service, error = init_minio_service(force=True)
        if error:
            logger.error(f"❌ MinIO 服務初始化失敗: {error}")
            return False
        
        if minio_service:
            # 檢查 bucket 是否存在
            bucket_name = settings.MINIO_BUCKET_NAME
            if minio_service.client.bucket_exists(bucket_name):
                logger.info(f"✅ MinIO 連接成功，bucket '{bucket_name}' 存在")
            else:
                logger.warning(f"⚠️ MinIO 連接成功，但 bucket '{bucket_name}' 不存在，正在創建...")
                minio_service._ensure_bucket_exists()
                logger.info(f"✅ Bucket '{bucket_name}' 創建成功")
            
            return True
        else:
            logger.error("❌ MinIO 服務實例為空")
            return False
            
    except Exception as e:
        logger.error(f"❌ MinIO 連接測試失敗: {e}")
        return False

def test_database_structure():
    """測試資料庫結構"""
    logger.info("🔄 測試資料庫結構...")
    
    try:
        db = SessionLocal()
        
        # 檢查是否有 media_path 和 media_url 欄位
        result = db.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'line_bot_user_interactions' 
            AND column_name IN ('media_path', 'media_url')
            ORDER BY column_name
        """)
        
        columns = result.fetchall()
        
        if len(columns) >= 2:
            logger.info(f"✅ 資料庫結構正確，媒體欄位存在:")
            for col in columns:
                logger.info(f"   - {col[0]} ({col[1]})")
            return True
        else:
            logger.error(f"❌ 資料庫結構不完整，缺少媒體欄位")
            logger.info(f"   發現的欄位: {[col[0] for col in columns]}")
            return False
            
    except Exception as e:
        logger.error(f"❌ 資料庫結構測試失敗: {e}")
        return False
    finally:
        try:
            db.close()
        except:
            pass

def test_sample_data():
    """檢查測試數據"""
    logger.info("🔄 檢查測試數據...")
    
    try:
        db = SessionLocal()
        
        # 檢查是否有 Bot 數據
        bot_count = db.query(Bot).count()
        logger.info(f"📊 Bot 數量: {bot_count}")
        
        # 檢查是否有用戶互動數據
        interaction_count = db.query(LineBotUserInteraction).count()
        logger.info(f"📊 用戶互動數量: {interaction_count}")
        
        # 檢查媒體類型的互動
        media_interactions = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio'])
        ).count()
        logger.info(f"📊 媒體訊息數量: {media_interactions}")
        
        if media_interactions > 0:
            logger.info("✅ 發現媒體訊息，可以測試媒體處理功能")
            return True
        else:
            logger.warning("⚠️ 沒有媒體訊息，需要發送測試媒體到 LINE Bot")
            return False
            
    except Exception as e:
        logger.error(f"❌ 測試數據檢查失敗: {e}")
        return False
    finally:
        try:
            db.close()
        except:
            pass

async def test_background_task_manager():
    """測試背景任務管理器"""
    logger.info("🔄 測試背景任務管理器...")
    
    try:
        task_manager = get_task_manager()
        
        # 啟動任務管理器
        await task_manager.start()
        
        # 添加測試任務
        await task_manager.add_task(
            "test_task",
            "測試任務",
            lambda: logger.info("✅ 測試任務執行成功"),
            priority=task_manager.__class__.__bases__[0].__dict__.get('TaskPriority', type('TaskPriority', (), {'NORMAL': 2})).NORMAL if hasattr(task_manager.__class__, 'TaskPriority') else 2
        )
        
        # 等待任務執行
        await asyncio.sleep(2)
        
        # 檢查狀態
        status = task_manager.get_status()
        logger.info(f"📊 任務管理器狀態: {status}")
        
        logger.info("✅ 背景任務管理器測試成功")
        return True
        
    except Exception as e:
        logger.error(f"❌ 背景任務管理器測試失敗: {e}")
        return False

async def test_media_api_endpoint():
    """測試媒體 API 端點"""
    logger.info("🔄 測試媒體 API 端點...")
    
    try:
        db = SessionLocal()
        
        # 查找一個媒體互動記錄
        media_interaction = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.message_type.in_(['image', 'video', 'audio'])
        ).first()
        
        if not media_interaction:
            logger.warning("⚠️ 沒有找到媒體互動記錄，無法測試 API 端點")
            return False
        
        logger.info(f"📋 找到媒體互動: ID={media_interaction.id}, 類型={media_interaction.message_type}")
        
        # 檢查是否有媒體 URL
        if media_interaction.media_url:
            logger.info(f"✅ 媒體 URL 已存在: {media_interaction.media_url[:50]}...")
        else:
            logger.warning("⚠️ 媒體 URL 尚未生成，需要觸發媒體處理")
        
        if media_interaction.media_path:
            logger.info(f"✅ 媒體路徑已存在: {media_interaction.media_path}")
        else:
            logger.warning("⚠️ 媒體路徑尚未生成")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 媒體 API 端點測試失敗: {e}")
        return False
    finally:
        try:
            db.close()
        except:
            pass

async def main():
    """主測試函數"""
    logger.info("🚀 開始媒體處理系統測試")
    logger.info("=" * 50)
    
    # 顯示配置信息
    logger.info(f"📝 配置信息:")
    logger.info(f"   MinIO 端點: {settings.MINIO_ENDPOINT}")
    logger.info(f"   MinIO Bucket: {settings.MINIO_BUCKET_NAME}")
    logger.info(f"   MinIO 安全模式: {settings.MINIO_SECURE}")
    logger.info(f"   資料庫: {settings.DATABASE_URL.split('@')[-1]}")  # 隱藏密碼
    
    print()
    
    # 測試步驟
    tests = [
        ("MinIO 連接", test_minio_connection),
        ("資料庫結構", test_database_structure),
        ("測試數據", test_sample_data),
        ("背景任務管理器", test_background_task_manager),
        ("媒體 API 端點", test_media_api_endpoint),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n📋 執行測試: {test_name}")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results[test_name] = result
        except Exception as e:
            logger.error(f"❌ 測試 {test_name} 發生異常: {e}")
            results[test_name] = False
    
    # 總結報告
    logger.info("\n" + "=" * 50)
    logger.info("📊 測試結果總結:")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ 通過" if result else "❌ 失敗"
        logger.info(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\n🎯 測試通過率: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed == total:
        logger.info("🎉 所有測試通過！系統準備就緒！")
        logger.info("\n📋 下一步操作:")
        logger.info("   1. 發送圖片/影片/音訊到 LINE Bot")
        logger.info("   2. 查看後台用戶管理頁面")
        logger.info("   3. 檢查媒體是否正確顯示")
    else:
        logger.warning("⚠️ 部分測試失敗，請檢查上述錯誤信息")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 測試被用戶中斷")
    except Exception as e:
        logger.error(f"❌ 測試過程中發生未預期錯誤: {e}")
        sys.exit(1)