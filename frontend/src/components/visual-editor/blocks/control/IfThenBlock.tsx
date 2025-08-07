/**
 * 條件判斷積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { ifThenBlockConfig } from '../../../../constants/blockConstants';

/**
 * 條件判斷積木組件
 */
export const IfThenBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={ifThenBlockConfig}
      {...props}
    >
      如果...那麼
    </BaseBlock>
  );
};

export default IfThenBlock;