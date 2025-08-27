import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Users, 
  Activity, 
  Copy, 
  CheckCircle, 
  Zap,
  MessageSquare,
  Webhook
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: () => void;
  disabled?: boolean;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

interface QuickActionsProps {
  botId?: string;
  className?: string;
  onSendTestMessage?: (userId: string, message: string) => Promise<void>;
  onCheckBotHealth?: () => Promise<void>;
  onViewUsers?: () => void;
  onCopyWebhookUrl?: () => void;
  webhookUrl?: string;
  botStatus?: "online" | "offline" | "error";
  customActions?: QuickAction[];
}

const QuickActions: React.FC<QuickActionsProps> = ({
  botId: _botId,
  className,
  onSendTestMessage,
  onCheckBotHealth,
  onViewUsers,
  onCopyWebhookUrl: _onCopyWebhookUrl,
  webhookUrl,
  botStatus = "online",
  customActions = []
}) => {
  const { toast } = useToast();
  const [testUserId, setTestUserId] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleSendTestMessage = async () => {
    if (!testUserId || !testMessage || !onSendTestMessage) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請填寫用戶 ID 和測試訊息"
      });
      return;
    }

    setIsLoading("send-test");
    try {
      await onSendTestMessage(testUserId, testMessage);
      setTestUserId("");
      setTestMessage("");
      toast({
        title: "發送成功",
        description: "測試訊息已發送"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "發送失敗",
        description: error instanceof Error ? error.message : "未知錯誤"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleCheckHealth = async () => {
    if (!onCheckBotHealth) return;

    setIsLoading("health-check");
    try {
      await onCheckBotHealth();
    } catch (_error) {
      // 錯誤處理在父元件中進行
    } finally {
      setIsLoading(null);
    }
  };

  const handleCopyWebhookUrl = async () => {
    if (!webhookUrl) return;

    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      toast({
        title: "複製成功",
        description: "Webhook URL 已複製到剪貼簿"
      });

      setTimeout(() => {
        setCopiedUrl(false);
      }, 2000);
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "複製失敗",
        description: "無法複製 Webhook URL"
      });
    }
  };

  const defaultActions: QuickAction[] = [
    {
      id: "health-check",
      label: "檢查狀態",
      description: "檢查 Bot 連接狀態",
      icon: Activity,
      onClick: handleCheckHealth,
      disabled: !onCheckBotHealth,
      badge: botStatus === "online" ? 
        { text: "在線", variant: "default" } :
        botStatus === "offline" ?
        { text: "離線", variant: "secondary" } :
        { text: "錯誤", variant: "destructive" }
    },
    {
      id: "view-users",
      label: "用戶列表",
      description: "查看 Bot 用戶",
      icon: Users,
      onClick: () => onViewUsers?.(),
      disabled: !onViewUsers
    },
    {
      id: "copy-webhook",
      label: "複製 Webhook",
      description: "複製 Webhook URL",
      icon: copiedUrl ? CheckCircle : Copy,
      onClick: handleCopyWebhookUrl,
      disabled: !webhookUrl,
      variant: copiedUrl ? "default" : "outline"
    }
  ];

  const allActions = [...defaultActions, ...customActions];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          快速操作
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="actions">操作面板</TabsTrigger>
            <TabsTrigger value="test">測試訊息</TabsTrigger>
          </TabsList>
          
          <TabsContent value="actions" className="space-y-4">
            {/* 快速操作按鈕 */}
            <div className="grid gap-3">
              {allActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant || "outline"}
                    className={cn(
                      "w-full justify-start h-auto p-4 text-left",
                      "hover:shadow-md transition-all duration-200"
                    )}
                    onClick={action.onClick}
                    disabled={action.disabled || isLoading === action.id}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <Icon className={cn(
                          "h-5 w-5",
                          isLoading === action.id && "animate-spin"
                        )} />
                        <div className="text-left">
                          <div className="font-medium">{action.label}</div>
                          {action.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {action.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {action.badge && (
                        <Badge 
                          variant={action.badge.variant || "default"}
                          className="text-xs"
                        >
                          {action.badge.text}
                        </Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
            
            {/* Webhook URL 顯示 */}
            {webhookUrl && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Webhook className="h-4 w-4 mr-1" />
                    Webhook URL
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="text-xs bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhookUrl}
                      className="flex-shrink-0"
                    >
                      {copiedUrl ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="test" className="space-y-4">
            {/* 測試訊息表單 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-user-id">用戶 ID</Label>
                <Input
                  id="test-user-id"
                  placeholder="請輸入測試用戶的 LINE ID"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="test-message">測試訊息</Label>
                <Textarea
                  id="test-message"
                  placeholder="請輸入要發送的測試訊息..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              
              <Button
                onClick={handleSendTestMessage}
                disabled={!testUserId || !testMessage || isLoading === "send-test"}
                className="w-full"
              >
                <Send className={cn(
                  "h-4 w-4 mr-2",
                  isLoading === "send-test" && "animate-pulse"
                )} />
                {isLoading === "send-test" ? "發送中..." : "發送測試訊息"}
              </Button>
            </div>
            
            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">使用提示：</p>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• 用戶 ID 是 LINE 用戶的唯一識別碼</li>
                    <li>• 用戶必須先加入您的 LINE Bot</li>
                    <li>• 測試訊息會直接發送給該用戶</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QuickActions;