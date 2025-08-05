/**
 * 填充積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 填充積木配置
 */
export const fillerBlockConfig: BlockConfig = {
  blockType: 'flex-layout',
  category: BlockCategory.FLEX_LAYOUT,
  name: '填充',
  description: 'Flex 填充元件，用於填充剩餘空間',
  color: 'bg-teal-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '填充',
    layoutType: 'filler',
    flex: 1
  },
  tooltip: '使用此積木在 Flex 訊息中填充剩餘空間',
  priority: 2
};

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