#!/usr/bin/env python3
"""
PDF 問題診斷工具
用於診斷和測試 PDF 檔案的處理問題
"""
import sys
import os
import logging
from pathlib import Path
from typing import List, Dict, Any

# 添加專案路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.enhanced_pdf_processor import get_enhanced_pdf_processor, PDFExtractionResult
from app.services.file_text_extractor import extract_text_by_mime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFDiagnostic:
    """PDF 診斷工具"""
    
    def __init__(self):
        self.processor = get_enhanced_pdf_processor()
        self.test_results = []
    
    def diagnose_pdf_file(self, file_path: str) -> Dict[str, Any]:
        """
        診斷單個 PDF 檔案
        
        Args:
            file_path: PDF 檔案路徑
            
        Returns:
            dict: 診斷結果
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            return {
                'file_path': str(file_path),
                'error': 'File not found',
                'success': False
            }
        
        if not file_path.suffix.lower() == '.pdf':
            return {
                'file_path': str(file_path),
                'error': 'Not a PDF file',
                'success': False
            }
        
        logger.info(f"診斷 PDF 檔案: {file_path}")
        
        try:
            # 讀取檔案
            with open(file_path, 'rb') as f:
                data = f.read()
            
            file_size_mb = len(data) / (1024 * 1024)
            
            # 使用增強處理器提取文字
            import time
            start_time = time.time()
            
            try:
                extracted_text = self.processor.extract_text_from_pdf(data)
                extraction_time = time.time() - start_time
                
                result = {
                    'file_path': str(file_path),
                    'file_size_mb': round(file_size_mb, 2),
                    'extraction_time_seconds': round(extraction_time, 3),
                    'text_length': len(extracted_text),
                    'text_preview': extracted_text[:200] + '...' if len(extracted_text) > 200 else extracted_text,
                    'success': True,
                    'extraction_stats': self.processor.get_extraction_stats()
                }
                
                logger.info(
                    f"✅ 成功: {file_size_mb:.2f}MB, "
                    f"{len(extracted_text)} 字元, {extraction_time:.3f}s"
                )
                
            except Exception as e:
                result = {
                    'file_path': str(file_path),
                    'file_size_mb': round(file_size_mb, 2),
                    'extraction_time_seconds': time.time() - start_time,
                    'error': str(e),
                    'success': False,
                    'extraction_stats': self.processor.get_extraction_stats()
                }
                
                logger.error(f"❌ 失敗: {e}")
            
            return result
            
        except Exception as e:
            return {
                'file_path': str(file_path),
                'error': f'File reading error: {str(e)}',
                'success': False
            }
    
    def batch_diagnose(self, directory_path: str) -> List[Dict[str, Any]]:
        """
        批次診斷目錄中的所有 PDF 檔案
        
        Args:
            directory_path: 目錄路徑
            
        Returns:
            list: 診斷結果列表
        """
        directory = Path(directory_path)
        
        if not directory.exists() or not directory.is_dir():
            logger.error(f"目錄不存在: {directory_path}")
            return []
        
        pdf_files = list(directory.glob("*.pdf"))
        
        if not pdf_files:
            logger.warning(f"目錄中沒有找到 PDF 檔案: {directory_path}")
            return []
        
        logger.info(f"找到 {len(pdf_files)} 個 PDF 檔案")
        
        results = []
        for pdf_file in pdf_files:
            result = self.diagnose_pdf_file(str(pdf_file))
            results.append(result)
            self.test_results.append(result)
        
        return results
    
    def generate_report(self, results: List[Dict[str, Any]]) -> str:
        """
        生成診斷報告
        
        Args:
            results: 診斷結果列表
            
        Returns:
            str: 報告內容
        """
        if not results:
            return "沒有診斷結果"
        
        total_files = len(results)
        successful_files = len([r for r in results if r.get('success', False)])
        failed_files = total_files - successful_files
        
        total_size = sum(r.get('file_size_mb', 0) for r in results)
        total_text_length = sum(r.get('text_length', 0) for r in results if r.get('success', False))
        avg_extraction_time = sum(r.get('extraction_time_seconds', 0) for r in results) / total_files
        
        report = f"""
=== PDF 診斷報告 ===

📊 總體統計:
- 總檔案數: {total_files}
- 成功處理: {successful_files} ({successful_files/total_files*100:.1f}%)
- 處理失敗: {failed_files} ({failed_files/total_files*100:.1f}%)
- 總檔案大小: {total_size:.2f} MB
- 總提取文字: {total_text_length:,} 字元
- 平均處理時間: {avg_extraction_time:.3f} 秒

"""
        
        if successful_files > 0:
            report += "✅ 成功處理的檔案:\n"
            for result in results:
                if result.get('success', False):
                    report += f"  - {Path(result['file_path']).name}: {result['file_size_mb']:.2f}MB, {result['text_length']:,} 字元\n"
        
        if failed_files > 0:
            report += "\n❌ 處理失敗的檔案:\n"
            for result in results:
                if not result.get('success', False):
                    report += f"  - {Path(result['file_path']).name}: {result.get('error', 'Unknown error')}\n"
        
        # 提取統計
        if results and 'extraction_stats' in results[-1]:
            stats = results[-1]['extraction_stats']
            report += f"""
📈 提取方法統計:
- pdfplumber 成功率: {stats.get('pdfplumber_rate', 0):.1f}%
- PyPDF2 成功率: {stats.get('pypdf2_rate', 0):.1f}%
- pdfminer 成功率: {stats.get('pdfminer_rate', 0):.1f}%
- 整體成功率: {stats.get('success_rate', 0):.1f}%
"""
        
        return report
    
    def test_problematic_patterns(self):
        """測試常見的問題模式"""
        logger.info("測試常見 PDF 問題模式...")
        
        # 這裡可以添加一些已知有問題的 PDF 測試案例
        test_cases = [
            "測試包含 Pattern 顏色問題的 PDF",
            "測試加密 PDF",
            "測試純圖片 PDF",
            "測試損壞的 PDF"
        ]
        
        for test_case in test_cases:
            logger.info(f"  - {test_case}: 需要實際檔案進行測試")


def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description="PDF 問題診斷工具")
    parser.add_argument("path", help="PDF 檔案或目錄路徑")
    parser.add_argument("--output", "-o", help="輸出報告檔案路徑")
    parser.add_argument("--verbose", "-v", action="store_true", help="詳細輸出")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    diagnostic = PDFDiagnostic()
    
    path = Path(args.path)
    
    if path.is_file():
        # 單個檔案診斷
        result = diagnostic.diagnose_pdf_file(str(path))
        results = [result]
    elif path.is_dir():
        # 目錄批次診斷
        results = diagnostic.batch_diagnose(str(path))
    else:
        logger.error(f"路徑不存在: {args.path}")
        return 1
    
    # 生成報告
    report = diagnostic.generate_report(results)
    print(report)
    
    # 保存報告
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)
        logger.info(f"報告已保存到: {args.output}")
    
    # 測試問題模式
    diagnostic.test_problematic_patterns()
    
    return 0


if __name__ == "__main__":
    exit(main())
