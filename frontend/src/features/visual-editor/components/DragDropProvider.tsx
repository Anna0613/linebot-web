import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BlockDragPreviewLayer from './BlockDragPreviewLayer';

interface DragDropProviderProps {
  children: React.ReactNode;
}

const DragDropProvider: React.FC<DragDropProviderProps> = ({ children }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      {children}
      <BlockDragPreviewLayer />
    </DndProvider>
  );
};

export default DragDropProvider;
