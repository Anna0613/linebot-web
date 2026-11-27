import { isBlockCompatible } from "../utils/blockCompatibility";
import type { UnifiedDropItem } from "../types/block";

// Worker 消息處理
self.onmessage = function(e) {
  const { id, type, data } = e.data;
  
  try {
    switch (type) {
      case 'CHECK_COMPATIBILITY': {
        const { block, context, existingBlocks } = data;
        const result = isBlockCompatible(block, context, existingBlocks);
        
        self.postMessage({
          id,
          type: 'COMPATIBILITY_RESULT',
          data: result
        });
        break;
      }
        
      case 'BATCH_CHECK': {
        const { blocks, context: batchContext, existingBlocks: batchExisting } = data;
        const results = blocks.map((block: UnifiedDropItem) =>
          isBlockCompatible(block, batchContext, batchExisting)
        );
        
        self.postMessage({
          id,
          type: 'BATCH_RESULT',
          data: results
        });
        break;
      }
        
      default:
        self.postMessage({
          id,
          type: 'ERROR',
          data: { error: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      data: { error: (error as Error).message }
    });
  }
};
