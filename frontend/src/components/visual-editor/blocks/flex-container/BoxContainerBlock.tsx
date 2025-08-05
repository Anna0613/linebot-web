/**
 * Box 容器積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * Box 容器積木配置
 */
export const boxContainerBlockConfig: BlockConfig = {
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  name: 'Box 容器',
  description: 'Flex Box 容器，用於佈局其他元件',
  color: 'bg-indigo-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: 'Box 容器',
    containerType: 'box',
    layout: 'vertical',
    contents: [],
    spacing: 'md',
    margin: 'none',
    paddingAll: 'none',
    paddingTop: 'none',
    paddingBottom: 'none',
    paddingStart: 'none',
    paddingEnd: 'none',
    backgroundColor: '',
    borderColor: '',
    borderWidth: 'none',
    cornerRadius: 'none'
  },
  tooltip: '使用此積木創建 Flex Box 容器',
  priority: 3
};

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