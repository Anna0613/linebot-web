export interface Bot {
  id: string;
  name: string;
  description?: string;
  channel_token: string;
  channel_secret: string;
  user_id: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotCreateData {
  name: string;
  channel_token: string;
  channel_secret: string;
}

export interface BotUpdateData {
  name?: string;
  channel_token?: string;
  channel_secret?: string;
}

export interface LineBotProfile {
  user_id?: string | null;
  channel_id?: string | null;
  basic_id?: string | null;
  premium_id?: string | null;
  display_name?: string | null;
  picture_url?: string | null;
  chat_mode?: string | null;
  mark_as_read_mode?: string | null;
  is_live: boolean;
  error?: string | null;
  fetched_at: string;
}

export interface LineBotProfilePreviewData {
  channel_token: string;
  channel_secret: string;
}

export interface LogicTemplate {
  id: string;
  user_id: string;
  bot_id: string;
  name: string;
  description?: string;
  logic_blocks: unknown[];
  is_active: string;
  generated_code?: string;
  created_at: string;
  updated_at: string;
}
