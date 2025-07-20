import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { VisualBotEditor } from '../components/visual-editor/VisualBotEditor';

const VisualBotEditorPage: React.FC = () => {
  return (
    <div className="h-screen bg-gray-50">
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            LINE Bot 視覺化編輯器
          </h1>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              儲存專案
            </button>
            <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
              匯出程式碼
            </button>
            <button className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
              測試 Bot
            </button>
          </div>
        </div>
      </div>

      <div className="h-full">
        <VisualBotEditor />
      </div>
    </div>
  );
};

export default VisualBotEditorPage;