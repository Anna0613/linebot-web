import React, { useState, useRef, useEffect, memo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { X, Settings, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { FlexMessageSummary } from '../../services/visualEditorApi';
import { useFlexMessageCache } from '../../hooks/useFlexMessageCache';

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
  flexMessageId?: string;
  flexMessageName?: string;
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
  onMove?: (dragIndex: number, hoverIndex: number) => void;
  onInsert?: (index: number, item: Block) => void;
}

const DroppedBlock: React.FC<DroppedBlockProps> = memo(({ 
  block, 
  index, 
  onRemove, 
  onUpdate, 
  onMove, 
  onInsert 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [blockData, setBlockData] = useState<BlockData>(block.blockData || {});
  const [showInsertZone, setShowInsertZone] = useState<'above' | 'below' | null>(null);
  const [flexMessages, setFlexMessages] = useState<FlexMessageSummary[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // 使用緩存 Hook
  const { getFlexMessages, isLoading: loadingFlexMessages } = useFlexMessageCache();

  // 載入FLEX訊息列表 - 使用緩存優化
  useEffect(() => {
    const loadFlexMessages = async () => {
      if (block.blockType === 'reply' && block.blockData.replyType === 'flex') {
        try {
          const messages = await getFlexMessages();
          setFlexMessages(messages);
        } catch (error) {
          console.error("Error occurred:", error);
          setFlexMessages([]);
        }
      }
    };

    loadFlexMessages();
  }, [block.blockType, block.blockData.replyType, getFlexMessages]);

  // 處理FLEX訊息選擇
  const handleFlexMessageSelect = (value: string) => {
    const selectedMessage = flexMessages.find(msg => msg.id === value);
    if (selectedMessage) {
      setBlockData({
        ...blockData,
        flexMessageId: value,
        flexMessageName: selectedMessage.name
      });
    }
  };

  // 拖拽功能 - 支持重排
  const [{ isDragging }, drag, _preview] = useDrag({
    type: 'dropped-block',
    item: () => ({ 
      index, 
      block,
      id: `dropped-${index}` 
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // 拖拽目標 - 支持插入和重排
  const [{ isOver, dropPosition: _dropPosition }, drop] = useDrop({
    accept: ['block', 'dropped-block'],
    hover: (item: Block & { index?: number; type?: string }, monitor) => {
      if (!ref.current) return;

      // 處理重排 (dropped-block 到 dropped-block)
      if (item.type === 'dropped-block' || (item.index !== undefined && typeof item.index === 'number')) {
        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) return;

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        
        if (!clientOffset) return;
        
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        // 設置插入位置提示
        if (hoverClientY < hoverMiddleY / 2) {
          setShowInsertZone('above');
        } else if (hoverClientY > hoverBoundingRect.height - hoverMiddleY / 2) {
          setShowInsertZone('below');
        } else {
          setShowInsertZone(null);
        }

        // 執行重排
        if (
          (dragIndex < hoverIndex && hoverClientY > hoverMiddleY) ||
          (dragIndex > hoverIndex && hoverClientY < hoverMiddleY)
        ) {
          if (onMove) {
            onMove(dragIndex, hoverIndex);
            item.index = hoverIndex;
          }
        }
      } else {
        // 處理新積木插入 (block 到 dropped-block)
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        
        if (!clientOffset) return;
        
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

        if (hoverClientY < hoverMiddleY) {
          setShowInsertZone('above');
        } else {
          setShowInsertZone('below');
        }
      }
    },
    drop: (item: Block & { index?: number; blockType?: string }, monitor) => {
      if (!ref.current) return;

      // 處理新積木插入
      if (item.blockType && onInsert) {
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        
        if (!clientOffset) return;
        
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

        const insertIndex = hoverClientY < hoverMiddleY ? index : index + 1;
        onInsert(insertIndex, item);
      }

      setShowInsertZone(null);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      dropPosition: showInsertZone,
    }),
  });

  // 清除插入區域提示
  const handleMouseLeave = () => {
    setShowInsertZone(null);
  };

  // 組合 drag 和 drop refs
  drag(drop(ref));

  const getBlockColor = (_blockType: string): string => {
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
                {/* 根據回覆類型顯示不同的編輯介面 */}
                {block.blockData.replyType === 'flex' ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white/80">選擇FLEX訊息模板:</div>
                    <Select 
                      value={blockData.flexMessageId || ''} 
                      onValueChange={handleFlexMessageSelect}
                      disabled={loadingFlexMessages}
                    >
                      <SelectTrigger className="text-black">
                        <SelectValue 
                          placeholder={loadingFlexMessages ? "載入中..." : "選擇FLEX訊息模板"} 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {flexMessages.length === 0 && !loadingFlexMessages ? (
                          <SelectItem value="" disabled>
                            沒有可用的FLEX訊息模板
                          </SelectItem>
                        ) : (
                          flexMessages.map((message) => (
                            <SelectItem key={message.id} value={message.id}>
                              {message.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {blockData.flexMessageName && (
                      <div className="text-xs text-white/60">
                        已選擇: {blockData.flexMessageName}
                      </div>
                    )}
                  </div>
                ) : blockData.replyType === 'flex' ? (
                  <div className="space-y-2">
                    <label className="text-xs text-white/80">Flex 訊息 JSON 內容：</label>
                    <Textarea
                      placeholder='請輸入 Flex 訊息 JSON，例如：
{
  "type": "bubble",
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": "Hello World",
        "size": "md",
        "weight": "regular",
        "color": "#000000"
      }
    ]
  }
}'
                      value={typeof blockData.flexContent === 'string' ? blockData.flexContent : JSON.stringify(blockData.flexContent || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setBlockData({...blockData, flexContent: parsed});
                        } catch {
                          // 如果 JSON 無效，暫時儲存為字串
                          setBlockData({...blockData, flexContent: e.target.value});
                        }
                      }}
                      className="text-black font-mono text-xs"
                      rows={8}
                    />
                  </div>
                ) : (
                  <Textarea
                    placeholder="回覆內容"
                    value={blockData.content || ''}
                    onChange={(e) => setBlockData({...blockData, content: e.target.value})}
                    className="text-black"
                    rows={3}
                  />
                )}
              </div>
            )}
            {/* 顯示當前的FLEX訊息內容（非編輯模式） */}
            {!isEditing && block.blockData.replyType === 'flex' && (
              <div className="text-xs text-white/70 mt-1">
                {block.blockData.flexMessageName ? (
                  <div>FLEX模板: {block.blockData.flexMessageName}</div>
                ) : block.blockData.flexContent && Object.keys(block.blockData.flexContent).length > 0 ? (
                  <div>
                    <div>自定義 Flex 訊息</div>
                    <div className="text-white/50 truncate">
                      {typeof block.blockData.flexContent === 'string'
                        ? block.blockData.flexContent.substring(0, 50) + '...'
                        : JSON.stringify(block.blockData.flexContent).substring(0, 50) + '...'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-orange-300">請設定 Flex 訊息內容</div>
                )}
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
    <div className="relative">
      {/* 上方插入區域 */}
      {showInsertZone === 'above' && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-400 rounded-full z-10 shadow-lg">
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
        </div>
      )}

      <div 
        ref={ref}
        onMouseLeave={handleMouseLeave}
        className={`${getBlockColor(block.blockType)} text-white p-3 rounded-lg shadow-sm transition-all duration-200 ${
          isDragging ? 'opacity-50 scale-95 rotate-2' : 'opacity-100 scale-100'
        } ${isOver ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 flex-1">
            {/* 拖拽手柄 */}
            <div className="pt-1 cursor-move hover:bg-white/20 p-1 rounded">
              <GripVertical className="h-4 w-4 text-white/70" />
            </div>
            <div className="flex-1">
              {renderBlockContent()}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            {/* 快速移動按鈕 */}
            {index > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => onMove && onMove(index, index - 1)}
                title="向上移動"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={() => onMove && onMove(index, index + 1)}
              title="向下移動"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={() => setIsEditing(!isEditing)}
              title="編輯設定"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={() => onRemove && onRemove(index)}
              title="刪除積木"
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

      {/* 下方插入區域 */}
      {showInsertZone === 'below' && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-400 rounded-full z-10 shadow-lg">
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // 記憶化比較函數 - 只在關鍵屬性變更時重新渲染
  return (
    prevProps.block === nextProps.block &&
    prevProps.index === nextProps.index &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onMove === nextProps.onMove &&
    prevProps.onInsert === nextProps.onInsert
  );
});

DroppedBlock.displayName = 'DroppedBlock';

export default DroppedBlock;