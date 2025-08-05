import { useRef, useCallback, useEffect } from 'react';
import { UnifiedBlock, UnifiedDropItem, WorkspaceContext, BlockValidationResult } from '../types/block';

interface WorkerMessage {
  id: string;
  type: string;
  data: any;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Web Worker 相容性檢查 Hook
 * 提供非阻塞的積木相容性檢查功能
 */
export const useCompatibilityWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map());
  const requestIdRef = useRef(0);

  // 初始化 Worker
  useEffect(() => {
    // 檢查 Worker 支援
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, falling back to synchronous compatibility checking');
      return;
    }

    try {
      workerRef.current = new Worker('/workers/blockCompatibilityWorker.js');
      
      workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const { id, type, data } = e.data;
        const pendingRequest = pendingRequestsRef.current.get(id);
        
        if (!pendingRequest) {
          console.warn(`Received response for unknown request ID: ${id}`);
          return;
        }
        
        // 清除超時和移除待處理請求
        clearTimeout(pendingRequest.timeout);
        pendingRequestsRef.current.delete(id);
        
        if (type === 'ERROR') {
          pendingRequest.reject(new Error(data.error));
        } else {
          pendingRequest.resolve(data);
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        // 清除所有待處理的請求
        pendingRequestsRef.current.forEach(({ reject, timeout }) => {
          clearTimeout(timeout);
          reject(new Error('Worker error occurred'));
        });
        pendingRequestsRef.current.clear();
      };
      
    } catch (error) {
      console.error('Failed to create compatibility worker:', error);
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // 清除所有待處理的請求
      pendingRequestsRef.current.forEach(({ timeout }) => {
        clearTimeout(timeout);
      });
      pendingRequestsRef.current.clear();
    };
  }, []);

  // 生成請求 ID
  const generateRequestId = useCallback(() => {
    return `req_${++requestIdRef.current}_${Date.now()}`;
  }, []);

  // 發送 Worker 消息並返回 Promise
  const sendWorkerMessage = useCallback((type: string, data: any, timeoutMs = 5000): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = generateRequestId();
      
      // 設置超時
      const timeout = setTimeout(() => {
        pendingRequestsRef.current.delete(id);
        reject(new Error('Worker request timeout'));
      }, timeoutMs);
      
      // 儲存待處理請求
      pendingRequestsRef.current.set(id, { resolve, reject, timeout });
      
      // 發送消息
      workerRef.current.postMessage({ id, type, data });
    });
  }, [generateRequestId]);

  // 檢查單個積木的相容性
  const checkCompatibility = useCallback(async (
    block: UnifiedBlock | UnifiedDropItem,
    context: WorkspaceContext,
    existingBlocks: UnifiedBlock[] = []
  ): Promise<BlockValidationResult> => {
    if (!workerRef.current) {
      // Fallback to synchronous checking
      return checkCompatibilitySync(block, context, existingBlocks);
    }

    try {
      const result = await sendWorkerMessage('CHECK_COMPATIBILITY', {
        block,
        context,
        existingBlocks
      });
      
      return result;
    } catch (error) {
      console.warn('Worker compatibility check failed, falling back to sync:', error);
      return checkCompatibilitySync(block, context, existingBlocks);
    }
  }, [sendWorkerMessage]);

  // 批量檢查積木相容性
  const checkBatchCompatibility = useCallback(async (
    blocks: (UnifiedBlock | UnifiedDropItem)[],
    context: WorkspaceContext,
    existingBlocks: UnifiedBlock[] = []
  ): Promise<BlockValidationResult[]> => {
    if (!workerRef.current) {
      // Fallback to synchronous checking
      return blocks.map(block => checkCompatibilitySync(block, context, existingBlocks));
    }

    try {
      const results = await sendWorkerMessage('BATCH_CHECK', {
        blocks,
        context,
        existingBlocks
      });
      
      return results;
    } catch (error) {
      console.warn('Worker batch compatibility check failed, falling back to sync:', error);
      return blocks.map(block => checkCompatibilitySync(block, context, existingBlocks));
    }
  }, [sendWorkerMessage]);

  // 獲取 Worker 狀態
  const getWorkerStatus = useCallback(() => {
    return {
      isAvailable: !!workerRef.current,
      pendingRequests: pendingRequestsRef.current.size,
      supportsWorkers: typeof Worker !== 'undefined'
    };
  }, []);

  return {
    checkCompatibility,
    checkBatchCompatibility,
    getWorkerStatus,
    isWorkerAvailable: !!workerRef.current
  };
};

// 同步後備相容性檢查函數
function checkCompatibilitySync(
  block: UnifiedBlock | UnifiedDropItem,
  context: WorkspaceContext,
  existingBlocks: UnifiedBlock[] = []
): BlockValidationResult {
  // 簡化的同步相容性檢查
  // 這個函數作為 Worker 不可用時的後備方案
  
  // 基本驗證
  if (!context) {
    return {
      isValid: false,
      reason: '工作區上下文未正確初始化',
      suggestions: ['請重新整理頁面']
    };
  }

  // 寬鬆的相容性政策 - 允許大多數操作
  return {
    isValid: true,
    reason: '使用同步後備相容性檢查（寬鬆政策）',
    suggestions: ['如果遇到問題，請重新整理頁面以啟用 Web Worker 優化']
  };
}

export default useCompatibilityWorker;