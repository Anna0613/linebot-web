"""
日誌配置
包含 PDF 處理警告過濾和其他日誌優化
統一專案日誌輸出格式與等級控制
"""
import logging
import logging.config
import warnings
import os
from typing import Dict, Any


class PDFWarningFilter(logging.Filter):
    """過濾 PDF 處理相關的警告"""
    
    def filter(self, record):
        # 過濾 pdfminer 的常見警告
        if record.name.startswith('pdfminer'):
            message = record.getMessage().lower()
            # 過濾顏色設置相關的警告
            if any(keyword in message for keyword in [
                'cannot set', 'color', 'invalid float value', 
                'pattern', 'stroke', 'non-stroke'
            ]):
                return False
        
        # 過濾其他 PDF 相關警告
        if 'pdf' in record.getMessage().lower():
            message = record.getMessage().lower()
            if any(keyword in message for keyword in [
                'invalid float', 'pattern', 'color space'
            ]):
                return False
        
        return True


def setup_logging_config() -> Dict[str, Any]:
    """設置日誌配置"""
    # 讀取環境變數以便調整日誌行為
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    # 允許自訂輸出格式（預設: 時間-記錄器-等級-訊息，採 key=value 風格訊息建議）
    console_format = os.getenv(
        'LOG_FORMAT', '%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    )
    file_format = os.getenv(
        'LOG_FILE_FORMAT', '%(asctime)s | %(levelname)s | %(name)s | %(filename)s:%(lineno)d | %(message)s'
    )

    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'standard': {
                'format': console_format,
            },
            'detailed': {
                'format': file_format,
            },
            'simple': {
                'format': '%(levelname)s - %(message)s'
            }
        },
        'filters': {
            'pdf_warning_filter': {
                '()': PDFWarningFilter,
            }
        },
        'handlers': {
            'console': {
                'level': log_level,
                'class': 'logging.StreamHandler',
                'formatter': 'standard',
                'filters': ['pdf_warning_filter']
            },
            'file': {
                'level': 'DEBUG',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': 'logs/app.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
                'formatter': 'detailed',
                'filters': ['pdf_warning_filter']
            },
            'error_file': {
                'level': 'ERROR',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': 'logs/error.log',
                'maxBytes': 10485760,  # 10MB
                'backupCount': 3,
                'formatter': 'detailed'
            }
        },
        'loggers': {
            # 應用程式日誌
            'app': {
                'handlers': ['console', 'file'],
                # 內部 application logger 設為 DEBUG（輸出位置由 handler 控制）
                'level': 'DEBUG',
                'propagate': False
            },
            # SQLAlchemy 日誌（預設抑制到 WARNING，避免大量 SQL 輸出）
            'sqlalchemy': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            'sqlalchemy.engine': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            'sqlalchemy.pool': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            # PDF 處理相關日誌
            'pdfminer': {
                'handlers': ['file'],
                'level': 'ERROR',  # 只記錄錯誤
                'propagate': False
            },
            'pdfminer.pdfinterp': {
                'handlers': ['file'],
                'level': 'ERROR',
                'propagate': False
            },
            'pdfplumber': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            # 其他第三方庫
            'urllib3': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            'requests': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            }
        },
        'root': {
            # root 以 LOG_LEVEL 控制，確保第三方與 __name__ logger 一致格式
            'level': log_level,
            'handlers': ['console', 'file', 'error_file']
        }
    }
    
    return config


def configure_pdf_logging():
    """配置 PDF 處理相關的日誌和警告"""
    
    # 抑制 PDF 相關的 Python 警告
    warnings.filterwarnings("ignore", category=UserWarning, module="pdfminer")
    warnings.filterwarnings("ignore", message=".*Cannot set.*color.*")
    warnings.filterwarnings("ignore", message=".*invalid float value.*")
    warnings.filterwarnings("ignore", message=".*Pattern.*")
    
    # 設置 PDF 相關日誌等級
    pdf_loggers = [
        'pdfminer',
        'pdfminer.pdfinterp',
        'pdfminer.pdfpage',
        'pdfminer.converter',
        'pdfminer.cmapdb',
        'pdfplumber'
    ]
    
    for logger_name in pdf_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.ERROR)
        
        # 添加自定義過濾器
        pdf_filter = PDFWarningFilter()
        logger.addFilter(pdf_filter)


def setup_application_logging():
    """設置應用程式日誌"""
    import os
    
    # 確保日誌目錄存在
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # 應用日誌配置
    config = setup_logging_config()
    logging.config.dictConfig(config)
    
    # 配置 PDF 日誌
    configure_pdf_logging()
    
    # 獲取應用程式日誌器
    app_logger = logging.getLogger('app')
    app_logger.info("日誌系統初始化完成")
    
    return app_logger


def get_logger(name: str = None) -> logging.Logger:
    """
    獲取日誌器
    
    Args:
        name: 日誌器名稱，預設為 'app'
        
    Returns:
        logging.Logger: 日誌器實例
    """
    if name is None:
        name = 'app'
    
    return logging.getLogger(name)


# 便利函數
def log_pdf_processing_start(filename: str, size_mb: float):
    """記錄 PDF 處理開始"""
    logger = get_logger('app.pdf')
    logger.info(f"開始處理 PDF: {filename} ({size_mb:.2f}MB)")


def log_pdf_processing_success(filename: str, text_length: int, processing_time: float):
    """記錄 PDF 處理成功"""
    logger = get_logger('app.pdf')
    logger.info(
        f"PDF 處理成功: {filename} - "
        f"{text_length} 字元, {processing_time:.3f}s"
    )


def log_pdf_processing_error(filename: str, error: str):
    """記錄 PDF 處理錯誤"""
    logger = get_logger('app.pdf')
    logger.error(f"PDF 處理失敗: {filename} - {error}")


def log_pdf_warning(filename: str, warning: str):
    """記錄 PDF 處理警告"""
    logger = get_logger('app.pdf')
    logger.warning(f"PDF 處理警告: {filename} - {warning}")


# 上下文管理器
class SuppressPDFWarnings:
    """暫時抑制 PDF 警告的上下文管理器"""
    
    def __init__(self):
        self.original_levels = {}
        self.original_filters = {}
    
    def __enter__(self):
        # 保存原始設置
        pdf_loggers = [
            'pdfminer',
            'pdfminer.pdfinterp',
            'pdfminer.pdfpage',
            'pdfplumber'
        ]
        
        for logger_name in pdf_loggers:
            logger = logging.getLogger(logger_name)
            self.original_levels[logger_name] = logger.level
            logger.setLevel(logging.ERROR)
        
        # 抑制警告
        warnings.filterwarnings("ignore", category=UserWarning, module="pdfminer")
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # 恢復原始設置
        for logger_name, level in self.original_levels.items():
            logging.getLogger(logger_name).setLevel(level)
        
        # 恢復警告
        warnings.resetwarnings()


# 初始化函數
def init_logging():
    """初始化日誌系統"""
    return setup_application_logging()


if __name__ == "__main__":
    # 測試日誌配置
    logger = init_logging()
    
    logger.info("測試應用程式日誌")
    logger.warning("測試警告日誌")
    logger.error("測試錯誤日誌")
    
    # 測試 PDF 警告抑制
    with SuppressPDFWarnings():
        pdf_logger = logging.getLogger('pdfminer.pdfinterp')
        pdf_logger.warning("這個 PDF 警告應該被抑制")
    
    print("日誌配置測試完成")
