import { useContext } from 'react';
import CodeDisplayContext from './CodeDisplayContext';

export const useCodeDisplay = () => {
  const context = useContext(CodeDisplayContext);
  if (!context) {
    throw new Error('useCodeDisplay must be used within a CodeDisplayProvider');
  }
  return context;
};
