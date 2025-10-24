import React from 'react';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { BlockRendererProps } from './types';

const ControlBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-2">
          {block.blockData.controlType === 'if' && (
            <div className="space-y-2">
              <Select value={(blockData as any).conditionType || 'message'} onValueChange={(value) => setBlockData({ ...blockData, conditionType: value })}>
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

              {(blockData as any).conditionType !== 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Select value={(blockData as any).operator || '=='} onValueChange={(value) => setBlockData({ ...blockData, operator: value })}>
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
                  <Input placeholder="比較值" value={(blockData as any).compareValue || ''} onChange={(e) => setBlockData({ ...blockData, compareValue: e.target.value })} className="text-black" />
                </div>
              )}

              {(blockData as any).conditionType === 'custom' && (
                <Input placeholder="輸入條件表達式（例如: user_message == 'hello'）" value={(blockData as any).condition || ''} onChange={(e) => setBlockData({ ...blockData, condition: e.target.value })} className="text-black" />
              )}

              <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                <div className="font-medium mb-1">條件預覽:</div>
                <code className="text-white/80">
                  {(blockData as any).conditionType === 'custom'
                    ? ((blockData as any).condition || '未設定')
                    : `${(blockData as any).conditionType === 'message' ? 'user_message' : (blockData as any).conditionType === 'variable' ? '變數名稱' : 'user_id'} ${(blockData as any).operator || '=='} "${(blockData as any).compareValue || '值'}"`}
                </code>
              </div>
            </div>
          )}

          {block.blockData.controlType === 'loop' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={(blockData as any).loopType || 'count'} onValueChange={(value) => setBlockData({ ...blockData, loopType: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="迴圈類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">指定次數</SelectItem>
                    <SelectItem value="while">條件迴圈</SelectItem>
                    <SelectItem value="foreach">遍歷清單</SelectItem>
                  </SelectContent>
                </Select>
                {(blockData as any).loopType === 'count' ? (
                  <Input type="number" placeholder="次數" value={(blockData as any).loopCount || '1'} onChange={(e) => setBlockData({ ...blockData, loopCount: parseInt(e.target.value) || 1 })} className="text-black" min="1" max="100" />
                ) : (blockData as any).loopType === 'while' ? (
                  <Input placeholder="條件" value={(blockData as any).condition || ''} onChange={(e) => setBlockData({ ...blockData, condition: e.target.value })} className="text-black" />
                ) : (
                  <Input placeholder="清單變數" value={(blockData as any).listVariable || ''} onChange={(e) => setBlockData({ ...blockData, listVariable: e.target.value })} className="text-black" />
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
                  value={(blockData as any).duration || '1'}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const unit = (blockData as any).unit || 'seconds';
                    const maxValue = unit === 'milliseconds' ? 60000 : unit === 'seconds' ? 60 : 5;
                    const finalValue = Math.min(Math.max(value, 1), maxValue);
                    setBlockData({ ...blockData, duration: finalValue });
                  }}
                  className="text-black"
                  min="1"
                  max={(blockData as any).unit === 'milliseconds' ? '60000' : (blockData as any).unit === 'seconds' ? '60' : '5'}
                />
                <Select
                  value={(blockData as any).unit || 'seconds'}
                  onValueChange={(value) => {
                    let newDuration = (blockData as any).duration || 1;
                    if (value === 'milliseconds' && ((blockData as any).unit === 'seconds' || !(blockData as any).unit)) {
                      newDuration = ((blockData as any).duration || 1) * 1000;
                    } else if (value === 'seconds' && (blockData as any).unit === 'milliseconds') {
                      newDuration = Math.floor(((blockData as any).duration || 1000) / 1000);
                    }
                    setBlockData({ ...blockData, unit: value, duration: newDuration });
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

              <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                範圍限制:
                {(blockData as any).unit === 'milliseconds' && ' 100-60000 毫秒'}
                {((blockData as any).unit === 'seconds' || !(blockData as any).unit) && ' 1-60 秒'}
                {(blockData as any).unit === 'minutes' && ' 1-5 分鐘'}
              </div>
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="text-xs text-white/70 mt-1">
          {block.blockData.controlType === 'if' && (block.blockData as any).condition && <div>條件: {(block.blockData as any).condition}</div>}
          {block.blockData.controlType === 'loop' && (
            <div>
              {(blockData as any).loopType === 'count' && `重複 ${(blockData as any).loopCount || 1} 次`}
              {(blockData as any).loopType === 'while' && `當 ${(blockData as any).condition || '條件'} 時`}
              {(blockData as any).loopType === 'foreach' && `遍歷 ${(blockData as any).listVariable || '清單'}`}
            </div>
          )}
          {block.blockData.controlType === 'wait' && (
            <div>
              等待 {(blockData as any).duration || 1000}{' '}
              {((blockData as any).unit === 'seconds' ? '秒' : (blockData as any).unit === 'minutes' ? '分鐘' : '毫秒')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlBlock;

