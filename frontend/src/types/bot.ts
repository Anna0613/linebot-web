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
