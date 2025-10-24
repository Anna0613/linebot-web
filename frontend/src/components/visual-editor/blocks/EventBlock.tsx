import React from 'react';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { BlockRendererProps } from './types';

const EventBlock: React.FC<BlockRendererProps> = ({ block, index, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-2">
          {block.blockData.eventType === 'message.text' && (
            <div className="space-y-2">
              <Select
                value={(blockData as any).matchMode || 'contains'}
                onValueChange={(value) => setBlockData({ ...blockData, matchMode: value })}
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

              <Input
                placeholder={
                  (blockData as any).matchMode === 'regex'
                    ? '輸入正則表達式 (例如: ^hello.*)'
                    : '輸入關鍵字或文字 (例如: hello)'
                }
                value={String((blockData as any).pattern || '')}
                onChange={(e) => setBlockData({ ...blockData, pattern: e.target.value })}
                className="text-black"
              />

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`caseSensitive-${index}`}
                  checked={Boolean((blockData as any).caseSensitive) || false}
                  onChange={(e) => setBlockData({ ...blockData, caseSensitive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor={`caseSensitive-${index}`} className="text-xs text-white/80">
                  區分大小寫
                </label>
              </div>

              <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                <div className="font-medium mb-1">匹配說明:</div>
                {(blockData as any).matchMode === 'contains' && '訊息中包含關鍵字即觸發'}
                {(blockData as any).matchMode === 'exact' && '訊息內容完全相同才觸發'}
                {(blockData as any).matchMode === 'startsWith' && '訊息以關鍵字開頭才觸發'}
                {(blockData as any).matchMode === 'endsWith' && '訊息以關鍵字結尾才觸發'}
                {(blockData as any).matchMode === 'regex' && '使用正則表達式進行匹配（進階功能）'}
              </div>
            </div>
          )}
          {block.blockData.eventType === 'postback' && (
            <Input
              placeholder="按鈕回傳資料"
              value={String((blockData as any).data || '')}
              onChange={(e) => setBlockData({ ...blockData, data: e.target.value })}
              className="text-black"
            />
          )}
          {!block.blockData.eventType ||
            (block.blockData.eventType !== 'message.text' && block.blockData.eventType !== 'postback') ? (
              <Input
                placeholder="事件條件"
                value={(blockData as any).condition || ''}
                onChange={(e) => setBlockData({ ...blockData, condition: e.target.value })}
                className="text-black"
              />
            ) : null}
        </div>
      )}
      {!isEditing && (
        <div className="text-xs text-white/70 mt-1">
          {block.blockData.eventType === 'message.text' && (block.blockData as any).pattern && (
            <div>觸發條件: "{String((block.blockData as any).pattern)}"</div>
          )}
          {block.blockData.eventType === 'postback' && (block.blockData as any).data && (
            <div>按鈕資料: {String((block.blockData as any).data)}</div>
          )}
          {(block.blockData as any).condition && <div>條件: {(block.blockData as any).condition}</div>}
        </div>
      )}
    </div>
  );
};

export default EventBlock;

