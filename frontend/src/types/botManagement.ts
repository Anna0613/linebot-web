export interface BotAnalytics {
  totalMessages: number;
  activeUsers: number;
  userRetention: number;
  peakHour: number;
  todayMessages: number;
  weekMessages: number;
  monthMessages: number;
  responseTime?: number;
  successRate?: number;
}

export interface MessageStats {
  date: string;
  sent: number;
  received: number;
  hour?: number;
}

export interface UserActivity {
  hour: string;
  activeUsers: number;
}

export interface UsageData {
  feature: string;
  usage: number;
  color: string;
}

export interface ActivityItem {
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

export interface LineUser {
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

export type MessageContent =
  | string
  | {
      text?: string | { text: string };
      content?: string;
      stickerId?: string;
      packageId?: string;
      title?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      [key: string]: unknown;
    };

export interface UserInteraction {
  id: string;
  event_type: string;
  message_type: string;
  message_content: MessageContent;
  media_url?: string;
  media_path?: string;
  timestamp: string;
}

export interface PaginationInfo {
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface GetBotUsersResponse {
  users: LineUser[];
  total_count: number;
  pagination: PaginationInfo;
}

export interface GetUserInteractionsResponse {
  interactions: UserInteraction[];
}

export interface BackendActivityData {
  id?: string;
  line_bot_user_interactions_id?: string;
  interaction_type?: string;
  message_content?: string;
  timestamp?: string;
  created_at?: string;
  line_bot_users_id?: string;
  user_id?: string;
  username?: string;
  display_name?: string;
  [key: string]: unknown;
}

export interface WebhookEndpointInfo {
  is_set?: boolean;
  active?: boolean;
  endpoint?: string;
}

export interface WebhookStatus extends Record<string, unknown> {
  status?: string;
  status_text?: string;
  is_configured?: boolean;
  line_api_accessible?: boolean;
  checked_at?: string;
  basic_id?: string;
  webhook_endpoint_info?: WebhookEndpointInfo;
}
