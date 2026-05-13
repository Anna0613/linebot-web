import React from 'react';
import { AlignmentSelector, SizeSelector } from '../editors';
import type { BlockRendererProps } from './types';

const settingPanelClass = 'rounded-lg border border-slate-200 bg-white/80 p-3';

const FlexLayoutBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-3">
          {block.blockData.layoutType === 'spacer' && (
            <div className={settingPanelClass}>
              <label className="text-sm font-medium text-slate-800">間距設定</label>
              <div className="mt-3">
                <SizeSelector type="spacer" value={(blockData as any).size || 'md'} onChange={(size) => setBlockData({ ...blockData, size })} label="間距大小" showDescription={false} />
              </div>
            </div>
          )}

          {block.blockData.layoutType === 'filler' && (
            <div className={settingPanelClass}>
              <label className="text-sm font-medium text-slate-800">填充設定</label>
              <div className="mt-3 space-y-2">
                <SizeSelector type="flex" value={(blockData as any).flex || '1'} onChange={(flex) => setBlockData({ ...blockData, flex })} label="Flex 比例" showDescription={false} />
                <div className="rounded bg-slate-50 p-2 text-xs text-slate-500">設定填充區域的彈性比例，數值越大佔用空間越多</div>
              </div>
            </div>
          )}

          {block.blockData.layoutType === 'align' && (
            <div className={settingPanelClass}>
              <label className="text-sm font-medium text-slate-800">對齊設定</label>
              <div className="mt-3 space-y-3">
                <AlignmentSelector
                  type="both"
                  alignValue={(blockData as any).align}
                  gravityValue={(blockData as any).gravity}
                  onAlignChange={(align) => setBlockData({ ...blockData, align })}
                  onGravityChange={(gravity) => setBlockData({ ...blockData, gravity })}
                  label=""
                  showVisual={true}
                />
                <div className="rounded bg-slate-50 p-2 text-xs text-slate-500">設定容器中子元素的對齊方式</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlexLayoutBlock;
