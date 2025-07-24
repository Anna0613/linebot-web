import React from 'react';
import { useDrop } from 'react-dnd';
import DroppedBlock from './DroppedBlock';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface DropItem {
  blockType: string;
  blockData: BlockData;
}

interface DropZoneProps {
  title: string;
  onDrop?: (item: DropItem) => void;
  blocks?: Block[];
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: BlockData) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ title, onDrop, blocks = [], onRemove, onUpdate }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'block',
    drop: (item: DropItem) => {
      if (onDrop) {
        onDrop(item);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div 
      ref={drop}
      className={`border-2 border-dashed rounded-lg p-8 min-h-96 bg-white transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <h3 className="text-lg font-medium text-gray-600 mb-4">{title}</h3>
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            從左側選擇積木並拖拽到這裡開始建立您的 LINE Bot 邏輯
          </div>
        ) : (
          blocks.map((block, index) => (
            <DroppedBlock 
              key={index} 
              block={block} 
              index={index}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DropZone;