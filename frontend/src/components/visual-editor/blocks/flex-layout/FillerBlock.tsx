/**
 * 填充積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { fillerBlockConfig } from '../../../../constants/blockConstants';

/**
 * 填充積木組件
 */
export const FillerBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={fillerBlockConfig}
      {...props}
    >
      填充
    </BaseBlock>
  );
};

export default FillerBlock;