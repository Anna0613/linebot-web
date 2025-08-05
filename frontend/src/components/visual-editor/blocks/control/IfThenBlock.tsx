/**
 * 條件判斷積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 條件判斷積木配置
 */
export const ifThenBlockConfig: BlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '如果...那麼',
  description: '根據條件執行不同的動作',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '如果...那麼',
    controlType: 'if',
    condition: '',
    thenActions: [],
    elseActions: []
  },
  tooltip: '使用此積木建立條件邏輯',
  priority: 1
};

/**
 * 條件判斷積木組件
 */
export const IfThenBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={ifThenBlockConfig}
      {...props}
    >
      如果...那麼
    </BaseBlock>
  );
};

export default IfThenBlock;