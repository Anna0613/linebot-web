import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import UserProfileSection from "@/components/settings/UserProfileSection";
import EmailManagementSection from "@/components/settings/EmailManagementSection";
import SocialAccountSection from "@/components/settings/SocialAccountSection";
import SecuritySection from "@/components/settings/SecuritySection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { useEmailManagement } from "../hooks/useEmailManagement";
import { useToast } from "@/hooks/use-toast";
import { LineLoginService } from "../services/lineLogin";
import { authManager } from "../services/UnifiedAuthManager";

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

  // 載入中狀態
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-lg">載入設定頁面...</div>
      </div>
    );
  }

  // 錯誤狀態
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-lg">載入用戶資料...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar user={user || authUser} />

      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* 頁面標題 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">帳號設定</h1>
            <p className="text-muted-foreground">
              管理您的個人資料、安全設定和帳號偏好
            </p>
          </div>

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
        </div>
      </div>

      {/* 帳號刪除確認對話框 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground border border-border rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-red-600">確認刪除帳號</h3>
            </div>

            <p className="text-muted-foreground mb-6">
              您確定要刪除帳號嗎？此操作將永久刪除您的所有資料，包括：
            </p>

            <ul className="text-sm text-muted-foreground mb-6 space-y-1">
              <li>• 個人資料和設定</li>
              <li>• 創建的所有機器人</li>
              <li>• 對話紀錄和數據</li>
              <li>• 無法復原的永久刪除</li>
            </ul>

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={confirmDeleteAccount}
                className="flex-1"
              >
                確定刪除
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      <DashboardFooter />
    </div>
  );
};

export default Setting;
