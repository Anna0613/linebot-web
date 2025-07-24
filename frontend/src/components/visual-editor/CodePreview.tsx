import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Copy, Download } from 'lucide-react';
import LineBotCodeGenerator from '../../utils/codeGenerator';

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

  useEffect(() => {
    if (blocks && blocks.length > 0) {
      const code = codeGenerator.generateCode(blocks);
      setGeneratedCode(code);
    } else {
      setGeneratedCode('# 請先在邏輯編輯器中加入積木來生成程式碼');
    }
  }, [blocks, codeGenerator]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    // 可以加入成功提示
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linebot.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-600">生成的程式碼</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-2" />
            複製
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCode}>
            <Download className="w-4 h-4 mr-2" />
            下載
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto">
        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
          {generatedCode}
        </pre>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>💡 提示：請記得將 YOUR_CHANNEL_ACCESS_TOKEN 和 YOUR_CHANNEL_SECRET 替換為您的 LINE Bot 憑證</p>
      </div>
    </div>
  );
};

export default CodePreview;