import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Code,
  Download,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import CodePreview from './CodePreview';
import { useCodeDisplay } from './CodeDisplayContext';
import { useToast } from '../../hooks/use-toast';
import { UnifiedBlock } from '../../types/block';
import LineBotCodeGenerator from '../../utils/codeGenerator';

type CodeGenBlock = {
  blockType: string;
  blockData: Record<string, unknown>;
  id?: string;
  children?: string[];
};

interface CodeViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // 接受 UnifiedBlock 或最小生成需求形狀
  blocks: UnifiedBlock[] | CodeGenBlock[];
}

const CodeViewerDialog: React.FC<CodeViewerDialogProps> = ({
  isOpen,
  onOpenChange,
  blocks,
}) => {
  const { toast } = useToast();
  const {
    state: { showLineNumbers },
    setShowLineNumbers,
  } = useCodeDisplay();

  const codeGeneratorRef = useRef(new LineBotCodeGenerator());

  const toCodeGenBlocks = (items: (UnifiedBlock | CodeGenBlock)[]): CodeGenBlock[] =>
    items.map((b) => ({
      blockType: (b as UnifiedBlock).blockType,
      blockData: (b as UnifiedBlock).blockData as Record<string, unknown>,
      id: (b as UnifiedBlock).id,
      children: (b as UnifiedBlock).children,
    }));

  const getGeneratedCode = (): string => {
    if (blocks && blocks.length > 0) {
      const normalized = toCodeGenBlocks(blocks as (UnifiedBlock | CodeGenBlock)[]);
      return codeGeneratorRef.current.generateCode(normalized);
    }
    return '# 請先在邏輯編輯器中加入積木來生成程式碼';
  };

  const copyToClipboard = async () => {
    try {
      const code = getGeneratedCode();
      await navigator.clipboard.writeText(code);
      toast({
        title: '複製成功',
        description: '程式碼已複製到剪貼板',
      });
    } catch (_error) {
      toast({
        title: '複製失敗',
        description: '無法複製程式碼到剪貼板',
        variant: 'destructive',
      });
    }
  };

  const downloadCode = () => {
    try {
      const code = getGeneratedCode();
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linebot.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '下載成功',
        description: '程式碼檔案已開始下載',
      });
    } catch (_error) {
      toast({
        title: '下載失敗',
        description: '無法下載程式碼檔案',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-purple-500" />
            生成的程式碼
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 控制面板 */}
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
            {/* 行號顯示 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">行號</span>
              <Button
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {showLineNumbers ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </Button>
            </div>

            {/* 複製和下載按鈕 */}
            <div className="flex items-center gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Copy className="w-4 h-4 mr-1" />
                複製
              </Button>
              <Button
                onClick={downloadCode}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Download className="w-4 h-4 mr-1" />
                下載
              </Button>
            </div>
          </div>

          {/* 程式碼預覽 */}
          <div className="border rounded-lg overflow-hidden">
            {/* CodePreview 只需要 blockType 與 blockData */}
            <CodePreview blocks={toCodeGenBlocks(blocks as (UnifiedBlock | CodeGenBlock)[])} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodeViewerDialog;
