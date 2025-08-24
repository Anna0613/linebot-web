import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Play, Pause, Eye, Calendar } from 'lucide-react';

interface LogicTemplate {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LogicTemplateManagerProps {
  templates: LogicTemplate[];
  onToggle: (templateId: string, isActive: boolean) => void;
  isLoading?: boolean;
}

const LogicTemplateManager: React.FC<LogicTemplateManagerProps> = ({
  templates,
  onToggle,
  isLoading = false
}) => {
  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">尚無邏輯模板</h3>
            <p className="text-muted-foreground mb-4">
              創建邏輯模板來定義 Bot 的回應行為
            </p>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              創建邏輯模板
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 統計資訊 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總模板數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              啟用中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              停用中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {templates.filter(t => !t.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 模板列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            邏輯模板管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template, index) => (
              <React.Fragment key={template.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-foreground truncate">
                        {template.name}
                      </h4>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "啟用中" : "已停用"}
                      </Badge>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        創建於 {new Date(template.created_at).toLocaleDateString('zh-TW')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        更新於 {new Date(template.updated_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    {/* 預覽按鈕 */}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* 啟用/停用切換 */}
                    <div className="flex items-center gap-2">
                      {template.is_active ? (
                        <Play className="h-4 w-4 text-green-600" />
                      ) : (
                        <Pause className="h-4 w-4 text-gray-500" />
                      )}
                      <Switch
                        checked={template.is_active}
                        disabled={isLoading}
                        onCheckedChange={(checked) => onToggle(template.id, checked)}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                  </div>
                </div>
                
                {index < templates.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>

          {/* 操作按鈕 */}
          <Separator className="my-4" />
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {templates.filter(t => t.is_active).length} 個模板正在運行
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                管理模板
              </Button>
              <Button size="sm">
                新增模板
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogicTemplateManager;