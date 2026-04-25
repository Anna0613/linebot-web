export type RichMenuActionType = 'postback' | 'message' | 'uri' | 'datetimepicker' | 'richmenuswitch';

export interface RichMenuAction {
  type: RichMenuActionType;
  label?: string;
  data?: string;
  text?: string;
  uri?: string;
  mode?: string;
  initial?: string;
  max?: string;
  min?: string;
  richMenuAliasId?: string;
  [key: string]: unknown;
}

export interface RichMenuBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RichMenuArea {
  bounds: RichMenuBounds;
  action: RichMenuAction;
}

export interface RichMenuSize {
  width: 2500;
  height: 1686 | 843;
}

export interface RichMenu {
  id: string;
  bot_id: string;
  line_rich_menu_id?: string;
  name: string;
  chat_bar_text: string;
  selected: boolean;
  size: RichMenuSize | Record<string, unknown>;
  areas: RichMenuArea[] | Array<Record<string, unknown>>;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRichMenuPayload {
  name: string;
  chat_bar_text: string;
  selected?: boolean;
  size: RichMenuSize;
  areas: RichMenuArea[];
}

export interface UpdateRichMenuPayload {
  name?: string;
  chat_bar_text?: string;
  selected?: boolean;
  size?: RichMenuSize;
  areas?: RichMenuArea[];
}

