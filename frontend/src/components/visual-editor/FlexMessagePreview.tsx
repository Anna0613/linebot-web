import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Copy, Download, Eye } from 'lucide-react';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface FlexMessagePreviewProps {
  blocks: Block[];
}

// 簡化的 Flex Message 生成器
class FlexMessageGenerator {
  generateFlexMessage(blocks: Block[]): Record<string, unknown> {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: []
      }
    };

    blocks.forEach(block => {
      if (block.blockType === 'flex-content') {
        switch (block.blockData.contentType) {
          case 'text':
            bubble.body.contents.push({
              type: "text",
              text: block.blockData.text || "示例文字",
              size: block.blockData.size || "md",
              weight: block.blockData.weight || "regular",
              color: block.blockData.color || "#000000"
            });
            break;
          case 'image':
            bubble.body.contents.push({
              type: "image",
              url: block.blockData.url || "https://via.placeholder.com/300x200"
            });
            break;
          case 'button':
            bubble.body.contents.push({
              type: "button",
              action: {
                type: "message",
                label: block.blockData.text || "按鈕",
                text: block.blockData.text || "按鈕被點擊"
              }
            });
            break;
          case 'separator':
            bubble.body.contents.push({
              type: "separator",
              margin: "md"
            });
            break;
        }
      }
    });

    return bubble;
  }

  generatePreviewHTML(flexMessage: Record<string, unknown>): string {
    if (!flexMessage || !flexMessage.body) {
      return '<div class="text-gray-500 text-center py-8">請加入 Flex 組件來設計您的訊息</div>';
    }

    let html = '<div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm" style="max-width: 300px;">';
    
    flexMessage.body.contents.forEach((content: Record<string, unknown>) => {
      switch (content.type) {
        case 'text':
          html += `<div class="mb-2" style="color: ${content.color}; font-size: ${this.getSizeInPx(content.size)}; font-weight: ${content.weight}">${content.text}</div>`;
          break;
        case 'image':
          html += `<img src="${content.url}" class="w-full rounded mb-2" style="max-height: 200px; object-fit: cover;" />`;
          break;
        case 'button':
          html += `<button class="w-full bg-blue-500 text-white py-2 px-4 rounded mb-2 hover:bg-blue-600">${content.action.label}</button>`;
          break;
        case 'separator':
          html += '<hr class="my-2 border-gray-300" />';
          break;
      }
    });

    html += '</div>';
    return html;
  }

  private getSizeInPx(size: string): string {
    const sizeMap: { [key: string]: string } = {
      'xs': '12px',
      'sm': '14px',
      'md': '16px',
      'lg': '18px',
      'xl': '20px'
    };
    return sizeMap[size] || '16px';
  }
}

const FlexMessagePreview: React.FC<FlexMessagePreviewProps> = ({ blocks }) => {
  const [flexMessage, setFlexMessage] = useState<Record<string, unknown> | null>(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [generator] = useState(new FlexMessageGenerator());

  useEffect(() => {
    if (blocks && blocks.length > 0) {
      const generated = generator.generateFlexMessage(blocks);
      setFlexMessage(generated);
      setPreviewHTML(generator.generatePreviewHTML(generated));
    } else {
      setFlexMessage(null);
      setPreviewHTML('<div class="text-gray-500 text-center py-8">請加入 Flex 組件來設計您的訊息</div>');
    }
  }, [blocks, generator]);

  const copyFlexMessage = () => {
    if (flexMessage) {
      navigator.clipboard.writeText(JSON.stringify(flexMessage, null, 2));
    }
  };

  const downloadFlexMessage = () => {
    if (flexMessage) {
      const blob = new Blob([JSON.stringify(flexMessage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flex-message.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-600 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          即時預覽
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={copyFlexMessage}>
            <Copy className="w-4 h-4 mr-2" />
            複製 JSON
          </Button>
          <Button variant="outline" size="sm" onClick={downloadFlexMessage}>
            <Download className="w-4 h-4 mr-2" />
            下載
          </Button>
        </div>
      </div>
      
      {/* 預覽區域 */}
      <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
        <div className="max-w-sm mx-auto">
          <div 
            className="flex-message-preview"
            dangerouslySetInnerHTML={{ __html: previewHTML }}
          />
        </div>
      </div>
      
      {/* JSON 預覽 */}
      {flexMessage && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Flex Message JSON:</h4>
          <div className="bg-gray-900 rounded p-3 max-h-32 overflow-auto">
            <pre className="text-green-400 text-xs font-mono">
              {JSON.stringify(flexMessage, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        💡 這個預覽模擬了 LINE 中 Flex Message 的外觀
      </div>
    </div>
  );
};

export default FlexMessagePreview;