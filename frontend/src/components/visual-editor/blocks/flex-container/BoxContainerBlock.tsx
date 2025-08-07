/**
 * Box 容器積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { boxContainerBlockConfig } from '../../../../constants/blockConstants';

/**
 * Box 容器積木組件
 */
export const BoxContainerBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={boxContainerBlockConfig}
      {...props}
    >
      Box 容器
    </BaseBlock>
  );
};

export default BoxContainerBlock;