import React, { useState, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent } from "../ui/card";
import { Upload, User, Camera, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onAvatarChange: (avatar: string | null) => void;
  onAvatarDelete?: () => void;
  username?: string;
  maxSize?: number; // KB
  allowedTypes?: string[];
  disabled?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  onAvatarDelete,
  username = "User",
  maxSize = 500, // 500KB
  allowedTypes = ["image/jpeg", "image/png", "image/gif"],
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 壓縮圖片
  const compressImage = useCallback(
    (file: File, maxWidth = 200, quality = 0.8): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
          // 計算新尺寸，保持比例
          let { width, height } = img;
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = (width * maxWidth) / height;
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // 繪製並壓縮
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
      });
    },
    []
  );

  // 驗證文件
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return `不支援的檔案格式。只允許: ${allowedTypes.map((type) => type.split("/")[1]).join(", ")}`;
      }

      if (file.size > maxSize * 1024) {
        return `檔案太大。最大允許 ${maxSize}KB`;
      }

      return null;
    },
    [allowedTypes, maxSize]
  );

  // 處理文件上傳
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (disabled) return;

      const error = validateFile(file);
      if (error) {
        toast({
          variant: "destructive",
          title: "上傳失敗",
          description: error,
        });
        return;
      }

      setIsUploading(true);

      try {
        const compressedDataUrl = await compressImage(file);
        onAvatarChange(compressedDataUrl);
        // 移除這裡的成功通知，讓實際的上傳處理來顯示結果
      } catch (_error) {
        console.error("Error occurred:", _error);
        toast({
          variant: "destructive",
          title: "處理圖片失敗",
          description: "請嘗試選擇其他圖片",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, validateFile, compressImage, onAvatarChange, toast]
  );

  // 文件輸入變更
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // 清空input值，允許重複選擇同一文件
      event.target.value = "";
    },
    [handleFileSelect]
  );

  // 拖拽處理
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) {
        setDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);

      if (disabled) return;

      const files = Array.from(event.dataTransfer.files);
      const file = files[0];

      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect]
  );

  // 開啟文件選擇器
  const openFileSelector = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // 刪除頭像
  const handleDeleteAvatar = useCallback(() => {
    if (disabled) return;

    onAvatarChange(null);
    if (onAvatarDelete) {
      onAvatarDelete();
    }

    toast({
      title: "頭像已刪除",
      description: "您的頭像已經刪除",
    });
  }, [disabled, onAvatarChange, onAvatarDelete, toast]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* 頭像顯示區域 */}
          <div className="relative">
            <Avatar className="w-32 h-32">
              <AvatarImage
                src={currentAvatar || undefined}
                alt={`${username}的頭像`}
              />
              <AvatarFallback className="text-2xl">
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>

            {/* 相機圖標覆蓋 */}
            {!disabled && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0"
                onClick={openFileSelector}
                disabled={isUploading}
              >
                <Camera className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* 拖拽上傳區域 */}
          {!disabled && (
            <div
              className={`
                relative w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}
                ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileSelector}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-1">
                點擊或拖拽圖片到此處上傳
              </p>
              <p className="text-xs text-gray-400">
                支援 JPG、PNG、GIF，最大 {maxSize}KB
              </p>

              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                  <div className="text-sm text-gray-600">處理中...</div>
                </div>
              )}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={openFileSelector}
              disabled={disabled || isUploading}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              選擇圖片
            </Button>

            {currentAvatar && !disabled && (
              <Button
                variant="outline"
                onClick={handleDeleteAvatar}
                disabled={isUploading}
                className="px-3"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* 隱藏的文件輸入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.join(",")}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AvatarUpload;
