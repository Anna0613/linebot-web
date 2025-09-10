/**
 * LINE Bot 相關類型定義
 */

// Flex Message 相關類型
export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexBubble | FlexCarousel;
  quickReply?: {
    items: Array<{
      type: 'action';
      action: FlexAction;
    }>;
  };
}

export interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'deca' | 'hecto' | 'kilo' | 'mega' | 'giga';
  direction?: 'ltr' | 'rtl';
  header?: FlexBoxComponent;
  hero?: FlexImageComponent | FlexVideoComponent;
  body?: FlexBoxComponent;
  footer?: FlexBoxComponent;
  styles?: {
    header?: FlexBubbleStyle;
    hero?: FlexBubbleStyle;
    body?: FlexBubbleStyle;
    footer?: FlexBubbleStyle;
  };
  action?: FlexAction;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexBoxComponent {
  type: 'box';
  layout: 'vertical' | 'horizontal' | 'baseline';
  contents: FlexComponent[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  margin?: FlexMarginSize;
  padding?: FlexPaddingSize;
  spacing?: FlexSpacingSize;
  flex?: number;
  gravity?: 'top' | 'bottom' | 'center';
  wrap?: boolean;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center';
  position?: 'relative' | 'absolute';
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  width?: string;
  height?: string;
  action?: FlexAction;
}

export interface FlexTextComponent {
  type: 'text';
  text: string;
  flex?: number;
  margin?: FlexMarginSize;
  size?: FlexFontSize;
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  wrap?: boolean;
  lineSpacing?: FlexLineSpacing;
  weight?: 'regular' | 'bold';
  color?: string;
  action?: FlexAction;
  decoration?: 'none' | 'underline' | 'line-through';
  style?: 'normal' | 'italic';
  adjustMode?: 'shrink-to-fit';
  maxLines?: number;
}

export interface FlexImageComponent {
  type: 'image';
  url: string;
  flex?: number;
  margin?: FlexMarginSize;
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  size?: FlexImageSize;
  aspectRatio?: FlexImageAspectRatio;
  aspectMode?: 'cover' | 'fit';
  backgroundColor?: string;
  action?: FlexAction;
  animated?: boolean;
}

export interface FlexButtonComponent {
  type: 'button';
  action: FlexAction;
  flex?: number;
  margin?: FlexMarginSize;
  height?: 'sm' | 'md';
  style?: 'link' | 'primary' | 'secondary';
  color?: string;
  gravity?: 'top' | 'bottom' | 'center';
  adjustMode?: 'shrink-to-fit';
}

export interface FlexSeparatorComponent {
  type: 'separator';
  margin?: FlexMarginSize;
  color?: string;
}

export interface FlexSpacerComponent {
  type: 'spacer';
  size?: FlexSpacingSize;
}

export interface FlexVideoComponent {
  type: 'video';
  url: string;
  previewUrl: string;
  altContent?: FlexImageComponent;
  aspectRatio?: FlexVideoAspectRatio;
  action?: FlexAction;
}

export type FlexComponent = 
  | FlexBoxComponent 
  | FlexTextComponent 
  | FlexImageComponent 
  | FlexButtonComponent 
  | FlexSeparatorComponent 
  | FlexSpacerComponent 
  | FlexVideoComponent;

// Flex Action 類型
export interface FlexMessageAction {
  type: 'message';
  label?: string;
  text: string;
}

export interface FlexPostbackAction {
  type: 'postback';
  label?: string;
  data: string;
  displayText?: string;
  inputOption?: 'closeRichMenu' | 'openRichMenu' | 'openKeyboard' | 'openVoice';
  fillInText?: string;
}

export interface FlexUriAction {
  type: 'uri';
  label?: string;
  uri: string;
  altUri?: {
    desktop: string;
  };
}

export interface FlexDatetimePickerAction {
  type: 'datetimepicker';
  label?: string;
  data: string;
  mode: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
}

export interface FlexCameraAction {
  type: 'camera';
  label?: string;
}

export interface FlexCameraRollAction {
  type: 'cameraRoll';
  label?: string;
}

export interface FlexLocationAction {
  type: 'location';
  label?: string;
}

export interface FlexClipboardAction {
  type: 'clipboard';
  label?: string;
  clipboardText: string;
}

export type FlexAction = 
  | FlexMessageAction 
  | FlexPostbackAction 
  | FlexUriAction 
  | FlexDatetimePickerAction 
  | FlexCameraAction 
  | FlexCameraRollAction 
  | FlexLocationAction 
  | FlexClipboardAction;

// Flex 樣式類型
export interface FlexBubbleStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

// Flex 尺寸類型
export type FlexMarginSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type FlexPaddingSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type FlexSpacingSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type FlexFontSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
export type FlexLineSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type FlexImageSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl' | 'full';
export type FlexImageAspectRatio = '1:1' | '1.51:1' | '1.91:1' | '4:3' | '16:9' | '20:13';
export type FlexVideoAspectRatio = '1:1' | '4:3' | '16:9' | '20:13';

// LINE Bot 訊息類型
export interface LineTextMessage {
  type: 'text';
  text: string;
  emojis?: Array<{
    index: number;
    productId: string;
    emojiId: string;
  }>;
  quickReply?: {
    items: Array<{
      type: 'action';
      action: FlexAction;
    }>;
  };
}

export interface LineImageMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
  quickReply?: {
    items: Array<{
      type: 'action';
      action: FlexAction;
    }>;
  };
}

export interface LineStickerMessage {
  type: 'sticker';
  packageId: string;
  stickerId: string;
  quickReply?: {
    items: Array<{
      type: 'action';
      action: FlexAction;
    }>;
  };
}

export type LineMessage = LineTextMessage | LineImageMessage | LineStickerMessage | FlexMessage;

// LINE Bot 事件類型
export interface LineMessageEvent {
  type: 'message';
  message: LineMessage;
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken: string;
}

export interface LinePostbackEvent {
  type: 'postback';
  postback: {
    data: string;
    params?: {
      date?: string;
      time?: string;
      datetime?: string;
    };
  };
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken: string;
}

export interface LineFollowEvent {
  type: 'follow';
  timestamp: number;
  source: {
    type: 'user';
    userId: string;
  };
  replyToken: string;
}

export interface LineUnfollowEvent {
  type: 'unfollow';
  timestamp: number;
  source: {
    type: 'user';
    userId: string;
  };
}

export type LineEvent = LineMessageEvent | LinePostbackEvent | LineFollowEvent | LineUnfollowEvent;
