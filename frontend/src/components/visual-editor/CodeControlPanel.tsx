import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useCodeDisplay } from './CodeDisplayContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Code,
  Download,
  Copy,
  FileText,
  Settings,
  Eye,
  EyeOff,
  Braces,
  Hash,
  Type,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { UnifiedBlock } from '../../types/block';
import LineBotCodeGenerator from '../../utils/codeGenerator';

interface CodeControlPanelProps {
  blocks: UnifiedBlock[];
  onExport?: (format: string) => void;
  onCopy?: () => void;
  onFormatChange?: (format: string) => void;
}

const CodeControlPanel: React.FC<CodeControlPanelProps> = ({
  blocks,
  onExport,
  onCopy,
  onFormatChange
}) => {
  const { toast } = useToast();
  const {
    state: { showLineNumbers, showComments, codeTheme, selectedFormat },
    setShowLineNumbers,
    setShowComments,
    setCodeTheme,
    setSelectedFormat
  } = useCodeDisplay();

  const handleFormatChange = (format: 'python') => {
    setSelectedFormat(format);
    onFormatChange?.(format);
  };
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

  // 程式碼統計
  const codeStats = {
    blocks: blocks.length,
    lines: blocks.length * 3, // 估算行數
    size: `${Math.round(JSON.stringify(blocks).length / 1024)}KB`,
    complexity: blocks.length > 10 ? '複雜' : blocks.length > 5 ? '中等' : '簡單'
  };

  // 程式碼品質檢查
  const qualityChecks = [
    {
      name: '積木連接',
      status: blocks.length > 0 ? 'pass' : 'warning',
      message: blocks.length > 0 ? '積木已連接' : '尚未添加積木'
    },
    {
      name: '事件處理',
      status: blocks.some(b => b.blockType?.includes('event')) ? 'pass' : 'warning',
      message: blocks.some(b => b.blockType?.includes('event')) ? '包含事件處理' : '建議添加事件處理'
    },
    {
      name: '回覆邏輯',
      status: blocks.some(b => b.blockType?.includes('reply') || b.blockType === 'text') ? 'pass' : 'info',
      message: blocks.some(b => b.blockType?.includes('reply') || b.blockType === 'text') ? '包含回覆邏輯' : '可添加回覆邏輯'
    }
  ];

  const formatIcons = {
    python: Braces
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast({
        title: "複製成功",
        description: "程式碼已複製到剪貼板",
      });
    } catch (error) {
      toast({
        title: "複製失敗",
        description: "無法複製程式碼到剪貼板",
        variant: "destructive",
      });
    }
  };

  const downloadCode = () => {
    try {
      const blob = new Blob([generatedCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linebot.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "下載成功",
        description: "程式碼檔案已開始下載",
      });
    } catch (error) {
      toast({
        title: "下載失敗",
        description: "無法下載程式碼檔案",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* 標題區域 */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Code className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-800">程式碼工具</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 格式選擇 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>輸出格式</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-center">
              {(Object.keys(formatIcons) as Array<keyof typeof formatIcons>).map((format) => {
                const Icon = formatIcons[format];
                return (
                  <Button
                    key={format}
                    onClick={() => handleFormatChange(format)}
                    variant={selectedFormat === format ? 'default' : 'outline'}
                    size="sm"
                    className="flex flex-col items-center p-3 h-auto min-w-[80px]"
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs uppercase font-medium">{format}</span>
                  </Button>
                );
              })}
            </div>

            <Separator />

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-1" />
                複製
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCode}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                下載
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 顯示選項 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>顯示選項</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">註解</span>
              <Button
                onClick={() => setShowComments(!showComments)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {showComments ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </Button>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-2 block">主題</label>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setCodeTheme('light')}
                  variant={codeTheme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                >
                  淺色
                </Button>
                <Button
                  onClick={() => setCodeTheme('dark')}
                  variant={codeTheme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                >
                  深色
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 程式碼統計 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>程式碼統計</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-gray-100 rounded">
                <div className="text-lg font-bold text-gray-800">{codeStats.blocks}</div>
                <div className="text-xs text-gray-600">積木數</div>
              </div>
              <div className="text-center p-2 bg-blue-100 rounded">
                <div className="text-lg font-bold text-blue-800">{codeStats.lines}</div>
                <div className="text-xs text-blue-600">預估行數</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-green-100 rounded">
                <div className="text-lg font-bold text-green-800">{codeStats.size}</div>
                <div className="text-xs text-green-600">檔案大小</div>
              </div>
              <div className="text-center p-2 bg-purple-100 rounded">
                <div className="text-lg font-bold text-purple-800">{codeStats.complexity}</div>
                <div className="text-xs text-purple-600">複雜度</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 品質檢查 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>品質檢查</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {qualityChecks.map((check, index) => {
              const StatusIcon = getStatusIcon(check.status);
              return (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <StatusIcon className={`w-4 h-4 ${getStatusColor(check.status)}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{check.name}</div>
                    <div className="text-xs text-gray-600">{check.message}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 狀態指示 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>格式</span>
          <Badge variant="outline" className="uppercase">
            {selectedFormat}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default CodeControlPanel;
