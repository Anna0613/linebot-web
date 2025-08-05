/**
 * 圖片訊息事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 圖片訊息事件積木配置
 */
export const imageEventBlockConfig: BlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當收到圖片訊息時',
  description: '當用戶發送圖片訊息時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當收到圖片訊息時',
    eventType: 'message.image'
  },
  tooltip: '此積木會在用戶發送圖片訊息時執行',
  priority: 2
};

/**
 * 圖片訊息事件積木組件
 */
export const ImageEventBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={imageEventBlockConfig}
      {...props}
    >
      當收到圖片訊息時
    </BaseBlock>
  );
};

export default ImageEventBlock;