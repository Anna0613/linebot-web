/**
 * 文字回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { textReplyBlockConfig } from '../../../../constants/blockConstants';

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