import React, { useState, useRef, useEffect, memo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { X, Settings, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { FlexMessageSummary } from '../../services/visualEditorApi';
import { useFlexMessageCache } from '../../hooks/useFlexMessageCache';
import { 
  ActionEditor, 
  ColorPicker,
  SizeSelector,
  AlignmentSelector,
  MarginPaddingEditor,
  type ActionData,
  type AlignType,
  type GravityType
} from './editors';

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

  // 監聽 block.blockData 變化，更新本地狀態
  useEffect(() => {
    setBlockData(block.blockData || {});
  }, [block.blockData]);

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
                {/* 根據事件類型顯示不同的輸入介面 */}
                {block.blockData.eventType === 'message.text' && (
                  <div className="space-y-2">
                    {/* 匹配模式選擇 */}
                    <Select
                      value={blockData.matchMode || 'contains'}
                      onValueChange={(value) => setBlockData({...blockData, matchMode: value})}
                    >
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="匹配模式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">包含關鍵字</SelectItem>
                        <SelectItem value="exact">完全匹配</SelectItem>
                        <SelectItem value="startsWith">開頭匹配</SelectItem>
                        <SelectItem value="endsWith">結尾匹配</SelectItem>
                        <SelectItem value="regex">正則表達式（進階）</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 關鍵字輸入 */}
                    <Input
                      placeholder={
                        blockData.matchMode === 'regex'
                          ? "輸入正則表達式 (例如: ^hello.*)"
                          : "輸入關鍵字或文字 (例如: hello)"
                      }
                      value={String(blockData.pattern || '')}
                      onChange={(e) => setBlockData({...blockData, pattern: e.target.value})}
                      className="text-black"
                    />

                    {/* 區分大小寫選項 */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`caseSensitive-${index}`}
                        checked={Boolean(blockData.caseSensitive) || false}
                        onChange={(e) => setBlockData({...blockData, caseSensitive: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`caseSensitive-${index}`} className="text-xs text-white/80">
                        區分大小寫
                      </label>
                    </div>

                    {/* 匹配模式說明 */}
                    <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                      <div className="font-medium mb-1">匹配說明:</div>
                      {blockData.matchMode === 'contains' && '訊息中包含關鍵字即觸發'}
                      {blockData.matchMode === 'exact' && '訊息內容完全相同才觸發'}
                      {blockData.matchMode === 'startsWith' && '訊息以關鍵字開頭才觸發'}
                      {blockData.matchMode === 'endsWith' && '訊息以關鍵字結尾才觸發'}
                      {blockData.matchMode === 'regex' && '使用正則表達式進行匹配（進階功能）'}
                    </div>
                  </div>
                )}
                {block.blockData.eventType === 'postback' && (
                  <Input 
                    placeholder="按鈕回傳資料"
                    value={String(blockData.data || '')}
                    onChange={(e) => setBlockData({...blockData, data: e.target.value})}
                    className="text-black"
                  />
                )}
                {(!block.blockData.eventType || (block.blockData.eventType !== 'message.text' && block.blockData.eventType !== 'postback')) && (
                  <Input 
                    placeholder="事件條件"
                    value={blockData.condition || ''}
                    onChange={(e) => setBlockData({...blockData, condition: e.target.value})}
                    className="text-black"
                  />
                )}
              </div>
            )}
            {/* 顯示當前設定的條件（非編輯模式） */}
            {!isEditing && (
              <div className="text-xs text-white/70 mt-1">
                {block.blockData.eventType === 'message.text' && block.blockData.pattern && (
                  <div>觸發條件: "{String(block.blockData.pattern)}"</div>
                )}
                {block.blockData.eventType === 'postback' && block.blockData.data && (
                  <div>按鈕資料: {String(block.blockData.data)}</div>
                )}
                {block.blockData.condition && (
                  <div>條件: {block.blockData.condition}</div>
                )}
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
                          <SelectItem value="no-templates" disabled>
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
                ) : block.blockData.replyType === 'image' ? (
                  <div className="space-y-2">
                    <label className="text-xs text-white/80">圖片回覆設定：</label>
                    <Input 
                      placeholder="原始圖片URL (必填)"
                      value={blockData.originalContentUrl || ''}
                      onChange={(e) => setBlockData({...blockData, originalContentUrl: e.target.value})}
                      className="text-black"
                    />
                    <Input 
                      placeholder="預覽圖片URL (必填)"
                      value={blockData.previewImageUrl || ''}
                      onChange={(e) => setBlockData({...blockData, previewImageUrl: e.target.value})}
                      className="text-black"
                    />
                    <div className="text-xs text-white/60">
                      • 原始圖片: 用戶點擊時顯示的高解析度圖片<br/>
                      • 預覽圖片: 聊天室中顯示的縮圖 (建議 240x240px)
                    </div>
                    {blockData.originalContentUrl && (
                      <div className="bg-white/5 p-2 rounded">
                        <div className="text-xs text-white/70 mb-1">圖片預覽:</div>
                        <img 
                          src={blockData.previewImageUrl || blockData.originalContentUrl} 
                          alt="圖片預覽" 
                          className="max-w-full max-h-32 rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDI0MCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIyNDAiIGZpbGw9IiNGMEYwRjAiLz48dGV4dCB4PSIxMjAiIHk9IjEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSI+5Zue55qE6KeJ5Zy5</text></svg>';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : block.blockData.replyType === 'sticker' ? (
                  <div className="space-y-2">
                    <label className="text-xs text-white/80">貼圖回覆設定：</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        placeholder="貼圖包ID"
                        value={blockData.packageId || ''}
                        onChange={(e) => setBlockData({...blockData, packageId: e.target.value})}
                        className="text-black"
                      />
                      <Input 
                        placeholder="貼圖ID"
                        value={blockData.stickerId || ''}
                        onChange={(e) => setBlockData({...blockData, stickerId: e.target.value})}
                        className="text-black"
                      />
                    </div>
                    <div className="text-xs text-white/60">
                      常用貼圖包：<br/>
                      • 包ID 1: LINE 官方貼圖 (貼圖ID: 1-17)<br/>
                      • 包ID 2: LINE 表情符號 (貼圖ID: 144-180)<br/>
                      • 包ID 3: 熊大兔兔 (貼圖ID: 180-259)
                    </div>
                    {/* 快速選擇常用貼圖 */}
                    <div className="bg-white/5 p-2 rounded">
                      <div className="text-xs text-white/70 mb-1">快速選擇:</div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          {packageId: '1', stickerId: '1', name: '😊'},
                          {packageId: '1', stickerId: '2', name: '😢'},
                          {packageId: '1', stickerId: '3', name: '😍'},
                          {packageId: '1', stickerId: '4', name: '😂'},
                          {packageId: '1', stickerId: '5', name: '😡'},
                          {packageId: '2', stickerId: '144', name: '👍'},
                          {packageId: '2', stickerId: '145', name: '👎'},
                          {packageId: '2', stickerId: '146', name: '❤️'}
                        ].map((sticker, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setBlockData({
                              ...blockData, 
                              packageId: sticker.packageId, 
                              stickerId: sticker.stickerId
                            })}
                          >
                            {sticker.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs text-white/80">回覆文字內容：</label>
                    <Textarea
                      placeholder="請輸入回覆內容 (例如: 321)"
                      value={String(blockData.text || '')}
                      onChange={(e) => setBlockData({...blockData, text: e.target.value})}
                      className="text-black"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
            {/* 顯示當前的回覆內容（非編輯模式） */}
            {!isEditing && (
              <div className="text-xs text-white/70 mt-1">
                {block.blockData.replyType === 'flex' ? (
                  block.blockData.flexMessageName ? (
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
                  )
                ) : block.blockData.replyType === 'image' ? (
                  // 顯示圖片回覆內容
                  (block.blockData.originalContentUrl && block.blockData.previewImageUrl) ? (
                    <div className="space-y-1">
                      <div>圖片回覆: 已設定圖片</div>
                      <div className="text-white/50 text-xs">
                        預覽: {block.blockData.previewImageUrl.substring(0, 30)}...
                      </div>
                    </div>
                  ) : (
                    <div className="text-orange-300">請設定圖片URL</div>
                  )
                ) : block.blockData.replyType === 'sticker' ? (
                  // 顯示貼圖回覆內容
                  (block.blockData.packageId && block.blockData.stickerId) ? (
                    <div>
                      貼圖回覆: 包{block.blockData.packageId} - 圖{block.blockData.stickerId}
                    </div>
                  ) : (
                    <div className="text-orange-300">請設定貼圖ID</div>
                  )
                ) : (
                  // 顯示一般回覆內容
                  (block.blockData.text || block.blockData.content) ? (
                    <div>回覆內容: "{block.blockData.text || block.blockData.content}"</div>
                  ) : (
                    <div className="text-orange-300">請設定回覆內容</div>
                  )
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
                  <div className="space-y-3">
                    {/* 文字內容 */}
                    <Textarea 
                      placeholder="文字內容"
                      value={blockData.text || ''}
                      onChange={(e) => setBlockData({...blockData, text: e.target.value})}
                      className="text-black"
                      rows={2}
                    />
                    
                    {/* 文字樣式 */}
                    <div className="grid grid-cols-2 gap-2">
                      <SizeSelector
                        type="text-size"
                        value={blockData.size || 'md'}
                        onChange={(size) => setBlockData({...blockData, size})}
                        label="文字大小"
                      />
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

                    {/* 顏色和樣式 */}
                    <div className="grid grid-cols-2 gap-2">
                      <ColorPicker
                        value={blockData.color || '#000000'}
                        onChange={(color) => setBlockData({...blockData, color})}
                        label="文字顏色"
                      />
                      <Select value={blockData.style || 'normal'} onValueChange={(value) => setBlockData({...blockData, style: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="文字樣式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">一般</SelectItem>
                          <SelectItem value="italic">斜體</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 對齊設定 */}
                    <AlignmentSelector
                      type="both"
                      alignValue={blockData.align as AlignType}
                      gravityValue={blockData.gravity as GravityType}
                      onAlignChange={(align) => setBlockData({...blockData, align})}
                      onGravityChange={(gravity) => setBlockData({...blockData, gravity})}
                      label="對齊設定"
                      showVisual={true}
                    />

                    {/* 進階設定 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-white/80">最大行數</label>
                        <Input
                          type="number"
                          value={blockData.maxLines || '0'}
                          onChange={(e) => setBlockData({...blockData, maxLines: parseInt(e.target.value) || 0})}
                          className="text-black"
                          min="0"
                          max="20"
                          placeholder="0=無限制"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-white/80">自動換行</label>
                        <Select value={blockData.wrap ? 'true' : 'false'} onValueChange={(value) => setBlockData({...blockData, wrap: value === 'true'})}>
                          <SelectTrigger className="text-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">開啟</SelectItem>
                            <SelectItem value="false">關閉</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-white/80">彈性比例</label>
                        <Input
                          type="number"
                          value={blockData.flex || '0'}
                          onChange={(e) => setBlockData({...blockData, flex: parseInt(e.target.value) || 0})}
                          className="text-black"
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>

                    {/* 邊距設定 */}
                    <MarginPaddingEditor
                      type="margin"
                      value={
                        blockData.margin ? 
                        { all: blockData.margin } : 
                        {}
                      }
                      onChange={(margin) => setBlockData({...blockData, margin: margin.all || 'none'})}
                      label="外邊距"
                      showUnifiedMode={true}
                    />
                  </div>
                )}
                {block.blockData.contentType === 'image' && (
                  <div className="space-y-3">
                    {/* 圖片URL */}
                    <div className="space-y-2">
                      <Input 
                        placeholder="圖片 URL"
                        value={blockData.url || ''}
                        onChange={(e) => setBlockData({...blockData, url: e.target.value})}
                        className="text-black"
                      />
                      {blockData.url && (
                        <div className="bg-white/5 p-2 rounded">
                          <div className="text-xs text-white/70 mb-1">圖片預覽:</div>
                          <img 
                            src={blockData.url} 
                            alt="圖片預覽" 
                            className="max-w-full max-h-32 rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDI0MCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIyNDAiIGZpbGw9IiNGMEYwRjAiLz48dGV4dCB4PSIxMjAiIHk9IjEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSI+5Zue55qE6KeJ5Zy5</text></svg>';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 圖片尺寸和比例 */}
                    <div className="grid grid-cols-2 gap-2">
                      <SizeSelector
                        type="image-size"
                        value={blockData.size || 'full'}
                        onChange={(size) => setBlockData({...blockData, size})}
                        label="圖片尺寸"
                      />
                      <Select value={blockData.aspectRatio || '20:13'} onValueChange={(value) => setBlockData({...blockData, aspectRatio: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="寬高比" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">正方形 (1:1)</SelectItem>
                          <SelectItem value="1.51:1">照片 (1.51:1)</SelectItem>
                          <SelectItem value="20:13">預設 (20:13)</SelectItem>
                          <SelectItem value="16:9">寬螢幕 (16:9)</SelectItem>
                          <SelectItem value="4:3">標準 (4:3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 顯示模式 */}
                    <Select value={blockData.aspectMode || 'cover'} onValueChange={(value) => setBlockData({...blockData, aspectMode: value})}>
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="顯示模式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">填滿 (可能裁切)</SelectItem>
                        <SelectItem value="fit">完整顯示 (可能有空白)</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 對齊和背景色 */}
                    <div className="grid grid-cols-2 gap-2">
                      <AlignmentSelector
                        type="align"
                        alignValue={blockData.align as AlignType}
                        onAlignChange={(align) => setBlockData({...blockData, align})}
                        label="水平對齊"
                        showVisual={false}
                      />
                      <AlignmentSelector
                        type="gravity"
                        gravityValue={blockData.gravity as GravityType}
                        onGravityChange={(gravity) => setBlockData({...blockData, gravity})}
                        label="垂直對齊"
                        showVisual={false}
                      />
                    </div>

                    {/* 背景色和邊距 */}
                    <div className="grid grid-cols-2 gap-2">
                      <ColorPicker
                        value={blockData.backgroundColor || 'transparent'}
                        onChange={(backgroundColor) => setBlockData({...blockData, backgroundColor})}
                        label="背景顏色"
                      />
                      <div className="space-y-1">
                        <label className="text-xs text-white/80">彈性比例</label>
                        <Input
                          type="number"
                          value={blockData.flex || '0'}
                          onChange={(e) => setBlockData({...blockData, flex: parseInt(e.target.value) || 0})}
                          className="text-black"
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>

                    {/* 邊距設定 */}
                    <MarginPaddingEditor
                      type="margin"
                      value={
                        blockData.margin ? 
                        { all: blockData.margin } : 
                        {}
                      }
                      onChange={(margin) => setBlockData({...blockData, margin: margin.all || 'none'})}
                      label="外邊距"
                      showUnifiedMode={true}
                    />

                    {/* 點擊動作（可選） */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableImageAction"
                          checked={!!blockData.action}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBlockData({...blockData, action: { type: 'uri', label: '圖片', uri: '' }});
                            } else {
                              const newData = { ...blockData };
                              delete newData.action;
                              setBlockData(newData);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="enableImageAction" className="text-xs text-white/80">
                          設定點擊動作
                        </label>
                      </div>
                      {blockData.action && (
                        <ActionEditor
                          value={blockData.action as ActionData}
                          onChange={(action) => setBlockData({...blockData, action})}
                          label="點擊動作"
                          showLabel={false}
                        />
                      )}
                    </div>
                  </div>
                )}
                {block.blockData.contentType === 'button' && (
                  <div className="space-y-2">
                    <ActionEditor
                      value={(blockData.action as ActionData) || { type: 'postback', label: '' }}
                      onChange={(action) => setBlockData({...blockData, action})}
                      label="按鈕動作設定"
                      showLabel={true}
                    />
                    {/* 按鈕樣式設定 */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={blockData.height || 'sm'} onValueChange={(value) => setBlockData({...blockData, height: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="按鈕高度" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">小按鈕</SelectItem>
                          <SelectItem value="md">中按鈕</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={blockData.style || 'primary'} onValueChange={(value) => setBlockData({...blockData, style: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="按鈕樣式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">主要按鈕</SelectItem>
                          <SelectItem value="secondary">次要按鈕</SelectItem>
                          <SelectItem value="link">連結樣式</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {block.blockData.contentType === 'separator' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/90">分隔線設定</label>
                    
                    {/* 邊距設定 */}
                    <MarginPaddingEditor
                      type="margin"
                      value={blockData.margin ? (typeof blockData.margin === 'string' ? { all: blockData.margin } : blockData.margin) : {}}
                      onChange={(margin) => setBlockData({...blockData, margin})}
                      label="邊距設定"
                      showUnifiedMode={true}
                    />
                    
                    {/* 顏色設定 */}
                    <ColorPicker
                      label="分隔線顏色"
                      value={blockData.color}
                      onChange={(color) => setBlockData({...blockData, color})}
                      showPresets={true}
                    />
                    
                    <div className="text-xs text-white/60 bg-white/5 p-2 rounded">
                      分隔線用於在Flex訊息中創建視覺分割效果
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'flex-container':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-3">
                {block.blockData.containerType === 'box' && (
                  <>
                    {/* 基本佈局設定 */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={blockData.layout || 'vertical'} onValueChange={(value) => setBlockData({...blockData, layout: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="佈局方向" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vertical">垂直</SelectItem>
                          <SelectItem value="horizontal">水平</SelectItem>
                        </SelectContent>
                      </Select>
                      <SizeSelector
                        type="spacing"
                        value={blockData.spacing || 'md'}
                        onChange={(spacing) => setBlockData({...blockData, spacing})}
                        label="內容間距"
                      />
                    </div>

                    {/* 邊距設定 */}
                    <MarginPaddingEditor
                      type="margin"
                      value={
                        blockData.margin ? 
                        { all: blockData.margin } : 
                        {}
                      }
                      onChange={(margin) => setBlockData({...blockData, margin: margin.all || 'none'})}
                      label="外邊距"
                      showUnifiedMode={true}
                    />

                    {/* 內邊距設定 */}
                    <MarginPaddingEditor
                      type="padding"
                      value={{
                        all: blockData.paddingAll,
                        top: blockData.paddingTop,
                        right: blockData.paddingEnd,
                        bottom: blockData.paddingBottom,
                        left: blockData.paddingStart
                      }}
                      onChange={(padding) => setBlockData({
                        ...blockData,
                        paddingAll: padding.all,
                        paddingTop: padding.top,
                        paddingBottom: padding.bottom,
                        paddingStart: padding.left,
                        paddingEnd: padding.right
                      })}
                      label="內邊距"
                      showUnifiedMode={true}
                    />

                    {/* 顏色和邊框 */}
                    <div className="space-y-2">
                      <ColorPicker
                        value={blockData.backgroundColor || 'transparent'}
                        onChange={(backgroundColor) => setBlockData({...blockData, backgroundColor})}
                        label="背景顏色"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <ColorPicker
                          value={blockData.borderColor || 'transparent'}
                          onChange={(borderColor) => setBlockData({...blockData, borderColor})}
                          label="邊框顏色"
                        />
                        <SizeSelector
                          type="border-width"
                          value={blockData.borderWidth || 'none'}
                          onChange={(borderWidth) => setBlockData({...blockData, borderWidth})}
                          label="邊框寬度"
                        />
                      </div>
                      <SizeSelector
                        type="corner-radius"
                        value={blockData.cornerRadius || 'none'}
                        onChange={(cornerRadius) => setBlockData({...blockData, cornerRadius})}
                        label="圓角"
                      />
                    </div>
                  </>
                )}

                {block.blockData.containerType === 'bubble' && (
                  <div className="space-y-2">
                    <Select value={blockData.size || 'mega'} onValueChange={(value) => setBlockData({...blockData, size: value})}>
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="Bubble 尺寸" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nano">極小 (Nano)</SelectItem>
                        <SelectItem value="micro">小 (Micro)</SelectItem>
                        <SelectItem value="deca">中 (Deca)</SelectItem>
                        <SelectItem value="hecto">大 (Hecto)</SelectItem>
                        <SelectItem value="kilo">極大 (Kilo)</SelectItem>
                        <SelectItem value="mega">超大 (Mega)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={blockData.direction || 'ltr'} onValueChange={(value) => setBlockData({...blockData, direction: value})}>
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="文字方向" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ltr">左到右</SelectItem>
                        <SelectItem value="rtl">右到左</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {block.blockData.containerType === 'carousel' && (
                  <div className="text-xs text-white/70">
                    Carousel 容器會自動管理其內容的佈局
                  </div>
                )}
              </div>
            )}
            {/* 顯示當前設定的參數（非編輯模式） */}
            {!isEditing && (
              <div className="text-xs text-white/70 mt-1">
                {block.blockData.containerType === 'box' && (
                  <div>
                    佈局: {blockData.layout === 'horizontal' ? '水平' : '垂直'} | 
                    間距: {blockData.spacing || 'md'}
                    {blockData.backgroundColor && blockData.backgroundColor !== 'transparent' && (
                      <div>背景: {blockData.backgroundColor}</div>
                    )}
                  </div>
                )}
                {block.blockData.containerType === 'bubble' && (
                  <div>
                    尺寸: {blockData.size || 'mega'} | 方向: {blockData.direction === 'rtl' ? '右到左' : '左到右'}
                  </div>
                )}
                {block.blockData.containerType === 'carousel' && (
                  <div>輪播容器</div>
                )}
              </div>
            )}
          </div>
        );
      case 'flex-layout':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-3">
                {block.blockData.layoutType === 'spacer' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/90">間距設定</label>
                    <SizeSelector
                      type="spacer"
                      value={blockData.size}
                      onChange={(size) => setBlockData({...blockData, size})}
                      label="間距大小"
                      showVisual={false}
                    />
                  </div>
                )}
                
                {block.blockData.layoutType === 'filler' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/90">填充設定</label>
                    
                    {/* Flex 比例設定 */}
                    <div className="space-y-2">
                      <label className="text-xs text-white/80">Flex 比例</label>
                      <SizeSelector
                        type="flex"
                        value={blockData.flex}
                        onChange={(flex) => setBlockData({...blockData, flex})}
                        label=""
                        showVisual={false}
                      />
                      <div className="text-xs text-white/60 bg-white/5 p-2 rounded">
                        設定填充區域的彈性比例，數值越大佔用空間越多
                      </div>
                    </div>
                  </div>
                )}
                
                {block.blockData.layoutType === 'align' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/90">對齊設定</label>
                    
                    {/* 對齊控制 */}
                    <AlignmentSelector
                      type="both"
                      alignValue={blockData.align}
                      gravityValue={blockData.gravity}
                      onAlignChange={(align) => setBlockData({...blockData, align})}
                      onGravityChange={(gravity) => setBlockData({...blockData, gravity})}
                      label=""
                      showVisual={true}
                    />
                    
                    <div className="text-xs text-white/60 bg-white/5 p-2 rounded">
                      設定容器中子元素的對齊方式
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'control':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-2">
                {block.blockData.controlType === 'if' && (
                  <div className="space-y-2">
                    {/* 條件類型選擇 */}
                    <Select
                      value={blockData.conditionType || 'message'}
                      onValueChange={(value) => setBlockData({...blockData, conditionType: value})}
                    >
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="條件類型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="message">訊息內容</SelectItem>
                        <SelectItem value="variable">變數</SelectItem>
                        <SelectItem value="user">用戶屬性</SelectItem>
                        <SelectItem value="custom">自訂條件</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 根據條件類型顯示不同的輸入 */}
                    {blockData.conditionType !== 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* 比較運算符 */}
                        <Select
                          value={blockData.operator || '=='}
                          onValueChange={(value) => setBlockData({...blockData, operator: value})}
                        >
                          <SelectTrigger className="text-black">
                            <SelectValue placeholder="運算符" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="==">等於 (==)</SelectItem>
                            <SelectItem value="!=">不等於 (!=)</SelectItem>
                            <SelectItem value="in">包含 (in)</SelectItem>
                            <SelectItem value="not in">不包含 (not in)</SelectItem>
                            <SelectItem value=">">大於 (&gt;)</SelectItem>
                            <SelectItem value="<">小於 (&lt;)</SelectItem>
                            <SelectItem value=">=">大於等於 (&gt;=)</SelectItem>
                            <SelectItem value="<=">小於等於 (&lt;=)</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* 比較值 */}
                        <Input
                          placeholder="比較值"
                          value={blockData.compareValue || ''}
                          onChange={(e) => setBlockData({...blockData, compareValue: e.target.value})}
                          className="text-black"
                        />
                      </div>
                    )}

                    {/* 自訂條件 */}
                    {blockData.conditionType === 'custom' && (
                      <Input
                        placeholder="輸入條件表達式（例如: user_message == 'hello'）"
                        value={blockData.condition || ''}
                        onChange={(e) => setBlockData({...blockData, condition: e.target.value})}
                        className="text-black"
                      />
                    )}

                    {/* 條件預覽 */}
                    <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                      <div className="font-medium mb-1">條件預覽:</div>
                      <code className="text-white/80">
                        {blockData.conditionType === 'custom'
                          ? (blockData.condition || '未設定')
                          : `${blockData.conditionType === 'message' ? 'user_message' : blockData.conditionType === 'variable' ? '變數名稱' : 'user_id'} ${blockData.operator || '=='} "${blockData.compareValue || '值'}"`
                        }
                      </code>
                    </div>
                  </div>
                )}
                {block.blockData.controlType === 'loop' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={blockData.loopType || 'count'} onValueChange={(value) => setBlockData({...blockData, loopType: value})}>
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="迴圈類型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="count">指定次數</SelectItem>
                          <SelectItem value="while">條件迴圈</SelectItem>
                          <SelectItem value="foreach">遍歷清單</SelectItem>
                        </SelectContent>
                      </Select>
                      {blockData.loopType === 'count' ? (
                        <Input 
                          type="number"
                          placeholder="次數"
                          value={blockData.loopCount || '1'}
                          onChange={(e) => setBlockData({...blockData, loopCount: parseInt(e.target.value) || 1})}
                          className="text-black"
                          min="1"
                          max="100"
                        />
                      ) : blockData.loopType === 'while' ? (
                        <Input 
                          placeholder="條件"
                          value={blockData.condition || ''}
                          onChange={(e) => setBlockData({...blockData, condition: e.target.value})}
                          className="text-black"
                        />
                      ) : (
                        <Input 
                          placeholder="清單變數"
                          value={blockData.listVariable || ''}
                          onChange={(e) => setBlockData({...blockData, listVariable: e.target.value})}
                          className="text-black"
                        />
                      )}
                    </div>
                  </div>
                )}
                {block.blockData.controlType === 'wait' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="等待時間"
                        value={blockData.duration || '1'}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          const unit = blockData.unit || 'seconds';
                          // 根據單位設定範圍限制
                          const maxValue = unit === 'milliseconds' ? 60000 : unit === 'seconds' ? 60 : 5;
                          const finalValue = Math.min(Math.max(value, 1), maxValue);
                          setBlockData({...blockData, duration: finalValue});
                        }}
                        className="text-black"
                        min="1"
                        max={blockData.unit === 'milliseconds' ? '60000' : blockData.unit === 'seconds' ? '60' : '5'}
                      />
                      <Select
                        value={blockData.unit || 'seconds'}
                        onValueChange={(value) => {
                          // 切換單位時調整數值
                          let newDuration = blockData.duration || 1;
                          if (value === 'milliseconds' && (blockData.unit === 'seconds' || !blockData.unit)) {
                            newDuration = (blockData.duration || 1) * 1000;
                          } else if (value === 'seconds' && blockData.unit === 'milliseconds') {
                            newDuration = Math.floor((blockData.duration || 1000) / 1000);
                          }
                          setBlockData({...blockData, unit: value, duration: newDuration});
                        }}
                      >
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="時間單位" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">秒</SelectItem>
                          <SelectItem value="milliseconds">毫秒</SelectItem>
                          <SelectItem value="minutes">分鐘</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 時間範圍提示 */}
                    <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                      範圍限制:
                      {blockData.unit === 'milliseconds' && ' 100-60000 毫秒'}
                      {(blockData.unit === 'seconds' || !blockData.unit) && ' 1-60 秒'}
                      {blockData.unit === 'minutes' && ' 1-5 分鐘'}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 顯示當前設定的參數（非編輯模式） */}
            {!isEditing && (
              <div className="text-xs text-white/70 mt-1">
                {block.blockData.controlType === 'if' && block.blockData.condition && (
                  <div>條件: {block.blockData.condition}</div>
                )}
                {block.blockData.controlType === 'loop' && (
                  <div>
                    {blockData.loopType === 'count' && `重複 ${blockData.loopCount || 1} 次`}
                    {blockData.loopType === 'while' && `當 ${blockData.condition || '條件'} 時`}
                    {blockData.loopType === 'foreach' && `遍歷 ${blockData.listVariable || '清單'}`}
                  </div>
                )}
                {block.blockData.controlType === 'wait' && (
                  <div>
                    等待 {blockData.duration || 1000} {
                      blockData.unit === 'seconds' ? '秒' :
                      blockData.unit === 'minutes' ? '分鐘' : '毫秒'
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'setting':
        return (
          <div>
            <div className="font-medium">{block.blockData.title}</div>
            {isEditing && (
              <div className="mt-2 space-y-2">
                {block.blockData.settingType === 'setVariable' && (
                  <div className="space-y-2">
                    {/* 變數名稱 */}
                    <div className="space-y-1">
                      <Input
                        placeholder="變數名稱（例如: user_count）"
                        value={String(blockData.variableName || '')}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 驗證變數名稱格式（只允許字母、數字、底線，且不能以數字開頭）
                          const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) || value === '';
                          if (isValid) {
                            setBlockData({...blockData, variableName: value});
                          }
                        }}
                        className="text-black"
                      />
                      {blockData.variableName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(blockData.variableName)) && (
                        <div className="text-xs text-red-400">
                          ⚠️ 變數名稱只能包含字母、數字、底線，且不能以數字開頭
                        </div>
                      )}
                    </div>

                    {/* 變數類型 */}
                    <Select
                      value={String(blockData.variableType || 'string')}
                      onValueChange={(value) => setBlockData({...blockData, variableType: value})}
                    >
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="變數類型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">文字</SelectItem>
                        <SelectItem value="number">數字</SelectItem>
                        <SelectItem value="boolean">布林值</SelectItem>
                        <SelectItem value="array">陣列</SelectItem>
                        <SelectItem value="object">物件</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 根據類型顯示不同的輸入控件 */}
                    {blockData.variableType === 'number' ? (
                      <Input
                        type="number"
                        placeholder="數字值（例如: 0）"
                        value={String(blockData.variableValue || '')}
                        onChange={(e) => setBlockData({...blockData, variableValue: e.target.value})}
                        className="text-black"
                      />
                    ) : blockData.variableType === 'boolean' ? (
                      <Select
                        value={String(blockData.variableValue || 'false')}
                        onValueChange={(value) => setBlockData({...blockData, variableValue: value})}
                      >
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="布林值" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True（真）</SelectItem>
                          <SelectItem value="false">False（假）</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : blockData.variableType === 'array' ? (
                      <Input
                        placeholder="陣列值（例如: [1, 2, 3]）"
                        value={String(blockData.variableValue || '')}
                        onChange={(e) => setBlockData({...blockData, variableValue: e.target.value})}
                        className="text-black"
                      />
                    ) : blockData.variableType === 'object' ? (
                      <Input
                        placeholder="物件值（例如: {'key': 'value'}）"
                        value={String(blockData.variableValue || '')}
                        onChange={(e) => setBlockData({...blockData, variableValue: e.target.value})}
                        className="text-black"
                      />
                    ) : (
                      <Input
                        placeholder="文字值（例如: Hello）"
                        value={String(blockData.variableValue || '')}
                        onChange={(e) => setBlockData({...blockData, variableValue: e.target.value})}
                        className="text-black"
                      />
                    )}

                    {/* 類型說明 */}
                    <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                      {blockData.variableType === 'string' && '文字類型：用於儲存文字內容'}
                      {blockData.variableType === 'number' && '數字類型：用於儲存數值'}
                      {blockData.variableType === 'boolean' && '布林值類型：用於儲存真/假值'}
                      {blockData.variableType === 'array' && '陣列類型：用於儲存多個值的列表'}
                      {blockData.variableType === 'object' && '物件類型：用於儲存鍵值對'}
                    </div>
                  </div>
                )}
                {block.blockData.settingType === 'getVariable' && (
                  <div className="space-y-2">
                    {/* 變數選擇模式 */}
                    <Select
                      value={blockData.variableSelectMode || 'select'}
                      onValueChange={(value) => setBlockData({...blockData, variableSelectMode: value})}
                    >
                      <SelectTrigger className="text-black">
                        <SelectValue placeholder="選擇模式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select">從清單選擇</SelectItem>
                        <SelectItem value="custom">自訂變數名稱</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 根據模式顯示不同的輸入 */}
                    {blockData.variableSelectMode === 'select' ? (
                      <Select
                        value={blockData.variableName || ''}
                        onValueChange={(value) => setBlockData({...blockData, variableName: value})}
                      >
                        <SelectTrigger className="text-black">
                          <SelectValue placeholder="選擇變數" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* TODO: 從工作區中收集已設定的變數 */}
                          <SelectItem value="user_count">user_count</SelectItem>
                          <SelectItem value="user_name">user_name</SelectItem>
                          <SelectItem value="message_count">message_count</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="變數名稱"
                        value={blockData.variableName || ''}
                        onChange={(e) => setBlockData({...blockData, variableName: e.target.value})}
                        className="text-black"
                      />
                    )}

                    {/* 預設值 */}
                    <Input
                      placeholder="預設值（可選）"
                      value={blockData.defaultValue || ''}
                      onChange={(e) => setBlockData({...blockData, defaultValue: e.target.value})}
                      className="text-black"
                    />

                    {/* 提示訊息 */}
                    {!blockData.variableName && (
                      <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                        ⚠️ 請選擇或輸入變數名稱
                      </div>
                    )}
                  </div>
                )}
                {block.blockData.settingType === 'saveUserData' && (
                  <div className="space-y-2">
                    <Input 
                      placeholder="資料鍵名"
                      value={blockData.dataKey || ''}
                      onChange={(e) => setBlockData({...blockData, dataKey: e.target.value})}
                      className="text-black"
                    />
                    <Input 
                      placeholder="資料值"
                      value={blockData.dataValue || ''}
                      onChange={(e) => setBlockData({...blockData, dataValue: e.target.value})}
                      className="text-black"
                    />
                    <Input 
                      placeholder="用戶ID（可選，預設為當前用戶）"
                      value={blockData.userId || ''}
                      onChange={(e) => setBlockData({...blockData, userId: e.target.value})}
                      className="text-black"
                    />
                  </div>
                )}
              </div>
            )}
            {/* 顯示當前設定的參數（非編輯模式） */}
            {!isEditing && (
              <div className="text-xs text-white/70 mt-1">
                {block.blockData.settingType === 'setVariable' && (
                  <div>
                    設定變數: {blockData.variableName || '未設定'} = {blockData.variableValue || '未設定'}
                    {blockData.variableType && blockData.variableType !== 'string' && (
                      <span className="ml-1">({blockData.variableType})</span>
                    )}
                  </div>
                )}
                {block.blockData.settingType === 'getVariable' && (
                  <div>
                    取得變數: {blockData.variableName || '未設定'}
                    {blockData.defaultValue && (
                      <span className="ml-1">預設值: {blockData.defaultValue}</span>
                    )}
                  </div>
                )}
                {block.blockData.settingType === 'saveUserData' && (
                  <div>
                    儲存資料: {blockData.dataKey || '未設定'} = {blockData.dataValue || '未設定'}
                    {blockData.userId && (
                      <div>目標用戶: {blockData.userId}</div>
                    )}
                  </div>
                )}
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
