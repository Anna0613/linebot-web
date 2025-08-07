/**
 * 間距積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { spacerBlockConfig } from '../../../../constants/blockConstants';

/**
 * 間距積木組件
 */
export const SpacerBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={spacerBlockConfig}
      {...props}
    >
      間距
    </BaseBlock>
  );
};

export default SpacerBlock;