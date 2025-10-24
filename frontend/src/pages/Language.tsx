import DashboardFooter from "../components/layout/DashboardFooter";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { useEmailManagement } from "../hooks/useEmailManagement";
import { useToast } from "@/hooks/use-toast";
import { PageContentWrapper } from "../components/common/PageContentWrapper";

/* eslint-disable @typescript-eslint/no-unused-vars */
const Language = () => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* 主要內容區域 */}
      <DashboardNavbar user={user || authUser} />
      <PageContentWrapper>
        <div className="pt-32 pb-16 px-6">
        {/* 標題區域 */}
        <div className="text-center mb-16">
        <h1 className="web3-section-title leading-tight tracking-wide px-2">
            語言設定
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-4">
            選擇您偏好的語言介面
          </p>
        </div>

        {/* 語言選項區域 */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="bg-card text-card-foreground rounded-lg shadow-lg p-8 sm:p-12 border border-border">
            <h2 className="text-foreground text-[24px] font-bold mb-8 text-center">
              選擇語言
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border-2 border-[#8ECAE6] dark:border-[hsl(var(--border))] rounded-lg cursor-pointer hover:bg-[#8ECAE6]/10 dark:hover:bg-secondary transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-4">🇹🇼</div>
                  <h3 className="text-foreground font-bold text-xl mb-2">
                    繁體中文
                  </h3>
                  <p className="text-muted-foreground">Traditional Chinese</p>
                </div>
              </div>

              <div className="p-6 border-2 border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-4">🇺🇸</div>
                  <h3 className="text-foreground font-bold text-xl mb-2">
                    English
                  </h3>
                  <p className="text-muted-foreground">English (US)</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-muted-foreground text-sm">更多語言選項即將推出</p>
            </div>
          </div>
        </div>
      </div>
      </PageContentWrapper>

      <DashboardFooter />
    </div>
  );
};

export default Language;
