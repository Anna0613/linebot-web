export interface Bot {
  id: string;
  name: string;
  channel_token: string;
  channel_secret: string;
  user_id: string;
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
