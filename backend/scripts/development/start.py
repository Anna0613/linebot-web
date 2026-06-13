#!/usr/bin/env python3
"""
BotCraft Backend v1 啟動腳本
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

DEFAULT_UVICORN_LOG_LEVEL = os.getenv("DEV_LOG_LEVEL", "INFO").upper()
DEFAULT_SQLALCHEMY_LOG_LEVEL = os.getenv("DEV_SQLALCHEMY_LOG_LEVEL", "WARNING").upper()

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
        "uvicorn": {"handlers": ["console"], "level": DEFAULT_UVICORN_LOG_LEVEL, "propagate": False},
        "uvicorn.error": {"handlers": ["console"], "level": DEFAULT_UVICORN_LOG_LEVEL, "propagate": False},
        "uvicorn.access": {"handlers": ["console"], "level": DEFAULT_UVICORN_LOG_LEVEL, "propagate": False},
        # SQLAlchemy（保留）
        "sqlalchemy.engine": {"handlers": ["console"], "level": DEFAULT_SQLALCHEMY_LOG_LEVEL, "propagate": False},
    },
    # 設置 root logger 為 INFO 級別，但不添加 handlers，讓應用程式自己管理
    "root": {
        "level": "INFO"
    }
}

def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        print(f"警告: {name}={value!r} 不是有效整數，使用預設值 {default}")
        return default


if __name__ == "__main__":
    # 檢查環境變數
    env_file = os.path.join(backend_dir, '.env')
    if not os.path.exists(env_file):
        print("警告: 未找到 .env 文件，請複製 env.example 為 .env 並設定相關配置")

    host = os.getenv("DEV_SERVER_HOST", "0.0.0.0")
    port = _env_int("DEV_SERVER_PORT", 8000)
    reload_enabled = _env_bool("DEV_RELOAD", True)
    log_level = os.getenv("DEV_LOG_LEVEL", "info").lower()
    workers = _env_int("DEV_WORKERS", 1)

    if reload_enabled and workers > 1:
        print("警告: Uvicorn reload 模式不支援多 worker，已將 DEV_WORKERS 調整為 1")
        workers = 1

    print(
        "啟動 BotCraft Backend: "
        f"host={host}, port={port}, reload={reload_enabled}, workers={workers}, log_level={log_level}"
    )

    # 預設保留開發 reload；效能檢查時可用 DEV_RELOAD=false DEV_WORKERS=2。
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload_enabled,
        workers=workers,
        log_level=log_level,
        log_config=LOGGING_CONFIG,
    )
