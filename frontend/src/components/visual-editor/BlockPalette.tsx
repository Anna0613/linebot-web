import React from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DraggableBlock from './DraggableBlock';
import { 
  MessageSquare, 
  Zap, 
  Settings, 
  Image, 
  Type, 
  Square,
  MousePointer,
  ArrowRight,
  Info,
  Filter
} from 'lucide-react';
import { BlockCategory, WorkspaceContext } from '../../types/block';
import { getBlockCompatibility, getBlockUsageSuggestions } from '../../utils/blockCompatibility';

interface BlockCategoryProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  context?: WorkspaceContext;
  categoryType?: BlockCategory;
}

const BlockCategory: React.FC<BlockCategoryProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  context, 
  categoryType 
}) => {
  const isCompatible = categoryType && context ? 
    getBlockCompatibility(categoryType).includes(context) : true;
  
  return (
    <div className={`mb-4 ${!isCompatible ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 mr-2" />
          {title}
          {!isCompatible && (
            <div className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              其他模式專用
            </div>
          )}
        </div>
        {categoryType && (
          <div className="group relative">
            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            <div className="invisible group-hover:visible absolute right-0 top-5 w-64 p-2 bg-black text-white text-xs rounded shadow-lg z-10">
              {getBlockUsageSuggestions(categoryType).map((suggestion, index) => (
                <div key={index}>• {suggestion}</div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

interface BlockPaletteProps {
  currentContext?: WorkspaceContext;
  showAllBlocks?: boolean;
  onShowAllBlocksChange?: (showAll: boolean) => void;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({ 
  currentContext = WorkspaceContext.LOGIC,
  showAllBlocks = true,
  onShowAllBlocksChange
}) => {
  // 根據當前上下文過濾積木
  const shouldShowCategory = (category: BlockCategory) => {
    if (showAllBlocks) return true;
    return getBlockCompatibility(category).includes(currentContext);
  };

  return (
    <>
      <style jsx>{`
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
              當前模式：{currentContext === WorkspaceContext.LOGIC ? '邏輯編輯器' : 'Flex 設計器'}
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

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2 flex-shrink-0">
          <TabsTrigger value="all">全部積木</TabsTrigger>
          <TabsTrigger value="logic">邏輯積木</TabsTrigger>
          <TabsTrigger value="flex">Flex 組件</TabsTrigger>
        </TabsList>
        
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
          <BlockCategory 
            title="事件" 
            icon={Zap} 
            context={currentContext}
            categoryType={BlockCategory.EVENT}
          >
            {shouldShowCategory(BlockCategory.EVENT) && (
              <>
                <DraggableBlock 
                  blockType="event" 
                  blockData={{ title: "當收到文字訊息時", eventType: "message.text" }}
                  color="bg-orange-500"
                >
                  當收到文字訊息時
                </DraggableBlock>
                <DraggableBlock 
                  blockType="event" 
                  blockData={{ title: "當收到圖片訊息時", eventType: "message.image" }}
                  color="bg-orange-500"
                >
                  當收到圖片訊息時
                </DraggableBlock>
                <DraggableBlock 
                  blockType="event" 
                  blockData={{ title: "當用戶加入好友時", eventType: "follow" }}
                  color="bg-orange-500"
                >
                  當用戶加入好友時
                </DraggableBlock>
                <DraggableBlock 
                  blockType="event" 
                  blockData={{ title: "當按鈕被點擊時", eventType: "postback" }}
                  color="bg-orange-500"
                >
                  當按鈕被點擊時
                </DraggableBlock>
              </>
            )}
          </BlockCategory>
          
          <BlockCategory 
            title="回覆" 
            icon={MessageSquare}
            context={currentContext}
            categoryType={BlockCategory.REPLY}
          >
            {shouldShowCategory(BlockCategory.REPLY) && (
              <>
                <DraggableBlock 
                  blockType="reply" 
                  blockData={{ title: "回覆文字訊息", replyType: "text" }}
                  color="bg-green-500"
                >
                  回覆文字訊息
                </DraggableBlock>
                <DraggableBlock 
                  blockType="reply" 
                  blockData={{ title: "回覆圖片訊息", replyType: "image" }}
                  color="bg-green-500"
                >
                  回覆圖片訊息
                </DraggableBlock>
                <DraggableBlock 
                  blockType="reply" 
                  blockData={{ title: "回覆 Flex 訊息", replyType: "flex" }}
                  color="bg-green-500"
                >
                  回覆 Flex 訊息
                </DraggableBlock>
                <DraggableBlock 
                  blockType="reply" 
                  blockData={{ title: "回覆貼圖", replyType: "sticker" }}
                  color="bg-green-500"
                >
                  回覆貼圖
                </DraggableBlock>
              </>
            )}
          </BlockCategory>
          
          <BlockCategory 
            title="控制" 
            icon={ArrowRight}
            context={currentContext}
            categoryType={BlockCategory.CONTROL}
          >
            {shouldShowCategory(BlockCategory.CONTROL) && (
              <>
                <DraggableBlock 
                  blockType="control" 
                  blockData={{ title: "如果...那麼", controlType: "if" }}
                  color="bg-purple-500"
                >
                  如果...那麼
                </DraggableBlock>
                <DraggableBlock 
                  blockType="control" 
                  blockData={{ title: "重複執行", controlType: "loop" }}
                  color="bg-purple-500"
                >
                  重複執行
                </DraggableBlock>
                <DraggableBlock 
                  blockType="control" 
                  blockData={{ title: "等待", controlType: "wait" }}
                  color="bg-purple-500"
                >
                  等待
                </DraggableBlock>
              </>
            )}
          </BlockCategory>
          
          <BlockCategory 
            title="設定" 
            icon={Settings}
            context={currentContext}
            categoryType={BlockCategory.SETTING}
          >
            {shouldShowCategory(BlockCategory.SETTING) && (
              <>
                <DraggableBlock 
                  blockType="setting" 
                  blockData={{ title: "設定變數", settingType: "setVariable" }}
                  color="bg-gray-500"
                >
                  設定變數
                </DraggableBlock>
                <DraggableBlock 
                  blockType="setting" 
                  blockData={{ title: "取得變數", settingType: "getVariable" }}
                  color="bg-gray-500"
                >
                  取得變數
                </DraggableBlock>
                <DraggableBlock 
                  blockType="setting" 
                  blockData={{ title: "儲存用戶資料", settingType: "saveUserData" }}
                  color="bg-gray-500"
                >
                  儲存用戶資料
                </DraggableBlock>
              </>
            )}
          </BlockCategory>

          <BlockCategory 
            title="容器" 
            icon={Square}
            context={currentContext}
            categoryType={BlockCategory.FLEX_CONTAINER}
          >
            {shouldShowCategory(BlockCategory.FLEX_CONTAINER) && (
              <>
                <DraggableBlock 
                  blockType="flex-container" 
                  blockData={{ title: "Bubble 容器", containerType: "bubble" }}
                  color="bg-indigo-500"
                >
                  Bubble 容器
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-container" 
                  blockData={{ title: "Carousel 容器", containerType: "carousel" }}
                  color="bg-indigo-500"
                >
                  Carousel 容器
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-container" 
                  blockData={{ title: "Box 容器", containerType: "box" }}
                  color="bg-indigo-500"
                >
                  Box 容器
                </DraggableBlock>
              </>
            )}
          </BlockCategory>
          
          <BlockCategory 
            title="內容" 
            icon={Type}
            context={currentContext}
            categoryType={BlockCategory.FLEX_CONTENT}
          >
            {shouldShowCategory(BlockCategory.FLEX_CONTENT) && (
              <>
                <DraggableBlock 
                  blockType="flex-content" 
                  blockData={{ title: "文字", contentType: "text" }}
                  color="bg-blue-500"
                >
                  文字
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-content" 
                  blockData={{ title: "圖片", contentType: "image" }}
                  color="bg-blue-500"
                >
                  圖片
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-content" 
                  blockData={{ title: "按鈕", contentType: "button" }}
                  color="bg-blue-500"
                >
                  按鈕
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-content" 
                  blockData={{ title: "分隔線", contentType: "separator" }}
                  color="bg-blue-500"
                >
                  分隔線
                </DraggableBlock>
              </>
            )}
          </BlockCategory>
          
          <BlockCategory 
            title="佈局" 
            icon={MousePointer}
            context={currentContext}
            categoryType={BlockCategory.FLEX_LAYOUT}
          >
            {shouldShowCategory(BlockCategory.FLEX_LAYOUT) && (
              <>
                <DraggableBlock 
                  blockType="flex-layout" 
                  blockData={{ title: "間距", layoutType: "spacer" }}
                  color="bg-teal-500"
                >
                  間距
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-layout" 
                  blockData={{ title: "填充", layoutType: "filler" }}
                  color="bg-teal-500"
                >
                  填充
                </DraggableBlock>
                <DraggableBlock 
                  blockType="flex-layout" 
                  blockData={{ title: "對齊", layoutType: "align" }}
                  color="bg-teal-500"
                >
                  對齊
                </DraggableBlock>
              </>
            )}
          </BlockCategory>
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
          <BlockCategory 
            title="事件" 
            icon={Zap}
            context={currentContext}
            categoryType={BlockCategory.EVENT}
          >
            <DraggableBlock 
              blockType="event" 
              blockData={{ title: "當收到文字訊息時", eventType: "message.text" }}
              color="bg-orange-500"
            >
              當收到文字訊息時
            </DraggableBlock>
            <DraggableBlock 
              blockType="event" 
              blockData={{ title: "當收到圖片訊息時", eventType: "message.image" }}
              color="bg-orange-500"
            >
              當收到圖片訊息時
            </DraggableBlock>
            <DraggableBlock 
              blockType="event" 
              blockData={{ title: "當用戶加入好友時", eventType: "follow" }}
              color="bg-orange-500"
            >
              當用戶加入好友時
            </DraggableBlock>
          </BlockCategory>

          <BlockCategory 
            title="回覆" 
            icon={MessageSquare}
            context={currentContext}
            categoryType={BlockCategory.REPLY}
          >
            <DraggableBlock 
              blockType="reply" 
              blockData={{ title: "回覆文字訊息", replyType: "text" }}
              color="bg-green-500"
            >
              回覆文字訊息
            </DraggableBlock>
            <DraggableBlock 
              blockType="reply" 
              blockData={{ title: "回覆 Flex 訊息", replyType: "flex" }}
              color="bg-green-500"
            >
              回覆 Flex 訊息
            </DraggableBlock>
          </BlockCategory>
          
          <BlockCategory 
            title="控制" 
            icon={ArrowRight}
            context={currentContext}
            categoryType={BlockCategory.CONTROL}
          >
            <DraggableBlock 
              blockType="control" 
              blockData={{ title: "如果...那麼", controlType: "if" }}
              color="bg-purple-500"
            >
              如果...那麼
            </DraggableBlock>
            <DraggableBlock 
              blockType="control" 
              blockData={{ title: "重複執行", controlType: "loop" }}
              color="bg-purple-500"
            >
              重複執行
            </DraggableBlock>
          </BlockCategory>
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
          <BlockCategory 
            title="容器" 
            icon={Square}
            context={currentContext}
            categoryType={BlockCategory.FLEX_CONTAINER}
          >
            <DraggableBlock 
              blockType="flex-container" 
              blockData={{ title: "Bubble 容器", containerType: "bubble" }}
              color="bg-indigo-500"
            >
              Bubble 容器
            </DraggableBlock>
            <DraggableBlock 
              blockType="flex-container" 
              blockData={{ title: "Box 容器", containerType: "box" }}
              color="bg-indigo-500"
            >
              Box 容器
            </DraggableBlock>
          </BlockCategory>
          
          <BlockCategory 
            title="內容" 
            icon={Type}
            context={currentContext}
            categoryType={BlockCategory.FLEX_CONTENT}
          >
            <DraggableBlock 
              blockType="flex-content" 
              blockData={{ title: "文字", contentType: "text" }}
              color="bg-blue-500"
            >
              文字
            </DraggableBlock>
            <DraggableBlock 
              blockType="flex-content" 
              blockData={{ title: "圖片", contentType: "image" }}
              color="bg-blue-500"
            >
              圖片
            </DraggableBlock>
            <DraggableBlock 
              blockType="flex-content" 
              blockData={{ title: "按鈕", contentType: "button" }}
              color="bg-blue-500"
            >
              按鈕
            </DraggableBlock>
          </BlockCategory>
          
          <BlockCategory 
            title="佈局" 
            icon={MousePointer}
            context={currentContext}
            categoryType={BlockCategory.FLEX_LAYOUT}
          >
            <DraggableBlock 
              blockType="flex-layout" 
              blockData={{ title: "間距", layoutType: "spacer" }}
              color="bg-teal-500"
            >
              間距
            </DraggableBlock>
            <DraggableBlock 
              blockType="flex-layout" 
              blockData={{ title: "填充", layoutType: "filler" }}
              color="bg-teal-500"
            >
              填充
            </DraggableBlock>
          </BlockCategory>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
};