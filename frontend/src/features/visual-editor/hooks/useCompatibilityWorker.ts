import { isBlockCompatible } from "../utils/blockCompatibility";
import { useRef, useCallback, useEffect } from 'react';
import { UnifiedBlock, UnifiedDropItem, WorkspaceContext, BlockValidationResult } from '../types/block';

interface WorkerMessage {
  id: string;
  type: string;
  data: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
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

    const pendingRequests = pendingRequestsRef.current;
    
    try {
      // 使用 Vite 的 Worker 載入方式
      workerRef.current = new Worker(
        new URL('../workers/blockCompatibilityWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
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
          pendingRequest.reject(new Error(String((data as {error?: string})?.error ?? "Worker error")));
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
      pendingRequests.forEach(({ timeout, reject }) => {
        clearTimeout(timeout);
        reject(new Error("Compatibility worker was closed"));
      });
      pendingRequests.clear();
    };
  }, []);

  // 生成請求 ID
  const generateRequestId = useCallback(() => {
    return `req_${++requestIdRef.current}_${Date.now()}`;
  }, []);

  // 發送 Worker 消息並返回 Promise
  const sendWorkerMessage = useCallback((type: string, data: unknown, timeoutMs = 5000): Promise<unknown> => {
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
      return isBlockCompatible(block, context, existingBlocks);
    }

    try {
      const result = await sendWorkerMessage('CHECK_COMPATIBILITY', {
        block,
        context,
        existingBlocks
      });
      
      return result as BlockValidationResult;
    } catch (error) {
      console.warn('Worker compatibility check failed, falling back to sync:', error);
      return isBlockCompatible(block, context, existingBlocks);
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
      return blocks.map(block => isBlockCompatible(block, context, existingBlocks));
    }

    try {
      const results = await sendWorkerMessage('BATCH_CHECK', {
        blocks,
        context,
        existingBlocks
      });
      
      return results as BlockValidationResult[];
    } catch (error) {
      console.warn('Worker batch compatibility check failed, falling back to sync:', error);
      return blocks.map(block => isBlockCompatible(block, context, existingBlocks));
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
