import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import UserProfileSection from "../components/UserProfileSection";
import EmailManagementSection from "../components/EmailManagementSection";
import SocialAccountSection from "../components/SocialAccountSection";
import SecuritySection from "../components/SecuritySection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEmailManagement } from "@/hooks/useEmailManagement";
import { useToast } from "@/hooks/use-toast";
import { LineLoginService } from "@/services/lineLogin";
import { authManager } from "@/services/UnifiedAuthManager";

const SettingsLoadingPanel = () => (
  <div
    className="app-panel p-10"
    aria-busy="true"
  >
    <Loader text="載入帳號設定..." />
  </div>
);

const Setting: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    setUserImage,
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
        setUserImage(authUser.picture_url || authUser.avatar || null);

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
    setUserImage,
  ]);

  // 處理顯示名稱保存
  const handleSaveDisplayName = async () => {
    const success = await updateDisplayName(displayName);
    if (success) {
      setIsEditingName(false);
    }
  };

  // 處理電子郵件保存
  const handleSaveEmail = async () => {
    const success = await updateEmail(email);
    if (success) {
      setIsEditingEmail(false);
    }
  };

  // 處理 LINE 帳號連結
  const handleLinkLineAccount = async () => {
    try {
      const lineLoginService = LineLoginService.getInstance();
      const result = await lineLoginService.getLoginUrl();

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("無法獲取 LINE 登入連結");
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "LINE 連結失敗",
        description:
          error instanceof Error ? error.message : "無法連結 LINE 帳號",
      });
    }
  };

  // 處理 LINE 帳號解除連結
  const handleUnlinkLineAccount = async () => {
    try {
      // 這裡應該調用 API 來解除 LINE 連結
      // await apiClient.unlinkLineAccount();

      toast({
        title: "LINE 帳號已解除連結",
        description: "您的 LINE 帳號連結已解除",
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "解除連結失敗",
        description:
          error instanceof Error ? error.message : "無法解除 LINE 帳號連結",
      });
    }
  };

  // 處理帳號刪除
  const handleDeleteAccount = () => {
    setShowConfirmModal(true);
  };

  const confirmDeleteAccount = async () => {
    const success = await deleteAccount();
    if (success) {
      authManager.clearAuth();
      localStorage.clear();
      navigate("/");
    }
    setShowConfirmModal(false);
  };

  const shellUser = user || authUser;
  const isSettingsLoading = authLoading || profileLoading || !user;

  return (
    <AppShell
      user={shellUser}
      activeNav="settings"
      headerKicker="設定"
      innerClassName="max-w-5xl"
    >
      <div className="py-8">
        {authError ? (
          <Alert className="rounded-[16px] border-rose-100 bg-[var(--surface-panel)] shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        ) : isSettingsLoading ? (
          <SettingsLoadingPanel />
        ) : (
          <>
            {/* 用戶資料區塊 */}
            <UserProfileSection
              user={user}
              displayName={displayName}
              userImage={userImage}
              isEditingName={isEditingName}
              avatarLoading={avatarLoading}
              onDisplayNameChange={setDisplayName}
              onEditNameToggle={setIsEditingName}
              onSaveDisplayName={handleSaveDisplayName}
              onAvatarUpload={uploadAvatar}
              onAvatarDelete={deleteAvatar}
            />

            {/* 電子郵件管理區塊 */}
            <EmailManagementSection
              email={email}
              emailVerified={emailVerified}
              isEditingEmail={isEditingEmail}
              isResendingEmailVerification={isResendingEmailVerification}
              onEmailChange={setEmail}
              onEditEmailToggle={setIsEditingEmail}
              onSaveEmail={handleSaveEmail}
              onResendVerification={resendEmailVerification}
            />

            {/* 社群帳號區塊 */}
            <SocialAccountSection
              user={user}
              onLinkLineAccount={handleLinkLineAccount}
              onUnlinkLineAccount={handleUnlinkLineAccount}
            />

            {/* 安全設定區塊 */}
            <SecuritySection
              onChangePassword={changePassword}
              onDeleteAccount={handleDeleteAccount}
              showDeleteConfirmation={showConfirmModal}
            />
          </>
        )}
      </div>

      {/* 帳號刪除確認對話框 */}
      <AlertDialog
        open={showConfirmModal}
        onOpenChange={(open) => setShowConfirmModal(open)}
      >
        <AlertDialogContent className="border-white/80 bg-white sm:rounded-[12px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <AlertDialogTitle className="text-red-600">
                確認刪除帳號
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-sm leading-6 text-[var(--bc-ink-3)]">
                <p>確定要刪除帳號嗎？此操作會永久刪除你的資料，包括：</p>
                <ul className="mt-3 space-y-1">
                  <li>• 個人資料和設定</li>
                  <li>• 建立的所有 Bot</li>
                  <li>• 對話紀錄和互動資料</li>
                  <li>• 無法復原的永久刪除</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmModal(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default Setting;
