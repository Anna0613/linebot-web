/**
 * Bubble 容器積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * Bubble 容器積木配置
 */
export const bubbleContainerBlockConfig: BlockConfig = {
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  name: 'Bubble 容器',
  description: 'Flex Bubble 容器，用於包含其他 Flex 元件',
  color: 'bg-indigo-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: 'Bubble 容器',
    containerType: 'bubble',
    size: 'mega',
    direction: 'ltr',
    header: null,
    hero: null,
    body: null,
    footer: null,
    styles: {}
  },
  tooltip: '使用此積木創建 Flex Bubble 容器',
  priority: 1
};

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