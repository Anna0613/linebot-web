/**
 * 積木系統常數定義
 */

import { BlockCategory, WorkspaceContext } from '../types/block';

// If-Then 積木配置
export const ifThenBlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '如果...那麼',
  description: '根據條件執行不同的動作',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '如果...那麼',
    controlType: 'if',
    condition: '',
    thenActions: [],
    elseActions: []
  },
  tooltip: '使用此積木建立條件邏輯',
  priority: 1
};

// Loop 積木配置
export const loopBlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '重複執行',
  description: '迴圈積木，重複執行指定的動作',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '重複執行',
    controlType: 'loop',
    loopType: 'count',
    condition: '',
    actions: []
  },
  tooltip: '使用此積木建立迴圈邏輯',
  priority: 2
};

// Wait 積木配置
export const WAIT_CONFIG = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '等待',
  description: '等待積木，暫停執行指定的時間',
  defaultData: {
    title: '等待',
    controlType: 'wait',
    duration: 1000, // 毫秒
    unit: 'seconds'
  },
  compatibility: [WorkspaceContext.LOGIC],
  visual: {
    color: 'bg-purple-500',
    shape: 'rounded-lg'
  }
};

// Follow Event 積木配置
export const FOLLOW_EVENT_CONFIG = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當用戶加入好友時',
  description: '用戶加入好友事件觸發器',
  defaultData: {
    title: '當用戶加入好友時',
    eventType: 'follow'
  },
  compatibility: [WorkspaceContext.LOGIC],
  visual: {
    color: 'bg-orange-500',
    shape: 'rounded-lg'
  }
};

// Image Event 積木配置
export const IMAGE_EVENT_CONFIG = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當收到圖片訊息時',
  description: '圖片訊息事件觸發器',
  defaultData: {
    title: '當收到圖片訊息時',
    eventType: 'message.image'
  },
  compatibility: [WorkspaceContext.LOGIC],
  visual: {
    color: 'bg-orange-500',
    shape: 'rounded-lg'
  }
};

// Message Event 積木配置
export const MESSAGE_EVENT_CONFIG = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當收到文字訊息時',
  description: '文字訊息事件觸發器',
  defaultData: {
    title: '當收到文字訊息時',
    eventType: 'message.text',
    pattern: '', // 可選：訊息模式匹配
    caseSensitive: false
  },
  compatibility: [WorkspaceContext.LOGIC],
  visual: {
    color: 'bg-orange-500',
    shape: 'rounded-lg'
  }
};

// Postback Event 積木配置
export const POSTBACK_EVENT_CONFIG = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當按鈕被點擊時',
  description: 'Postback 事件觸發器（按鈕點擊）',
  defaultData: {
    title: '當按鈕被點擊時',
    eventType: 'postback',
    data: '' // Postback 數據
  },
  compatibility: [WorkspaceContext.LOGIC],
  visual: {
    color: 'bg-orange-500',
    shape: 'rounded-lg'
  }
};

// Updated control block configs with standardized naming
export const loopBlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '重複執行',
  description: '重複執行指定的動作',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '重複執行',
    controlType: 'loop',
    loopCount: 1,
    loopActions: []
  },
  tooltip: '使用此積木重複執行動作',
  priority: 2
};

export const waitBlockConfig = {
  blockType: 'control',
  category: BlockCategory.CONTROL,
  name: '等待',
  description: '暫停執行指定的時間',
  color: 'bg-purple-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '等待',
    controlType: 'wait',
    duration: 1000,
    unit: 'milliseconds'
  },
  tooltip: '使用此積木在動作間加入延遲',
  priority: 3
};

// Event block configs
export const followEventBlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當用戶加入好友時',
  description: '當用戶加入為好友時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當用戶加入好友時',
    eventType: 'follow'
  },
  tooltip: '此積木會在用戶加入好友時執行',
  priority: 3
};

export const imageEventBlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當收到圖片訊息時',
  description: '當用戶發送圖片訊息時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當收到圖片訊息時',
    eventType: 'message.image'
  },
  tooltip: '此積木會在用戶發送圖片訊息時執行',
  priority: 2
};

export const messageEventBlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當收到文字訊息時',
  description: '當用戶發送文字訊息時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當收到文字訊息時',
    eventType: 'message.text'
  },
  tooltip: '此積木會在用戶發送文字訊息時執行',
  priority: 1
};

export const postbackEventBlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當按鈕被點擊時',
  description: '當用戶點擊按鈕時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當按鈕被點擊時',
    eventType: 'postback'
  },
  tooltip: '此積木會在用戶點擊按鈕時執行',
  priority: 4
};

// Flex container block configs
export const boxContainerBlockConfig = {
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  name: 'Box 容器',
  description: 'Flex Box 容器，用於佈局其他元件',
  color: 'bg-indigo-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: 'Box 容器',
    containerType: 'box',
    layout: 'vertical',
    contents: [],
    spacing: 'md',
    margin: 'none',
    paddingAll: 'none',
    paddingTop: 'none',
    paddingBottom: 'none',
    paddingStart: 'none',
    paddingEnd: 'none',
    backgroundColor: '',
    borderColor: '',
    borderWidth: 'none',
    cornerRadius: 'none'
  },
  tooltip: '使用此積木創建 Flex Box 容器',
  priority: 3
};

export const bubbleContainerBlockConfig = {
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  name: 'Bubble 容器',
  description: 'Flex Bubble 容器，用於包含其他 Flex 元件',
  color: 'bg-indigo-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: 'Bubble 容器',
    containerType: 'bubble',
    size: 'mega',
    direction: 'ltr',
    header: null,
    hero: null,
    body: null,
    footer: null,
    styles: {}
  },
  tooltip: '使用此積木創建 Flex Bubble 容器',
  priority: 1
};

export const carouselContainerBlockConfig = {
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  name: 'Carousel 容器',
  description: 'Flex Carousel 容器，用於建立輪播卡片',
  color: 'bg-indigo-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: 'Carousel 容器',
    containerType: 'carousel',
    contents: []
  },
  tooltip: '使用此積木創建 Flex Carousel 容器',
  priority: 2
};

// Flex content block configs
export const buttonContentBlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '按鈕',
  description: 'Flex 按鈕元件，用於用戶互動',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '按鈕',
    contentType: 'button',
    action: {
      type: 'postback',
      label: '點擊我',
      data: '',
      text: ''
    },
    height: 'sm',
    style: 'primary',
    color: '',
    gravity: 'center',
    margin: 'none',
    flex: 0
  },
  tooltip: '使用此積木在 Flex 訊息中加入互動按鈕',
  priority: 3
};

export const imageContentBlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '圖片',
  description: 'Flex 圖片元件，用於顯示圖片',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '圖片',
    contentType: 'image',
    url: '',
    size: 'full',
    aspectRatio: '20:13',
    aspectMode: 'cover',
    backgroundColor: '',
    margin: 'none',
    align: 'center',
    gravity: 'top',
    flex: 0,
    action: null
  },
  tooltip: '使用此積木在 Flex 訊息中顯示圖片',
  priority: 2
};

export const separatorBlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '分隔線',
  description: 'Flex 分隔線元件，用於視覺分割',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '分隔線',
    contentType: 'separator',
    margin: 'md',
    color: '#B7B7B7'
  },
  tooltip: '使用此積木在 Flex 訊息中加入分隔線',
  priority: 4
};

export const textContentBlockConfig = {
  blockType: 'flex-content',
  category: BlockCategory.FLEX_CONTENT,
  name: '文字',
  description: 'Flex 文字元件，用於顯示文字內容',
  color: 'bg-blue-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '文字',
    contentType: 'text',
    text: '請輸入文字內容',
    size: 'md',
    weight: 'regular',
    color: '#000000',
    align: 'start',
    gravity: 'top',
    wrap: true,
    maxLines: 0,
    flex: 0,
    margin: 'none',
    style: 'normal'
  },
  tooltip: '使用此積木在 Flex 訊息中顯示文字',
  priority: 1
};

// Flex layout block configs
export const alignBlockConfig = {
  blockType: 'flex-layout',
  category: BlockCategory.FLEX_LAYOUT,
  name: '對齊',
  description: 'Flex 對齊控制，用於調整元件對齊方式',
  color: 'bg-teal-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '對齊',
    layoutType: 'align',
    align: 'center',
    gravity: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
  tooltip: '使用此積木控制 Flex 訊息中元件的對齊方式',
  priority: 3
};

export const fillerBlockConfig = {
  blockType: 'flex-layout',
  category: BlockCategory.FLEX_LAYOUT,
  name: '填充',
  description: 'Flex 填充元件，用於填充剩餘空間',
  color: 'bg-teal-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '填充',
    layoutType: 'filler',
    flex: 1
  },
  tooltip: '使用此積木在 Flex 訊息中填充剩餘空間',
  priority: 2
};

export const spacerBlockConfig = {
  blockType: 'flex-layout',
  category: BlockCategory.FLEX_LAYOUT,
  name: '間距',
  description: 'Flex 間距元件，用於佈局控制',
  color: 'bg-teal-500',
  compatibility: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
  defaultData: {
    title: '間距',
    layoutType: 'spacer',
    size: 'sm'
  },
  tooltip: '使用此積木在 Flex 訊息中加入間距',
  priority: 1
};

// Reply block configs
export const flexReplyBlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆 Flex 訊息',
  description: '發送 Flex 訊息回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆 Flex 訊息',
    replyType: 'flex',
    altText: 'Flex 訊息',
    flexContent: {}
  },
  tooltip: '使用此積木發送豐富的 Flex 訊息給用戶',
  priority: 3
};

export const imageReplyBlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆圖片訊息',
  description: '發送圖片訊息回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆圖片訊息',
    replyType: 'image',
    originalContentUrl: '',
    previewImageUrl: ''
  },
  tooltip: '使用此積木發送圖片訊息給用戶',
  priority: 2
};

export const stickerReplyBlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆貼圖',
  description: '發送貼圖回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆貼圖',
    replyType: 'sticker',
    packageId: '1',
    stickerId: '1'
  },
  tooltip: '使用此積木發送貼圖給用戶',
  priority: 4
};

export const textReplyBlockConfig = {
  blockType: 'reply',
  category: BlockCategory.REPLY,
  name: '回覆文字訊息',
  description: '發送文字訊息回覆給用戶',
  color: 'bg-green-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '回覆文字訊息',
    replyType: 'text',
    text: '請輸入回覆內容'
  },
  tooltip: '使用此積木發送文字訊息給用戶',
  priority: 1
};

// Setting block configs
export const getVariableBlockConfig = {
  blockType: 'setting',
  category: BlockCategory.SETTING,
  name: '取得變數',
  description: '取得變數的值',
  color: 'bg-gray-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '取得變數',
    settingType: 'getVariable',
    variableName: '',
    defaultValue: ''
  },
  tooltip: '使用此積木取得變數值',
  priority: 2
};

export const saveUserDataBlockConfig = {
  blockType: 'setting',
  category: BlockCategory.SETTING,
  name: '儲存用戶資料',
  description: '儲存或更新用戶的個人資料',
  color: 'bg-gray-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '儲存用戶資料',
    settingType: 'saveUserData',
    dataKey: '',
    dataValue: '',
    userId: ''
  },
  tooltip: '使用此積木儲存用戶的個人資料',
  priority: 3
};

export const setVariableBlockConfig = {
  blockType: 'setting',
  category: BlockCategory.SETTING,
  name: '設定變數',
  description: '設定或更新變數的值',
  color: 'bg-gray-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '設定變數',
    settingType: 'setVariable',
    variableName: '',
    variableValue: '',
    variableType: 'string'
  },
  tooltip: '使用此積木設定變數值',
  priority: 1
};