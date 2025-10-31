#!/usr/bin/env python3
"""
LineBot-Web Backend v1 啟動腳本
"""
import uvicorn
import os
import sys

# 添加專案根目錄到 Python 路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
scripts_dir = os.path.dirname(current_dir)
backend_dir = os.path.dirname(scripts_dir)
sys.path.insert(0, backend_dir)

# 簡化的 Uvicorn 日誌設定，讓應用程式自己管理日誌配置
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        }
    },
    "loggers": {
        # 只配置 Uvicorn 相關的 logger，讓應用程式自己管理其他 logger
        "uvicorn": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["console"], "level": "INFO", "propagate": False},
        # SQLAlchemy（保留）
        "sqlalchemy.engine": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
    # 設置 root logger 為 INFO 級別，但不添加 handlers，讓應用程式自己管理
    "root": {
        "level": "INFO"
    }
}

if __name__ == "__main__":
    # 先設定環境變數，避免 transformers 在匯入時嘗試載入 TensorFlow/Flax
    os.environ.setdefault("USE_TF", "0")
    os.environ.setdefault("USE_FLAX", "0")
    os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
    os.environ.setdefault("TRANSFORMERS_NO_FLAX", "1")
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    # 檢查環境變數
    env_file = os.path.join(backend_dir, '.env')
    if not os.path.exists(env_file):
        print("警告: 未找到 .env 文件，請複製 env.example 為 .env 並設定相關配置")

    # 啟動服務（啟用 reload 以便開發時自動重載）
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        log_config=LOGGING_CONFIG,
    )
