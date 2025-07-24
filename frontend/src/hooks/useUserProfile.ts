import { useState, useCallback } from "react";
import { useToast } from "./use-toast";
import { apiClient } from "../services/UnifiedApiClient";

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
  // apiClient 已經從 UnifiedApiClient 匯入

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.status === 200 && response.data) {
        const userData = response.data;
        
        // 合併數據，確保 display_name 有值
        const mergedUserData = {
          ...userData,
          display_name: userData.display_name || userData.username || "",
          username: userData.username || "",
        };
        
        setUser(mergedUserData);

        // 如果是 LINE 用戶，使用 LINE 頭像
        if (mergedUserData.isLineUser && mergedUserData.picture_url) {
          setUserImage(mergedUserData.picture_url);
        }

        return mergedUserData;
      } else {
        throw new Error(response.error || "載入用戶資料失敗");
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
  }, [toast]);

  const loadUserAvatar = useCallback(async () => {
    try {
      const response = await apiClient.getUserAvatar();
      if (response.status === 200 && response.data?.avatar) {
        setUserImage(response.data.avatar);
      }
    } catch (error) {
      console.error("載入頭像錯誤:", error);
      // 頭像載入失敗不顯示錯誤提示，使用預設頭像
    }
  }, []);

  const updateDisplayName = useCallback(
    async (newDisplayName: string) => {
      try {
        const response = await apiClient.updateProfile({
          display_name: newDisplayName,
        });

        if (response.status === 200) {
          setUser((prev) =>
            prev ? { ...prev, display_name: newDisplayName } : null
          );
          toast({
            title: "更新成功",
            description: "顯示名稱已更新",
          });
          return true;
        } else {
          throw new Error(response.error || "更新失敗");
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
    [toast]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      setAvatarLoading(true);
      try {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await apiClient.uploadAvatar(formData);

        if (response.status === 200) {
          // 成功上傳，重新載入頭像
          const avatarResponse = await apiClient.getUserAvatar();
          let newAvatarUrl = null;
          
          if (avatarResponse.status === 200 && avatarResponse.data?.avatar) {
            newAvatarUrl = avatarResponse.data.avatar;
            setUserImage(newAvatarUrl);
          }
          
          // 發送頭像更新事件給其他組件（如DashboardNavbar）
          const avatarUpdateEvent = new CustomEvent('avatarUpdated', {
            detail: { avatar: newAvatarUrl }
          });
          window.dispatchEvent(avatarUpdateEvent);
          
          toast({
            title: "頭像更新成功",
            description: "您的頭像已成功更新",
          });
          return true;
        } else {
          throw new Error(response.error || "頭像上傳失敗");
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
    [toast]
  );

  const deleteAvatar = useCallback(async () => {
    setAvatarLoading(true);
    try {
      const response = await apiClient.deleteAvatar();

      if (response.status === 200) {
        setUserImage(null);
        
        // 發送頭像刪除事件給其他組件（如DashboardNavbar）
        const avatarUpdateEvent = new CustomEvent('avatarUpdated', {
          detail: { avatar: null }
        });
        window.dispatchEvent(avatarUpdateEvent);
        
        toast({
          title: "頭像已刪除",
          description: "您的頭像已成功刪除",
        });
        return true;
      } else {
        throw new Error(response.error || "刪除頭像失敗");
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
  }, [toast]);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const response = await apiClient.changePassword(
        oldPassword,
        newPassword
      );

      if (response.status === 200) {
        return true;
      } else {
        // 直接拋出錯誤，讓調用方處理錯誤顯示
        throw new Error(response.error || "密碼更新失敗");
      }
    },
    []
  );

  const deleteAccount = useCallback(async () => {
    try {
      const response = await apiClient.deleteAccount();

      if (response.status === 200) {
        toast({
          title: "帳號已刪除",
          description: "您的帳號已成功刪除",
        });
        return true;
      } else {
        throw new Error(response.error || "帳號刪除失敗");
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "無法刪除帳號",
      });
      return false;
    }
  }, [toast]);

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
