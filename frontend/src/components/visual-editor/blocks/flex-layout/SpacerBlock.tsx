/**
 * 間距積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 間距積木配置
 */
export const spacerBlockConfig: BlockConfig = {
  blockType: 'flex-layout',
  category: BlockCategory.FLEX_LAYOUT,
  name: '間距',
  description: 'Flex 間距元件，用於佈局控制',
  color: 'bg-teal-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '間距',
    layoutType: 'spacer',
    size: 'sm'
  },
  tooltip: '使用此積木在 Flex 訊息中加入間距',
  priority: 1
};

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