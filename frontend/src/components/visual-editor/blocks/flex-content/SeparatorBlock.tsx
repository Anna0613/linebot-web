/**
 * 分隔線積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { separatorBlockConfig } from '../../../../constants/blockConstants';

/**
 * 分隔線積木組件
 */
export const SeparatorBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={separatorBlockConfig}
      {...props}
    >
      分隔線
    </BaseBlock>
  );
};

export default SeparatorBlock;