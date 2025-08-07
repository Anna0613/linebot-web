/**
 * Carousel 容器積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { carouselContainerBlockConfig } from '../../../../constants/blockConstants';

/**
 * Carousel 容器積木組件
 */
export const CarouselContainerBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={carouselContainerBlockConfig}
      {...props}
    >
      Carousel 容器
    </BaseBlock>
  );
};

export default CarouselContainerBlock;