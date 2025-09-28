#!/usr/bin/env python3
"""
向量切塊功能效能監控腳本
用於驗證優化效果和監控系統效能
"""
import asyncio
import time
import json
import logging
from datetime import datetime
from typing import Dict, List, Any
import psutil
import sys
import os

# 添加專案路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.stream_file_processor import get_stream_file_processor
from app.services.adaptive_concurrency import get_adaptive_concurrency_manager
from app.services.embedding_manager import EmbeddingManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """效能監控器"""
    
    def __init__(self):
        self.stream_processor = get_stream_file_processor()
        self.concurrency_manager = get_adaptive_concurrency_manager()
        self.monitoring_data = []
    
    async def monitor_system_metrics(self, duration_seconds: int = 60):
        """
        監控系統指標
        
        Args:
            duration_seconds: 監控持續時間（秒）
        """
        logger.info(f"開始監控系統指標，持續 {duration_seconds} 秒")
        
        start_time = time.time()
        metrics_history = []
        
        while time.time() - start_time < duration_seconds:
            # 獲取系統指標
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # 獲取並發管理器狀態
            concurrency_status = self.concurrency_manager.get_status()
            
            # 獲取檔案處理器統計
            processor_stats = self.stream_processor.get_processing_stats()
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': memory.available / (1024**3),
                'current_concurrency': concurrency_status['current_concurrency'],
                'total_adjustments': concurrency_status['total_adjustments'],
                'processed_files': processor_stats['processed_files_count'],
                'total_mb_processed': processor_stats['total_mb_processed']
            }
            
            metrics_history.append(metrics)
            
            logger.info(
                f"CPU: {cpu_percent:.1f}%, 記憶體: {memory.percent:.1f}%, "
                f"並發數: {concurrency_status['current_concurrency']}, "
                f"已處理檔案: {processor_stats['processed_files_count']}"
            )
            
            await asyncio.sleep(5)  # 每 5 秒記錄一次
        
        return metrics_history
    
    async def test_file_processing_performance(self, file_sizes_mb: List[int] = None):
        """
        測試檔案處理效能
        
        Args:
            file_sizes_mb: 要測試的檔案大小列表（MB）
        """
        if file_sizes_mb is None:
            file_sizes_mb = [1, 5, 10, 20, 30]
        
        logger.info("開始檔案處理效能測試")
        
        results = []
        
        for size_mb in file_sizes_mb:
            if size_mb > 50:  # 超過限制
                logger.warning(f"跳過 {size_mb}MB 檔案測試（超過 50MB 限制）")
                continue
            
            logger.info(f"測試 {size_mb}MB 檔案處理")
            
            # 創建測試檔案內容
            content = b"A" * (size_mb * 1024 * 1024)
            
            # 模擬 UploadFile
            from unittest.mock import Mock, AsyncMock
            from fastapi import UploadFile
            
            mock_file = Mock(spec=UploadFile)
            mock_file.filename = f"test_{size_mb}mb.txt"
            mock_file.content_type = "text/plain"
            mock_file.seek = AsyncMock()
            
            # 模擬分塊讀取
            chunk_size = 1024 * 1024  # 1MB
            chunks = [content[i:i + chunk_size] for i in range(0, len(content), chunk_size)]
            
            read_call_count = 0
            async def mock_read(size=None):
                nonlocal read_call_count
                if read_call_count < len(chunks):
                    chunk = chunks[read_call_count]
                    read_call_count += 1
                    return chunk
                return b""
            
            mock_file.read = AsyncMock(side_effect=mock_read)
            
            # 測試處理時間
            start_time = time.time()
            memory_before = psutil.virtual_memory().percent
            
            try:
                result = await self.stream_processor.process_upload_stream(mock_file)
                processing_time = time.time() - start_time
                memory_after = psutil.virtual_memory().percent
                
                test_result = {
                    'file_size_mb': size_mb,
                    'processing_time_seconds': processing_time,
                    'memory_before_percent': memory_before,
                    'memory_after_percent': memory_after,
                    'memory_increase_percent': memory_after - memory_before,
                    'throughput_mbps': size_mb / processing_time if processing_time > 0 else 0,
                    'success': True
                }
                
                logger.info(
                    f"{size_mb}MB 檔案處理完成: {processing_time:.2f}s, "
                    f"吞吐量: {test_result['throughput_mbps']:.2f} MB/s"
                )
                
            except Exception as e:
                test_result = {
                    'file_size_mb': size_mb,
                    'processing_time_seconds': time.time() - start_time,
                    'error': str(e),
                    'success': False
                }
                logger.error(f"{size_mb}MB 檔案處理失敗: {e}")
            
            results.append(test_result)
            
            # 等待系統恢復
            await asyncio.sleep(2)
        
        return results
    
    async def test_concurrent_processing(self, num_concurrent: int = 5, file_size_mb: int = 5):
        """
        測試並發處理效能
        
        Args:
            num_concurrent: 並發任務數
            file_size_mb: 每個檔案大小（MB）
        """
        logger.info(f"開始並發處理測試: {num_concurrent} 個 {file_size_mb}MB 檔案")
        
        async def process_single_file(file_id: int):
            """處理單個檔案"""
            content = b"A" * (file_size_mb * 1024 * 1024)
            
            # 模擬檔案處理
            start_time = time.time()
            await asyncio.sleep(0.1)  # 模擬處理時間
            processing_time = time.time() - start_time
            
            return {
                'file_id': file_id,
                'file_size_mb': file_size_mb,
                'processing_time': processing_time
            }
        
        # 記錄開始狀態
        start_time = time.time()
        memory_before = psutil.virtual_memory().percent
        cpu_before = psutil.cpu_percent()
        
        # 並發執行
        tasks = [process_single_file(i) for i in range(num_concurrent)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 記錄結束狀態
        total_time = time.time() - start_time
        memory_after = psutil.virtual_memory().percent
        cpu_after = psutil.cpu_percent()
        
        # 統計結果
        successful_results = [r for r in results if isinstance(r, dict)]
        failed_results = [r for r in results if isinstance(r, Exception)]
        
        concurrent_test_result = {
            'num_concurrent': num_concurrent,
            'file_size_mb': file_size_mb,
            'total_time_seconds': total_time,
            'successful_files': len(successful_results),
            'failed_files': len(failed_results),
            'memory_before_percent': memory_before,
            'memory_after_percent': memory_after,
            'memory_increase_percent': memory_after - memory_before,
            'cpu_before_percent': cpu_before,
            'cpu_after_percent': cpu_after,
            'throughput_files_per_second': len(successful_results) / total_time if total_time > 0 else 0,
            'individual_results': successful_results
        }
        
        logger.info(
            f"並發測試完成: {len(successful_results)}/{num_concurrent} 成功, "
            f"總時間: {total_time:.2f}s, 吞吐量: {concurrent_test_result['throughput_files_per_second']:.2f} 檔案/秒"
        )
        
        return concurrent_test_result
    
    async def test_embedding_batch_performance(self, text_counts: List[int] = None):
        """
        測試嵌入批次處理效能
        
        Args:
            text_counts: 要測試的文本數量列表
        """
        if text_counts is None:
            text_counts = [10, 50, 100, 200]
        
        logger.info("開始嵌入批次處理效能測試")
        
        results = []
        
        for count in text_counts:
            logger.info(f"測試 {count} 個文本的嵌入處理")
            
            # 創建測試文本
            texts = [f"這是測試文本 {i}，用於測試嵌入向量生成的效能。" * 10 for i in range(count)]
            
            # 測試傳統批次處理
            start_time = time.time()
            try:
                # 注意：這裡需要真實的模型，在測試環境中可能需要模擬
                traditional_embeddings = await EmbeddingManager.embed_texts_batch(
                    texts, batch_size=32
                )
                traditional_time = time.time() - start_time
                traditional_success = True
            except Exception as e:
                traditional_time = time.time() - start_time
                traditional_success = False
                logger.warning(f"傳統批次處理失敗: {e}")
            
            # 測試自適應批次處理
            start_time = time.time()
            try:
                adaptive_embeddings = await EmbeddingManager.embed_texts_adaptive_batch(texts)
                adaptive_time = time.time() - start_time
                adaptive_success = True
            except Exception as e:
                adaptive_time = time.time() - start_time
                adaptive_success = False
                logger.warning(f"自適應批次處理失敗: {e}")
            
            result = {
                'text_count': count,
                'traditional_time_seconds': traditional_time,
                'traditional_success': traditional_success,
                'adaptive_time_seconds': adaptive_time,
                'adaptive_success': adaptive_success,
                'improvement_percent': ((traditional_time - adaptive_time) / traditional_time * 100) if traditional_time > 0 and traditional_success and adaptive_success else 0
            }
            
            results.append(result)
            
            logger.info(
                f"{count} 個文本處理完成: 傳統={traditional_time:.2f}s, "
                f"自適應={adaptive_time:.2f}s, 改善={result['improvement_percent']:.1f}%"
            )
            
            await asyncio.sleep(1)  # 等待系統恢復
        
        return results
    
    def save_results(self, results: Dict[str, Any], filename: str = None):
        """保存測試結果"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_results_{timestamp}.json"
        
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        logger.info(f"測試結果已保存到: {filepath}")
        return filepath


async def main():
    """主函數"""
    monitor = PerformanceMonitor()
    
    logger.info("=== 向量切塊功能效能測試開始 ===")
    
    all_results = {
        'test_timestamp': datetime.now().isoformat(),
        'system_info': {
            'cpu_count': psutil.cpu_count(),
            'memory_total_gb': psutil.virtual_memory().total / (1024**3),
            'python_version': sys.version
        }
    }
    
    try:
        # 1. 檔案處理效能測試
        logger.info("\n1. 檔案處理效能測試")
        file_results = await monitor.test_file_processing_performance([1, 5, 10, 20])
        all_results['file_processing'] = file_results
        
        # 2. 並發處理測試
        logger.info("\n2. 並發處理測試")
        concurrent_results = await monitor.test_concurrent_processing(num_concurrent=3, file_size_mb=5)
        all_results['concurrent_processing'] = concurrent_results
        
        # 3. 嵌入批次處理測試
        logger.info("\n3. 嵌入批次處理測試")
        embedding_results = await monitor.test_embedding_batch_performance([10, 50, 100])
        all_results['embedding_batch'] = embedding_results
        
        # 4. 系統監控（短時間）
        logger.info("\n4. 系統監控測試")
        monitoring_results = await monitor.monitor_system_metrics(duration_seconds=30)
        all_results['system_monitoring'] = monitoring_results
        
        # 保存結果
        results_file = monitor.save_results(all_results)
        
        logger.info("\n=== 效能測試完成 ===")
        logger.info(f"詳細結果請查看: {results_file}")
        
        # 輸出摘要
        print("\n=== 測試摘要 ===")
        if file_results:
            max_size = max(r['file_size_mb'] for r in file_results if r.get('success'))
            print(f"✅ 最大成功處理檔案: {max_size}MB")
        
        if concurrent_results:
            print(f"✅ 並發處理: {concurrent_results['successful_files']}/{concurrent_results['num_concurrent']} 成功")
        
        if embedding_results:
            avg_improvement = sum(r['improvement_percent'] for r in embedding_results if r['traditional_success'] and r['adaptive_success']) / len([r for r in embedding_results if r['traditional_success'] and r['adaptive_success']])
            print(f"✅ 自適應批次處理平均改善: {avg_improvement:.1f}%")
        
    except Exception as e:
        logger.error(f"測試過程中發生錯誤: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
