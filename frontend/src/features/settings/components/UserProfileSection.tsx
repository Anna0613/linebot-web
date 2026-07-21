import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// import { Loader } from "@/components/ui/loader";
import AvatarUpload from "./AvatarUpload";
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon } from "lucide-react";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  isLineUser?: boolean;
  avatar?: string;
}

interface UserProfileSectionProps {
  user: User;
  displayName: string;
  userImage: string | null;
  isEditingName: boolean;
  avatarLoading: boolean;
  onDisplayNameChange: (name: string) => void;
  onEditNameToggle: (editing: boolean) => void;
  onSaveDisplayName: () => Promise<void>;
  onAvatarUpload: (file: File) => Promise<void>;
  onAvatarDelete: () => Promise<void>;
}

const UserProfileSection = ({
  user,
  displayName,
  userImage,
  isEditingName,
  avatarLoading,
  onDisplayNameChange,
  onEditNameToggle,
  onSaveDisplayName,
  onAvatarUpload,
  onAvatarDelete,
}: UserProfileSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檔案大小檢查 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "檔案太大",
        description: "頭像檔案大小不能超過 5MB",
      });
      return;
    }

    // 檔案類型檢查
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "檔案格式不支援",
        description: "請選擇 JPG、PNG、GIF 或 WebP 格式的圖片",
      });
      return;
    }

    await onAvatarUpload(file);

    // 清除 input 值以允許重複選擇同一檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="app-panel mb-6 p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserIcon className="h-5 w-5 text-emerald-700" />
        <h2 className="text-xl font-semibold text-[var(--bc-ink)]">個人資料</h2>
      </div>

      {/* 頭像區塊 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative">
          <AvatarUpload
            currentAvatar={userImage}
            onAvatarChange={async (avatar) => {
              if (avatar) {
                // AvatarUpload 組件返回 base64 字符串，需要轉換為 File 或 Blob
                try {
                  const response = await fetch(avatar);
                  const blob = await response.blob();
                  const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                  await onAvatarUpload(file);
                } catch (_error) {
                  console.error("Error occurred:", _error);
                }
              } else {
                await onAvatarDelete();
              }
            }}
            onAvatarDelete={onAvatarDelete}
            username={user.display_name}
            disabled={user?.isLineUser || avatarLoading}
          />
          {user?.isLineUser && (
            <p className="mt-2 max-w-24 text-center text-xs text-[var(--bc-ink-3)]">
              LINE 帳號頭像會自動同步
            </p>
          )}
        </div>

        <div className="flex-1">
          <Label className="text-sm font-medium text-slate-700">頭像</Label>
          <p className="mt-1 text-sm leading-6 text-[var(--bc-ink-3)]">
            {user?.isLineUser
              ? "頭像會同步你的 LINE 個人資料照片"
              : "上傳 JPG、PNG、GIF 或 WebP 格式的圖片，檔案大小不超過 5MB"}
          </p>
        </div>
      </div>

      {/* 隱藏的檔案輸入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* 顯示名稱區塊 */}
      <div className="space-y-2">
        <Label htmlFor="displayName">顯示名稱</Label>
        <div className="flex gap-2">
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            disabled={!isEditingName}
            className={isEditingName ? "app-input" : "app-input bg-slate-50"}
          />
          <Button
            variant={isEditingName ? "default" : "outline"}
            onClick={() => {
              if (isEditingName) {
                onSaveDisplayName();
              } else {
                onEditNameToggle(true);
              }
            }}
            className={isEditingName ? "app-primary-button whitespace-nowrap" : "app-secondary-button whitespace-nowrap"}
          >
            {isEditingName ? "儲存" : "編輯"}
          </Button>
          {isEditingName && (
            <Button
              variant="outline"
              onClick={() => {
                onEditNameToggle(false);
                onDisplayNameChange(user.display_name); // 還原原始值
              }}
            >
              取消
            </Button>
          )}
        </div>
        <p className="text-sm text-[var(--bc-ink-3)]">這是工作台中顯示的名稱。</p>
      </div>
    </div>
  );
};

export default UserProfileSection;
