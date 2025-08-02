"""
應用程式配置模組
包含所有環境變數和設定值的統一管理
"""
import os
from typing import List, Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

class Settings(BaseSettings):
    """應用程式設定類別"""
    
    # 基本設定
    PROJECT_NAME: str = "LineBot-Web Unified API"
    VERSION: str = "2.0.0"
    DESCRIPTION: str = "統一的 LINE Bot 管理 API"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # 資料庫設定
    DB_HOST: str = os.getenv("DB_HOST", "sql.jkl921102.org")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "LineBot_01")
    DB_USER: str = os.getenv("DB_USER", "11131230")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "11131230")
    
    @property
    def DATABASE_URL(self) -> str:
        """資料庫連線 URL"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # JWT 設定
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-here")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
    # 記住我功能的長期 token 過期時間（7天）
    JWT_REMEMBER_EXPIRE_MINUTES: int = int(os.getenv("JWT_REMEMBER_EXPIRE_MINUTES", "10080"))  # 7 * 24 * 60 = 10080 分鐘
    
    # LINE 登入設定
    LINE_CHANNEL_ID: str = os.getenv("LINE_CHANNEL_ID", "")
    LINE_CHANNEL_SECRET: str = os.getenv("LINE_CHANNEL_SECRET", "")
    LINE_REDIRECT_URI: str = os.getenv("LINE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/line/callback")
    
    # Flask 密鑰（向後相容）
    FLASK_SECRET_KEY: str = os.getenv("FLASK_SECRET_KEY", "your-flask-secret-key")
    
    # 前端 URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080")
    
    # 郵件設定
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_USE_TLS: bool = True
    
    # CORS 設定 - 預設允許的來源
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """取得允許的 CORS 來源"""
        default_origins = [
            "http://localhost:8080",
            "http://localhost:3000", 
            "http://localhost:5173",
            "https://localhost:5173",
            "http://127.0.0.1:5173",
            "https://127.0.0.1:5173",
            "http://127.0.0.1:8080",
            "https://127.0.0.1:8080",
            "http://line-login.jkl921102.org",
            "https://line-login.jkl921102.org",
            "http://login-api.jkl921102.org",
            "https://login-api.jkl921102.org",
            "http://puzzle-api.jkl921102.org",
            "https://puzzle-api.jkl921102.org",
            "http://setting-api.jkl921102.org",
            "https://setting-api.jkl921102.org",
            "https://jkl921102.org",
            "http://jkl921102.org"
        ]
        
        # 從環境變數添加額外的來源
        extra_origins_str = os.getenv("EXTRA_ALLOWED_ORIGINS", "")
        if extra_origins_str:
            extra_origins = [origin.strip() for origin in extra_origins_str.split(",") if origin.strip()]
            default_origins.extend(extra_origins)
        
        return list(set(default_origins))  # 去重
    
    ALLOWED_HOSTS: List[str] = ["*"]  # 在生產環境中應該更嚴格
    
    # API 設定
    API_V1_PREFIX: str = "/api/v1"
    
    # 安全設定
    SECRET_KEY: str = os.getenv("SECRET_KEY", FLASK_SECRET_KEY)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"  # 忽略額外的環境變數

# 創建設定實例
settings = Settings() 