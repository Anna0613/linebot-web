import { useState, useCallback } from "react";
import { useToast } from "./use-toast";
import { apiClient } from "../services/UnifiedApiClient";

export const useEmailManagement = () => {
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isResendingEmailVerification, setIsResendingEmailVerification] =
    useState(false);
  const { toast } = useToast();
  // apiClient 已經從 UnifiedApiClient 匯入

  const loadEmailStatus = useCallback(async () => {
    try {
      const response = await apiClient.getUserProfile();
      if (response.status === 200 && response.data) {
        setEmail(response.data.email || "");
        setEmailVerified(response.data.email_verified || false);
      }
    } catch (error) {
      console.error("載入電子郵件狀態錯誤:", error);
    }
  }, [apiClient]);

  const updateEmail = useCallback(
    async (newEmail: string) => {
      try {
        const response = await apiClient.updateUserProfile({ email: newEmail });

        if (response.status === 200) {
          setEmail(newEmail);
          setEmailVerified(false); // 更新電子郵件後需要重新驗證
          setIsEditingEmail(false);

          toast({
            title: "電子郵件已更新",
            description: "請檢查您的新電子郵件並點擊驗證連結",
          });

          return true;
        } else {
          throw new Error(response.error || "更新電子郵件失敗");
        }
      } catch (error: unknown) {
        toast({
          variant: "destructive",
          title: "更新失敗",
          description:
            error instanceof Error ? error.message : "無法更新電子郵件",
        });
        return false;
      }
    },
    [apiClient, toast]
  );

  const resendEmailVerification = useCallback(async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "請先設定電子郵件",
      });
      return false;
    }

    setIsResendingEmailVerification(true);
    try {
      const response = await apiClient.resendEmailVerification();

      if (response.status === 200) {
        toast({
          title: "驗證郵件已發送",
          description: "請檢查您的電子郵件並點擊驗證連結",
        });
        return true;
      } else {
        throw new Error(response.error || "發送驗證郵件失敗");
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "發送失敗",
        description:
          error instanceof Error ? error.message : "無法發送驗證郵件",
      });
      return false;
    } finally {
      setIsResendingEmailVerification(false);
    }
  }, [email, apiClient, toast]);

  const checkEmailVerification = useCallback(async () => {
    try {
      const response = await apiClient.checkEmailVerification();
      if (response.status === 200 && response.data) {
        setEmailVerified(response.data.verified);
        return response.data.verified;
      }
      return false;
    } catch (error) {
      console.error("檢查電子郵件驗證狀態錯誤:", error);
      return false;
    }
  }, [apiClient]);

  return {
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
    checkEmailVerification,
  };
};
