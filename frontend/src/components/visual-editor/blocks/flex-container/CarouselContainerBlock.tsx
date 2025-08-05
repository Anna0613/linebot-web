/**
 * Carousel 容器積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * Carousel 容器積木配置
 */
export const carouselContainerBlockConfig: BlockConfig = {
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  name: 'Carousel 容器',
  description: 'Flex Carousel 容器，用於建立輪播卡片',
  color: 'bg-indigo-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: 'Carousel 容器',
    containerType: 'carousel',
    contents: []
  },
  tooltip: '使用此積木創建 Flex Carousel 容器',
  priority: 2
};

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