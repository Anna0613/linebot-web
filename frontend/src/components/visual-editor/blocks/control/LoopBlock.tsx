/**
 * 重複執行積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { loopBlockConfig } from '../../../../constants/blockConstants';

/**
 * 重複執行積木組件
 */
export const LoopBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={loopBlockConfig}
      {...props}
    >
      重複執行
    </BaseBlock>
  );
};

export default LoopBlock;