import AppShell from "@/components/layout/AppShell";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEmailManagement } from "@/hooks/useEmailManagement";
import { useToast } from "@/hooks/use-toast";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { CheckCircle2 } from "lucide-react";

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
      <div className="pb-8">
        <header className="studio-page-heading">
          <h1>語言設定</h1>
          <p>選擇工作台的介面語言。</p>
        </header>
        <div role="group" aria-label="介面語言" className="studio-language-options">
          {([{ id: "zh", label: "繁體中文", detail: "Traditional Chinese" }, { id: "en", label: "English", detail: "英文" }] as const).map(option => (
            <button type="button" key={option.id} aria-pressed={language === option.id}
              onClick={() => handleLanguageSelect(option.id)}>
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              {language === option.id && <CheckCircle2 aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Language;
