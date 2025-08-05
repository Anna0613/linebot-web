/**
 * 重複執行積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 重複執行積木配置
 */
export const loopBlockConfig: BlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '重複執行',
  description: '重複執行指定的動作',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '重複執行',
    controlType: 'loop',
    loopCount: 1,
    loopActions: []
  },
  tooltip: '使用此積木重複執行動作',
  priority: 2
};

/**
 * 重複執行積木組件
 */
export const LoopBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={loopBlockConfig}
      {...props}
    >
      重複執行
    </BaseBlock>
  );
};

export default LoopBlock;