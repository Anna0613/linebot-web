#!/usr/bin/env python3
"""
清理 PostgreSQL 中的舊對話資料表腳本

使用方法:
python scripts/cleanup_postgresql_tables.py [選項]

選項:
--dry-run: 乾跑模式，不實際執行 DROP 操作
--backup: 建立備份後再刪除
--force: 強制刪除，不詢問確認
"""

import sys
import os
import argparse
import logging
from datetime import datetime
from typing import List

# 添加專案根目錄到 Python 路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
scripts_dir = os.path.dirname(current_dir)
backend_dir = os.path.dirname(scripts_dir)
sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'cleanup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class PostgreSQLCleaner:
    """PostgreSQL 清理器"""
    
    # 要清理的表格列表（對話相關）
    TABLES_TO_CLEANUP = [
        "line_bot_user_interactions",  # 對話互動記錄表
    ]
    
    # 要清理的索引列表
    INDEXES_TO_CLEANUP = [
        "idx_interaction_user_timestamp",
        "idx_interaction_event_type", 
        "idx_interaction_timestamp",
        "idx_interaction_timestamp_event",
        "idx_interaction_time_extract",
        "idx_interaction_sender_type",
        "idx_interaction_admin_user",
        "idx_interaction_user_sender",
    ]
    
    def __init__(self, dry_run: bool = False, backup: bool = False, force: bool = False):
        self.dry_run = dry_run
        self.backup = backup
        self.force = force
        self.engine = engine
    
    def check_table_exists(self, table_name: str) -> bool:
        """檢查表格是否存在"""
        try:
            with Session(self.engine) as db:
                result = db.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = :table_name
                    );
                """), {"table_name": table_name})
                return result.scalar()
        except Exception as e:
            logger.error(f"檢查表格 {table_name} 是否存在時發生錯誤: {e}")
            return False
    
    def check_index_exists(self, index_name: str) -> bool:
        """檢查索引是否存在"""
        try:
            with Session(self.engine) as db:
                result = db.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relkind = 'i' 
                        AND n.nspname = 'public'
                        AND c.relname = :index_name
                    );
                """), {"index_name": index_name})
                return result.scalar()
        except Exception as e:
            logger.error(f"檢查索引 {index_name} 是否存在時發生錯誤: {e}")
            return False
    
    def get_table_row_count(self, table_name: str) -> int:
        """獲取表格行數"""
        try:
            with Session(self.engine) as db:
                result = db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
                return result.scalar()
        except Exception as e:
            logger.error(f"獲取表格 {table_name} 行數時發生錯誤: {e}")
            return 0
    
    def backup_table(self, table_name: str) -> bool:
        """備份表格"""
        try:
            backup_name = f"{table_name}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            logger.info(f"建立表格備份: {table_name} -> {backup_name}")
            
            with Session(self.engine) as db:
                # 創建備份表
                db.execute(text(f'CREATE TABLE "{backup_name}" AS SELECT * FROM "{table_name}"'))
                db.commit()
            
            logger.info(f"備份表格創建成功: {backup_name}")
            return True
            
        except Exception as e:
            logger.error(f"備份表格 {table_name} 失敗: {e}")
            return False
    
    def drop_table(self, table_name: str) -> bool:
        """刪除表格"""
        try:
            logger.info(f"刪除表格: {table_name}")
            
            if self.dry_run:
                logger.info(f"[乾跑] 將執行: DROP TABLE IF EXISTS \"{table_name}\" CASCADE")
                return True
            
            with Session(self.engine) as db:
                db.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
                db.commit()
            
            logger.info(f"表格刪除成功: {table_name}")
            return True
            
        except Exception as e:
            logger.error(f"刪除表格 {table_name} 失敗: {e}")
            return False
    
    def drop_index(self, index_name: str) -> bool:
        """刪除索引"""
        try:
            logger.info(f"刪除索引: {index_name}")
            
            if self.dry_run:
                logger.info(f"[乾跑] 將執行: DROP INDEX IF EXISTS \"{index_name}\"")
                return True
            
            with Session(self.engine) as db:
                db.execute(text(f'DROP INDEX IF EXISTS "{index_name}"'))
                db.commit()
            
            logger.info(f"索引刪除成功: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"刪除索引 {index_name} 失敗: {e}")
            return False
    
    def get_cleanup_summary(self) -> dict:
        """獲取清理摘要"""
        summary = {
            "tables_to_drop": [],
            "indexes_to_drop": [],
            "total_rows": 0
        }
        
        # 檢查表格
        for table_name in self.TABLES_TO_CLEANUP:
            if self.check_table_exists(table_name):
                row_count = self.get_table_row_count(table_name)
                summary["tables_to_drop"].append({
                    "name": table_name,
                    "rows": row_count
                })
                summary["total_rows"] += row_count
        
        # 檢查索引
        for index_name in self.INDEXES_TO_CLEANUP:
            if self.check_index_exists(index_name):
                summary["indexes_to_drop"].append(index_name)
        
        return summary
    
    def confirm_cleanup(self, summary: dict) -> bool:
        """確認清理操作"""
        if self.force:
            return True
        
        print("\n" + "="*60)
        print("PostgreSQL 清理摘要")
        print("="*60)
        
        print("\n要刪除的表格:")
        for table_info in summary["tables_to_drop"]:
            print(f"  - {table_info['name']} ({table_info['rows']:,} 行)")
        
        print(f"\n要刪除的索引:")
        for index_name in summary["indexes_to_drop"]:
            print(f"  - {index_name}")
        
        print(f"\n總行數: {summary['total_rows']:,}")
        
        if self.dry_run:
            print("\n[乾跑模式] 不會實際刪除資料")
        elif self.backup:
            print("\n[備份模式] 將先建立備份再刪除")
        
        print("\n警告: 此操作將永久刪除上述資料！")
        
        while True:
            confirm = input("\n確定要繼續嗎? (yes/no): ").lower().strip()
            if confirm in ['yes', 'y']:
                return True
            elif confirm in ['no', 'n']:
                return False
            else:
                print("請輸入 'yes' 或 'no'")
    
    def run_cleanup(self):
        """執行清理"""
        try:
            logger.info("開始 PostgreSQL 清理作業")
            
            # 獲取清理摘要
            summary = self.get_cleanup_summary()
            
            if not summary["tables_to_drop"] and not summary["indexes_to_drop"]:
                logger.info("沒有需要清理的對象")
                return
            
            # 確認清理
            if not self.confirm_cleanup(summary):
                logger.info("清理作業已取消")
                return
            
            success_count = 0
            total_count = len(summary["tables_to_drop"]) + len(summary["indexes_to_drop"])
            
            # 處理表格
            for table_info in summary["tables_to_drop"]:
                table_name = table_info["name"]
                
                # 建立備份
                if self.backup and not self.dry_run:
                    if not self.backup_table(table_name):
                        logger.warning(f"表格 {table_name} 備份失敗，跳過刪除")
                        continue
                
                # 刪除表格
                if self.drop_table(table_name):
                    success_count += 1
            
            # 處理索引
            for index_name in summary["indexes_to_drop"]:
                if self.drop_index(index_name):
                    success_count += 1
            
            # 最終報告
            logger.info(f"清理完成: {success_count}/{total_count} 項目成功")
            
            if success_count < total_count:
                logger.warning(f"有 {total_count - success_count} 項目清理失敗，請檢查日誌")
            else:
                logger.info("所有項目清理成功！")
            
        except Exception as e:
            logger.error(f"清理作業失敗: {e}")
            raise


def main():
    """主函數"""
    parser = argparse.ArgumentParser(description='清理 PostgreSQL 中的舊對話資料表')
    parser.add_argument('--dry-run', action='store_true', help='乾跑模式，不實際執行 DROP 操作')
    parser.add_argument('--backup', action='store_true', help='建立備份後再刪除')
    parser.add_argument('--force', action='store_true', help='強制刪除，不詢問確認')
    
    args = parser.parse_args()
    
    try:
        # 創建清理器
        cleaner = PostgreSQLCleaner(
            dry_run=args.dry_run,
            backup=args.backup,
            force=args.force
        )
        
        # 執行清理
        cleaner.run_cleanup()
        
        logger.info("清理腳本執行完成")
        
    except KeyboardInterrupt:
        logger.info("清理被用戶中斷")
    except Exception as e:
        logger.error(f"清理腳本執行失敗: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()