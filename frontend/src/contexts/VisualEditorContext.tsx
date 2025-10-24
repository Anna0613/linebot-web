import React, { createContext, useContext, ReactNode } from 'react';

interface VisualEditorContextType {
  selectedBotId: string;
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined);

export const useVisualEditorContext = () => {
  const context = useContext(VisualEditorContext);
  if (!context) {
    throw new Error('useVisualEditorContext must be used within VisualEditorProvider');
  }
  return context;
};

interface VisualEditorProviderProps {
  children: ReactNode;
  selectedBotId: string;
}

export const VisualEditorProvider: React.FC<VisualEditorProviderProps> = ({ 
  children, 
  selectedBotId 
}) => {
  return (
    <VisualEditorContext.Provider value={{ selectedBotId }}>
      {children}
    </VisualEditorContext.Provider>
  );
};

