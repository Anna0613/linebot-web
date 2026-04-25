#!/usr/bin/env python3
"""
資料庫管理腳本
提供類似 Prisma 的資料庫管理功能
"""
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

# 添加專案路徑
current_dir = os.path.dirname(__file__)
scripts_dir = os.path.dirname(current_dir)
backend_dir = os.path.dirname(scripts_dir)
sys.path.append(backend_dir)

from app.config import settings
from app.db.database import init_database
import subprocess

class DatabaseManager:
    """資料庫管理器 - 提供類似 Prisma 的 ORM 管理功能"""
    
    def __init__(self):
        # 動態檢測 Python 和 Alembic 路徑
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        if not os.path.exists(venv_python):
            venv_python = os.path.join(backend_dir, "venv", "bin", "python")
        
        if os.path.exists(venv_python):
            self.alembic_cmd = [venv_python, "-m", "alembic"]
        else:
            self.alembic_cmd = ["python", "-m", "alembic"]
        
        # 設定工作目錄為 backend 根目錄
        self.working_dir = backend_dir
    
    def status(self):
        """顯示資料庫狀態 (類似 prisma db push)"""
        print("📊 資料庫狀態檢查")
        print("=" * 50)
        
        try:
            # 檢查當前 migration 狀態
            result = subprocess.run(
                self.alembic_cmd + ["current"],
                capture_output=True,
                text=True,
                check=True,
                cwd=self.working_dir
            )
            
            current_revision = result.stdout.strip()
            if current_revision:
                print(f"✅ 當前 Migration: {current_revision}")
            else:
                print("⚠️ 資料庫尚未初始化")
            
            # 檢查是否有待應用的 migration
            result = subprocess.run(
                self.alembic_cmd + ["heads"],
                capture_output=True,
                text=True,
                check=True,
                cwd=self.working_dir
            )
            
            heads = result.stdout.strip()
            print(f"📋 最新 Migration: {heads}")
            
            # 檢查是否需要升級
            if current_revision != heads:
                print("⚠️ 有新的 migration 需要應用")
                print("💡 執行 'python manage_db.py migrate' 來更新資料庫")
            else:
                print("✅ 資料庫已是最新狀態")
                
        except subprocess.CalledProcessError as e:
            print(f"❌ 檢查狀態失敗: {e}")
            
    def migrate(self):
        """應用 migration (類似 prisma db push)"""
        print("🚀 執行資料庫 Migration")
        print("=" * 50)
        
        try:
            # 檢查資料庫連接
            init_database()
            print("✅ 資料庫連接成功")
            
            # 執行 migration
            result = subprocess.run(
                self.alembic_cmd + ["upgrade", "head"],
                check=True,
                cwd=self.working_dir
            )
            
            print("✅ Migration 執行完成!")
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Migration 失敗: {e}")
            return 1
        except Exception as e:
            print(f"❌ 資料庫連接失敗: {e}")
            return 1
            
        return 0
    
    def generate(self, message):
        """生成新的 migration (類似 prisma db push 後的 migration 生成)"""
        print(f"📝 生成新的 Migration: {message}")
        print("=" * 50)
        
        try:
            result = subprocess.run(
                self.alembic_cmd + ["revision", "--autogenerate", "-m", message],
                check=True,
                cwd=self.working_dir
            )
            
            print("✅ Migration 檔案生成完成!")
            print("💡 執行 'python manage_db.py migrate' 來應用變更")
            
        except subprocess.CalledProcessError as e:
            print(f"❌ 生成 Migration 失敗: {e}")
            return 1
            
        return 0
    
    def reset(self):
        """重置資料庫 (類似 prisma db reset)"""
        print("⚠️ 重置資料庫 - 這將刪除所有資料!")
        
        confirm = input("確定要重置資料庫嗎? 輸入 'RESET' 確認: ")
        if confirm != "RESET":
            print("❌ 重置操作已取消")
            return 1
            
        print("🗑️ 開始重置資料庫...")
        
        try:
            # 降級到初始狀態
            subprocess.run(
                self.alembic_cmd + ["downgrade", "base"],
                check=True,
                cwd=self.working_dir
            )
            
            # 重新執行所有 migration
            subprocess.run(
                self.alembic_cmd + ["upgrade", "head"],
                check=True,
                cwd=self.working_dir
            )
            
            print("✅ 資料庫重置完成!")
            
        except subprocess.CalledProcessError as e:
            print(f"❌ 重置失敗: {e}")
            return 1
            
        return 0
    
    def seed(self):
        """填充測試資料 (類似 prisma db seed)"""
        print("🌱 填充測試資料")
        print("=" * 50)
        
        try:
            # 這裡可以添加測試資料填充邏輯
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from app.models import User
            
            engine = create_engine(settings.DATABASE_URL)
            Session = sessionmaker(bind=engine)
            session = Session()
            
            # 檢查是否已有測試資料
            existing_users = session.query(User).count()
            if existing_users > 0:
                print(f"ℹ️ 已有 {existing_users} 筆使用者資料")
                if input("是否要跳過填充? (Y/n): ").lower() != 'n':
                    session.close()
                    return 0
            
            # 創建測試用戶
            test_user = User(
                username="test_user",
                email="test@example.com",
                password="hashed_password_here",
                email_verified=True
            )
            
            session.add(test_user)
            session.commit()
            session.close()
            
            print("✅ 測試資料填充完成!")
            
        except Exception as e:
            print(f"❌ 填充測試資料失敗: {e}")
            return 1
            
        return 0
    
    def schema(self):
        """生成資料庫架構報告 (類似 prisma db pull)"""
        print("📋 生成資料庫架構報告")
        print("=" * 50)
        
        try:
            from scripts.db_schema_generator import get_database_schema, format_schema_report
            
            schema_info = get_database_schema()
            report = format_schema_report(schema_info)
            
            # 儲存報告
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_file = f"schema_report_{timestamp}.md"
            
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            print(f"✅ 架構報告已儲存至: {report_file}")
            
        except Exception as e:
            print(f"❌ 生成架構報告失敗: {e}")
            return 1
            
        return 0
    
    def history(self):
        """顯示 migration 歷史"""
        print("📚 Migration 歷史")
        print("=" * 50)
        
        try:
            result = subprocess.run(
                self.alembic_cmd + ["history", "--verbose"],
                check=True,
                cwd=self.working_dir
            )
            
        except subprocess.CalledProcessError as e:
            print(f"❌ 獲取歷史失敗: {e}")
            return 1
            
        return 0
    
    def clean_schemas(self):
        """清理未使用的 schemas"""
        print("🧹 清理未使用的 Schemas")
        print("=" * 50)
        
        try:
            from app.db.database import clean_unused_schemas, check_database_connection
            
            # 檢查資料庫連接
            check_database_connection()
            print("✅ 資料庫連接成功")
            
            # 執行清理
            clean_unused_schemas()
            print("✅ Schema 清理完成!")
            
        except Exception as e:
            print(f"❌ Schema 清理失敗: {e}")
            return 1
            
        return 0

def main():
    """主函數"""
    parser = argparse.ArgumentParser(
        description="資料庫管理工具 (類似 Prisma CLI)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用範例:
  python manage_db.py status                    # 檢查資料庫狀態
  python manage_db.py migrate                   # 應用 migration
  python manage_db.py generate "Add user table" # 生成新 migration
  python manage_db.py reset                     # 重置資料庫
  python manage_db.py seed                      # 填充測試資料
  python manage_db.py schema                    # 生成架構報告
  python manage_db.py history                   # 顯示 migration 歷史
  python manage_db.py clean-schemas             # 清理未使用的 schemas
        """
    )
    
    parser.add_argument(
        'command',
        choices=['status', 'migrate', 'generate', 'reset', 'seed', 'schema', 'history', 'clean-schemas'],
        help='要執行的命令'
    )
    
    parser.add_argument(
        '-m', '--message',
        help='Migration 訊息 (用於 generate 命令)'
    )
    
    args = parser.parse_args()
    
    db_manager = DatabaseManager()
    
    if args.command == 'status':
        return db_manager.status()
    elif args.command == 'migrate':
        return db_manager.migrate()
    elif args.command == 'generate':
        if not args.message:
            print("❌ generate 命令需要提供 -m 參數指定 migration 訊息")
            return 1
        return db_manager.generate(args.message)
    elif args.command == 'reset':
        return db_manager.reset()
    elif args.command == 'seed':
        return db_manager.seed()
    elif args.command == 'schema':
        return db_manager.schema()
    elif args.command == 'history':
        return db_manager.history()
    elif args.command == 'clean-schemas':
        return db_manager.clean_schemas()

if __name__ == "__main__":
    exit(main())