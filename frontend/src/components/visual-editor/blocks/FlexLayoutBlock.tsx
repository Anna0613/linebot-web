import React from 'react';
import { AlignmentSelector, SizeSelector } from '../editors';
import type { BlockRendererProps } from './types';

const FlexLayoutBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-3">
          {block.blockData.layoutType === 'spacer' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">間距設定</label>
              <SizeSelector type="spacer" value={(blockData as any).size} onChange={(size) => setBlockData({ ...blockData, size })} label="間距大小" showVisual={false} />
            </div>
          )}

          {block.blockData.layoutType === 'filler' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/90">填充設定</label>
              <div className="space-y-2">
                <label className="text-xs text-white/80">Flex 比例</label>
                <SizeSelector type="flex" value={(blockData as any).flex} onChange={(flex) => setBlockData({ ...blockData, flex })} label="" showVisual={false} />
                <div className="text-xs text-white/60 bg-white/5 p-2 rounded">設定填充區域的彈性比例，數值越大佔用空間越多</div>
              </div>
            </div>
          )}

          {block.blockData.layoutType === 'align' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/90">對齊設定</label>
              <AlignmentSelector
                type="both"
                alignValue={(blockData as any).align}
                gravityValue={(blockData as any).gravity}
                onAlignChange={(align) => setBlockData({ ...blockData, align })}
                onGravityChange={(gravity) => setBlockData({ ...blockData, gravity })}
                label=""
                showVisual={true}
              />
              <div className="text-xs text-white/60 bg-white/5 p-2 rounded">設定容器中子元素的對齊方式</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlexLayoutBlock;

