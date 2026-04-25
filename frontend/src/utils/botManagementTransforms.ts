import {
  ActivityItem,
  BackendActivityData,
  UsageData,
} from "@/types/botManagement";

const usageColorMapping: Record<string, string> = {
  文字訊息: "#6366F1",
  圖片訊息: "#3B82F6",
  影片訊息: "#8B5CF6",
  語音訊息: "#10B981",
  貼圖訊息: "#F59E0B",
  位置訊息: "#EF4444",
  其他類型: "#06B6D4",
};

export const getDaysFromTimeRange = (range: string) => {
  switch (range) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    default:
      return 30;
  }
};

export const getGranularityFromTimeRange = (range: string) => {
  switch (range) {
    case "day":
      return "hour";
    case "week":
      return "day";
    case "month":
      return "day";
    default:
      return "day";
  }
};

export const addUsageColors = (usageStatsData: unknown): UsageData[] => {
  return Array.isArray(usageStatsData)
    ? (
        usageStatsData as Array<{
          feature: string;
          usage: number;
          percentage: number;
        }>
      ).map((item) => ({
        ...item,
        color: usageColorMapping[item.feature] || "#A4A6B0",
      }))
    : [];
};

export const extractActivityData = (
  activitiesData: unknown
): BackendActivityData[] => {
  let extractedActivities = activitiesData;

  const dataObj = extractedActivities as {
    activities?: unknown;
    data?: unknown;
  };
  if (dataObj.activities && Array.isArray(dataObj.activities)) {
    extractedActivities = dataObj.activities;
  } else if (dataObj.data && Array.isArray(dataObj.data)) {
    extractedActivities = dataObj.data;
  } else if (!Array.isArray(extractedActivities)) {
    extractedActivities = [];
  }

  return extractedActivities as BackendActivityData[];
};

export const convertBackendDataToActivityItem = (
  backendData: BackendActivityData[]
): ActivityItem[] => {
  if (!Array.isArray(backendData)) {
    console.warn("後端資料不是陣列格式:", backendData);
    return [];
  }

  return backendData.map((item: BackendActivityData) => {
    const id =
      item.line_bot_user_interactions_id ||
      item.id ||
      `activity_${Date.now()}_${Math.random()}`;

    let type: ActivityItem["type"] = "info";
    let title = "未知活動";
    let description = "";

    switch (item.interaction_type) {
      case "message":
        type = "message";
        title = "用戶發送訊息";
        description = item.message_content || "無內容";
        break;
      case "join":
      case "user_join":
        type = "user_join";
        title = "新用戶加入";
        description = `用戶 ${item.display_name || item.username || "匿名用戶"} 加入對話`;
        break;
      case "leave":
      case "user_leave":
        type = "user_leave";
        title = "用戶離開";
        description = `用戶 ${item.display_name || item.username || "匿名用戶"} 離開對話`;
        break;
      case "follow":
        type = "success";
        title = "用戶追蹤";
        description = `用戶 ${item.display_name || item.username || "匿名用戶"} 開始追蹤機器人`;
        break;
      case "unfollow":
        type = "user_leave";
        title = "用戶取消追蹤";
        description = `用戶 ${item.display_name || item.username || "匿名用戶"} 取消追蹤機器人`;
        break;
      default:
        type = "info";
        title = `${item.interaction_type || "系統活動"}`;
        description = item.message_content || "無詳細資訊";
    }

    const timestamp =
      item.timestamp || item.created_at || new Date().toISOString();

    return {
      id,
      type,
      title,
      description,
      timestamp,
      metadata: {
        userId: item.line_bot_users_id || item.user_id,
        userName: item.display_name || item.username,
        messageContent: item.message_content,
        interactionType: item.interaction_type,
        ...item,
      },
    };
  });
};
