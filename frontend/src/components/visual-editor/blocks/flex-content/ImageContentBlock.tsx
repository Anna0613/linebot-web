/**
 * 圖片內容積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 圖片內容積木配置
 */
export const imageContentBlockConfig: BlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '圖片',
  description: 'Flex 圖片元件，用於顯示圖片',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '圖片',
    contentType: 'image',
    url: '',
    size: 'full',
    aspectRatio: '20:13',
    aspectMode: 'cover',
    backgroundColor: '',
    margin: 'none',
    align: 'center',
    gravity: 'top',
    flex: 0,
    action: null
  },
  tooltip: '使用此積木在 Flex 訊息中顯示圖片',
  priority: 2
};

/**
 * 圖片內容積木組件
 */
export const ImageContentBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={imageContentBlockConfig}
      {...props}
    >
      圖片
    </BaseBlock>
  );
};

export default ImageContentBlock;