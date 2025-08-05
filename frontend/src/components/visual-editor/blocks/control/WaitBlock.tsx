/**
 * 等待延遲積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 等待延遲積木配置
 */
export const waitBlockConfig: BlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '等待',
  description: '暫停執行指定的時間',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '等待',
    controlType: 'wait',
    duration: 1000,
    unit: 'milliseconds'
  },
  tooltip: '使用此積木在動作間加入延遲',
  priority: 3
};

/**
 * 等待延遲積木組件
 */
export const WaitBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={waitBlockConfig}
      {...props}
    >
      等待
    </BaseBlock>
  );
};

export default WaitBlock;