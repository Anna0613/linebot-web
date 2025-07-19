#!/usr/bin/env python3
"""
LineBot-Web Backend v1 啟動腳本
"""
import uvicorn
import os
import sys

# 添加父目錄到 Python 路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

if __name__ == "__main__":
    # 檢查環境變數
    env_file = os.path.join(parent_dir, '.env')
    if not os.path.exists(env_file):
        print("警告: 未找到 .env 文件，請複製 env.example 為 .env 並設定相關配置")
    
    # 啟動服務
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 