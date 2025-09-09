#!/usr/bin/env python3
"""
資料庫管理快捷腳本
提供簡化的資料庫操作接口
"""
import os
import subprocess
import sys

def main():
    """主函數 - 轉發到 manage_db.py"""
    script_path = os.path.join(os.path.dirname(__file__), "manage_db.py")
    
    if not os.path.exists(script_path):
        print(f"❌ 找不到資料庫管理腳本: {script_path}")
        return 1
    
    # 轉發所有參數到 manage_db.py
    cmd = [sys.executable, script_path] + sys.argv[1:]
    
    try:
        return subprocess.call(cmd)
    except KeyboardInterrupt:
        print("\n🛑 操作已取消")
        return 0
    except Exception as e:
        print(f"❌ 執行失敗: {e}")
        return 1

if __name__ == "__main__":
    exit(main())