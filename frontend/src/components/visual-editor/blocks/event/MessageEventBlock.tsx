/**
 * 文字訊息事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 文字訊息事件積木配置
 */
export const messageEventBlockConfig: BlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當收到文字訊息時',
  description: '當用戶發送文字訊息時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當收到文字訊息時',
    eventType: 'message.text'
  },
  tooltip: '此積木會在用戶發送文字訊息時執行',
  priority: 1
};

/**
 * 文字訊息事件積木組件
 */
export const MessageEventBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={messageEventBlockConfig}
      {...props}
    >
      當收到文字訊息時
    </BaseBlock>
  );
};

export default MessageEventBlock;