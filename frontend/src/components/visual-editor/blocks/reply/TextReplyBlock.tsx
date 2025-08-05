/**
 * 文字回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 文字回覆積木配置
 */
export const textReplyBlockConfig: BlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆文字訊息',
  description: '發送文字訊息回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆文字訊息',
    replyType: 'text',
    text: '請輸入回覆內容'
  },
  tooltip: '使用此積木發送文字訊息給用戶',
  priority: 1
};

/**
 * 文字回覆積木組件
 */
export const TextReplyBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={textReplyBlockConfig}
      {...props}
    >
      回覆文字訊息
    </BaseBlock>
  );
};

export default TextReplyBlock;