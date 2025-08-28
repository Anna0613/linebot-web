import React, { useState, useEffect } from 'react';
import LineBotCodeGenerator from '../../utils/codeGenerator';
import { useCodeDisplay } from './useCodeDisplay';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface CodePreviewProps {
  blocks: Block[];
}

const CodePreview: React.FC<CodePreviewProps> = ({ blocks }) => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeGenerator] = useState(new LineBotCodeGenerator());
  const { state: { showLineNumbers, codeTheme } } = useCodeDisplay();

  useEffect(() => {
    if (blocks && blocks.length > 0) {
      const code = codeGenerator.generateCode(blocks);
      setGeneratedCode(code);
    } else {
      setGeneratedCode('# 請先在邏輯編輯器中加入積木來生成程式碼');
    }
  }, [blocks, codeGenerator]);


  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-600">生成的程式碼</h3>
        <div className="flex space-x-2">
          {/* 操作按鈕已移除以避免未使用變數警告 */}
        </div>
      </div>
      
      <div className={`flex-1 rounded-lg p-4 overflow-auto ${
        codeTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <pre className={`text-sm font-mono whitespace-pre-wrap ${
          codeTheme === 'dark' ? 'text-green-400' : 'text-gray-800'
        }`}>
          {showLineNumbers ?
            generatedCode.split('\n').map((line, index) => (
              <div key={index} className="flex">
                <span className={`mr-4 select-none ${
                  codeTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {String(index + 1).padStart(3, ' ')}
                </span>
                <span>{line}</span>
              </div>
            )) :
            generatedCode
          }
        </pre>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>💡 提示：請記得將 YOUR_CHANNEL_ACCESS_TOKEN 和 YOUR_CHANNEL_SECRET 替換為您的 LINE Bot 憑證</p>
      </div>
    </div>
  );
};

export default CodePreview;
