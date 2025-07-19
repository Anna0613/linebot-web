import { useState, useCallback } from "react";
import { useToast } from "./use-toast";
import { ApiClient } from "../services/api";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  email?: string;
  email_verified?: boolean;
  username?: string;
  isLineUser?: boolean;
  avatar?: string;
}

export const useUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const { toast } = useToast();
  const apiClient = ApiClient.getInstance();

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await apiClient.getUserProfile();
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);

        // 如果是 LINE 用戶，使用 LINE 頭像
        if (userData.isLineUser && userData.picture_url) {
          setUserImage(userData.picture_url);
        }

        return userData;
      } else {
        throw new Error(response.message || "載入用戶資料失敗");
      }
    } catch (error: unknown) {
      console.error("載入用戶資料錯誤:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: "無法載入用戶資料",
      });
      return null;
    }
  }, [apiClient, toast]);

  const loadUserAvatar = useCallback(async () => {
    try {
      const response = await apiClient.getUserAvatar();
      if (response.success && response.data?.avatar_url) {
        setUserImage(response.data.avatar_url);
      }
    } catch (error) {
      console.error("載入頭像錯誤:", error);
      // 頭像載入失敗不顯示錯誤提示，使用預設頭像
    }
  }, [apiClient]);

  const updateDisplayName = useCallback(
    async (newDisplayName: string) => {
      try {
        const response = await apiClient.updateUserProfile({
          display_name: newDisplayName,
        });

        if (response.success) {
          setUser((prev) =>
            prev ? { ...prev, display_name: newDisplayName } : null
          );
          toast({
            title: "更新成功",
            description: "顯示名稱已更新",
          });
          return true;
        } else {
          throw new Error(response.message || "更新失敗");
        }
      } catch (error: unknown) {
        toast({
          variant: "destructive",
          title: "更新失敗",
          description:
            error instanceof Error ? error.message : "無法更新顯示名稱",
        });
        return false;
      }
    },
    [apiClient, toast]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      setAvatarLoading(true);
      try {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await apiClient.uploadAvatar(formData);

        if (response.success && response.data?.avatar_url) {
          setUserImage(response.data.avatar_url);
          toast({
            title: "頭像更新成功",
            description: "您的頭像已成功更新",
          });
          return true;
        } else {
          throw new Error(response.message || "頭像上傳失敗");
        }
      } catch (error: unknown) {
        toast({
          variant: "destructive",
          title: "頭像上傳失敗",
          description: error instanceof Error ? error.message : "無法上傳頭像",
        });
        return false;
      } finally {
        setAvatarLoading(false);
      }
    },
    [apiClient, toast]
  );

  const deleteAvatar = useCallback(async () => {
    setAvatarLoading(true);
    try {
      const response = await apiClient.deleteAvatar();

      if (response.success) {
        setUserImage(null);
        toast({
          title: "頭像已刪除",
          description: "您的頭像已成功刪除",
        });
        return true;
      } else {
        throw new Error(response.message || "刪除頭像失敗");
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "無法刪除頭像",
      });
      return false;
    } finally {
      setAvatarLoading(false);
    }
  }, [apiClient, toast]);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      try {
        const response = await apiClient.changePassword(
          oldPassword,
          newPassword
        );

        if (response.success) {
          toast({
            title: "密碼更新成功",
            description: "您的密碼已成功更新",
          });
          return true;
        } else {
          throw new Error(response.message || "密碼更新失敗");
        }
      } catch (error: unknown) {
        toast({
          variant: "destructive",
          title: "密碼更新失敗",
          description:
            error instanceof Error
              ? error.message
              : "請檢查您的現在密碼是否正確",
        });
        return false;
      }
    },
    [apiClient, toast]
  );

  const deleteAccount = useCallback(async () => {
    try {
      const response = await apiClient.deleteAccount();

      if (response.success) {
        toast({
          title: "帳號已刪除",
          description: "您的帳號已成功刪除",
        });
        return true;
      } else {
        throw new Error(response.message || "帳號刪除失敗");
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "無法刪除帳號",
      });
      return false;
    }
  }, [apiClient, toast]);

  return {
    user,
    setUser,
    userImage,
    setUserImage,
    loading,
    setLoading,
    avatarLoading,
    loadUserProfile,
    loadUserAvatar,
    updateDisplayName,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    deleteAccount,
  };
};
