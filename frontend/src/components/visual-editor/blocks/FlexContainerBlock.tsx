import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  ColorPicker,
  SizeSelector,
  MarginPaddingEditor,
} from '../editors';
import type { BlockRendererProps } from './types';

const FlexContainerBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-3">
          {block.blockData.containerType === 'box' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Select value={(blockData as any).layout || 'vertical'} onValueChange={(value) => setBlockData({ ...blockData, layout: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="佈局方向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">垂直</SelectItem>
                    <SelectItem value="horizontal">水平</SelectItem>
                  </SelectContent>
                </Select>
                <SizeSelector type="spacing" value={(blockData as any).spacing || 'md'} onChange={(spacing) => setBlockData({ ...blockData, spacing })} label="內容間距" />
              </div>

              <MarginPaddingEditor
                type="margin"
                value={(blockData as any).margin ? { all: (blockData as any).margin } : {}}
                onChange={(margin) => setBlockData({ ...blockData, margin: (margin as any).all || 'none' })}
                label="外邊距"
                showUnifiedMode={true}
              />

              <MarginPaddingEditor
                type="padding"
                value={{
                  all: (blockData as any).paddingAll,
                  top: (blockData as any).paddingTop,
                  right: (blockData as any).paddingEnd,
                  bottom: (blockData as any).paddingBottom,
                  left: (blockData as any).paddingStart,
                }}
                onChange={(padding) =>
                  setBlockData({
                    ...blockData,
                    paddingAll: (padding as any).all,
                    paddingTop: (padding as any).top,
                    paddingBottom: (padding as any).bottom,
                    paddingStart: (padding as any).left,
                    paddingEnd: (padding as any).right,
                  })
                }
                label="內邊距"
                showUnifiedMode={true}
              />

              <div className="space-y-2">
                <ColorPicker value={(blockData as any).backgroundColor || 'transparent'} onChange={(backgroundColor) => setBlockData({ ...blockData, backgroundColor })} label="背景顏色" />
                <div className="grid grid-cols-2 gap-2">
                  <ColorPicker value={(blockData as any).borderColor || 'transparent'} onChange={(borderColor) => setBlockData({ ...blockData, borderColor })} label="邊框顏色" />
                  <SizeSelector type="border-width" value={(blockData as any).borderWidth || 'none'} onChange={(borderWidth) => setBlockData({ ...blockData, borderWidth })} label="邊框寬度" />
                </div>
                <SizeSelector type="corner-radius" value={(blockData as any).cornerRadius || 'none'} onChange={(cornerRadius) => setBlockData({ ...blockData, cornerRadius })} label="圓角" />
              </div>
            </>
          )}

          {block.blockData.containerType === 'bubble' && (
            <div className="space-y-2">
              <Select value={(blockData as any).size || 'mega'} onValueChange={(value) => setBlockData({ ...blockData, size: value })}>
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
              <Select value={(blockData as any).direction || 'ltr'} onValueChange={(value) => setBlockData({ ...blockData, direction: value })}>
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

          {block.blockData.containerType === 'carousel' && <div className="text-xs text-white/70">Carousel 容器會自動管理其內容的佈局</div>}
        </div>
      )}

      {!isEditing && (
        <div className="text-xs text-white/70 mt-1">
          {block.blockData.containerType === 'box' && (
            <div>
              佈局: {(blockData as any).layout === 'horizontal' ? '水平' : '垂直'} | 間距: {(blockData as any).spacing || 'md'}
              {(blockData as any).backgroundColor && (blockData as any).backgroundColor !== 'transparent' && <div>背景: {(blockData as any).backgroundColor}</div>}
            </div>
          )}
          {block.blockData.containerType === 'bubble' && <div>尺寸: {(blockData as any).size || 'mega'} | 方向: {(blockData as any).direction === 'rtl' ? '右到左' : '左到右'}</div>}
          {block.blockData.containerType === 'carousel' && <div>輪播容器</div>}
        </div>
      )}
    </div>
  );
};

export default FlexContainerBlock;

