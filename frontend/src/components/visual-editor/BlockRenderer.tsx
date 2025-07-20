import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useVisualEditorStore, BlockField } from '../../stores/visualEditorStore';
import { XIcon, EditIcon } from 'lucide-react';

interface BlockRendererProps {
  blockId: string;
  isDragging: boolean;
}

interface FieldEditorProps {
  field: BlockField;
  onUpdate: (value: any) => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onUpdate }) => {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={field.value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          value={field.value || ''}
          onChange={(e) => onUpdate(Number(e.target.value))}
          placeholder={field.placeholder}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
      );
    
    case 'select':
      return (
        <select
          value={field.value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        >
          {field.options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={field.value || false}
          onChange={(e) => onUpdate(e.target.checked)}
          className="rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    
    default:
      return (
        <input
          type="text"
          value={field.value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
      );
  }
};

export const BlockRenderer: React.FC<BlockRendererProps> = ({ blockId, isDragging }) => {
  const { workspaceBlocks, updateBlockField, removeBlockFromWorkspace } = useVisualEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  
  const block = workspaceBlocks[blockId];
  
  const { attributes, listeners, setNodeRef, transform, isDragging: dragKitIsDragging } = useDraggable({
    id: `workspace-block-${blockId}`,
    data: {
      type: 'workspace-block',
      blockId: blockId
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  if (!block) return null;

  const handleFieldUpdate = (fieldId: string, value: any) => {
    updateBlockField(blockId, fieldId, value);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlockFromWorkspace(blockId);
  };

  const getBlockShape = () => {
    switch (block.shape) {
      case 'hat':
        return 'rounded-t-lg rounded-b-md';
      case 'cap':
        return 'rounded-b-lg rounded-t-md';
      case 'statement':
        return 'rounded-md';
      case 'expression':
        return 'rounded-full px-4';
      default:
        return 'rounded-md';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        relative min-w-48 max-w-80
        ${getBlockShape()}
        ${isDragging || dragKitIsDragging ? 'opacity-80 shadow-2xl' : 'shadow-md hover:shadow-lg'}
        ${dragKitIsDragging ? 'pointer-events-none' : ''}
        transition-all duration-200
      `}
      style={{
        backgroundColor: block.color,
        ...style
      }}
    >
      {/* 區塊標頭 */}
      <div className="p-3 text-white font-medium text-sm flex items-center justify-between">
        {/* 拖拽手柄區域 */}
        <div 
          {...(isDragging ? {} : listeners)}
          {...(isDragging ? {} : attributes)}
          className="flex-1 cursor-move"
          onDoubleClick={() => setIsEditing(true)}
        >
          <span>{block.label}</span>
        </div>
        
        {/* 控制按鈕區域 - 不受拖拽影響 */}
        <div className="flex items-center space-x-1 z-10 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsEditing(!isEditing);
            }}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            type="button"
          >
            <EditIcon className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-500 hover:bg-opacity-80 rounded transition-colors"
            type="button"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 區塊字段編輯區 */}
      {isEditing && block.fields.length > 0 && (
        <div className="p-3 bg-white border-t border-opacity-20">
          {block.fields.map(field => (
            <div key={field.id} className="mb-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <FieldEditor
                field={field}
                onUpdate={(value) => handleFieldUpdate(field.id, value)}
              />
            </div>
          ))}
          <div className="flex justify-end mt-3 space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* 連接點 */}
      {block.previousConnection && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-md hover:bg-yellow-300 transition-colors">
          {/* 連接指示器 */}
          {block.connections.previous && (
            <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      )}
      
      {block.nextConnection && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-400 rounded-full border-2 border-white shadow-md hover:bg-blue-300 transition-colors">
          {/* 連接指示器 */}
          {block.connections.next && (
            <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      )}
      
      {block.outputConnection && (
        <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-purple-400 rounded-full border-2 border-white shadow-md hover:bg-purple-300 transition-colors">
          {/* 連接指示器 */}
          {block.connections.output && (
            <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      )}
      
      {/* 輸入連接點 */}
      {block.fields.some(f => f.type === 'text' || f.type === 'number') && (
        <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-md hover:bg-green-300 transition-colors">
          {/* 連接指示器 */}
          {block.connections.input && block.connections.input.length > 0 && (
            <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      )}
    </div>
  );
};