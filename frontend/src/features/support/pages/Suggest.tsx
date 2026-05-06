import AppShell from "@/components/layout/AppShell";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEmailManagement } from "@/hooks/useEmailManagement";
import { useToast } from "@/hooks/use-toast";
import { Bug, Lightbulb, Mail, MessageSquare, Send } from "lucide-react";

const feedbackTypes = [
  { label: "錯誤回報", icon: Bug },
  { label: "功能建議", icon: Lightbulb },
  { label: "一般意見", icon: MessageSquare },
];

/* eslint-disable @typescript-eslint/no-unused-vars */
const Suggest = () => {
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
    <AppShell
      user={user || authUser}
      activeNav="settings"
      headerKicker="意見回饋"
      innerClassName="max-w-5xl"
    >
      <main className="py-8">
        <div>
          <div className="mb-10 text-center">
            <p className="app-kicker mb-2">設定</p>
            <h1 className="app-page-title">
              意見回饋
            </h1>
            <p className="app-subtitle mx-auto mt-3 max-w-3xl">
              遇到問題或有想法，都可以直接告訴我們。
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="app-panel p-8 sm:p-10">
              <form className="space-y-8">
                <div>
                  <label className="mb-4 block text-base font-semibold text-slate-950">
                    意見類型
                  </label>
                  <div className="grid gap-4 md:grid-cols-3">
                    {feedbackTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.label}
                          type="button"
                          className="rounded-[16px] border border-slate-200 bg-white p-4 text-center transition-colors hover:border-emerald-200 hover:bg-emerald-50/70"
                        >
                          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-medium text-slate-950">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-base font-semibold text-slate-950">
                    意見內容
                  </label>
                  <textarea
                    placeholder="請描述你遇到的問題，或想建議的功能。"
                    rows={6}
                    className="app-input min-h-36 resize-none py-3"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="mb-3 block text-base font-semibold text-slate-950">
                      姓名（選填）
                    </label>
                    <input
                      type="text"
                      placeholder="輸入姓名"
                      className="app-input"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-base font-semibold text-slate-950">
                      Email（選填）
                    </label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      className="app-input"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    className="app-primary-button inline-flex items-center justify-center gap-2 px-10"
                  >
                    <Send className="h-4 w-4" />
                    送出意見
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 聯絡方式區域 */}
          <div className="max-w-4xl mx-auto mt-12">
            <div className="app-muted-panel p-8">
              <h2 className="mb-8 text-center text-2xl font-semibold text-slate-950">
                其他聯絡方式
              </h2>
              <div className="grid md:grid-cols-2 gap-8 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-emerald-100 text-emerald-700">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-950">
                    Email 聯絡
                  </h3>
                  <p className="text-sm text-slate-500">
                    support@linebotweb.com
                  </p>
                </div>

                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#06C755]">
                    <svg
                      className="h-7 w-7 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-950">
                    LINE 官方帳號
                  </h3>
                  <p className="text-sm text-slate-500">@linebotweb</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
};

export default Suggest;
