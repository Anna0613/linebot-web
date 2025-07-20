import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { blockCategories } from './blockDefinitions';
import { BlockDefinition } from '../../stores/visualEditorStore';

interface DraggableBlockProps {
  block: BlockDefinition;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ block }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${block.id}`,
    data: {
      type: 'palette-block',
      block: block
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        p-2 m-1 rounded-lg cursor-grab border-2 border-transparent
        ${isDragging ? 'opacity-50' : 'hover:border-gray-300'}
        transition-all duration-200
      `}
      style={{
        backgroundColor: block.color + '20',
        borderLeftColor: block.color,
        borderLeftWidth: '4px',
        ...style
      }}
    >
      <div className="text-sm font-medium text-gray-800">
        {block.label}
      </div>
      {block.fields.length > 0 && (
        <div className="text-xs text-gray-600 mt-1">
          {block.fields.map(field => field.label).join(', ')}
        </div>
      )}
    </div>
  );
};

interface CategorySectionProps {
  name: string;
  color: string;
  blocks: BlockDefinition[];
}

const CategorySection: React.FC<CategorySectionProps> = ({ name, color, blocks }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 text-left font-medium text-gray-700 hover:bg-gray-50 rounded-md"
        style={{ backgroundColor: color + '10' }}
      >
        <span>{name}</span>
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-2">
          {blocks.map(block => (
            <DraggableBlock key={block.id} block={block} />
          ))}
        </div>
      )}
    </div>
  );
};

export const BlockPalette: React.FC = () => {
  return (
    <div className="h-full p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">拼圖區塊</h2>
      
      <div className="space-y-2">
        {Object.entries(blockCategories).map(([key, category]) => (
          <CategorySection
            key={key}
            name={category.name}
            color={category.color}
            blocks={category.blocks}
          />
        ))}
      </div>
      
      <div className="mt-8 p-3 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">使用說明</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 從左側拖拽區塊到中間工作區</li>
          <li>• 點擊區塊可編輯參數</li>
          <li>• 區塊會自動生成 Python 程式碼</li>
          <li>• 右側即時預覽生成的程式碼</li>
        </ul>
      </div>
    </div>
  );
};