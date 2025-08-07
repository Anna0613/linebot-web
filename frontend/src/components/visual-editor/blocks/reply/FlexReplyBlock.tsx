/**
 * Flex 訊息回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { flexReplyBlockConfig } from '../../../../constants/blockConstants';

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