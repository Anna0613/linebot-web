/**
 * Flex 訊息回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * Flex 訊息回覆積木配置
 */
export const flexReplyBlockConfig: BlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆 Flex 訊息',
  description: '發送 Flex 訊息回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆 Flex 訊息',
    replyType: 'flex',
    altText: 'Flex 訊息',
    flexContent: {}
  },
  tooltip: '使用此積木發送豐富的 Flex 訊息給用戶',
  priority: 3
};

/**
 * Flex 訊息回覆積木組件
 */
export const FlexReplyBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={flexReplyBlockConfig}
      {...props}
    >
      回覆 Flex 訊息
    </BaseBlock>
  );
};

export default FlexReplyBlock;