import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import DraggableBlock from './DraggableBlock';
import { WorkspaceContext } from '../../types/block';

// 積木類別定義
interface BlockType {
  blockType: string;
  name: string;
  data: Record<string, unknown>;
}

interface BlockCategory {
  name: string;
  color: string;
  blocks: BlockType[];
}

interface VirtualizedBlockPaletteProps {
  currentContext: WorkspaceContext;
  showAllBlocks: boolean;
  onShowAllBlocksChange: (show: boolean) => void;
}

// 積木項目組件 - 記憶化以提升性能
const BlockItem = memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: {
    items: Array<{ block: BlockType; color: string; categoryName: string }>;
  };
}) => {
  const { block, color, categoryName } = data.items[index];
  
  return (
    <div style={style} className="px-2 py-1">
      <DraggableBlock
        blockType={block.blockType}
        blockData={block.data}
        color={color}
        className="w-full"
      >
        <div className="flex flex-col">
          <span className="text-sm font-medium">{block.name}</span>
          <span className="text-xs opacity-70">{categoryName}</span>
        </div>
      </DraggableBlock>
    </div>
  );
});

BlockItem.displayName = 'BlockItem';

// 主要的虛擬化積木面板組件
const VirtualizedBlockPalette: React.FC<VirtualizedBlockPaletteProps> = memo(({
  currentContext,
  showAllBlocks,
  onShowAllBlocksChange
}) => {
  // 積木類別數據（優化版本）
  const blockCategories = useMemo((): BlockCategory[] => [
    {
      name: '事件積木',
      color: 'bg-blue-500',
      blocks: [
        { blockType: 'message', name: '收到訊息', data: { eventType: 'message' } },
        { blockType: 'postback', name: '按鈕回調', data: { eventType: 'postback' } },
        { blockType: 'follow', name: '加入好友', data: { eventType: 'follow' } },
        { blockType: 'image_event', name: '圖片事件', data: { eventType: 'image' } }
      ]
    },
    {
      name: '回覆積木',
      color: 'bg-green-500',
      blocks: [
        { blockType: 'text', name: '文字回覆', data: { replyType: 'text', text: '請輸入回覆文字' } },
        { blockType: 'image', name: '圖片回覆', data: { replyType: 'image', url: 'https://example.com/image.jpg' } },
        { blockType: 'sticker', name: '貼圖回覆', data: { replyType: 'sticker', packageId: '1', stickerId: '1' } },
        { blockType: 'flex', name: 'Flex 回覆', data: { replyType: 'flex', flexMessageId: '', flexMessageName: '' } }
      ]
    },
    {
      name: '控制積木',
      color: 'bg-purple-500',
      blocks: [
        { blockType: 'if_then', name: '條件判斷', data: { controlType: 'condition', condition: '' } },
        { blockType: 'loop', name: '迴圈', data: { controlType: 'loop', count: 1 } },
        { blockType: 'wait', name: '等待', data: { controlType: 'delay', duration: 1000 } }
      ]
    },
    {
      name: '設定積木',
      color: 'bg-orange-500',
      blocks: [
        { blockType: 'set_variable', name: '設定變數', data: { settingType: 'variable', name: '', value: '' } },
        { blockType: 'get_variable', name: '取得變數', data: { settingType: 'variable', name: '' } },
        { blockType: 'save_user_data', name: '儲存用戶資料', data: { settingType: 'userData', key: '', value: '' } }
      ]
    },
    {
      name: 'Flex 容器',
      color: 'bg-indigo-500',
      blocks: [
        { blockType: 'bubble', name: 'Bubble 容器', data: { containerType: 'bubble' } },
        { blockType: 'carousel', name: 'Carousel 容器', data: { containerType: 'carousel' } },
        { blockType: 'box', name: 'Box 容器', data: { containerType: 'box', layout: 'vertical' } }
      ]
    },
    {
      name: 'Flex 內容',
      color: 'bg-pink-500',
      blocks: [
        { blockType: 'text_content', name: '文字內容', data: { contentType: 'text', text: '文字內容', size: 'md' } },
        { blockType: 'image_content', name: '圖片內容', data: { contentType: 'image', url: 'https://example.com/image.jpg' } },
        { blockType: 'button_content', name: '按鈕內容', data: { contentType: 'button', text: '按鈕', action: 'postback' } }
      ]
    },
    {
      name: 'Flex 佈局',
      color: 'bg-teal-500',
      blocks: [
        { blockType: 'separator', name: '分隔線', data: { layoutType: 'separator' } },
        { blockType: 'spacer', name: '間距', data: { layoutType: 'spacer', size: 'sm' } },
        { blockType: 'filler', name: '填充', data: { layoutType: 'filler' } }
      ]
    }
  ], []);

  // 過濾適用於當前上下文的積木
  const filteredCategories = useMemo(() => {
    if (showAllBlocks) {
      return blockCategories;
    }

    return blockCategories.filter(category => {
      switch (currentContext) {
        case WorkspaceContext.LOGIC:
          return ['事件積木', '回覆積木', '控制積木', '設定積木'].includes(category.name);
        case WorkspaceContext.FLEX:
          return ['Flex 容器', 'Flex 內容', 'Flex 佈局', '控制積木'].includes(category.name);
        default:
          return true;
      }
    });
  }, [blockCategories, currentContext, showAllBlocks]);

  // 扁平化積木列表供虛擬化列表使用
  const flatBlockItems = useMemo(() => {
    const items: Array<{ block: BlockType; color: string; categoryName: string }> = [];
    
    filteredCategories.forEach(category => {
      category.blocks.forEach(block => {
        items.push({
          block,
          color: category.color,
          categoryName: category.name
        });
      });
    });
    
    return items;
  }, [filteredCategories]);

  const ITEM_HEIGHT = 80; // 每個積木項目的高度
  const CONTAINER_HEIGHT = Math.min(600, Math.max(200, flatBlockItems.length * ITEM_HEIGHT));

  return (
    <div className="w-80 bg-card text-card-foreground border-r border-border flex flex-col">
      {/* 標題區域 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">積木面板</h2>
          <div className="text-xs text-muted-foreground">
            {flatBlockItems.length} 個積木
          </div>
        </div>
        
        {/* 顯示模式切換 */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showAllBlocks"
            checked={showAllBlocks}
            onChange={(e) => onShowAllBlocksChange(e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="showAllBlocks" className="text-sm text-muted-foreground">
            顯示所有積木
          </label>
        </div>
        
        {/* 當前上下文指示器 */}
        <div className="mt-2 text-xs text-muted-foreground">
          當前模式: {currentContext === WorkspaceContext.LOGIC ? '邏輯編輯器' : 'Flex 設計器'}
        </div>
      </div>

      {/* 虛擬化積木列表 */}
      <div className="flex-1 overflow-hidden">
        {flatBlockItems.length > 0 ? (
          <List
            height={CONTAINER_HEIGHT}
            itemCount={flatBlockItems.length}
            itemSize={ITEM_HEIGHT}
            itemData={{ items: flatBlockItems }}
            overscanCount={5} // 預渲染額外的項目以提升滾動體驗
          >
            {BlockItem}
          </List>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <div className="text-sm">沒有可用的積木</div>
              <div className="text-xs mt-1">請切換顯示模式或工作區</div>
            </div>
          </div>
        )}
      </div>

      {/* 效能指示器 */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>虛擬化: 已啟用</span>
          <span>渲染: {Math.min(10, flatBlockItems.length)} / {flatBlockItems.length}</span>
        </div>
      </div>
    </div>
  );
});

VirtualizedBlockPalette.displayName = 'VirtualizedBlockPalette';

export default VirtualizedBlockPalette;
