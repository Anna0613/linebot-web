/**
 * 對齊積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 對齊積木配置
 */
export const alignBlockConfig: BlockConfig = {
  blockType: 'flex-layout',
  category: BlockCategory.FLEX_LAYOUT,
  name: '對齊',
  description: 'Flex 對齊控制，用於調整元件對齊方式',
  color: 'bg-teal-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '對齊',
    layoutType: 'align',
    align: 'center',
    gravity: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
  tooltip: '使用此積木控制 Flex 訊息中元件的對齊方式',
  priority: 3
};

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