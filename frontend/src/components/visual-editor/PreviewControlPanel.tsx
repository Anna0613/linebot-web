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
}

const PreviewControlPanel: React.FC<PreviewControlPanelProps> = ({
  blocks,
  flexBlocks
}) => {

  // 統計積木資訊
  const blockStats = {
    total: blocks.length,
    events: blocks.filter(block => block.blockType?.includes('event') || block.blockType === 'message').length,
    replies: blocks.filter(block => block.blockType?.includes('reply') || block.blockType === 'text').length,
    controls: blocks.filter(block => block.blockType?.includes('control')).length
  };



  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* 標題區域 */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">預覽控制台</h3>
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
              <div className="text-center p-2 bg-gray-100 rounded">
                <div className="text-lg font-bold text-gray-800">{blockStats.total}</div>
                <div className="text-xs text-gray-600">邏輯積木</div>
              </div>
              <div className="text-center p-2 bg-blue-100 rounded">
                <div className="text-lg font-bold text-blue-800">{flexBlocks?.length || 0}</div>
                <div className="text-xs text-blue-600">Flex 組件</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-green-100 rounded">
                <div className="text-lg font-bold text-green-800">{blockStats.replies}</div>
                <div className="text-xs text-green-600">回覆</div>
              </div>
              <div className="text-center p-2 bg-purple-100 rounded">
                <div className="text-lg font-bold text-purple-800">{blockStats.controls}</div>
                <div className="text-xs text-purple-600">控制</div>
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
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <User className="w-3 h-3 mr-2" />
              模擬新用戶
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <MessageSquare className="w-3 h-3 mr-2" />
              發送測試訊息
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <Eye className="w-3 h-3 mr-2" />
              預覽完整對話
            </Button>
          </CardContent>
        </Card>

        {/* 狀態指示 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
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
