"""
增強的 PDF 處理器
處理各種 PDF 格式問題，包括 pdfminer 警告和錯誤
"""
from __future__ import annotations

import io
import logging
import warnings
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PDFExtractionResult:
    """PDF 提取結果"""
    text: str
    page_count: int
    extraction_method: str
    warnings: List[str]
    metadata: Dict[str, Any]


class EnhancedPDFProcessor:
    """
    增強的 PDF 處理器
    
    特點：
    - 多種提取方法備援
    - 警告和錯誤處理
    - 詳細的提取統計
    - 支援問題 PDF 檔案
    """
    
    def __init__(self):
        self.extraction_stats = {
            'total_processed': 0,
            'pdfplumber_success': 0,
            'pypdf2_success': 0,
            'pdfminer_success': 0,
            'failed_extractions': 0
        }
    
    def _suppress_pdf_warnings(self):
        """抑制 PDF 處理相關的警告"""
        # 抑制 pdfminer 相關警告
        warnings.filterwarnings("ignore", category=UserWarning, module="pdfminer")
        warnings.filterwarnings("ignore", message=".*Cannot set.*color.*")
        warnings.filterwarnings("ignore", message=".*invalid float value.*")
        
        # 設置相關日誌等級
        loggers_to_quiet = [
            'pdfminer.pdfinterp',
            'pdfminer.pdfpage',
            'pdfminer.converter',
            'pdfminer.cmapdb',
            'pdfplumber'
        ]
        
        original_levels = {}
        for logger_name in loggers_to_quiet:
            pdf_logger = logging.getLogger(logger_name)
            original_levels[logger_name] = pdf_logger.level
            pdf_logger.setLevel(logging.ERROR)
        
        return original_levels
    
    def _restore_logging_levels(self, original_levels: Dict[str, int]):
        """恢復原始日誌等級"""
        for logger_name, level in original_levels.items():
            logging.getLogger(logger_name).setLevel(level)
    
    def _extract_with_pdfplumber(self, data: bytes) -> Optional[PDFExtractionResult]:
        """使用 pdfplumber 提取文字"""
        try:
            import pdfplumber
            
            texts = []
            warnings_list = []
            metadata = {}
            
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                metadata['page_count'] = len(pdf.pages)
                metadata['metadata'] = pdf.metadata or {}
                
                for page_num, page in enumerate(pdf.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            texts.append(page_text)
                        else:
                            warnings_list.append(f"第 {page_num + 1} 頁無文字內容")
                            texts.append("")
                    except Exception as e:
                        warning_msg = f"第 {page_num + 1} 頁提取失敗: {str(e)}"
                        warnings_list.append(warning_msg)
                        texts.append("")
            
            extracted_text = "\n".join(texts).strip()
            
            if extracted_text:
                self.extraction_stats['pdfplumber_success'] += 1
                return PDFExtractionResult(
                    text=extracted_text,
                    page_count=metadata.get('page_count', 0),
                    extraction_method='pdfplumber',
                    warnings=warnings_list,
                    metadata=metadata
                )
            
        except ImportError:
            logger.warning("pdfplumber 未安裝，跳過此方法")
        except Exception as e:
            logger.debug(f"pdfplumber 提取失敗: {e}")
        
        return None
    
    def _extract_with_pypdf2(self, data: bytes) -> Optional[PDFExtractionResult]:
        """使用 PyPDF2 提取文字"""
        try:
            from PyPDF2 import PdfReader
            
            reader = PdfReader(io.BytesIO(data))
            texts = []
            warnings_list = []
            
            metadata = {
                'page_count': len(reader.pages),
                'metadata': reader.metadata or {}
            }
            
            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        texts.append(page_text)
                    else:
                        warnings_list.append(f"第 {page_num + 1} 頁無文字內容")
                        texts.append("")
                except Exception as e:
                    warning_msg = f"第 {page_num + 1} 頁提取失敗: {str(e)}"
                    warnings_list.append(warning_msg)
                    texts.append("")
            
            extracted_text = "\n".join(texts).strip()
            
            if extracted_text:
                self.extraction_stats['pypdf2_success'] += 1
                return PDFExtractionResult(
                    text=extracted_text,
                    page_count=metadata.get('page_count', 0),
                    extraction_method='PyPDF2',
                    warnings=warnings_list,
                    metadata=metadata
                )
            
        except ImportError:
            logger.warning("PyPDF2 未安裝，跳過此方法")
        except Exception as e:
            logger.debug(f"PyPDF2 提取失敗: {e}")
        
        return None
    
    def _extract_with_pdfminer(self, data: bytes) -> Optional[PDFExtractionResult]:
        """使用 pdfminer 直接提取文字"""
        try:
            from pdfminer.high_level import extract_text
            
            extracted_text = extract_text(io.BytesIO(data))
            
            if extracted_text and extracted_text.strip():
                self.extraction_stats['pdfminer_success'] += 1
                return PDFExtractionResult(
                    text=extracted_text.strip(),
                    page_count=0,  # pdfminer 不提供頁數資訊
                    extraction_method='pdfminer',
                    warnings=[],
                    metadata={'method': 'direct_extraction'}
                )
            
        except ImportError:
            logger.warning("pdfminer 未安裝，跳過此方法")
        except Exception as e:
            logger.debug(f"pdfminer 提取失敗: {e}")
        
        return None
    
    def extract_text_from_pdf(self, data: bytes) -> str:
        """
        從 PDF 提取文字的主要方法
        
        Args:
            data: PDF 檔案的二進制資料
            
        Returns:
            str: 提取的文字內容
            
        Raises:
            RuntimeError: 當所有提取方法都失敗時
        """
        self.extraction_stats['total_processed'] += 1
        
        # 抑制警告
        original_levels = self._suppress_pdf_warnings()
        
        try:
            # 按優先順序嘗試不同的提取方法
            extraction_methods = [
                self._extract_with_pdfplumber,
                self._extract_with_pypdf2,
                self._extract_with_pdfminer
            ]
            
            for method in extraction_methods:
                try:
                    result = method(data)
                    if result and result.text:
                        logger.info(
                            f"PDF 提取成功 ({result.extraction_method}): "
                            f"{len(result.text)} 字元, {result.page_count} 頁"
                        )
                        
                        if result.warnings:
                            logger.warning(f"提取警告: {'; '.join(result.warnings)}")
                        
                        return result.text
                        
                except Exception as e:
                    logger.debug(f"提取方法 {method.__name__} 失敗: {e}")
                    continue
            
            # 所有方法都失敗
            self.extraction_stats['failed_extractions'] += 1
            raise RuntimeError(
                "PDF 文字提取失敗：所有提取方法都無法從檔案中提取文字內容。"
                "可能原因：檔案損壞、加密保護、純圖片 PDF 或格式不支援。"
            )
            
        finally:
            # 恢復日誌等級
            self._restore_logging_levels(original_levels)
    
    def get_extraction_stats(self) -> Dict[str, Any]:
        """獲取提取統計資訊"""
        total = self.extraction_stats['total_processed']
        if total == 0:
            return self.extraction_stats
        
        return {
            **self.extraction_stats,
            'success_rate': (total - self.extraction_stats['failed_extractions']) / total * 100,
            'pdfplumber_rate': self.extraction_stats['pdfplumber_success'] / total * 100,
            'pypdf2_rate': self.extraction_stats['pypdf2_success'] / total * 100,
            'pdfminer_rate': self.extraction_stats['pdfminer_success'] / total * 100
        }
    
    def reset_stats(self):
        """重置統計資訊"""
        for key in self.extraction_stats:
            self.extraction_stats[key] = 0


# 全域實例
_pdf_processor = None

def get_enhanced_pdf_processor() -> EnhancedPDFProcessor:
    """獲取全域增強 PDF 處理器實例"""
    global _pdf_processor
    if _pdf_processor is None:
        _pdf_processor = EnhancedPDFProcessor()
    return _pdf_processor


# 向後相容的函數
def extract_text_from_pdf_enhanced(data: bytes) -> str:
    """增強的 PDF 文字提取函數"""
    from app.services.file_text_extractor import clean_text_for_database
    processor = get_enhanced_pdf_processor()
    text = processor.extract_text_from_pdf(data)
    return clean_text_for_database(text)
