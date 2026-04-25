import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Hash, 
  Clock, 
  Globe, 
  MessageSquare,
  Calendar,
  Activity
} from "lucide-react";

// 類型定義
interface LineUser {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url: string;
  status_message: string;
  language: string;
  first_interaction: string;
  last_interaction: string;
  interaction_count: string;
}

interface UserDetailsModalProps {
  user: LineUser | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, isOpen, onClose }) => {
  if (!user) return null;

  // 格式化時間
  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long"
    });
  };

  // 計算活躍度
  const getActivityLevel = (count: string) => {
    const num = parseInt(count);
    if (num >= 100) return { level: "非常活躍", color: "bg-green-500", text: "text-green-700" };
    if (num >= 50) return { level: "活躍", color: "bg-blue-500", text: "text-blue-700" };
    if (num >= 20) return { level: "一般", color: "bg-yellow-500", text: "text-yellow-700" };
    if (num >= 5) return { level: "偶爾", color: "bg-gray-500", text: "text-foreground" };
    return { level: "很少", color: "bg-red-500", text: "text-red-700" };
  };

  // 語言顯示
  const getLanguageDisplay = (lang: string) => {
    const languageMap: Record<string, string> = {
      "zh-TW": "繁體中文 (台灣)",
      "zh-CN": "簡體中文 (中國)",
      "en": "英文",
      "ja": "日文",
      "ko": "韓文",
      "th": "泰文",
      "vi": "越南文",
      "id": "印尼文",
    };
    return languageMap[lang] || lang || "未知";
  };

  // 計算使用天數
  const getDaysFromFirst = (firstInteraction: string) => {
    const first = new Date(firstInteraction);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - first.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const activityLevel = getActivityLevel(user.interaction_count);
  const daysFromFirst = getDaysFromFirst(user.first_interaction);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            用戶詳細資訊
          </DialogTitle>
          <DialogDescription>
            查看用戶的完整資料和活動統計
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 用戶基本資訊 */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.picture_url} />
              <AvatarFallback className="text-lg">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {user.display_name || "未設定名稱"}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {user.line_user_id}
              </p>
              {user.status_message && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  "{user.status_message}"
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* 活動統計 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Hash className="h-4 w-4" />
                <span>互動次數</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{user.interaction_count}</span>
                <Badge 
                  className={`${activityLevel.color} text-white text-xs`}
                >
                  {activityLevel.level}
                </Badge>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span>使用天數</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{daysFromFirst}</span>
                <span className="text-sm text-muted-foreground">天</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 詳細資訊 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>語言偏好</span>
              </div>
              <span className="text-sm font-medium">
                {getLanguageDisplay(user.language)}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>首次互動</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatDateTime(user.first_interaction)}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>最後活動</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatDateTime(user.last_interaction)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const lastActive = new Date(user.last_interaction);
                    const now = new Date();
                    const diffHours = Math.round((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
                    
                    if (diffHours < 1) return "不到 1 小時前";
                    if (diffHours < 24) return `${diffHours} 小時前`;
                    const diffDays = Math.round(diffHours / 24);
                    if (diffDays < 7) return `${diffDays} 天前`;
                    const diffWeeks = Math.round(diffDays / 7);
                    if (diffWeeks < 4) return `${diffWeeks} 週前`;
                    const diffMonths = Math.round(diffDays / 30);
                    return `${diffMonths} 個月前`;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* 互動頻率統計 */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
              <MessageSquare className="h-4 w-4" />
              <span>互動統計</span>
            </div>
            <div className="text-xs text-blue-600">
              {(() => {
                const avgPerDay = (parseInt(user.interaction_count) / daysFromFirst).toFixed(1);
                return `平均每天 ${avgPerDay} 次互動`;
              })()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;
