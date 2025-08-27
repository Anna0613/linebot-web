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

interface ActivityItem {
  id: string;
  type: "message" | "user_join" | "user_leave" | "error" | "success" | "info";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    userId?: string;
    userName?: string;
    messageContent?: string;
    errorCode?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
  showRefresh?: boolean;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  height?: number;
}

const getActivityIcon = (type: string) => {
  const iconMap: { [key: string]: React.ElementType } = {
    message: MessageSquare,
    user_join: Users,
    user_leave: Users,
    error: AlertCircle,
    success: CheckCircle,
    info: Activity,
  };
  
  return iconMap[type] || Activity;
};

const getActivityColor = (type: string) => {
  const colorMap: { [key: string]: string } = {
    message: "text-blue-600 bg-blue-50 border-blue-200",
    user_join: "text-green-600 bg-green-50 border-green-200",
    user_leave: "text-orange-600 bg-orange-50 border-orange-200",
    error: "text-red-600 bg-red-50 border-red-200",
    success: "text-green-600 bg-green-50 border-green-200",
    info: "text-gray-600 bg-gray-50 border-gray-200",
  };
  
  return colorMap[type] || "text-gray-600 bg-gray-50 border-gray-200";
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分鐘前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小時前`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}天前`;
  }
};

const ActivityItemComponent: React.FC<{ 
  activity: ActivityItem;
  isNew?: boolean;
}> = ({ activity, isNew = false }) => {
  const Icon = getActivityIcon(activity.type);
  const colorClasses = getActivityColor(activity.type);
  
  return (
    <div 
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-all duration-300",
        isNew ? "bg-blue-50 border-blue-200 animate-in slide-in-from-left-2" : "bg-background border-border hover:bg-muted/50"
      )}
    >
      <div className={cn("flex-shrink-0 p-1 rounded-full", colorClasses)}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground truncate">
            {activity.title}
          </h4>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1.5 py-0.5", colorClasses)}
            >
              {activity.type}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>
        </div>
        
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}
        
        {activity.metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {activity.metadata.userName && (
              <Badge variant="secondary" className="text-xs">
                用戶: {activity.metadata.userName}
              </Badge>
            )}
            {activity.metadata.messageContent && (
              <Badge variant="outline" className="text-xs max-w-32 truncate">
                {activity.metadata.messageContent}
              </Badge>
            )}
            {activity.metadata.errorCode && (
              <Badge variant="destructive" className="text-xs">
                錯誤: {activity.metadata.errorCode}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivitySkeleton: React.FC = () => (
  <div className="flex items-start space-x-3 p-3">
    <Skeleton className="h-6 w-6 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex space-x-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading = false,
  className,
  maxItems = 50,
  showRefresh = true,
  onRefresh,
  autoRefresh = false,
  refreshInterval = 30000, // 30秒
  height = 400
}) => {
  const [newActivities, setNewActivities] = useState<Set<string>>(new Set());
  const [displayedActivities, setDisplayedActivities] = useState<ActivityItem[]>([]);

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
            setNewActivities(new Set());
          }, 5000);
        }
        
        return sortedActivities;
      });
    }
  }, [activities, maxItems]);

  // 自動刷新
  useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(onRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, onRefresh, refreshInterval]);

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
        <ScrollArea className={`h-[${height}px] pr-4`}>
          <div className="space-y-3">
            {isLoading ? (
              // 載入骨架
              Array.from({ length: 5 }, (_, i) => (
                <ActivitySkeleton key={i} />
              ))
            ) : displayedActivities.length > 0 ? (
              // 活動列表
              displayedActivities.map((activity) => (
                <ActivityItemComponent
                  key={activity.id}
                  activity={activity}
                  isNew={newActivities.has(activity.id)}
                />
              ))
            ) : (
              // 空狀態
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">暫無活動記錄</p>
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新載入
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;