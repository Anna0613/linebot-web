#!/usr/bin/env python3
"""
LineBot-Web Backend 快速啟動腳本
簡化的啟動器，用於開發和生產環境
"""
import os
import subprocess
import sys

def main():
    """主啟動函數"""
    print("🚀 啟動 LineBot-Web Backend...")
    
    # 檢查環境文件
    if not os.path.exists('.env'):
        print("⚠️ 警告: 未找到 .env 檔案")
        print("📋 建議: 複製 env.example 為 .env 並設定相關配置")
        
        response = input("是否繼續啟動？ (y/N): ")
        if response.lower() != 'y':
            print("❌ 啟動已取消")
            return 1
    
    # 使用 scripts/start.py 啟動
    script_path = os.path.join("scripts", "start.py")
    if os.path.exists(script_path):
        try:
            return subprocess.call([sys.executable, script_path])
        except KeyboardInterrupt:
            print("\n🛑 服務已停止")
            return 0
        except Exception as e:
            print(f"❌ 啟動失敗: {e}")
            return 1
    else:
        print(f"❌ 找不到啟動腳本: {script_path}")
        return 1

if __name__ == "__main__":
    exit(main())