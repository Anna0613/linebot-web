/**
 * 按鈕內容積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 按鈕內容積木配置
 */
export const buttonContentBlockConfig: BlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '按鈕',
  description: 'Flex 按鈕元件，用於用戶互動',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '按鈕',
    contentType: 'button',
    action: {
      type: 'postback',
      label: '點擊我',
      data: '',
      text: ''
    },
    height: 'sm',
    style: 'primary',
    color: '',
    gravity: 'center',
    margin: 'none',
    flex: 0
  },
  tooltip: '使用此積木在 Flex 訊息中加入互動按鈕',
  priority: 3
};

/**
 * 按鈕內容積木組件
 */
export const ButtonContentBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={buttonContentBlockConfig}
      {...props}
    >
      按鈕
    </BaseBlock>
  );
};

export default ButtonContentBlock;