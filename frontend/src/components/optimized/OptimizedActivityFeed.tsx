/**
 * 優化版本的活動動態組件
 * 使用智能輪詢，結合 WebSocket 狀態，只在必要時使用 HTTP 輪詢
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Users, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
// Removed unused polling hooks to avoid unused imports

interface ActivityItem {
  id: string;
  type: "message" | "user_join" | "user_leave" | "error" | "success" | "info";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    user_name?: string;
    bot_name?: string;
    message_count?: number;
    [key: string]: unknown;
  };
}

interface OptimizedActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
  showRefresh?: boolean;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  height?: number;
  isWebSocketConnected?: () => boolean;
}

const ActivitySkeleton = () => (
  <div className="flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-3 w-16" />
  </div>
);

const ActivityIcon = ({ type }: { type: ActivityItem['type'] }) => {
  const iconProps = "h-4 w-4";
  
  switch (type) {
    case "message":
      return <MessageSquare className={cn(iconProps, "text-blue-500")} />;
    case "user_join":
      return <Users className={cn(iconProps, "text-green-500")} />;
    case "user_leave":
      return <Users className={cn(iconProps, "text-gray-500")} />;
    case "error":
      return <AlertCircle className={cn(iconProps, "text-red-500")} />;
    case "success":
      return <CheckCircle className={cn(iconProps, "text-green-500")} />;
    case "info":
    default:
      return <Activity className={cn(iconProps, "text-blue-500")} />;
  }
};

const ActivityItem = ({ 
  activity, 
  isNew 
}: { 
  activity: ActivityItem; 
  isNew: boolean;
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "剛剛";
    if (diffInMinutes < 60) return `${diffInMinutes} 分鐘前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} 小時前`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "flex items-start space-x-3 p-3 border-b border-gray-100 last:border-b-0 transition-colors",
      isNew && "bg-blue-50 border-blue-200"
    )}>
      <div className="flex-shrink-0 mt-0.5">
        <div className={cn(
          "p-1.5 rounded-full",
          isNew ? "bg-blue-100" : "bg-gray-100"
        )}>
          <ActivityIcon type={activity.type} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.title}
          </p>
          {isNew && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              新
            </Badge>
          )}
        </div>
        
        {activity.description && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}
        
        {activity.metadata && (
          <div className="flex items-center space-x-2 mt-1">
            {activity.metadata.user_name && (
              <span className="text-xs text-gray-500">
                用戶: {activity.metadata.user_name}
              </span>
            )}
            {activity.metadata.bot_name && (
              <span className="text-xs text-gray-500">
                Bot: {activity.metadata.bot_name}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-shrink-0 text-xs text-gray-500 flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        {formatTime(activity.timestamp)}
      </div>
    </div>
  );
};

const OptimizedActivityFeed: React.FC<OptimizedActivityFeedProps> = ({
  activities,
  isLoading = false,
  className,
  maxItems = 50,
  showRefresh = true,
  onRefresh,
  autoRefresh: _autoRefresh = false,
  refreshInterval: _refreshInterval = 60000, // 60秒預設間隔
  height = 400,
  isWebSocketConnected = () => false
}) => {
  const [newActivities, setNewActivities] = useState<Set<string>>(new Set());
  const [displayedActivities, setDisplayedActivities] = useState<ActivityItem[]>([]);

  // 使用 WebSocket 和手動刷新，不進行輪詢
  console.log('OptimizedActivityFeed: 依賴 WebSocket 和手動刷新');

  // 處理活動更新
  useEffect(() => {
    if (activities.length > 0) {
      const sortedActivities = [...activities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxItems);
      
      setDisplayedActivities(prevDisplayed => {
        // 檢查是否有新活動
        const currentIds = new Set(prevDisplayed.map(a => a.id));
        const newIds = sortedActivities
          .filter(a => !currentIds.has(a.id))
          .map(a => a.id);
        
        if (newIds.length > 0) {
          setNewActivities(new Set(newIds));
          // 5秒後移除"新"標記
          setTimeout(() => {
            setNewActivities(prev => {
              const updated = new Set(prev);
              newIds.forEach(id => updated.delete(id));
              return updated;
            });
          }, 5000);
        }
        
        return sortedActivities;
      });
    } else {
      setDisplayedActivities([]);
    }
  }, [activities, maxItems]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            即時活動
            {displayedActivities.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {displayedActivities.length}
              </Badge>
            )}
            {isWebSocketConnected() && (
              <Badge variant="outline" className="ml-2 text-xs text-green-600">
                即時連接
              </Badge>
            )}
          </CardTitle>
          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 px-3"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <ScrollArea 
          className="pr-4 activity-scroll" 
          style={{ height: `${height}px` }}
        >
          <div className="space-y-0">
            {isLoading ? (
              // 載入骨架
              Array.from({ length: 5 }, (_, i) => (
                <ActivitySkeleton key={i} />
              ))
            ) : displayedActivities.length > 0 ? (
              displayedActivities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isNew={newActivities.has(activity.id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">暫無活動記錄</p>
                <p className="text-xs mt-1">當有新的用戶互動時，活動將顯示在這裡</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OptimizedActivityFeed;
