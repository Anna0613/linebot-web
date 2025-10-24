import type React from 'react';

export interface BlockData {
  [key: string]: unknown;
  title?: string;
  condition?: string;
  content?: string;
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  url?: string;
  layout?: string;
  spacing?: string;
  eventType?: string;
  replyType?: string;
  controlType?: string;
  settingType?: string;
  containerType?: string;
  contentType?: string;
  layoutType?: string;
  flexMessageId?: string;
  flexMessageName?: string;
}

export interface Block {
  blockType: string;
  blockData: BlockData;
}

export interface BlockRendererProps {
  block: Block;
  index: number;
  isEditing: boolean;
  blockData: BlockData;
  setBlockData: React.Dispatch<React.SetStateAction<BlockData>>;
  // 子元件可於關鍵動作（如圖片上傳成功）即時請求父層保存
  onCommit?: (data: BlockData) => void;
}
