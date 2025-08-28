import React, { createContext, useState, ReactNode } from 'react';

interface CodeDisplayState {
  showLineNumbers: boolean;
  showComments: boolean;
  codeTheme: 'light' | 'dark';
  selectedFormat: 'python';
}

interface CodeDisplayContextType {
  state: CodeDisplayState;
  setShowLineNumbers: (show: boolean) => void;
  setShowComments: (show: boolean) => void;
  setCodeTheme: (theme: 'light' | 'dark') => void;
  setSelectedFormat: (format: 'python') => void;
}

const CodeDisplayContext = createContext<CodeDisplayContextType | undefined>(undefined);

interface CodeDisplayProviderProps {
  children: ReactNode;
}

export const CodeDisplayProvider: React.FC<CodeDisplayProviderProps> = ({ children }) => {
  const [state, setState] = useState<CodeDisplayState>({
    showLineNumbers: true,
    showComments: true,
    codeTheme: 'light',
    selectedFormat: 'python'
  });

  const setShowLineNumbers = (show: boolean) => {
    setState(prev => ({ ...prev, showLineNumbers: show }));
  };

  const setShowComments = (show: boolean) => {
    setState(prev => ({ ...prev, showComments: show }));
  };

  const setCodeTheme = (theme: 'light' | 'dark') => {
    setState(prev => ({ ...prev, codeTheme: theme }));
  };

  const setSelectedFormat = (format: 'python') => {
    setState(prev => ({ ...prev, selectedFormat: format }));
  };

  const value: CodeDisplayContextType = {
    state,
    setShowLineNumbers,
    setShowComments,
    setCodeTheme,
    setSelectedFormat
  };

  return (
    <CodeDisplayContext.Provider value={value}>
      {children}
    </CodeDisplayContext.Provider>
  );
};

export default CodeDisplayContext;
