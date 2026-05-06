/**
 * 模組化積木調色板
 * 使用新的積木模組系統，從 568 行縮減到約 100 行
 */

import React from 'react';
import DraggableBlock from './DraggableBlock';
import { Zap, MessageSquare, ArrowRight, Settings, Square, Type, MousePointer } from 'lucide-react';
import { WorkspaceContext } from '@/features/visual-editor/types/block';

// 簡化的積木定義 - 直接在組件中定義以避免複雜的模組依賴
const blockDefinitions = {
  event: [
    { blockType: 'event', name: '當收到文字訊息時', data: { title: '當收到文字訊息時', eventType: 'message.text' } },
    { blockType: 'event', name: '當收到圖片訊息時', data: { title: '當收到圖片訊息時', eventType: 'message.image' } },
    { blockType: 'event', name: '當好友加入時', data: { title: '當好友加入時', eventType: 'follow' } },
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
    { blockType: 'setting', name: '儲存好友資料', data: { title: '儲存好友資料', settingType: 'saveUserData' } }
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
  'event': 'bg-amber-600',
  'reply': 'bg-emerald-600',
  'control': 'bg-slate-700',
  'setting': 'bg-slate-500',
  'flex-container': 'bg-sky-600',
  'flex-content': 'bg-[#16a34a]',
  'flex-layout': 'bg-teal-600'
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
}

const BlockGroup: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="mb-4">
    <div className="mb-2 flex items-center text-sm font-semibold text-slate-700">
      <Icon className="w-4 h-4 mr-2" />
      {title}
    </div>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const PaletteScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="custom-scrollbar h-full space-y-4 overflow-y-scroll p-4"
    style={{
      maxHeight: 'calc(100vh - 120px)',
      scrollbarWidth: 'thin',
      scrollbarColor: '#cbd5e0 #f7fafc'
    }}
  >
    {children}
  </div>
);

export const ModularBlockPalette: React.FC<ModularBlockPaletteProps> = ({
  currentContext = WorkspaceContext.LOGIC
}) => {
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
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      
      <div className="flex h-full w-80 flex-col bg-transparent">
        {currentContext === WorkspaceContext.FLEX ? (
          <PaletteScroll>
            <BlockGroup title="容器" icon={getCategoryIcon('flexContainer')}>
              {renderBlocks(blockDefinitions.flexContainer, blockColors['flex-container'])}
            </BlockGroup>

            <BlockGroup title="內容" icon={getCategoryIcon('flexContent')}>
              {renderBlocks(blockDefinitions.flexContent, blockColors['flex-content'])}
            </BlockGroup>

            <BlockGroup title="佈局" icon={getCategoryIcon('flexLayout')}>
              {renderBlocks(blockDefinitions.flexLayout, blockColors['flex-layout'])}
            </BlockGroup>
          </PaletteScroll>
        ) : (
          <PaletteScroll>
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
          </PaletteScroll>
        )}
      </div>
    </>
  );
};

export default ModularBlockPalette;
