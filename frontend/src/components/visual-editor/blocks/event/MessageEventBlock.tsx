/**
 * 文字訊息事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { messageEventBlockConfig } from '../../../../constants/blockConstants';

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