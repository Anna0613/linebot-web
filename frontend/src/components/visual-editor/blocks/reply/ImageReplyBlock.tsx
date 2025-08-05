/**
 * 圖片回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 圖片回覆積木配置
 */
export const imageReplyBlockConfig: BlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆圖片訊息',
  description: '發送圖片訊息回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆圖片訊息',
    replyType: 'image',
    originalContentUrl: '',
    previewImageUrl: ''
  },
  tooltip: '使用此積木發送圖片訊息給用戶',
  priority: 2
};

/**
 * 圖片回覆積木組件
 */
export const ImageReplyBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={imageReplyBlockConfig}
      {...props}
    >
      回覆圖片訊息
    </BaseBlock>
  );
};

export default ImageReplyBlock;