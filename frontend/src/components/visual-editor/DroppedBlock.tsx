import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { X, Settings } from 'lucide-react';

interface BlockData {
  [key: string]: unknown;
  title?: string;
  condition?: string;
  content?: string;
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  url?: string;
  layout?: string;
  spacing?: string;
  eventType?: string;
  replyType?: string;
  controlType?: string;
  settingType?: string;
  containerType?: string;
  contentType?: string;
  layoutType?: string;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface DroppedBlockProps {
  block: Block;
  index: number;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: BlockData) => void;
}

const DroppedBlock: React.FC<DroppedBlockProps> = ({ block, index, onRemove, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [blockData, setBlockData] = useState<BlockData>(block.blockData || {});

  const getBlockColor = (blockType: string): string => {
    const colorMap: Record<string, string> = {
      'event': 'bg-orange-500',
      'reply': 'bg-green-500',
      'control': 'bg-purple-500',
      'setting': 'bg-gray-500',
      'flex-container': 'bg-indigo-500',
      'flex-content': 'bg-blue-500',
      'flex-layout': 'bg-teal-500'
    };
    return colorMap[block.blockType] || 'bg-blue-500';
  };

  const renderBlockContent = () => {
    switch (block.blockType) {
      case 'event':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-2">
                <Input 
                  placeholder="事件條件"
                  value={blockData.condition || ''}
                  onChange={(e) => setBlockData({...blockData, condition: e.target.value})}
                  className="text-black"
                />
              </div>
            )}
          </div>
        );
      case 'reply':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-2">
                <Textarea 
                  placeholder="回覆內容"
                  value={blockData.content || ''}
                  onChange={(e) => setBlockData({...blockData, content: e.target.value})}
                  className="text-black"
                  rows={3}
                />
              </div>
            )}
          </div>
        );
      case 'flex-content':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-2">
                {block.blockData.contentType === 'text' && (
                  <>
                    <Input 
                      placeholder="文字內容"
                      value={blockData.text || ''}
                      onChange={(e) => setBlockData({...blockData, text: e.target.value})}
                      className="text-black"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={blockData.size || 'md'} onValueChange={(value) => setBlockData({...blockData, size: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="文字大小" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xs">極小</SelectItem>
                          <SelectItem value="sm">小</SelectItem>
                          <SelectItem value="md">中</SelectItem>
                          <SelectItem value="lg">大</SelectItem>
                          <SelectItem value="xl">極大</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={blockData.weight || 'regular'} onValueChange={(value) => setBlockData({...blockData, weight: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="字重" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">一般</SelectItem>
                          <SelectItem value="bold">粗體</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input 
                      placeholder="文字顏色 (例如: #000000)"
                      value={blockData.color || ''}
                      onChange={(e) => setBlockData({...blockData, color: e.target.value})}
                      className="text-black"
                    />
                  </>
                )}
                {block.blockData.contentType === 'image' && (
                  <Input 
                    placeholder="圖片 URL"
                    value={blockData.url || ''}
                    onChange={(e) => setBlockData({...blockData, url: e.target.value})}
                    className="text-black"
                  />
                )}
                {block.blockData.contentType === 'button' && (
                  <Input 
                    placeholder="按鈕文字"
                    value={blockData.text || ''}
                    onChange={(e) => setBlockData({...blockData, text: e.target.value})}
                    className="text-black"
                  />
                )}
              </div>
            )}
          </div>
        );
      case 'flex-container':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && block.blockData.containerType === 'box' && (
              <div className="mt-2 space-y-2">
                <Select value={blockData.layout || 'vertical'} onValueChange={(value) => setBlockData({...blockData, layout: value})}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="佈局方向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">垂直</SelectItem>
                    <SelectItem value="horizontal">水平</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={blockData.spacing || 'md'} onValueChange={(value) => setBlockData({...blockData, spacing: value})}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="間距" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">極小</SelectItem>
                    <SelectItem value="sm">小</SelectItem>
                    <SelectItem value="md">中</SelectItem>
                    <SelectItem value="lg">大</SelectItem>
                    <SelectItem value="xl">極大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      case 'flex-layout':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && block.blockData.layoutType === 'spacer' && (
              <div className="mt-2 space-y-2">
                <Select value={blockData.size || 'md'} onValueChange={(value) => setBlockData({...blockData, size: value})}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="間距大小" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">極小</SelectItem>
                    <SelectItem value="sm">小</SelectItem>
                    <SelectItem value="md">中</SelectItem>
                    <SelectItem value="lg">大</SelectItem>
                    <SelectItem value="xl">極大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
          </div>
        );
    }
  };

  return (
    <div className={`${getBlockColor(block.blockType)} text-white p-3 rounded-lg shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {renderBlockContent()}
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={() => onRemove && onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (onUpdate) {
                onUpdate(index, blockData);
              }
              setIsEditing(false);
            }}
          >
            儲存設定
          </Button>
        </div>
      )}
    </div>
  );
};

export default DroppedBlock;