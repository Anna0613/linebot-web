import React from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  BookOpen,
  Bot as BotIcon,
  CheckCircle,
  Copy,
  Download,
  Eye,
  Layout,
  QrCode,
  Settings,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuotaStatusCard } from "./quota/QuotaStatusCard";
import { useToast } from "@/hooks/use-toast";
import { getWebhookUrl } from "@/config/apiConfig";
import { Bot } from "@/types/bot";
import { WebhookStatus } from "@/features/bot-management/types/botManagement";
import { QuotaStatus } from "@/hooks/useQuotaStatus";

interface ControlTabContentProps {
  selectedBotId: string;
  selectedBot: Bot | undefined;
  botHealth: "online" | "offline" | "error";
  isConnected: boolean;
  quotaStatus: QuotaStatus | null;
  quotaLoading: boolean;
  quotaError: string | null;
  webhookStatus: WebhookStatus | null;
  webhookStatusLoading: boolean;
  copiedWebhookUrl: boolean;
  controlLoading: boolean;
  onRefreshQuota: () => void;
  onCheckBotHealth: () => void;
  onCopyWebhookUrl: () => void;
  onCheckWebhookStatus: () => void;
}

const formatBotTime = (timestamp: string) =>
  new Date(timestamp).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const getHealthBadgeClass = (botHealth: "online" | "offline" | "error") => {
  if (botHealth === "online")
    return "bg-green-50 text-green-700 border-green-200";
  if (botHealth === "offline")
    return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-700 border-red-200";
};

const getWebhookBadgeVariant = (webhookStatus: WebhookStatus) => {
  if (webhookStatus.status === "active") return "default";
  if (webhookStatus.status === "not_configured") return "secondary";
  return "destructive";
};

const getWebhookBadgeClass = (webhookStatus: WebhookStatus) => {
  if (webhookStatus.status === "active")
    return "bg-green-100 text-green-800 border-green-200";
  if (webhookStatus.status === "not_configured")
    return "bg-secondary text-foreground border-border";
  return "bg-red-100 text-red-800 border-red-200";
};

const ControlTabContent: React.FC<ControlTabContentProps> = ({
  selectedBotId,
  selectedBot,
  botHealth,
  isConnected,
  quotaStatus,
  quotaLoading,
  quotaError,
  webhookStatus,
  webhookStatusLoading,
  copiedWebhookUrl,
  controlLoading,
  onRefreshQuota,
  onCheckBotHealth,
  onCopyWebhookUrl,
  onCheckWebhookStatus,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const copyQrCodeImage = async () => {
    try {
      const canvas = document.createElement("canvas");
      const svg = document.querySelector(".qrcode-svg") as SVGElement;
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ "image/png": blob }),
                ]);
                toast({
                  title: "複製成功",
                  description: "QR Code 已複製到剪貼簿",
                });
              } catch (err) {
                console.error("複製失敗:", err);
                toast({
                  title: "複製失敗",
                  description: "無法複製 QR Code 到剪貼簿",
                  variant: "destructive",
                });
              }
            }
          });
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      console.error("複製失敗:", error);
      toast({
        title: "複製失敗",
        description: "無法複製 QR Code",
        variant: "destructive",
      });
    }
  };

  const downloadQrCodeImage = () => {
    const svg = document.querySelector(".qrcode-svg") as SVGElement;
    if (!svg || !selectedBot) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `${selectedBot.name}_QRCode.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            toast({
              title: "下載成功",
              description: "QR Code 已下載",
            });
          }
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  if (!selectedBotId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BotIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">
            請先選擇一個 Bot 來查看控制選項
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
        <Card className="shadow-sm hover:shadow-md transition h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Bot 資訊與狀態
              </div>
              <Badge
                variant="outline"
                className={getHealthBadgeClass(botHealth)}
              >
                <Activity className="h-3 w-3 mr-1" />
                {botHealth === "online"
                  ? "運作正常"
                  : botHealth === "offline"
                    ? "離線"
                    : "錯誤"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            {selectedBot && (
              <>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Bot 名稱
                      </label>
                      <p className="text-sm font-semibold">
                        {selectedBot.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        建立時間
                      </label>
                      <p className="text-xs">
                        {formatBotTime(selectedBot.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        最後更新
                      </label>
                      <p className="text-xs">
                        {formatBotTime(selectedBot.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        頻道設定
                      </label>
                      <Badge
                        variant={
                          selectedBot.channel_token ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {selectedBot.channel_token ? "已設定" : "未設定"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        連接狀態
                      </label>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                        />
                        <span
                          className={`text-xs font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}
                        >
                          {isConnected ? "即時連接" : "離線模式"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <QuotaStatusCard
                    quotaStatus={quotaStatus}
                    isLoading={quotaLoading}
                    error={quotaError}
                    onRefresh={onRefreshQuota}
                    compact={true}
                  />
                </div>
                <div className="pt-3 border-t mt-auto">
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={onCheckBotHealth}
                    disabled={controlLoading}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {controlLoading ? "檢查中..." : "重新檢查狀態"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Webhook URL
              </div>
              {webhookStatus && (
                <Badge
                  variant={getWebhookBadgeVariant(webhookStatus)}
                  className={getWebhookBadgeClass(webhookStatus)}
                >
                  {webhookStatusLoading
                    ? "檢查中..."
                    : webhookStatus.status_text || "未知狀態"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                LINE Bot Webhook URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={selectedBotId ? getWebhookUrl(selectedBotId) : ""}
                  readOnly
                  className="flex-1 text-sm"
                  placeholder="請選擇 Bot"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopyWebhookUrl}
                  disabled={!selectedBotId}
                  className="px-3"
                >
                  {copiedWebhookUrl ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                請將此 URL 設定到 LINE Developers Console 的 Webhook URL 欄位
              </p>
            </div>

            {webhookStatus && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    綁定狀態
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCheckWebhookStatus}
                    disabled={webhookStatusLoading}
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    {webhookStatusLoading ? "檢查中..." : "重新檢查"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Bot 配置:</span>
                    <span
                      className={`ml-1 ${webhookStatus.is_configured ? "text-green-600" : "text-red-600"} font-medium`}
                    >
                      {webhookStatus.is_configured ? "✓ 已配置" : "✗ 未配置"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">LINE API:</span>
                    <span
                      className={`ml-1 ${webhookStatus.line_api_accessible ? "text-green-600" : "text-red-600"} font-medium`}
                    >
                      {webhookStatus.line_api_accessible
                        ? "✓ 可連接"
                        : "✗ 連接失敗"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Webhook 端點:</span>
                    {webhookStatus.webhook_endpoint_info?.is_set ? (
                      <span
                        className={`ml-1 ${webhookStatus.webhook_endpoint_info?.active ? "text-green-600" : "text-orange-600"} font-medium`}
                      >
                        {webhookStatus.webhook_endpoint_info?.active
                          ? "✓ 已啟用"
                          : "⚠ 已設定但未啟用"}
                      </span>
                    ) : (
                      <span className="ml-1 text-red-600 font-medium">
                        ✗ 未設定
                      </span>
                    )}
                  </div>
                  {webhookStatus.webhook_endpoint_info?.endpoint && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">設定的端點:</span>
                      <div className="text-xs text-muted-foreground mt-1 break-all">
                        {webhookStatus.webhook_endpoint_info.endpoint}
                      </div>
                    </div>
                  )}
                </div>
                {webhookStatus.checked_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    最後檢查:{" "}
                    {new Date(webhookStatus.checked_at).toLocaleString("zh-TW")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {selectedBot && webhookStatus?.basic_id && (
          <Card className="shadow-sm hover:shadow-md transition h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-5 w-5" />
                LINE Bot QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col items-center">
                <div
                  className="bg-white p-3 rounded-lg border-2 border-border"
                  id="qrcode-container"
                >
                  <QRCodeSVG
                    value={`https://line.me/R/ti/p/${encodeURIComponent(webhookStatus.basic_id)}`}
                    size={180}
                    level="H"
                    includeMargin={true}
                    className="qrcode-svg"
                  />
                </div>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  掃描 QR Code 加入 {selectedBot.name}
                </p>

                <div className="flex gap-2 mt-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={copyQrCodeImage}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    複製圖片
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={downloadQrCodeImage}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下載圖片
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm hover:shadow-md transition h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-3 grid-rows-2 gap-3">
              <div
                className="row-span-2 flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-red-400 hover:bg-red-50 transition cursor-pointer group"
                onClick={() =>
                  window.open("https://developers.line.biz/console/", "_blank")
                }
              >
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-3 group-hover:bg-red-200 transition">
                  <Activity className="h-8 w-8 text-red-600" />
                </div>
                <span className="text-sm font-medium text-center">
                  LINE Console
                </span>
                <span className="text-xs text-muted-foreground text-center mt-2">
                  開發者平台
                </span>
              </div>

              <div
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer group"
                onClick={() =>
                  navigate("/bots/visual-editor", {
                    state: {
                      activeTab: "richmenu",
                      selectedBotId,
                      returnTo: "/bots/management",
                      returnLabel: "返回管理中心",
                    },
                  })
                }
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2 group-hover:bg-blue-200 transition">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  Rich Menu
                </span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  選單管理
                </span>
              </div>

              <div
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition cursor-pointer group"
                onClick={() =>
                  navigate("/bots/visual-editor", {
                    state: {
                      activeTab: "logic",
                      selectedBotId,
                      returnTo: "/bots/management",
                      returnLabel: "返回管理中心",
                    },
                  })
                }
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2 group-hover:bg-purple-200 transition">
                  <Workflow className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  邏輯設計器
                </span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  流程編輯
                </span>
              </div>

              <div
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition cursor-pointer group"
                onClick={() =>
                  navigate("/bots/visual-editor", {
                    state: {
                      activeTab: "flex",
                      selectedBotId,
                      returnTo: "/bots/management",
                      returnLabel: "返回管理中心",
                    },
                  })
                }
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2 group-hover:bg-green-200 transition">
                  <Layout className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  Flex Message 編輯
                </span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  訊息設計
                </span>
              </div>

              <div
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition cursor-pointer group"
                onClick={() =>
                  navigate("/bots/visual-editor", {
                    state: {
                      activeTab: "preview",
                      selectedBotId,
                      returnTo: "/bots/management",
                      returnLabel: "返回管理中心",
                    },
                  })
                }
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2 group-hover:bg-orange-200 transition">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  AI 知識庫
                </span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  知識管理
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ControlTabContent;
