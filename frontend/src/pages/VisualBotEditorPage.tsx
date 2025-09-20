import React from 'react';
import { VisualBotEditor } from '../components/visual-editor/VisualBotEditor';

const VisualBotEditorPage: React.FC = () => {
  return (
    <div className="h-screen bg-background">
      <VisualBotEditor />
    </div>
  );
};

export default VisualBotEditorPage;
