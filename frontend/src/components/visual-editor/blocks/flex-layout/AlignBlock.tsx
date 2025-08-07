/**
 * 對齊積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { alignBlockConfig } from '../../../../constants/blockConstants';

/**
 * 對齊積木組件
 */
export const AlignBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={alignBlockConfig}
      {...props}
    >
      對齊
    </BaseBlock>
  );
};

export default AlignBlock;