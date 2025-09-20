import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Eye,
  MessageSquare,
  User,
  Zap
} from 'lucide-react';
import { UnifiedBlock } from '../../types/block';

interface PreviewControlPanelProps {
  blocks: UnifiedBlock[];
  flexBlocks: UnifiedBlock[];
  onTestAction?: (action: 'new-user' | 'test-message' | 'preview-dialog') => void;
}

const PreviewControlPanel: React.FC<PreviewControlPanelProps> = ({
  blocks,
  flexBlocks,
  onTestAction
}) => {

  // 統計積木資訊
  const blockStats = {
    total: blocks.length,
    events: blocks.filter(block => block.blockType?.includes('event') || block.blockType === 'message').length,
    replies: blocks.filter(block => block.blockType?.includes('reply') || block.blockType === 'text').length,
    controls: blocks.filter(block => block.blockType?.includes('control')).length
  };



  return (
    <div className="w-80 bg-card text-card-foreground border-r border-border flex flex-col h-full">
      {/* 標題區域 */}
      <div className="p-4 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-foreground">預覽控制台</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 積木統計 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>積木統計</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-secondary rounded">
                <div className="text-lg font-bold text-foreground">{blockStats.total}</div>
                <div className="text-xs text-muted-foreground">邏輯積木</div>
              </div>
              <div className="text-center p-2 bg-secondary rounded">
                <div className="text-lg font-bold text-foreground">{flexBlocks?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Flex 組件</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-secondary rounded">
                <div className="text-lg font-bold text-foreground">{blockStats.replies}</div>
                <div className="text-xs text-muted-foreground">回覆</div>
              </div>
              <div className="text-center p-2 bg-secondary rounded">
                <div className="text-lg font-bold text-foreground">{blockStats.controls}</div>
                <div className="text-xs text-muted-foreground">控制</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快速測試 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>快速測試</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onTestAction?.('new-user')}
            >
              <User className="w-3 h-3 mr-2" />
              模擬新用戶
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onTestAction?.('test-message')}
            >
              <MessageSquare className="w-3 h-3 mr-2" />
              發送測試訊息
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onTestAction?.('preview-dialog')}
            >
              <Eye className="w-3 h-3 mr-2" />
              預覽完整對話
            </Button>
          </CardContent>
        </Card>

        {/* 狀態指示 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>總組件數</span>
          <Badge variant="outline">
            {blockStats.total + (flexBlocks?.length || 0)}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default PreviewControlPanel;
