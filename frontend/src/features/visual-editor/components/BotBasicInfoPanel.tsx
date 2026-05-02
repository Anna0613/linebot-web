import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/services/UnifiedApiClient";
import type { Bot as BotRecord, BotUpdateData, LineBotProfile } from "@/types/bot";
import { useToast } from "@/hooks/use-toast";

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
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    void loadBot();
    void loadLineProfile();
  }, [loadBot, loadLineProfile]);

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

  const officialName = lineProfile?.display_name || bot?.name || "LINE Bot";
  const officialAvatar = lineProfile?.picture_url || undefined;

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
