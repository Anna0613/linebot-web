/**
 * 文字內容積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 文字內容積木配置
 */
export const textContentBlockConfig: BlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '文字',
  description: 'Flex 文字元件，用於顯示文字內容',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '文字',
    contentType: 'text',
    text: '請輸入文字內容',
    size: 'md',
    weight: 'regular',
    color: '#000000',
    align: 'start',
    gravity: 'top',
    wrap: true,
    maxLines: 0,
    flex: 0,
    margin: 'none',
    style: 'normal'
  },
  tooltip: '使用此積木在 Flex 訊息中顯示文字',
  priority: 1
};

/**
 * 文字內容積木組件
 */
export const TextContentBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={textContentBlockConfig}
      {...props}
    >
      文字
    </BaseBlock>
  );
};

export default TextContentBlock;