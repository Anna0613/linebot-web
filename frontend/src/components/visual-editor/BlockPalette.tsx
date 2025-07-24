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
  ArrowRight
} from 'lucide-react';

interface BlockCategoryProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const BlockCategory: React.FC<BlockCategoryProps> = ({ title, icon: Icon, children }) => (
  <div className="mb-4">
    <div className="flex items-center mb-2 text-sm font-medium text-gray-700">
      <Icon className="w-4 h-4 mr-2" />
      {title}
    </div>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

export const BlockPalette: React.FC = () => {
  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      <Tabs defaultValue="blocks" className="flex-1">
        <TabsList className="grid w-full grid-cols-2 m-2">
          <TabsTrigger value="blocks">邏輯積木</TabsTrigger>
          <TabsTrigger value="flex">Flex 組件</TabsTrigger>
        </TabsList>
        
        <TabsContent value="blocks" className="p-4 space-y-4 overflow-y-auto">
          <BlockCategory title="事件" icon={Zap}>
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
          </BlockCategory>
          
          <BlockCategory title="回覆" icon={MessageSquare}>
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
          </BlockCategory>
          
          <BlockCategory title="控制" icon={ArrowRight}>
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
          </BlockCategory>
          
          <BlockCategory title="設定" icon={Settings}>
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
          </BlockCategory>
        </TabsContent>
        
        <TabsContent value="flex" className="p-4 space-y-4 overflow-y-auto">
          <BlockCategory title="容器" icon={Square}>
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
          </BlockCategory>
          
          <BlockCategory title="內容" icon={Type}>
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
          </BlockCategory>
          
          <BlockCategory title="佈局" icon={MousePointer}>
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
          </BlockCategory>
        </TabsContent>
      </Tabs>
    </div>
  );
};