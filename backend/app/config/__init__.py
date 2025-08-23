"""
配置模組
包含 Redis、資料庫和其他服務的配置
"""

# 重新導出 config.py 中的 settings
import importlib.util
import os

# 導入父模組中的 config.py
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.py')
spec = importlib.util.spec_from_file_location("config", config_path)
config_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config_module)

# 重新導出 settings
settings = config_module.settings

__all__ = ['settings']