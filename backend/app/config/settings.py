"""
應用程式配置模組
包含所有環境變數和設定值的統一管理
"""
import os
import re
from pathlib import Path
from typing import List, Optional
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from dotenv import load_dotenv

# 載入環境變數。後端設定優先；frontend/.env 只作為本機開發的公開 URL fallback。
BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(REPO_ROOT / "frontend" / ".env")
load_dotenv()

def first_env_value(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value and value.strip():
            return value.strip()
    return default

class Settings(BaseSettings):
    """應用程式設定類別"""

    # 基本設定
    PROJECT_NAME: str = "BotCraft Unified API"
    VERSION: str = "2.0.0"
    DESCRIPTION: str = "統一的 LINE Bot 管理 API"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SHOW_DOCS: bool = os.getenv("SHOW_DOCS", "False").lower() == "true"
    # SQL 日誌輸出（預設關閉）
    SQL_ECHO: bool = os.getenv("SQL_ECHO", "False").lower() == "true"

    # 日誌/請求細節控制
    LOG_REQUEST_HEADERS: bool = os.getenv("LOG_REQUEST_HEADERS", "False").lower() == "true"
    LOG_WEBHOOK_VERBOSE: bool = os.getenv("LOG_WEBHOOK_VERBOSE", "False").lower() == "true"

    # 安全限制：Webhook 請求主體大小上限（避免惡意/異常大 payload）
    MAX_WEBHOOK_BODY_BYTES: int = int(os.getenv("MAX_WEBHOOK_BODY_BYTES", str(256 * 1024)))  # 256KB

    # 連線池設定（可由環境變數覆蓋）
    POOL_SIZE: int = int(os.getenv("POOL_SIZE", "10"))
    POOL_MAX_OVERFLOW: int = int(os.getenv("POOL_MAX_OVERFLOW", "20"))
    POOL_TIMEOUT: int = int(os.getenv("POOL_TIMEOUT", "15"))

    # 資料庫設定 - 主庫（寫入）
    DB_HOST: str = os.getenv("DB_HOST", "sql.jkl921102.org")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "LineBot_01")
    DB_USER: str = os.getenv("DB_USER", "11131230")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "11131230")

    # 資料庫設定 - 從庫（讀取）
    # 如果未設定，則使用主庫的設定
    DB_REPLICA_HOST: Optional[str] = os.getenv("DB_REPLICA_HOST")
    DB_REPLICA_PORT: Optional[int] = int(os.getenv("DB_REPLICA_PORT", "5433")) if os.getenv("DB_REPLICA_PORT") else None
    DB_REPLICA_NAME: Optional[str] = os.getenv("DB_REPLICA_NAME")
    DB_REPLICA_USER: Optional[str] = os.getenv("DB_REPLICA_USER")
    DB_REPLICA_PASSWORD: Optional[str] = os.getenv("DB_REPLICA_PASSWORD")

    # 讀寫分離開關（預設關閉，需明確啟用）
    ENABLE_READ_WRITE_SPLITTING: bool = os.getenv("ENABLE_READ_WRITE_SPLITTING", "False").lower() == "true"

    @property
    def DATABASE_URL(self) -> str:
        """資料庫連線 URL（主庫 - 寫入）"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_REPLICA_URL(self) -> Optional[str]:
        """資料庫連線 URL（從庫 - 讀取）"""
        if not self.ENABLE_READ_WRITE_SPLITTING:
            return None

        # 使用從庫設定，若未設定則使用主庫設定
        host = self.DB_REPLICA_HOST or self.DB_HOST
        port = self.DB_REPLICA_PORT or self.DB_PORT
        name = self.DB_REPLICA_NAME or self.DB_NAME
        user = self.DB_REPLICA_USER or self.DB_USER
        password = self.DB_REPLICA_PASSWORD or self.DB_PASSWORD

        return f"postgresql://{user}:{password}@{host}:{port}/{name}"

    # JWT 設定
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-here")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    # 滑動過期時間設定：3 小時閒置後過期
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "180"))  # 3 小時 = 180 分鐘
    # 向後兼容的別名
    JWT_EXPIRE_MINUTES: int = ACCESS_TOKEN_EXPIRE_MINUTES
    # 記住我功能的長期 token 過期時間（7天）
    JWT_REMEMBER_EXPIRE_MINUTES: int = int(os.getenv("JWT_REMEMBER_EXPIRE_MINUTES", "10080"))  # 7 * 24 * 60 = 10080 分鐘
    # Token 自動刷新閾值（當剩餘時間少於此百分比時自動刷新）
    TOKEN_REFRESH_THRESHOLD: float = float(os.getenv("TOKEN_REFRESH_THRESHOLD", "0.5"))  # 50%

    # Cookie 設定
    COOKIE_DOMAIN: Optional[str] = os.getenv("COOKIE_DOMAIN")  # None 表示讓瀏覽器自動處理

    # LINE 登入設定
    LINE_CHANNEL_ID: str = os.getenv("LINE_CHANNEL_ID", "")
    LINE_CHANNEL_SECRET: str = os.getenv("LINE_CHANNEL_SECRET", "")
    LINE_REDIRECT_URI: str = os.getenv("LINE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/line/callback")

    # Flask 密鑰（向後相容）
    FLASK_SECRET_KEY: str = os.getenv("FLASK_SECRET_KEY", "your-flask-secret-key")

    # 前端 URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080")
    # 對外可被 LINE 平台存取的後端網域，用於自動設定 Messaging API Webhook。
    # LINE Webhook endpoint 必須是 HTTPS；本機開發請設定為 ngrok / tunnel URL。
    WEBHOOK_DOMAIN: str = first_env_value(
        "WEBHOOK_DOMAIN",
        "PUBLIC_API_URL",
        "VITE_WEBHOOK_DOMAIN",
        default="http://localhost:8000",
    )
    # 對外可被瀏覽器與 LINE 平台讀取的後端 API base URL。
    # MinIO proxy URL 應該走後端 API 網域，不應從 MINIO_PUBLIC_URL 推導。
    API_PUBLIC_URL: str = first_env_value(
        "API_PUBLIC_URL",
        "PUBLIC_API_URL",
        "BACKEND_PUBLIC_URL",
        "WEBHOOK_DOMAIN",
        "VITE_UNIFIED_API_URL",
        default="http://localhost:8000",
    )

    # 郵件設定
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_USE_TLS: bool = True

    # Redis 設定
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_URL: str = os.getenv("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")

    # MinIO 設定
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "False").lower() == "true"
    MINIO_REGION: str = os.getenv("MINIO_REGION", "us-east-1")
    # HTTPS 憑證檢查（自簽證書測試可設為 False，僅限開發測試）
    MINIO_CERT_CHECK: bool = os.getenv("MINIO_CERT_CHECK", "True").lower() == "true"
    # 自訂 CA 憑證（PEM）路徑，若提供會用來驗證 MinIO 憑證
    MINIO_CA_CERT_FILE: Optional[str] = os.getenv("MINIO_CA_CERT_FILE")
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "message-store")
    MINIO_PUBLIC_URL: str = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000")

    # MongoDB 設定
    MONGODB_HOST: str = os.getenv("MONGODB_HOST", "localhost")
    MONGODB_PORT: int = int(os.getenv("MONGODB_PORT", "27017"))
    MONGODB_USERNAME: Optional[str] = os.getenv("MONGODB_USERNAME")
    MONGODB_PASSWORD: Optional[str] = os.getenv("MONGODB_PASSWORD")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "botcraft_conversations")
    MONGODB_AUTH_DATABASE: str = os.getenv("MONGODB_AUTH_DATABASE", "admin")
    MONGODB_SSL: bool = os.getenv("MONGODB_SSL", "False").lower() == "true"

    @property
    def MONGODB_URL(self) -> str:
        """MongoDB 連線 URL"""
        if self.MONGODB_USERNAME and self.MONGODB_PASSWORD:
            auth_part = f"{self.MONGODB_USERNAME}:{self.MONGODB_PASSWORD}@"
        else:
            auth_part = ""

        ssl_param = "?ssl=true" if self.MONGODB_SSL else ""
        return f"mongodb://{auth_part}{self.MONGODB_HOST}:{self.MONGODB_PORT}/{self.MONGODB_DATABASE}{ssl_param}"

    # AI 設定
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")

    # Groq 設定
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    # 預設對齊內建清單的可用型號，避免未知模型警告
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Gemini 設定（向後相容）
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # OpenAI / Embedding 設定
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "openai")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    EMBEDDING_DIMENSIONS: int = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
    EMBEDDING_TIMEOUT_SECONDS: float = float(os.getenv("EMBEDDING_TIMEOUT_SECONDS", "15"))
    EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "64"))
    EMBEDDING_MAX_RETRIES: int = int(os.getenv("EMBEDDING_MAX_RETRIES", "3"))

    # 通用 AI 設定
    AI_MAX_HISTORY_MESSAGES: int = int(os.getenv("AI_MAX_HISTORY_MESSAGES", "200"))
    AI_DEFAULT_HISTORY_MESSAGES: int = int(os.getenv("AI_DEFAULT_HISTORY_MESSAGES", "12"))
    AI_CONTEXT_TOKEN_BUDGET: int = int(os.getenv("AI_CONTEXT_TOKEN_BUDGET", "6000"))
    AI_SUMMARY_RECENT_MESSAGES: int = int(os.getenv("AI_SUMMARY_RECENT_MESSAGES", "12"))
    AI_SUMMARY_BATCH_MESSAGES: int = int(os.getenv("AI_SUMMARY_BATCH_MESSAGES", "10"))
    AI_MEMORY_RETRIEVAL_TOP_K: int = int(os.getenv("AI_MEMORY_RETRIEVAL_TOP_K", "4"))
    AI_MEMORY_INDEX_RECENT_MESSAGES: int = int(os.getenv("AI_MEMORY_INDEX_RECENT_MESSAGES", "200"))

    # CORS 設定 - 預設允許的來源
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """取得允許的 CORS 來源"""
        default_origins = [
            "http://localhost:8080",
            "http://localhost:3000",
            "http://localhost:5173",
            "https://localhost:5173",
            "http://localhost:8081",
            "https://localhost:8081",
            "http://127.0.0.1:5173",
            "https://127.0.0.1:5173",
            "http://127.0.0.1:8080",
            "https://127.0.0.1:8080",
            "http://127.0.0.1:8081",
            "https://127.0.0.1:8081",
            "http://line-login.jkl921102.org",
            "https://line-login.jkl921102.org",
            "http://login-api.jkl921102.org",
            "https://login-api.jkl921102.org",
            "http://puzzle-api.jkl921102.org",
            "https://puzzle-api.jkl921102.org",
            "http://setting-api.jkl921102.org",
            "https://setting-api.jkl921102.org",
            "http://linebot.jkl921102.org",
            "https://linebot.jkl921102.org",
            "http://api.jkl921102.org",
            "https://api.jkl921102.org",
            "https://jkl921102.org",
            "http://jkl921102.org"
        ]

        # 從環境變數添加額外的來源
        extra_origins_str = os.getenv("EXTRA_ALLOWED_ORIGINS", "")
        if extra_origins_str:
            extra_origins = [origin.strip() for origin in extra_origins_str.split(",") if origin.strip()]
            default_origins.extend(extra_origins)

        return list(set(default_origins))  # 去重

    @property
    def ALLOWED_ORIGIN_REGEX(self) -> Optional[str]:
        """以正則表示式允許的 CORS 來源（用於開發與子網域）"""
        # 可由環境變數覆蓋
        regex = os.getenv("ALLOWED_ORIGIN_REGEX")
        if regex:
            return regex
        # 允許 localhost/127.0.0.1 任意埠，以及 *.jkl921102.org
        return r"^https?://((localhost|127\\.0\\.0\\.1)(:\\d+)?|([A-Za-z0-9-]+\\.)*jkl921102\\.org)$"

    def is_origin_allowed(self, origin: str) -> bool:
        """檢查輸入的 Origin 是否允許（清單或正則其一符合即可）"""
        try:
            if origin in self.ALLOWED_ORIGINS:
                return True
            pattern = self.ALLOWED_ORIGIN_REGEX
            return bool(re.match(pattern, origin)) if pattern else False
        except Exception:
            return origin in self.ALLOWED_ORIGINS

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
