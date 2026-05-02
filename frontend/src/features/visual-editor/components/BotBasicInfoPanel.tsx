import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  QrCode,
  RefreshCw,
  Save,
  Wifi,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/services/UnifiedApiClient";
import type { Bot as BotRecord, BotUpdateData, LineBotProfile } from "@/types/bot";
import type { WebhookStatus } from "@/features/bot-management/types/botManagement";
import { QuotaStatusCard } from "@/features/bot-management/components/quota/QuotaStatusCard";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

interface BotBasicInfoPanelProps {
  selectedBotId: string;
  onBotUpdated?: () => Promise<unknown> | void;
}

const officialAccountManagerUrl = "https://manager.line.biz/";

const formatDateTime = (value?: string | null) => {
  if (!value) return "尚未同步";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未同步";

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const displayValue = (value?: string | null) => value || "未提供";

const getBotHealthFromWebhook = (webhookStatus: WebhookStatus | null) => {
  if (!webhookStatus) return "offline";
  if (webhookStatus.status === "active") return "online";
  if (
    webhookStatus.status === "not_configured" ||
    webhookStatus.status === "configuration_error"
  ) {
    return "error";
  }
  return "offline";
};

const getHealthBadgeClass = (health: "online" | "offline" | "error") => {
  if (health === "online") return "border-emerald-200 bg-emerald-50 text-[#166534]";
  if (health === "offline") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
};

const getHealthLabel = (health: "online" | "offline" | "error") => {
  if (health === "online") return "運作正常";
  if (health === "offline") return "離線";
  return "錯誤";
};

const getWebhookBadgeClass = (webhookStatus: WebhookStatus | null) => {
  if (webhookStatus?.status === "active") {
    return "border-emerald-200 bg-emerald-50 text-[#166534]";
  }
  if (webhookStatus?.status === "not_configured") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  if (!webhookStatus) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border-red-200 bg-red-50 text-red-700";
};

const isWebhookBound = (webhookStatus: WebhookStatus | null) =>
  webhookStatus?.status === "active" ||
  webhookStatus?.webhook_working === true ||
  webhookStatus?.webhook_endpoint_info?.active === true;

const BotBasicInfoPanel: React.FC<BotBasicInfoPanelProps> = ({
  selectedBotId,
  onBotUpdated,
}) => {
  const [bot, setBot] = useState<BotRecord | null>(null);
  const [lineProfile, setLineProfile] = useState<LineBotProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    channel_token: "",
    channel_secret: "",
  });
  const [originalData, setOriginalData] = useState(formData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingLine, setIsSyncingLine] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [copiedQrCode, setCopiedQrCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const { isConnected } = useWebSocket({
    botId: selectedBotId || undefined,
    autoReconnect: true,
    enabled: !!selectedBotId,
  });
  const {
    quotaStatus,
    isLoading: quotaLoading,
    error: quotaError,
    refetch: refetchQuota,
  } = useQuotaStatus({
    botId: selectedBotId || null,
    enabled: !!selectedBotId,
    refreshInterval: 5 * 60 * 1000,
  });

  const hasChanges = useMemo(
    () =>
      formData.name.trim() !== originalData.name.trim() ||
      formData.channel_token.trim() !== originalData.channel_token.trim() ||
      formData.channel_secret.trim() !== originalData.channel_secret.trim(),
    [formData, originalData]
  );

  const loadLineProfile = useCallback(async () => {
    if (!selectedBotId) return;

    setIsSyncingLine(true);
    try {
      const response = await apiClient.getLineBotProfile(selectedBotId);
      if (response.error) {
        setLineProfile(null);
        setError(response.error);
        return;
      }

      setLineProfile(response.data || null);
      setError(null);
    } catch (_err) {
      setLineProfile(null);
      setError("無法同步 LINE 官方帳號資料");
    } finally {
      setIsSyncingLine(false);
    }
  }, [selectedBotId]);

  const loadBot = useCallback(async () => {
    if (!selectedBotId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getBot(selectedBotId);
      if (response.error) {
        setError(response.error);
        return;
      }

      const botData = response.data as BotRecord;
      const nextData = {
        name: botData.name || "",
        channel_token: botData.channel_token || "",
        channel_secret: botData.channel_secret || "",
      };

      setBot(botData);
      setFormData(nextData);
      setOriginalData(nextData);
    } catch (_err) {
      setError("無法載入 Bot 連線設定");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBotId]);

  const fetchWebhookStatus = useCallback(async () => {
    if (!selectedBotId) return null;

    setWebhookStatusLoading(true);
    try {
      const response = await apiClient.getWebhookStatus(selectedBotId);
      if (response.data && !response.error) {
        const statusData = response.data as WebhookStatus;
        setWebhookStatus(statusData);
        return statusData;
      }

      setWebhookStatus(null);
      return null;
    } catch (_err) {
      setWebhookStatus(null);
      return null;
    } finally {
      setWebhookStatusLoading(false);
    }
  }, [selectedBotId]);

  useEffect(() => {
    void loadBot();
    void loadLineProfile();
    void fetchWebhookStatus();
  }, [loadBot, loadLineProfile, fetchWebhookStatus]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!hasChanges || isSaving) return;

    const nextData: BotUpdateData = {
      name: formData.name.trim(),
      channel_token: formData.channel_token.trim(),
      channel_secret: formData.channel_secret.trim(),
    };

    if (!nextData.name || !nextData.channel_token || !nextData.channel_secret) {
      toast({
        variant: "destructive",
        title: "資料不完整",
        description: "Bot 名稱、Channel Token 與 Channel Secret 都必須填寫",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.updateBot(selectedBotId, nextData);
      if (response.error) {
        toast({
          variant: "destructive",
          title: "更新失敗",
          description: response.error,
        });
        return;
      }

      toast({
        title: "連線設定已更新",
        description: "已重新同步 LINE 官方帳號資料",
      });

      await onBotUpdated?.();
      await loadBot();
      await loadLineProfile();
      await fetchWebhookStatus();
    } catch (_err) {
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: "無法更新 Bot 連線設定",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(originalData);
  };

  const handleCheckBotHealth = async () => {
    if (!selectedBotId || controlLoading) return;

    setControlLoading(true);
    try {
      const statusData = await fetchWebhookStatus();
      if (statusData?.status === "active") {
        toast({
          title: "狀態檢查完成",
          description: "Bot 運作正常，Webhook 已綁定",
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "狀態檢查完成",
        description: statusData?.status_text || "無法確認 Bot 狀態",
      });
    } catch (_err) {
      toast({
        variant: "destructive",
        title: "檢查失敗",
        description: "無法取得 Bot 狀態",
      });
    } finally {
      setControlLoading(false);
    }
  };

  const getQrCodeSvg = () =>
    qrCodeRef.current?.querySelector("svg") as SVGElement | null;

  const copyQrCodeImage = async () => {
    try {
      const svg = getQrCodeSvg();
      if (!svg) return;

      const canvas = document.createElement("canvas");
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
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) return;

          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopiedQrCode(true);
          toast({
            title: "複製成功",
            description: "QR Code 已複製到剪貼簿",
          });
          window.setTimeout(() => setCopiedQrCode(false), 2000);
        });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "複製失敗",
        description: "無法複製 QR Code",
      });
    }
  };

  const downloadQrCodeImage = () => {
    const svg = getQrCodeSvg();
    if (!svg || !bot) return;

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
          if (!blob) return;

          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `${bot.name}_QRCode.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);

          toast({
            title: "下載成功",
            description: "QR Code 已下載",
          });
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const officialName = lineProfile?.display_name || bot?.name || "LINE Bot";
  const officialAvatar = lineProfile?.picture_url || undefined;
  const botHealth = getBotHealthFromWebhook(webhookStatus);
  const qrCodeBasicId = webhookStatus?.basic_id || lineProfile?.basic_id || "";
  const webhookBound = isWebhookBound(webhookStatus);
  const webhookAutoBindError = webhookStatus?.webhook_auto_bind?.error;
  const webhookNeedsHttpsDomain =
    typeof webhookAutoBindError === "string" &&
    webhookAutoBindError.includes("HTTPS");
  const webhookBindingLabel = !webhookStatus
    ? "尚未檢查綁定狀態"
    : webhookBound
      ? "Webhook 已綁定並啟用"
      : !webhookStatus.is_configured
        ? "待完成 Channel 設定"
        : webhookStatus.status === "configuration_error"
          ? "LINE API 設定錯誤"
          : "Webhook 尚未啟用";
  const webhookBindingDescription = webhookBound
    ? "系統會自動維護 LINE webhook 綁定，不需手動複製 URL。"
    : webhookNeedsHttpsDomain
      ? "LINE webhook 自動綁定需要可公開 HTTPS WEBHOOK_DOMAIN；localhost 不能直接綁定 LINE。"
      : "請確認 Channel Token、Channel Secret 與後端 WEBHOOK_DOMAIN 設定後重新檢查。";
  const webhookBindingClass = webhookBound
    ? "border-emerald-100 bg-emerald-50 text-[#166534]"
    : webhookStatus?.status === "configuration_error"
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-amber-100 bg-amber-50 text-amber-700";

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-8">
        <section className="app-panel-strong overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-20 w-20 border border-white/80 bg-white shadow-sm">
                <AvatarImage src={officialAvatar} alt={officialName} />
                <AvatarFallback className="bg-emerald-50 text-[#166534]">
                  <Bot className="h-9 w-9" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="app-kicker">LINE 官方帳號</p>
                  <Badge
                    variant="outline"
                    className={
                      lineProfile?.is_live
                        ? "border-emerald-200 bg-emerald-50 text-[#166534]"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    {lineProfile?.is_live ? "LINE API 已同步" : "尚未取得真實資料"}
                  </Badge>
                </div>
                <h2 className="truncate text-2xl font-semibold text-slate-950">
                  {officialName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {displayValue(lineProfile?.basic_id)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="app-secondary-button"
                onClick={() => void loadLineProfile()}
                disabled={isSyncingLine}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingLine ? "animate-spin" : ""}`} />
                重新同步
              </Button>
              <Button asChild variant="outline" className="app-secondary-button">
                <a href={officialAccountManagerUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  編輯 LINE 官方資料
                </a>
              </Button>
            </div>
          </div>
        </section>

        {(error || lineProfile?.error) && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/80 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>LINE API 同步失敗</AlertTitle>
            <AlertDescription>{error || lineProfile?.error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <section className="app-panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">Control</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">Bot 資訊與狀態</h3>
              </div>
              <Badge variant="outline" className={getHealthBadgeClass(botHealth)}>
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {getHealthLabel(botHealth)}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Bot 名稱" value={displayValue(bot?.name)} />
              <InfoItem
                label="頻道設定"
                value={bot?.channel_token && bot?.channel_secret ? "已設定" : "未設定"}
              />
              <InfoItem label="建立時間" value={formatDateTime(bot?.created_at)} />
              <InfoItem label="最後更新" value={formatDateTime(bot?.updated_at)} />
              <div className="rounded-lg border border-white/70 bg-white/60 p-4 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">即時連接</p>
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        isConnected ? "text-[#166534]" : "text-red-700"
                      }`}
                    >
                      {isConnected ? "WebSocket 已連線" : "離線模式"}
                    </p>
                  </div>
                  <Wifi
                    className={`h-5 w-5 ${isConnected ? "text-[#16a34a]" : "text-red-500"}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="app-secondary-button"
                onClick={() => void handleCheckBotHealth()}
                disabled={controlLoading}
              >
                <Activity className="h-4 w-4" />
                {controlLoading ? "檢查中..." : "重新檢查狀態"}
              </Button>
            </div>
          </section>

          <section className="app-panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">Webhook</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">綁定狀態</h3>
              </div>
              <Badge variant="outline" className={getWebhookBadgeClass(webhookStatus)}>
                {webhookStatusLoading ? "檢查中..." : webhookStatus?.status_text || "尚未檢查"}
              </Badge>
            </div>

            <div className={`mb-4 rounded-lg border px-4 py-3 ${webhookBindingClass}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {webhookBound ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {webhookBindingLabel}
              </div>
              <p className="mt-1 text-xs font-medium opacity-80">
                {webhookBindingDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatusItem
                label="Bot 配置"
                active={Boolean(webhookStatus?.is_configured)}
                activeText="已配置"
                inactiveText="未配置"
              />
              <StatusItem
                label="LINE API"
                active={Boolean(webhookStatus?.line_api_accessible)}
                activeText="可連接"
                inactiveText="連接失敗"
              />
              <StatusItem
                label="Webhook 端點"
                active={Boolean(webhookStatus?.webhook_endpoint_info?.is_set)}
                warning={
                  Boolean(webhookStatus?.webhook_endpoint_info?.is_set) &&
                  !webhookStatus?.webhook_endpoint_info?.active
                }
                activeText="已啟用"
                warningText="已設定但未啟用"
                inactiveText="未設定"
                className="sm:col-span-2"
              />
              <InfoItem
                label="最後檢查"
                value={formatDateTime(webhookStatus?.checked_at)}
                className="sm:col-span-2"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="app-secondary-button"
                onClick={() => void fetchWebhookStatus()}
                disabled={webhookStatusLoading}
              >
                <RefreshCw className={`h-4 w-4 ${webhookStatusLoading ? "animate-spin" : ""}`} />
                {webhookStatusLoading ? "檢查中..." : "重新檢查"}
              </Button>
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="app-panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">Messaging API</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">訊息配額</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="app-icon-button h-9 w-9"
                onClick={() => void refetchQuota()}
                disabled={quotaLoading}
                title="重新整理配額"
              >
                <RefreshCw className={`h-4 w-4 ${quotaLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <QuotaStatusCard
              quotaStatus={quotaStatus}
              isLoading={quotaLoading}
              error={quotaError}
              onRefresh={refetchQuota}
              compact
            />
          </section>

          <section className="app-panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">LINE OA</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">QR Code</h3>
              </div>
              <QrCode className="h-5 w-5 text-[#16a34a]" />
            </div>

            {qrCodeBasicId ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  ref={qrCodeRef}
                  className="w-fit rounded-lg border border-slate-200 bg-white p-3"
                >
                  <QRCodeSVG
                    value={`https://line.me/R/ti/p/${encodeURIComponent(qrCodeBasicId)}`}
                    size={156}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">
                    {officialName}
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {qrCodeBasicId}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="app-secondary-button"
                      onClick={() => void copyQrCodeImage()}
                    >
                      {copiedQrCode ? (
                        <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      複製圖片
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="app-secondary-button"
                      onClick={downloadQrCodeImage}
                    >
                      <Download className="h-4 w-4" />
                      下載圖片
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[170px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/50 text-sm text-slate-500">
                尚未取得 Basic ID
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <section className="app-panel p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker">LINE API</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">真實官方資料</h3>
              </div>
              {lineProfile?.is_live && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#166534]">
                  <CheckCircle2 className="h-4 w-4" />
                  Live
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="顯示名稱" value={displayValue(lineProfile?.display_name)} />
              <InfoItem label="Basic ID" value={displayValue(lineProfile?.basic_id)} />
              <InfoItem label="Premium ID" value={displayValue(lineProfile?.premium_id)} />
              <InfoItem label="Channel/User ID" value={displayValue(lineProfile?.channel_id || lineProfile?.user_id)} />
              <InfoItem label="聊天模式" value={displayValue(lineProfile?.chat_mode)} />
              <InfoItem label="已讀模式" value={displayValue(lineProfile?.mark_as_read_mode)} />
              <InfoItem label="頭像 URL" value={displayValue(lineProfile?.picture_url)} className="sm:col-span-2" />
              <InfoItem label="同步時間" value={formatDateTime(lineProfile?.fetched_at)} className="sm:col-span-2" />
            </div>
          </section>

          <section className="app-panel p-5 sm:p-6">
            <div className="mb-5">
              <p className="app-kicker">Connection</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">連線設定</h3>
            </div>

            {isLoading ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-100 border-b-[#16a34a]" />
                  載入中...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bot-name" className="text-slate-700">
                    系統管理名稱
                  </Label>
                  <Input
                    id="bot-name"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, name: event.target.value }))
                    }
                    className="app-input"
                    placeholder="Bot 名稱"
                  />
                </div>

                <SecretInput
                  id="channel-token"
                  label="Channel Access Token"
                  value={formData.channel_token}
                  visible={showToken}
                  onToggleVisible={() => setShowToken((current) => !current)}
                  onChange={(value) =>
                    setFormData((current) => ({ ...current, channel_token: value }))
                  }
                />

                <SecretInput
                  id="channel-secret"
                  label="Channel Secret"
                  value={formData.channel_secret}
                  visible={showSecret}
                  onToggleVisible={() => setShowSecret((current) => !current)}
                  onChange={(value) =>
                    setFormData((current) => ({ ...current, channel_secret: value }))
                  }
                />

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="app-secondary-button"
                    onClick={handleReset}
                    disabled={!hasChanges || isSaving}
                  >
                    重置
                  </Button>
                  <Button
                    type="submit"
                    className="app-primary-button"
                    disabled={!hasChanges || isSaving}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "儲存中..." : "儲存連線設定"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: string;
  className?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, className }) => (
  <div className={`rounded-lg border border-white/70 bg-white/60 p-4 ${className || ""}`}>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-2 break-all text-sm font-medium text-slate-900">{value}</p>
  </div>
);

interface StatusItemProps {
  label: string;
  active: boolean;
  warning?: boolean;
  activeText: string;
  inactiveText: string;
  warningText?: string;
  className?: string;
}

const StatusItem: React.FC<StatusItemProps> = ({
  label,
  active,
  warning,
  activeText,
  inactiveText,
  warningText,
  className,
}) => {
  const tone = warning
    ? "text-amber-700"
    : active
      ? "text-[#166534]"
      : "text-red-700";
  const value = warning ? warningText || activeText : active ? activeText : inactiveText;

  return (
    <div className={`rounded-lg border border-white/70 bg-white/60 p-4 ${className || ""}`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
};

interface SecretInputProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
}

const SecretInput: React.FC<SecretInputProps> = ({
  id,
  label,
  value,
  visible,
  onToggleVisible,
  onChange,
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-slate-700">
      {label}
    </Label>
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-input pr-12"
        autoComplete="off"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-500 hover:text-[#166534]"
        onClick={onToggleVisible}
        title={visible ? "隱藏" : "顯示"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  </div>
);

export default BotBasicInfoPanel;
