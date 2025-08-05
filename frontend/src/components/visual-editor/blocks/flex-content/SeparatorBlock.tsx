/**
 * 分隔線積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 分隔線積木配置
 */
export const separatorBlockConfig: BlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '分隔線',
  description: 'Flex 分隔線元件，用於視覺分割',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '分隔線',
    contentType: 'separator',
    margin: 'md',
    color: '#B7B7B7'
  },
  tooltip: '使用此積木在 Flex 訊息中加入分隔線',
  priority: 4
};

/**
 * 分隔線積木組件
 */
export const SeparatorBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={separatorBlockConfig}
      {...props}
    >
      分隔線
    </BaseBlock>
  );
};

export default SeparatorBlock;