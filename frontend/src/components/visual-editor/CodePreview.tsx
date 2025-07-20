import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useVisualEditorStore } from '../../stores/visualEditorStore';
import { CopyIcon, DownloadIcon, PlayIcon } from 'lucide-react';

export const CodePreview: React.FC = () => {
  const { generatedCode, workspaceBlocks } = useVisualEditorStore();
  const [activeTab, setActiveTab] = useState<'python' | 'json'>('python');
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      // 可以加入 toast 通知
    } catch (err) {
      console.error('複製失敗:', err);
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linebot_code.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestCode = () => {
    // 這裡可以實作測試功能
    console.log('測試程式碼功能待實作');
  };

  const exportToJSON = () => {
    return JSON.stringify({
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        blockCount: Object.keys(workspaceBlocks).length
      },
      blocks: workspaceBlocks
    }, null, 2);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 標題列 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">程式碼預覽</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="複製程式碼"
            >
              <CopyIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadCode}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="下載程式碼"
            >
              <DownloadIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleTestCode}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="測試程式碼"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* 分頁切換 */}
        <div className="flex mt-3 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('python')}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'python'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Python 程式碼
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            專案結構
          </button>
        </div>
      </div>

      {/* 程式碼內容 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'python' ? (
          <div className="h-full">
            {generatedCode ? (
              <SyntaxHighlighter
                language="python"
                style={oneDark}
                className="h-full !m-0"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  height: '100%'
                }}
              >
                {generatedCode}
              </SyntaxHighlighter>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">💻</div>
                  <p>還沒有程式碼</p>
                  <p className="text-sm">開始拖拽區塊來生成程式碼</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full">
            <SyntaxHighlighter
              language="json"
              style={oneDark}
              className="h-full !m-0"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                height: '100%'
              }}
            >
              {exportToJSON()}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {/* 狀態列 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>區塊數量: {Object.keys(workspaceBlocks).length}</span>
          <span>程式碼行數: {generatedCode.split('\n').length}</span>
        </div>
      </div>
    </div>
  );
};