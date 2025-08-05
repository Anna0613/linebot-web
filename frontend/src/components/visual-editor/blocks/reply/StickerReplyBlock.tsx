/**
 * 貼圖回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 貼圖回覆積木配置
 */
export const stickerReplyBlockConfig: BlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆貼圖',
  description: '發送貼圖回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆貼圖',
    replyType: 'sticker',
    packageId: '1',
    stickerId: '1'
  },
  tooltip: '使用此積木發送貼圖給用戶',
  priority: 4
};

/**
 * 貼圖回覆積木組件
 */
export const StickerReplyBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={stickerReplyBlockConfig}
      {...props}
    >
      回覆貼圖
    </BaseBlock>
  );
};

export default StickerReplyBlock;