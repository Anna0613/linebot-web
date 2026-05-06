import AppShell from "@/components/layout/AppShell";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEmailManagement } from "@/hooks/useEmailManagement";
import { useToast } from "@/hooks/use-toast";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { CheckCircle2, Languages } from "lucide-react";

/* eslint-disable @typescript-eslint/no-unused-vars */
const Language = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguagePreference();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // 使用認證 hook
  const {
    user: authUser,
    loading: authLoading,
    error: authError,
  } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });

  // 使用用戶資料管理 hooks
  const {
    user,
    setUser,
    userImage,
    loading: profileLoading,
    setLoading: setProfileLoading,
    avatarLoading,
    loadUserProfile,
    loadUserAvatar,
    updateDisplayName,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    deleteAccount,
  } = useUserProfile();

  // 使用電子郵件管理 hook
  const {
    email,
    setEmail,
    emailVerified,
    setEmailVerified,
    isEditingEmail,
    setIsEditingEmail,
    isResendingEmailVerification,
    loadEmailStatus,
    updateEmail,
    resendEmailVerification,
  } = useEmailManagement();

  // 初始化用戶資料
  useEffect(() => {
    const initializeUserData = async () => {
      if (authUser && !authLoading) {
        // 確保用戶數據結構完整
        const completeUser = {
          ...authUser,
          display_name: authUser.display_name || authUser.username || "",
          username: authUser.username || "",
        };

        setUser(completeUser);
        setDisplayName(completeUser.display_name);
        setEmail(authUser.email || "");
        setEmailVerified(authUser.email_verified || false);

        // 載入詳細的用戶資料
        if (!authUser.isLineUser) {
          await loadUserProfile();
          await loadUserAvatar();
          await loadEmailStatus();
        }

        setProfileLoading(false);
      }
    };

    initializeUserData();
  }, [
    authUser,
    authLoading,
    setUser,
    setEmail,
    setEmailVerified,
    loadUserProfile,
    loadUserAvatar,
    loadEmailStatus,
    setProfileLoading,
  ]);

  const handleLanguageSelect = (nextLanguage: "en" | "zh") => {
    setLanguage(nextLanguage);
    toast({
      title: nextLanguage === "zh" ? "語言已更新" : "Language updated",
      description:
        nextLanguage === "zh"
          ? "介面語言已切換為繁體中文。"
          : "The interface language has been switched to English.",
    });
  };

  return (
    <AppShell
      user={user || authUser}
      activeNav="settings"
      headerKicker="Language"
      innerClassName="max-w-5xl"
    >
      <div className="py-8">
        <div className="mb-10 text-center">
          <p className="app-kicker mb-2">設定</p>
          <h1 className="app-page-title px-2">
            語言設定
          </h1>
          <p className="app-subtitle mx-auto mt-3 max-w-3xl px-4">
            選擇你偏好的介面語言。
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="app-panel p-8 sm:p-10">
            <h2 className="text-center text-2xl font-semibold text-slate-950">
              選擇語言
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div
                className={`cursor-pointer rounded-[16px] border p-6 transition-colors ${
                  language === "zh"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60"
                }`}
                onClick={() => handleLanguageSelect("zh")}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleLanguageSelect("zh");
                  }
                }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-emerald-700 shadow-sm">
                    {language === "zh" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Languages className="h-6 w-6" />
                    )}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-950">
                    繁體中文
                  </h3>
                  <p className="text-sm text-slate-500">Traditional Chinese</p>
                </div>
              </div>

              <div
                className={`cursor-pointer rounded-[16px] border p-6 transition-colors ${
                  language === "en"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60"
                }`}
                onClick={() => handleLanguageSelect("en")}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleLanguageSelect("en");
                  }
                }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-emerald-700 shadow-sm">
                    {language === "en" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Languages className="h-6 w-6" />
                    )}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-950">
                    English
                  </h3>
                  <p className="text-sm text-slate-500">English (US)</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-slate-500">
                更多語言選項即將推出
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Language;
