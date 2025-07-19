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
