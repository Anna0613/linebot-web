import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Plus,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { useBotManagement } from "@/features/bot-management/hooks/useBotManagement";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";

interface BotData {
  name: string;
  accessToken: string;
  channelSecret: string;
}

const credentialHints = [
  "LINE Developers Console",
  "Messaging API 分頁",
  "Basic settings 分頁",
];

const BotCreationForm = () => {
  const navigate = useNavigate();
  const { createBot, isLoading, error, setError, clearError } =
    useBotManagement();
  const { selectBot, refreshBots } = useSelectedBot();
  const [formData, setFormData] = useState<BotData>({
    name: "",
    accessToken: "",
    channelSecret: "",
  });
  const [success, setSuccess] = useState(false);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof BotData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) clearError();
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "name":
        if (!value.trim()) return "請輸入 LINE Bot 名稱";
        if (value.trim().length < 2) return "Bot 名稱至少需要 2 個字符";
        if (value.trim().length > 50) return "Bot 名稱不能超過 50 個字符";
        if (!/^[a-zA-Z0-9\u4e00-\u9fff\-_\s]+$/.test(value.trim())) {
          return "Bot 名稱只能包含中英文、數字、空格、連字號和底線";
        }
        return "";
      case "accessToken":
        if (!value.trim()) return "請輸入 Channel Access Token";
        if (value.trim().length < 10) return "Channel Access Token 長度不正確";
        return "";
      case "channelSecret":
        if (!value.trim()) return "請輸入 Channel Secret";
        if (value.trim().length < 10) return "Channel Secret 長度不正確";
        return "";
      default:
        return "";
    }
  };

  const handleFieldBlur = (name: keyof BotData, value: string) => {
    const nextError = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: nextError }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    Object.keys(formData).forEach((key) => {
      const nextError = validateField(key, formData[key as keyof BotData]);
      if (nextError) errors[key] = nextError;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return "請修正表單中的錯誤";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const createdBot = await createBot({
        name: formData.name.trim(),
        channel_token: formData.accessToken.trim(),
        channel_secret: formData.channelSecret.trim(),
      });

      if (createdBot) {
        const nextCreatedBotId = (createdBot as { id?: string })?.id || null;
        setCreatedBotId(nextCreatedBotId);
        if (nextCreatedBotId) {
          selectBot(nextCreatedBotId);
          void refreshBots();
        }
        setSuccess(true);
      }
    } catch (creationError) {
      console.error("創建 Bot 失敗:", creationError);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setCreatedBotId(null);
    setFormData({ name: "", accessToken: "", channelSecret: "" });
    setFieldErrors({});
    clearError();
  };

  if (success) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <div className="app-panel-strong p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="app-soft-icon">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="app-kicker mt-5">Created</p>
              <h1 className="app-page-title mt-2">Bot 已建立</h1>
              <p className="app-subtitle mt-3">
                {formData.name} 已加入工作台。接下來可以開始設計對話流程，或回到管理中心查看狀態。
              </p>
            </div>
            <div className="app-muted-panel min-w-48">
              <p className="text-xs text-slate-500">狀態</p>
              <p className="mt-1 font-semibold text-[#166534]">已建立</p>
              <p className="mt-3 text-xs text-slate-500">建立時間</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {new Date().toLocaleString("zh-TW")}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() =>
                navigate("/bots/visual-editor", {
                  state: {
                    selectedBotId: createdBotId,
                    activeTab: "logic",
                    returnTo: "/bots/management",
                    returnLabel: "返回管理中心",
                  },
                })
              }
              className="app-primary-button"
            >
              <Workflow className="h-4 w-4" />
              開始設計流程
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/bots/management")}
              variant="outline"
              className="app-secondary-button"
            >
              前往管理中心
            </Button>
            <Button
              type="button"
              onClick={resetForm}
              variant="outline"
              className="app-secondary-button"
            >
              <Plus className="h-4 w-4" />
              建立其他 Bot
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitDisabled =
    isLoading ||
    !formData.name ||
    !formData.accessToken ||
    !formData.channelSecret;

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="mb-6">
        <p className="app-kicker">Create Bot</p>
        <h1 className="app-page-title mt-2">建立新的 LINE Bot</h1>
        <p className="app-subtitle mt-3">
          輸入 Bot 名稱與 LINE Channel 憑證。建立後即可進入視覺化編輯器。
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <form onSubmit={handleSubmit} className="app-panel-strong p-5 sm:p-7">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bot-name" className="text-slate-700">
                Bot 名稱
              </Label>
              <Input
                id="bot-name"
                value={formData.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                onBlur={(event) => handleFieldBlur("name", event.target.value)}
                placeholder="例如：客服助手"
                className="app-input"
              />
              {fieldErrors.name && (
                <p className="text-sm text-rose-600">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-token" className="text-slate-700">
                Channel Access Token
              </Label>
              <Input
                id="access-token"
                value={formData.accessToken}
                onChange={(event) =>
                  handleInputChange("accessToken", event.target.value)
                }
                onBlur={(event) =>
                  handleFieldBlur("accessToken", event.target.value)
                }
                placeholder="貼上長期 Channel Access Token"
                className="app-input"
              />
              {fieldErrors.accessToken && (
                <p className="text-sm text-rose-600">
                  {fieldErrors.accessToken}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-secret" className="text-slate-700">
                Channel Secret
              </Label>
              <Input
                id="channel-secret"
                value={formData.channelSecret}
                onChange={(event) =>
                  handleInputChange("channelSecret", event.target.value)
                }
                onBlur={(event) =>
                  handleFieldBlur("channelSecret", event.target.value)
                }
                placeholder="貼上 Channel Secret"
                className="app-input"
              />
              {fieldErrors.channelSecret && (
                <p className="text-sm text-rose-600">
                  {fieldErrors.channelSecret}
                </p>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="app-primary-button"
            >
              {isLoading ? (
                <>
                  <Loader size="sm" />
                  建立中
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  建立 Bot
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="app-secondary-button"
              onClick={() => navigate("/how-to-establish")}
            >
              <ExternalLink className="h-4 w-4" />
              查看憑證教學
            </Button>
          </div>
        </form>

        <aside className="app-panel p-5">
          <span className="app-soft-icon">
            <KeyRound className="h-5 w-5" />
          </span>
          <h2 className="app-card-title mt-5">需要準備的資訊</h2>
          <p className="app-card-copy mt-2">
            三個欄位都來自 LINE Developers。確認 Channel 已啟用 Messaging API 後再建立。
          </p>
          <div className="mt-5 space-y-3">
            {credentialHints.map((hint, index) => (
              <div key={hint} className="flex items-center gap-3 rounded-[14px] bg-slate-50/80 px-3 py-3 text-sm text-slate-600">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-[#166534]">
                  {index + 1}
                </span>
                {hint}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[14px] border border-emerald-100 bg-emerald-50/80 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-[#166534]" />
              <p className="text-sm leading-6 text-emerald-800">
                憑證只用於連接您的 LINE Bot，請避免貼到不信任的頁面。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default BotCreationForm;
