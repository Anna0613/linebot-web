/**
 * 增強版 Flex Message 生成器
 * 支援完整的 LINE 官方 Flex Message 組件
 */

export enum FlexComponentType {
  // 基本組件
  TEXT = 'text',
  IMAGE = 'image',
  BUTTON = 'button',
  SEPARATOR = 'separator',
  SPACER = 'spacer',
  FILLER = 'filler',
  
  // 進階組件
  ICON = 'icon',
  VIDEO = 'video',
  AUDIO = 'audio',
  
  // 容器組件
  BOX = 'box',
  
  // 特殊組件
  SPAN = 'span'
}

export enum FlexLayout {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  BASELINE = 'baseline'
}

export enum FlexAlign {
  START = 'start',
  END = 'end',
  CENTER = 'center'
}

export enum FlexGravity {
  TOP = 'top',
  BOTTOM = 'bottom',
  CENTER = 'center'
}

export enum FlexSpacing {
  NONE = 'none',
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  XXL = 'xxl'
}

export enum FlexSize {
  XXS = 'xxs',
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  XXL = 'xxl',
  FULL = 'full'
}

export enum FlexWeight {
  REGULAR = 'regular',
  BOLD = 'bold'
}

export enum FlexButtonStyle {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  LINK = 'link'
}

export enum FlexActionType {
  MESSAGE = 'message',
  POSTBACK = 'postback',
  URI = 'uri',
  DATETIMEPICKER = 'datetimepicker',
  RICHMENUSWITCH = 'richmenuswitch',
  CAMERA = 'camera',
  CAMERAROLL = 'cameraroll',
  LOCATION = 'location',
  CLIPBOARD = 'clipboard'
}

/**
 * Flex 組件基礎介面
 */
export interface FlexComponent {
  type: FlexComponentType;
  flex?: number;
  margin?: FlexSpacing;
  padding?: FlexSpacing;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  position?: 'relative' | 'absolute';
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  aspectRatio?: string;
  gravity?: FlexGravity;
  backgroundColor?: string;
  borderWidth?: string;
  borderColor?: string;
  cornerRadius?: string;
  [key: string]: unknown;
}

/**
 * 文字組件
 */
export interface FlexTextComponent extends FlexComponent {
  type: FlexComponentType.TEXT;
  text: string;
  size?: FlexSize;
  weight?: FlexWeight;
  color?: string;
  align?: FlexAlign;
  decoration?: 'none' | 'underline' | 'line-through';
  wrap?: boolean;
  maxLines?: number;
  adjustMode?: 'shrink-to-fit';
  contents?: FlexSpanComponent[];
  style?: 'normal' | 'italic';
}

/**
 * 圖片組件
 */
export interface FlexImageComponent extends FlexComponent {
  type: FlexComponentType.IMAGE;
  url: string;
  size?: FlexSize;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  backgroundColor?: string;
  action?: FlexAction;
  animated?: boolean;
}

/**
 * 按鈕組件
 */
export interface FlexButtonComponent extends FlexComponent {
  type: FlexComponentType.BUTTON;
  action: FlexAction;
  style?: FlexButtonStyle;
  color?: string;
  scaling?: boolean;
  adjustMode?: 'shrink-to-fit';
}

/**
 * 分隔線組件
 */
export interface FlexSeparatorComponent extends FlexComponent {
  type: FlexComponentType.SEPARATOR;
  color?: string;
}

/**
 * 間距組件
 */
export interface FlexSpacerComponent extends FlexComponent {
  type: FlexComponentType.SPACER;
  size?: FlexSpacing;
}

/**
 * 填充組件
 */
export interface FlexFillerComponent extends FlexComponent {
  type: FlexComponentType.FILLER;
}

/**
 * 圖示組件
 */
export interface FlexIconComponent extends FlexComponent {
  type: FlexComponentType.ICON;
  url: string;
  size?: FlexSpacing;
  aspectRatio?: string;
  offsetTop?: FlexSpacing;
  offsetBottom?: FlexSpacing;
  offsetStart?: FlexSpacing;
  offsetEnd?: FlexSpacing;
  scaling?: boolean;
}

/**
 * 影片組件
 */
export interface FlexVideoComponent extends FlexComponent {
  type: FlexComponentType.VIDEO;
  url: string;
  previewUrl: string;
  altContent: FlexComponent;
  aspectRatio?: string;
  action?: FlexAction;
}

/**
 * 音訊組件
 */
export interface FlexAudioComponent extends FlexComponent {
  type: FlexComponentType.AUDIO;
  url: string;
  duration: number;
}

/**
 * 容器組件
 */
export interface FlexBoxComponent extends FlexComponent {
  type: FlexComponentType.BOX;
  layout: FlexLayout;
  contents: FlexComponent[];
  spacing?: FlexSpacing;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: FlexAlign;
  background?: {
    type: 'linearGradient';
    angle: string;
    startColor: string;
    endColor: string;
    centerColor?: string;
    centerColorPosition?: string;
  };
  borderWidth?: 'none' | 'light' | 'normal' | 'medium' | 'semi-bold' | 'bold';
  cornerRadius?: 'none' | FlexSpacing;
  action?: FlexAction;
}

/**
 * Span 組件（用於富文本）
 */
export interface FlexSpanComponent {
  type: FlexComponentType.SPAN;
  text: string;
  size?: FlexSize;
  weight?: FlexWeight;
  color?: string;
  decoration?: 'none' | 'underline' | 'line-through';
  style?: 'normal' | 'italic';
}

/**
 * Flex 動作
 */
export interface FlexAction {
  type: FlexActionType;
  label?: string;
  text?: string;
  data?: string;
  uri?: string;
  mode?: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
  clipboardText?: string;
}

/**
 * Flex 泡泡容器
 */
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

/**
 * Flex 泡泡樣式
 */
export interface FlexBubbleStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

/**
 * Flex 輪播容器
 */
export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

/**
 * Flex Message
 */
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

/**
 * 增強版 Flex Message 生成器
 */
export class EnhancedFlexMessageGenerator {
  /**
   * 從積木陣列生成完整的 Flex Message
   */
  generateFlexMessage(blocks: Array<{
    blockType: string;
    blockData: Record<string, unknown>;
    id?: string;
  }>): FlexMessage {
    const bubble = this.generateBubble(blocks);
    
    return {
      type: 'flex',
      altText: this.generateAltText(bubble),
      contents: bubble
    };
  }

  /**
   * 生成 Flex Bubble
   */
  generateBubble(blocks: Array<{
    blockType: string;
    blockData: Record<string, unknown>;
    id?: string;
  }>): FlexBubble {
    const headerComponents: FlexComponent[] = [];
    const heroComponents: FlexComponent[] = [];
    const bodyComponents: FlexComponent[] = [];
    const footerComponents: FlexComponent[] = [];

    // 按區域分類組件
    blocks.forEach(block => {
      const component = this.convertBlockToComponent(block);
      if (!component) return;

      const area = block.blockData.area as string || 'body';
      
      switch (area) {
        case 'header':
          headerComponents.push(component);
          break;
        case 'hero':
          heroComponents.push(component);
          break;
        case 'footer':
          footerComponents.push(component);
          break;
        default:
          bodyComponents.push(component);
          break;
      }
    });

    const bubble: FlexBubble = {
      type: 'bubble',
      size: 'kilo'
    };

    // 建立各區域
    if (headerComponents.length > 0) {
      bubble.header = this.createBoxComponent(headerComponents, FlexLayout.VERTICAL);
    }

    if (heroComponents.length > 0 && heroComponents[0]) {
      const heroComponent = heroComponents[0];
      if (heroComponent.type === FlexComponentType.IMAGE) {
        bubble.hero = heroComponent as FlexImageComponent;
      } else if (heroComponent.type === FlexComponentType.VIDEO) {
        bubble.hero = heroComponent as FlexVideoComponent;
      }
    }

    if (bodyComponents.length > 0) {
      bubble.body = this.createBoxComponent(bodyComponents, FlexLayout.VERTICAL);
    } else {
      // 預設的 body
      bubble.body = this.createBoxComponent([
        this.createTextComponent('請添加內容到 Flex 設計器', {
          color: '#999999',
          align: FlexAlign.CENTER
        })
      ], FlexLayout.VERTICAL);
    }

    if (footerComponents.length > 0) {
      bubble.footer = this.createBoxComponent(footerComponents, FlexLayout.VERTICAL);
    }

    return bubble;
  }

  /**
   * 將積木轉換為 Flex 組件
   */
  private convertBlockToComponent(block: {
    blockType: string;
    blockData: Record<string, unknown>;
    id?: string;
  }): FlexComponent | null {
    const { blockType, blockData } = block;

    if (blockType === 'flex-content') {
      switch (blockData.contentType) {
        case 'text':
          return this.createTextComponent(
            blockData.text as string || '文字內容',
            {
              size: this.parseSize(blockData.size as string),
              weight: this.parseWeight(blockData.weight as string),
              color: blockData.color as string,
              align: this.parseAlign(blockData.align as string),
              wrap: blockData.wrap !== false,
              maxLines: blockData.maxLines as number,
              decoration: blockData.decoration as 'none' | 'underline' | 'line-through' | undefined
            }
          );

        case 'image':
          return this.createImageComponent(
            blockData.url as string || 'https://via.placeholder.com/300x200',
            {
              size: this.parseSize(blockData.size as string),
              aspectRatio: blockData.aspectRatio as string,
              aspectMode: blockData.aspectMode as 'cover' | 'fit',
              backgroundColor: blockData.backgroundColor as string,
              animated: blockData.animated as boolean
            }
          );

        case 'button':
          return this.createButtonComponent(
            this.createAction(blockData),
            {
              style: this.parseButtonStyle(blockData.style as string),
              color: blockData.color as string,
              scaling: blockData.scaling as boolean
            }
          );

        case 'separator':
          return this.createSeparatorComponent({
            color: blockData.color as string || '#E0E0E0',
            margin: this.parseSpacing(blockData.margin as string)
          });

        case 'icon':
          return this.createIconComponent(
            blockData.url as string || '',
            {
              size: this.parseSpacing(blockData.size as string),
              aspectRatio: blockData.aspectRatio as string
            }
          );

        default:
          console.warn(`不支援的內容類型: ${blockData.contentType}`);
          return null;
      }
    }

    if (blockType === 'flex-layout') {
      switch (blockData.layoutType) {
        case 'spacer':
          return this.createSpacerComponent({
            size: this.parseSpacing(blockData.size as string)
          });

        case 'filler':
          return this.createFillerComponent();

        case 'box':
          return this.createBoxComponent(
            [], // 子組件需要另外處理
            this.parseLayout(blockData.layout as string),
            {
              spacing: this.parseSpacing(blockData.spacing as string),
              margin: this.parseSpacing(blockData.margin as string),
              padding: this.parseSpacing(blockData.padding as string),
              backgroundColor: blockData.backgroundColor as string,
              borderWidth: blockData.borderWidth as string,
              cornerRadius: blockData.cornerRadius as string
            }
          );

        default:
          console.warn(`不支援的佈局類型: ${blockData.layoutType}`);
          return null;
      }
    }

    console.warn(`不支援的積木類型: ${blockType}`);
    return null;
  }

  /**
   * 創建文字組件
   */
  createTextComponent(text: string, options: Partial<FlexTextComponent> = {}): FlexTextComponent {
    return {
      type: FlexComponentType.TEXT,
      text,
      size: FlexSize.MD,
      weight: FlexWeight.REGULAR,
      color: '#000000',
      align: FlexAlign.START,
      wrap: true,
      ...options
    };
  }

  /**
   * 創建圖片組件
   */
  createImageComponent(url: string, options: Partial<FlexImageComponent> = {}): FlexImageComponent {
    return {
      type: FlexComponentType.IMAGE,
      url,
      size: FlexSize.FULL,
      aspectMode: 'cover',
      ...options
    };
  }

  /**
   * 創建按鈕組件
   */
  createButtonComponent(action: FlexAction, options: Partial<FlexButtonComponent> = {}): FlexButtonComponent {
    return {
      type: FlexComponentType.BUTTON,
      action,
      style: FlexButtonStyle.PRIMARY,
      ...options
    };
  }

  /**
   * 創建分隔線組件
   */
  createSeparatorComponent(options: Partial<FlexSeparatorComponent> = {}): FlexSeparatorComponent {
    return {
      type: FlexComponentType.SEPARATOR,
      margin: FlexSpacing.MD,
      ...options
    };
  }

  /**
   * 創建間距組件
   */
  createSpacerComponent(options: Partial<FlexSpacerComponent> = {}): FlexSpacerComponent {
    return {
      type: FlexComponentType.SPACER,
      size: FlexSpacing.MD,
      ...options
    };
  }

  /**
   * 創建填充組件
   */
  createFillerComponent(options: Partial<FlexFillerComponent> = {}): FlexFillerComponent {
    return {
      type: FlexComponentType.FILLER,
      ...options
    };
  }

  /**
   * 創建圖示組件
   */
  createIconComponent(url: string, options: Partial<FlexIconComponent> = {}): FlexIconComponent {
    return {
      type: FlexComponentType.ICON,
      url,
      size: FlexSpacing.MD,
      ...options
    };
  }

  /**
   * 創建容器組件
   */
  createBoxComponent(
    contents: FlexComponent[],
    layout: FlexLayout = FlexLayout.VERTICAL,
    options: Partial<FlexBoxComponent> = {}
  ): FlexBoxComponent {
    return {
      type: FlexComponentType.BOX,
      layout,
      contents,
      spacing: FlexSpacing.MD,
      ...options
    };
  }

  /**
   * 創建動作
   */
  private createAction(blockData: Record<string, unknown>): FlexAction {
    const actionType = blockData.actionType as string || 'message';
    const label = blockData.label as string || '按鈕';
    
    const action: FlexAction = {
      type: this.parseActionType(actionType),
      label
    };

    switch (action.type) {
      case FlexActionType.MESSAGE:
        action.text = blockData.text as string || blockData.label as string || '按鈕被點擊';
        break;
      case FlexActionType.POSTBACK:
        action.data = blockData.data as string || 'postback_data';
        action.text = blockData.text as string;
        break;
      case FlexActionType.URI:
        action.uri = blockData.uri as string || 'https://example.com';
        break;
      case FlexActionType.DATETIMEPICKER:
        action.data = blockData.data as string || 'datetime_data';
        action.mode = blockData.mode as 'date' | 'time' | 'datetime' || 'datetime';
        action.initial = blockData.initial as string;
        action.max = blockData.max as string;
        action.min = blockData.min as string;
        break;
    }

    return action;
  }

  /**
   * 生成 Alt Text
   */
  private generateAltText(bubble: FlexBubble): string {
    const textComponents: string[] = [];
    
    const extractText = (component: FlexComponent | FlexBoxComponent) => {
      if (component.type === FlexComponentType.TEXT) {
        textComponents.push((component as FlexTextComponent).text);
      } else if (component.type === FlexComponentType.BOX) {
        (component as FlexBoxComponent).contents.forEach(extractText);
      }
    };

    if (bubble.header) extractText(bubble.header);
    if (bubble.body) extractText(bubble.body);
    if (bubble.footer) extractText(bubble.footer);

    return textComponents.slice(0, 3).join(' ') || 'Flex Message';
  }

  // 解析方法
  private parseSize(size: string | undefined): FlexSize {
    if (!size) return FlexSize.MD;
    return (Object.values(FlexSize) as string[]).includes(size) ? size as FlexSize : FlexSize.MD;
  }

  private parseWeight(weight: string | undefined): FlexWeight {
    if (!weight) return FlexWeight.REGULAR;
    return weight === 'bold' ? FlexWeight.BOLD : FlexWeight.REGULAR;
  }

  private parseAlign(align: string | undefined): FlexAlign {
    if (!align) return FlexAlign.START;
    return (Object.values(FlexAlign) as string[]).includes(align) ? align as FlexAlign : FlexAlign.START;
  }

  private parseSpacing(spacing: string | undefined): FlexSpacing {
    if (!spacing) return FlexSpacing.MD;
    return (Object.values(FlexSpacing) as string[]).includes(spacing) ? spacing as FlexSpacing : FlexSpacing.MD;
  }

  private parseLayout(layout: string | undefined): FlexLayout {
    if (!layout) return FlexLayout.VERTICAL;
    return (Object.values(FlexLayout) as string[]).includes(layout) ? layout as FlexLayout : FlexLayout.VERTICAL;
  }

  private parseButtonStyle(style: string | undefined): FlexButtonStyle {
    if (!style) return FlexButtonStyle.PRIMARY;
    return (Object.values(FlexButtonStyle) as string[]).includes(style) ? style as FlexButtonStyle : FlexButtonStyle.PRIMARY;
  }

  private parseActionType(actionType: string | undefined): FlexActionType {
    if (!actionType) return FlexActionType.MESSAGE;
    return (Object.values(FlexActionType) as string[]).includes(actionType) ? actionType as FlexActionType : FlexActionType.MESSAGE;
  }
}