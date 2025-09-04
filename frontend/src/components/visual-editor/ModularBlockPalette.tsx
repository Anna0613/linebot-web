/**
 * 模組化積木調色板
 * 使用新的積木模組系統，從 568 行縮減到約 100 行
 */

import React from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DraggableBlock from './DraggableBlock';
import { Filter, Zap, MessageSquare, ArrowRight, Settings, Square, Type, MousePointer } from 'lucide-react';
import { WorkspaceContext } from '../../types/block';

// 簡化的積木定義 - 直接在組件中定義以避免複雜的模組依賴
const blockDefinitions = {
  event: [
    { blockType: 'event', name: '當收到文字訊息時', data: { title: '當收到文字訊息時', eventType: 'message.text' } },
    { blockType: 'event', name: '當收到圖片訊息時', data: { title: '當收到圖片訊息時', eventType: 'message.image' } },
    { blockType: 'event', name: '當用戶加入好友時', data: { title: '當用戶加入好友時', eventType: 'follow' } },
    { blockType: 'event', name: '當按鈕被點擊時', data: { title: '當按鈕被點擊時', eventType: 'postback' } }
  ],
  reply: [
    { blockType: 'reply', name: '回覆文字訊息', data: { title: '回覆文字訊息', replyType: 'text' } },
    { blockType: 'reply', name: '回覆圖片訊息', data: { title: '回覆圖片訊息', replyType: 'image' } },
    { blockType: 'reply', name: '回覆 Flex 訊息', data: { title: '回覆 Flex 訊息', replyType: 'flex' } },
    { blockType: 'reply', name: '回覆貼圖', data: { title: '回覆貼圖', replyType: 'sticker' } }
  ],
  control: [
    { blockType: 'control', name: '如果...那麼', data: { title: '如果...那麼', controlType: 'if' } },
    { blockType: 'control', name: '重複執行', data: { title: '重複執行', controlType: 'loop' } },
    { blockType: 'control', name: '等待', data: { title: '等待', controlType: 'wait' } }
  ],
  setting: [
    { blockType: 'setting', name: '設定變數', data: { title: '設定變數', settingType: 'setVariable' } },
    { blockType: 'setting', name: '取得變數', data: { title: '取得變數', settingType: 'getVariable' } },
    { blockType: 'setting', name: '儲存用戶資料', data: { title: '儲存用戶資料', settingType: 'saveUserData' } }
  ],
  flexContainer: [
    { blockType: 'flex-container', name: 'Bubble 容器', data: { title: 'Bubble 容器', containerType: 'bubble' } },
    { blockType: 'flex-container', name: 'Carousel 容器', data: { title: 'Carousel 容器', containerType: 'carousel' } },
    { blockType: 'flex-container', name: 'Box 容器', data: { title: 'Box 容器', containerType: 'box' } }
  ],
  flexContent: [
    { blockType: 'flex-content', name: '文字', data: { title: '文字', contentType: 'text' } },
    { blockType: 'flex-content', name: '圖片', data: { title: '圖片', contentType: 'image' } },
    { blockType: 'flex-content', name: '按鈕', data: { title: '按鈕', contentType: 'button' } },
    { blockType: 'flex-content', name: '分隔線', data: { title: '分隔線', contentType: 'separator' } }
  ],
  flexLayout: [
    { blockType: 'flex-layout', name: '間距', data: { title: '間距', layoutType: 'spacer' } },
    { blockType: 'flex-layout', name: '填充', data: { title: '填充', layoutType: 'filler' } }
    // 移除 '對齊' 積木，因為它不是標準 LINE Flex 組件
    // 對齊應該通過容器的 align 屬性來設定，而不是單獨的積木
  ]
};

const blockColors = {
  'event': 'bg-orange-500',
  'reply': 'bg-green-500',
  'control': 'bg-purple-500',
  'setting': 'bg-gray-500',
  'flex-container': 'bg-indigo-500',
  'flex-content': 'bg-blue-500',
  'flex-layout': 'bg-teal-500'
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'event': return Zap;
    case 'reply': return MessageSquare;
    case 'control': return ArrowRight;
    case 'setting': return Settings;
    case 'flexContainer': return Square;
    case 'flexContent': return Type;
    case 'flexLayout': return MousePointer;
    default: return Settings;
  }
};

interface ModularBlockPaletteProps {
  currentContext?: WorkspaceContext;
  showAllBlocks?: boolean;
  onShowAllBlocksChange?: (showAll: boolean) => void;
}

const BlockGroup: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="mb-4">
    <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
      <Icon className="w-4 h-4 mr-2" />
      {title}
    </div>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

export const ModularBlockPalette: React.FC<ModularBlockPaletteProps> = ({
  currentContext = WorkspaceContext.LOGIC,
  showAllBlocks = true,
  onShowAllBlocksChange
}) => {
  // 根據當前上下文自動決定活動標籤
  const getActiveTab = () => {
    switch (currentContext) {
      case WorkspaceContext.LOGIC:
        return 'logic';
      case WorkspaceContext.FLEX:
        return 'flex';
      default:
        return 'all';
    }
  };

  const renderBlocks = (blocks: Array<{blockType: string; name: string; data: Record<string, unknown>}>, color: string) =>
    blocks.map((block, index) => (
      <DraggableBlock
        key={`${block.blockType}-${index}`}
        blockType={block.blockType}
        blockData={block.data}
        color={color}
      >
        {block.name}
      </DraggableBlock>
    ));

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        {/* 當前模式指示器 */}
        <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {currentContext === WorkspaceContext.LOGIC ? '邏輯積木' : 'Flex 組件'}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                自動切換
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowAllBlocksChange?.(!showAllBlocks)}
              className="text-xs"
            >
              {showAllBlocks ? '僅顯示相容' : '顯示全部'}
            </Button>
          </div>
        </div>

        <Tabs value={getActiveTab()} className="flex-1 flex flex-col">
          {/* 隱藏標籤列表，因為現在由工作區上下文自動控制 */}
          <div className="hidden">
            <TabsList className="grid w-full grid-cols-3 m-2 flex-shrink-0">
              <TabsTrigger value="all">全部積木</TabsTrigger>
              <TabsTrigger value="logic">邏輯積木</TabsTrigger>
              <TabsTrigger value="flex">Flex 組件</TabsTrigger>
            </TabsList>
          </div>
          
          {/* 全部積木標籤 */}
          <TabsContent value="all" className="flex-1 overflow-hidden">
            <div 
              className="h-full p-4 space-y-4 overflow-y-scroll custom-scrollbar" 
              style={{ 
                maxHeight: 'calc(100vh - 200px)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc'
              }}
            >
              <BlockGroup title="事件" icon={getCategoryIcon('event')}>
                {renderBlocks(blockDefinitions.event, blockColors.event)}
              </BlockGroup>
              
              <BlockGroup title="回覆" icon={getCategoryIcon('reply')}>
                {renderBlocks(blockDefinitions.reply, blockColors.reply)}
              </BlockGroup>
              
              <BlockGroup title="控制" icon={getCategoryIcon('control')}>
                {renderBlocks(blockDefinitions.control, blockColors.control)}
              </BlockGroup>
              
              <BlockGroup title="設定" icon={getCategoryIcon('setting')}>
                {renderBlocks(blockDefinitions.setting, blockColors.setting)}
              </BlockGroup>

              <BlockGroup title="容器" icon={getCategoryIcon('flexContainer')}>
                {renderBlocks(blockDefinitions.flexContainer, blockColors['flex-container'])}
              </BlockGroup>
              
              <BlockGroup title="內容" icon={getCategoryIcon('flexContent')}>
                {renderBlocks(blockDefinitions.flexContent, blockColors['flex-content'])}
              </BlockGroup>
              
              <BlockGroup title="佈局" icon={getCategoryIcon('flexLayout')}>
                {renderBlocks(blockDefinitions.flexLayout, blockColors['flex-layout'])}
              </BlockGroup>
            </div>
          </TabsContent>

          {/* 邏輯積木標籤 */}
          <TabsContent value="logic" className="flex-1 overflow-hidden">
            <div 
              className="h-full p-4 space-y-4 overflow-y-scroll custom-scrollbar" 
              style={{ 
                maxHeight: 'calc(100vh - 200px)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc'
              }}
            >
              <BlockGroup title="事件" icon={getCategoryIcon('event')}>
                {renderBlocks(blockDefinitions.event, blockColors.event)}
              </BlockGroup>
              
              <BlockGroup title="回覆" icon={getCategoryIcon('reply')}>
                {renderBlocks(blockDefinitions.reply, blockColors.reply)}
              </BlockGroup>
              
              <BlockGroup title="控制" icon={getCategoryIcon('control')}>
                {renderBlocks(blockDefinitions.control, blockColors.control)}
              </BlockGroup>
              
              <BlockGroup title="設定" icon={getCategoryIcon('setting')}>
                {renderBlocks(blockDefinitions.setting, blockColors.setting)}
              </BlockGroup>
            </div>
          </TabsContent>

          {/* Flex 組件標籤 */}
          <TabsContent value="flex" className="flex-1 overflow-hidden">
            <div 
              className="h-full p-4 space-y-4 overflow-y-scroll custom-scrollbar" 
              style={{ 
                maxHeight: 'calc(100vh - 200px)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc'
              }}
            >
              <BlockGroup title="容器" icon={getCategoryIcon('flexContainer')}>
                {renderBlocks(blockDefinitions.flexContainer, blockColors['flex-container'])}
              </BlockGroup>
              
              <BlockGroup title="內容" icon={getCategoryIcon('flexContent')}>
                {renderBlocks(blockDefinitions.flexContent, blockColors['flex-content'])}
              </BlockGroup>
              
              <BlockGroup title="佈局" icon={getCategoryIcon('flexLayout')}>
                {renderBlocks(blockDefinitions.flexLayout, blockColors['flex-layout'])}
              </BlockGroup>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ModularBlockPalette;