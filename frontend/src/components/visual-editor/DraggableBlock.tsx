import React from 'react';
import { useDrag } from 'react-dnd';

interface BlockData {
  [key: string]: unknown;
}

interface DraggableBlockProps {
  children: React.ReactNode;
  blockType: string;
  blockData: BlockData;
  color?: string;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ 
  children, 
  blockType, 
  blockData, 
  color = "bg-blue-500" 
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'block',
    item: { blockType, blockData },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag}
      className={`${color} text-white px-3 py-2 rounded-lg cursor-move text-sm shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {children}
    </div>
  );
};

export default DraggableBlock;