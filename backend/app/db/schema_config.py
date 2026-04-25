"""
Schema 管理配置
定義需要保留和清理的 schemas
"""
import os
from typing import Set, List

class SchemaConfig:
    """Schema 配置管理"""
    
    # 系統必要的 schemas（永遠不會被刪除）
    SYSTEM_SCHEMAS: Set[str] = {
        'information_schema',
        'pg_catalog', 
        'pg_toast',
        'pg_temp_1',
        'pg_toast_temp_1'
    }
    
    # 應用程式必要的 schemas
    REQUIRED_SCHEMAS: Set[str] = {
        'public',  # 主要的應用程式 schema
        # 如果您有其他必要的 schemas，請在這裡添加
    }
    
    @classmethod
    def get_protected_schemas(cls) -> Set[str]:
        """取得所有受保護的 schemas（不會被刪除）"""
        protected = cls.SYSTEM_SCHEMAS.copy()
        protected.update(cls.REQUIRED_SCHEMAS)
        
        # 從環境變數添加額外的保護 schemas
        extra_schemas = os.getenv('PROTECTED_SCHEMAS', '')
        if extra_schemas:
            extra_set = {s.strip() for s in extra_schemas.split(',') if s.strip()}
            protected.update(extra_set)
        
        return protected
    
    @classmethod
    def should_drop_schema(cls, schema_name: str) -> bool:
        """判斷是否應該刪除指定的 schema"""
        if not schema_name:
            return False
            
        # 不刪除受保護的 schemas
        if schema_name in cls.get_protected_schemas():
            return False
            
        # 不刪除以 pg_ 開頭的 PostgreSQL 系統 schemas
        if schema_name.startswith('pg_'):
            return False
            
        return True
    
    @classmethod
    def get_cleanup_patterns(cls) -> List[str]:
        """取得需要清理的 schema 名稱模式"""
        return [
            'test_%',      # 測試相關的 schemas
            'temp_%',      # 臨時 schemas
            'backup_%',    # 備份相關的 schemas
            'old_%',       # 舊版本的 schemas
            'migration_%', # 遷移過程中的臨時 schemas
        ]