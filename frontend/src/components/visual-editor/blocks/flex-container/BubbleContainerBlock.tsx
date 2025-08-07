/**
 * Bubble 容器積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { bubbleContainerBlockConfig } from '../../../../constants/blockConstants';

/**
 * Bubble 容器積木組件
 */
export const BubbleContainerBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={bubbleContainerBlockConfig}
      {...props}
    >
      Bubble 容器
    </BaseBlock>
  );
};

export default BubbleContainerBlock;