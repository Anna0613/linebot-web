#!/usr/bin/env python3
"""
資料庫管理命令腳本
提供完整的資料庫初始化、遷移管理和維護功能
"""
import os
import sys
import logging
import argparse
from pathlib import Path

# 添加項目根目錄到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 檢查依賴套件
try:
    import sqlalchemy
    import alembic
except ImportError as e:
    print("❌ 缺少必要的依賴套件")
    print("請先安裝虛擬環境和依賴套件:")
    print("  python -m venv venv")
    print("  source venv/bin/activate  # Linux/Mac")
    print("  venv\\Scripts\\activate     # Windows")
    print("  pip install -r requirements.txt")
    sys.exit(1)

try:
    from app.database_enhanced import DatabaseInitializer, init_database_enhanced
    from app.db.database import check_database_connection
except ImportError as e:
    print(f"❌ 導入模組失敗: {e}")
    print("請確保在正確的專案目錄中執行此腳本")
    sys.exit(1)

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_settings():
    """載入設定"""
    try:
        from app.config import settings
        return settings
    except Exception as e:
        logger.error(f"載入設定失敗: {e}")
        return None

def cmd_init(args):
    """初始化資料庫"""
    logger.info("🚀 開始資料庫初始化...")
    
    settings = load_settings()
    if not settings:
        return False
    
    success = init_database_enhanced(settings.DATABASE_URL, str(project_root))
    
    if success:
        logger.info("✅ 資料庫初始化完成")
        return True
    else:
        logger.error("❌ 資料庫初始化失敗")
        return False

def cmd_check(args):
    """檢查資料庫狀態"""
    logger.info("🔍 檢查資料庫狀態...")
    
    settings = load_settings()
    if not settings:
        return False
    
    try:
        # 檢查連接
        check_database_connection()
        logger.info("✅ 資料庫連接正常")
        
        # 檢查遷移狀態
        alembic_ini_path = os.path.join(project_root, "alembic.ini")
        if os.path.exists(alembic_ini_path):
            initializer = DatabaseInitializer(settings.DATABASE_URL, alembic_ini_path)
            current = initializer.get_current_revision()
            head = initializer.get_head_revision()
            
            logger.info(f"📝 當前遷移版本: {current or 'None'}")
            logger.info(f"📝 最新遷移版本: {head or 'None'}")
            
            if initializer.is_database_up_to_date():
                logger.info("✅ 資料庫已是最新版本")
            else:
                logger.warning("⚠️ 資料庫需要更新")
        else:
            logger.error("❌ 找不到 alembic.ini 檔案")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 資料庫檢查失敗: {e}")
        return False

def cmd_repair(args):
    """修復資料庫狀態"""
    logger.info("🔧 修復資料庫狀態...")
    
    settings = load_settings()
    if not settings:
        return False
    
    alembic_ini_path = os.path.join(project_root, "alembic.ini")
    if not os.path.exists(alembic_ini_path):
        logger.error("❌ 找不到 alembic.ini 檔案")
        return False
    
    try:
        initializer = DatabaseInitializer(settings.DATABASE_URL, alembic_ini_path)
        
        # 檢查和修復遷移狀態
        if initializer._check_and_fix_migrations():
            logger.info("✅ 遷移狀態修復完成")
            
            # 執行遷移
            if initializer._run_migrations():
                logger.info("✅ 遷移執行完成")
                
                # 驗證結構
                if initializer._validate_schema():
                    logger.info("✅ 資料庫結構驗證通過")
                    return True
                else:
                    logger.error("❌ 資料庫結構驗證失敗")
                    return False
            else:
                logger.error("❌ 遷移執行失敗")
                return False
        else:
            logger.error("❌ 遷移狀態修復失敗")
            return False
            
    except Exception as e:
        logger.error(f"❌ 資料庫修復失敗: {e}")
        return False

def cmd_status(args):
    """顯示詳細資料庫狀態"""
    logger.info("📊 資料庫詳細狀態報告...")
    
    settings = load_settings()
    if not settings:
        return False
    
    alembic_ini_path = os.path.join(project_root, "alembic.ini")
    if not os.path.exists(alembic_ini_path):
        logger.error("❌ 找不到 alembic.ini 檔案")
        return False
    
    try:
        initializer = DatabaseInitializer(settings.DATABASE_URL, alembic_ini_path)
        
        # 連接檢查
        if initializer._check_connection():
            logger.info("✅ 資料庫連接: 正常")
        else:
            logger.error("❌ 資料庫連接: 失敗")
            return False
        
        # 版本資訊
        current = initializer.get_current_revision()
        head = initializer.get_head_revision()
        
        print("\n" + "="*50)
        print("📋 資料庫狀態報告")
        print("="*50)
        print(f"🔗 資料庫 URL: {settings.DATABASE_URL}")
        print(f"📝 當前版本: {current or '未設定'}")
        print(f"📝 最新版本: {head or '未知'}")
        print(f"🔄 需要更新: {'否' if initializer.is_database_up_to_date() else '是'}")
        
        # 表結構驗證
        if initializer._validate_schema():
            print("✅ 表結構: 完整")
        else:
            print("❌ 表結構: 不完整")
        
        print("="*50)
        return True
        
    except Exception as e:
        logger.error(f"❌ 獲取狀態失敗: {e}")
        return False

def cmd_clean(args):
    """清理未使用的資料庫結構"""
    logger.info("🧹 清理資料庫...")
    
    settings = load_settings()
    if not settings:
        return False
    
    try:
        from app.db.database import clean_unused_schemas
        clean_unused_schemas()
        logger.info("✅ 資料庫清理完成")
        return True
    except Exception as e:
        logger.error(f"❌ 資料庫清理失敗: {e}")
        return False

def main():
    """主函數"""
    parser = argparse.ArgumentParser(
        description="BotCraft 資料庫管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用範例:
  python db_manager.py init         # 初始化資料庫
  python db_manager.py check        # 檢查資料庫狀態
  python db_manager.py repair       # 修復資料庫問題
  python db_manager.py status       # 顯示詳細狀態
  python db_manager.py clean        # 清理未使用的結構
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # init 命令
    init_parser = subparsers.add_parser('init', help='初始化資料庫')
    init_parser.set_defaults(func=cmd_init)
    
    # check 命令
    check_parser = subparsers.add_parser('check', help='檢查資料庫狀態')
    check_parser.set_defaults(func=cmd_check)
    
    # repair 命令
    repair_parser = subparsers.add_parser('repair', help='修復資料庫問題')
    repair_parser.set_defaults(func=cmd_repair)
    
    # status 命令
    status_parser = subparsers.add_parser('status', help='顯示詳細狀態')
    status_parser.set_defaults(func=cmd_status)
    
    # clean 命令
    clean_parser = subparsers.add_parser('clean', help='清理未使用的結構')
    clean_parser.set_defaults(func=cmd_clean)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        success = args.func(args)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("操作被用戶取消")
        sys.exit(1)
    except Exception as e:
        logger.error(f"執行失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
