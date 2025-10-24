import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useBotManagement } from "../../hooks/useBotManagement";
import { Loader } from "@/components/ui/loader";
// import ToastNotification from "../ui/ToastNotification";

interface BotData {
  name: string;
  accessToken: string;
  channelSecret: string;
}

const AddServerPage = () => {
  const navigate = useNavigate();
  const { createBot, isLoading, error, setError, clearError } =
    useBotManagement();
  const [formData, setFormData] = useState<BotData>({
    name: "",
    accessToken: "",
    channelSecret: "",
  });
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [_showToast, _setShowToast] = useState(false);
  const [_toastMessage, _setToastMessage] = useState("");
  const [_toastType, _setToastType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");

  const handleInputChange = (field: keyof BotData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) {
      clearError();
    }
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "name":
        if (!value.trim()) {
          return "請輸入 LINE Bot 名稱";
        }
        if (value.trim().length < 2) {
          return "Bot 名稱至少需要 2 個字符";
        }
        if (value.trim().length > 50) {
          return "Bot 名稱不能超過 50 個字符";
        }
        if (!/^[a-zA-Z0-9\u4e00-\u9fff\-_\s]+$/.test(value.trim())) {
          return "Bot 名稱只能包含中英文、數字、空格、連字號和底線";
        }
        return "";

      case "accessToken":
        if (!value.trim()) {
          return "請輸入 Channel Access Token";
        }
        if (value.trim().length < 10) {
          return "Channel Access Token 長度不正確";
        }
        return "";

      case "channelSecret":
        if (!value.trim()) {
          return "請輸入 Channel Secret";
        }
        if (value.trim().length < 10) {
          return "Channel Secret 長度不正確";
        }
        return "";

      default:
        return "";
    }
  };

  const _handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        errors[key] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return "請修正表單中的錯誤";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // 準備提交給 puzzleAPI 的數據
    const botData = {
      name: formData.name,
      channel_token: formData.accessToken,
      channel_secret: formData.channelSecret,
    };

    try {
      // 調用 hook 中的 createBot 方法
      const createdBot = await createBot(botData);

      if (createdBot) {
        console.log("Bot 創建成功:", createdBot);

        // 顯示成功訊息
        setSuccess(true);

        // 移除自動跳轉，讓用戶停留在當前頁面
      }
    } catch (error) {
      // 錯誤已經在 useBotManagement 中處理，這裡不需要額外處理
      console.error("創建 Bot 失敗:", error);
    }
  };

  const _handleCancel = () => {
    window.history.back(); // 返回上一頁
  };

  if (success) {
    return (
      <div className="space-y-12">
        {/* 成功標題區域 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[hsl(var(--primary))] rounded-full mb-6 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-foreground text-[36px] sm:text-[42px] font-bold mb-4 leading-tight tracking-wide">
            建立成功！
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            您的 LINE Bot 已成功建立
          </p>
        </div>

        {/* 成功訊息區域 */}
        <div className="max-w-3xl mx-auto">
          <div className="web3-glass-card p-8 border-l-4 border-primary">
            <h2 className="text-foreground text-[24px] font-bold mb-6">
              建立完成
            </h2>
            <div className="space-y-4">
              <div className="bg-secondary/50 rounded-lg p-6">
                <h3 className="text-foreground font-bold text-lg mb-4">
                  機器人資訊
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground font-medium">名稱：</span>
                    <span className="text-foreground/80">{formData.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground font-medium">狀態：</span>
                    <span className="text-primary font-bold">已建立</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground font-medium">
                      建立時間：
                    </span>
                    <span className="text-foreground/80">
                      {new Date().toLocaleString("zh-TW")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 下一步區域 */}
        <div className="max-w-4xl mx-auto">
          <div className="web3-glass-card p-8">
            <h2 className="text-foreground text-[24px] font-bold text-center mb-8">
              下一步操作
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 web3-glass-card">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h2a1 1 0 011-1V4m0 0h8m-8 0a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V5a1 1 0 00-1-1z"
                    />
                  </svg>
                </div>
                <h3 className="text-foreground font-bold mb-2">設計對話</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  開始設計您的機器人對話流程
                </p>
              </div>

              <div className="text-center p-6 web3-glass-card">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-accent-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-foreground font-bold mb-2">測試功能</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  測試機器人回應是否正常
                </p>
              </div>

              <div className="text-center p-6 web3-glass-card">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-foreground font-bold mb-2">正式發布</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  讓您的機器人上線服務
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 按鈕區域 */}
        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/bots/management")}
              className="web3-primary-button px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-200 text-lg"
            >
              查看我的機器人
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({ name: "", accessToken: "", channelSecret: "" });
              }}
              className="web3-button px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-200 text-lg"
            >
              建立其他機器人
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* 標題區域 */}
      <div className="text-center mb-8 sm:mb-12 fade-in-element">
      <h1 className="text-foreground text-2xl sm:text-3xl md:text-[36px] lg:text-[42px] font-bold mb-3 sm:mb-4 leading-tight tracking-wide px-2">
          建立新的 LINE Bot
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-4">
          請輸入您的 LINE Bot 資訊
        </p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-destructive mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span className="text-foreground font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* 主要表單區域 */}
      <div className="max-w-4xl mx-auto">
        <div className="web3-glass-card p-8 sm:p-12">
          <div className="space-y-8">
            {/* Bot 名稱 */}
            <div>
              <label className="block text-foreground text-lg font-bold mb-3">
                Bot 名稱
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="請輸入您的 Bot 名稱"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-foreground text-lg"
              />
              <p className="text-muted-foreground text-sm mt-2">
                這個名稱將會顯示在您的機器人設定中
              </p>
            </div>

            {/* Channel Access Token */}
            <div>
              <label className="block text-foreground text-lg font-bold mb-3">
                Channel Access Token
              </label>
              <input
                type="text"
                value={formData.accessToken}
                onChange={(e) =>
                  handleInputChange("accessToken", e.target.value)
                }
                placeholder="請輸入您的 Channel Access Token"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-foreground text-lg"
              />
              <p className="text-muted-foreground text-sm mt-2">
                從 LINE Developers Console 取得的長期 Channel Access Token
              </p>
            </div>

            {/* Channel Secret */}
            <div>
              <label className="block text-foreground text-lg font-bold mb-3">
                Channel Secret
              </label>
              <input
                type="text"
                value={formData.channelSecret}
                onChange={(e) =>
                  handleInputChange("channelSecret", e.target.value)
                }
                placeholder="請輸入您的 Channel Secret"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-foreground text-lg"
              />
              <p className="text-muted-foreground text-sm mt-2">
                用於驗證來自 LINE 平台的請求
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 幫助資訊區域 */}
      <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
        <div className="web3-glass-card p-8">
          <h2 className="text-foreground text-[24px] font-bold text-center mb-8">
            如何取得這些資訊？
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 卡片 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground text-2xl font-bold shadow-md bg-primary">
                1
              </div>
              <h3 className="text-foreground font-bold text-lg mb-3">
                前往 LINE Developers
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                登入 LINE Developers Console 並選擇您的頻道
              </p>
            </div>

            {/* 卡片 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-accent-foreground text-2xl font-bold shadow-md bg-accent">
                2
              </div>
              <h3 className="text-foreground font-bold text-lg mb-3">
                取得 Access Token
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                在 "Messaging API" 分頁中發行長期的 Channel Access Token
              </p>
            </div>

            {/* 卡片 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground text-2xl font-bold shadow-md bg-primary">
                3
              </div>
              <h3 className="text-foreground font-bold text-lg mb-3">
                複製 Channel Secret
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                在 "Basic settings" 分頁中找到並複製 Channel Secret
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/how-to-establish"
              className="web3-primary-button inline-flex items-center px-6 py-3 font-bold rounded-lg shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              查看詳細教學
            </a>
          </div>
        </div>
      </div>

      {/* 提交按鈕區域 */}
      <div className="text-center mt-8">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !formData.name || !formData.accessToken || !formData.channelSecret}
          className="web3-primary-button px-12 py-4 font-bold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <div className="scale-50">
                <Loader fullPage={false} web3Style={true} />
              </div>
              建立中...
            </span>
          ) : (
            "立即建立 Bot"
          )}
        </button>
      </div>
    </div>
  );
};

export default AddServerPage;
