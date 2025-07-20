import { BlockDefinition } from '../../stores/visualEditorStore';

export const blockDefinitions: BlockDefinition[] = [
  // 事件區塊
  {
    id: 'event_message_received',
    type: 'event_message_received',
    category: 'events',
    label: '當收到訊息時',
    color: '#FFB84D',
    shape: 'hat',
    fields: [
      {
        id: 'message_type',
        type: 'select',
        label: '訊息類型',
        value: 'any',
        options: ['any', 'text', 'image', 'video', 'audio', 'location', 'sticker']
      }
    ],
    code: 'if isinstance(event, MessageEvent):',
    nextConnection: true
  },
  
  {
    id: 'event_follow',
    type: 'event_follow',
    category: 'events',
    label: '當用戶追蹤時',
    color: '#FFB84D',
    shape: 'hat',
    fields: [],
    code: 'if isinstance(event, FollowEvent):',
    nextConnection: true
  },
  
  {
    id: 'event_unfollow',
    type: 'event_unfollow',
    category: 'events',
    label: '當用戶取消追蹤時',
    color: '#FFB84D',
    shape: 'hat',
    fields: [],
    code: 'if isinstance(event, UnfollowEvent):',
    nextConnection: true
  },
  
  {
    id: 'event_join',
    type: 'event_join',
    category: 'events',
    label: '當 Bot 加入群組時',
    color: '#FFB84D',
    shape: 'hat',
    fields: [],
    code: 'if isinstance(event, JoinEvent):',
    nextConnection: true
  },
  
  {
    id: 'event_postback',
    type: 'event_postback',
    category: 'events',
    label: '當收到回傳資料時',
    color: '#FFB84D',
    shape: 'hat',
    fields: [
      {
        id: 'postback_data',
        type: 'text',
        label: '回傳資料',
        value: '',
        placeholder: '例：action=buy&item=1'
      }
    ],
    code: 'if isinstance(event, PostbackEvent) and event.postback.data == "{{postback_data}}":',
    nextConnection: true
  },

  // 訊息回覆區塊
  {
    id: 'reply_text_message',
    type: 'reply_text_message',
    category: 'messages',
    label: '回覆文字訊息',
    color: '#4A90E2',
    shape: 'statement',
    fields: [
      {
        id: 'text_content',
        type: 'text',
        label: '訊息內容',
        value: '',
        placeholder: '輸入要回覆的文字'
      }
    ],
    code: 'line_bot_api.reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TextMessage(text="{{text_content}}")]))',
    previousConnection: true,
    nextConnection: true
  },
  
  {
    id: 'reply_sticker_message',
    type: 'reply_sticker_message',
    category: 'messages',
    label: '回覆貼圖訊息',
    color: '#4A90E2',
    shape: 'statement',
    fields: [
      {
        id: 'package_id',
        type: 'text',
        label: '貼圖包 ID',
        value: '6136',
        placeholder: '例：6136'
      },
      {
        id: 'sticker_id',
        type: 'text',
        label: '貼圖 ID',
        value: '10551376',
        placeholder: '例：10551376'
      }
    ],
    code: 'line_bot_api.reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[StickerMessage(package_id="{{package_id}}", sticker_id="{{sticker_id}}")]))',
    previousConnection: true,
    nextConnection: true
  },
  
  {
    id: 'reply_image_message',
    type: 'reply_image_message',
    category: 'messages',
    label: '回覆圖片訊息',
    color: '#4A90E2',
    shape: 'statement',
    fields: [
      {
        id: 'original_url',
        type: 'text',
        label: '原始圖片 URL',
        value: '',
        placeholder: 'https://example.com/image.jpg'
      },
      {
        id: 'preview_url',
        type: 'text',
        label: '預覽圖片 URL',
        value: '',
        placeholder: 'https://example.com/preview.jpg'
      }
    ],
    code: 'line_bot_api.reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[ImageMessage(original_content_url="{{original_url}}", preview_image_url="{{preview_url}}")]))',
    previousConnection: true,
    nextConnection: true
  },

  // 主動推送訊息區塊
  {
    id: 'push_text_message',
    type: 'push_text_message',
    category: 'messages',
    label: '推送文字訊息',
    color: '#7ED321',
    shape: 'statement',
    fields: [
      {
        id: 'user_id',
        type: 'text',
        label: '用戶 ID',
        value: '',
        placeholder: '輸入用戶 ID'
      },
      {
        id: 'text_content',
        type: 'text',
        label: '訊息內容',
        value: '',
        placeholder: '輸入要推送的文字'
      }
    ],
    code: 'line_bot_api.push_message(PushMessageRequest(to="{{user_id}}", messages=[TextMessage(text="{{text_content}}")]))',
    previousConnection: true,
    nextConnection: true
  },

  // 邏輯控制區塊
  {
    id: 'if_condition',
    type: 'if_condition',
    category: 'logic',
    label: '如果',
    color: '#F5A623',
    shape: 'statement',
    fields: [
      {
        id: 'condition',
        type: 'text',
        label: '條件',
        value: '',
        placeholder: '例：event.message.text == "你好"'
      }
    ],
    code: 'if {{condition}}:',
    previousConnection: true,
    nextConnection: true
  },
  
  {
    id: 'variable_set',
    type: 'variable_set',
    category: 'variables',
    label: '設定變數',
    color: '#FF6B6B',
    shape: 'statement',
    fields: [
      {
        id: 'variable_name',
        type: 'text',
        label: '變數名稱',
        value: '',
        placeholder: '例：user_name'
      },
      {
        id: 'variable_value',
        type: 'text',
        label: '變數值',
        value: '',
        placeholder: '例：event.source.user_id'
      }
    ],
    code: '{{variable_name}} = {{variable_value}}',
    previousConnection: true,
    nextConnection: true
  },

  // LINE Bot 進階功能
  {
    id: 'get_user_profile',
    type: 'get_user_profile',
    category: 'linebot_api',
    label: '取得用戶資料',
    color: '#BD10E0',
    shape: 'statement',
    fields: [
      {
        id: 'user_id_source',
        type: 'select',
        label: '用戶 ID 來源',
        value: 'event',
        options: ['event', 'custom']
      },
      {
        id: 'custom_user_id',
        type: 'text',
        label: '自訂用戶 ID',
        value: '',
        placeholder: '若選擇自訂請填入'
      },
      {
        id: 'store_variable',
        type: 'text',
        label: '儲存到變數',
        value: 'user_profile',
        placeholder: '變數名稱'
      }
    ],
    code: '{{store_variable}} = line_bot_api.get_profile("{{user_id_source}}" if "{{user_id_source}}" != "event" else event.source.user_id)',
    previousConnection: true,
    nextConnection: true
  },

  {
    id: 'create_quick_reply',
    type: 'create_quick_reply',
    category: 'linebot_api',
    label: '建立快速回覆',
    color: '#BD10E0',
    shape: 'statement',
    fields: [
      {
        id: 'quick_reply_items',
        type: 'text',
        label: '快速回覆項目 (JSON)',
        value: '[{"type":"action","action":{"type":"message","label":"是","text":"是"}},{"type":"action","action":{"type":"message","label":"否","text":"否"}}]',
        placeholder: '快速回覆項目的 JSON 格式'
      }
    ],
    code: 'quick_reply = QuickReply(items={{quick_reply_items}})',
    previousConnection: true,
    nextConnection: true
  },

  // 範本訊息區塊
  {
    id: 'reply_button_template',
    type: 'reply_button_template',
    category: 'templates',
    label: '回覆按鈕範本',
    color: '#50E3C2',
    shape: 'statement',
    fields: [
      {
        id: 'alt_text',
        type: 'text',
        label: '替代文字',
        value: '',
        placeholder: '按鈕範本'
      },
      {
        id: 'title',
        type: 'text',
        label: '標題',
        value: '',
        placeholder: '範本標題'
      },
      {
        id: 'text_content',
        type: 'text',
        label: '內容文字',
        value: '',
        placeholder: '範本內容'
      },
      {
        id: 'button_1_label',
        type: 'text',
        label: '按鈕1標籤',
        value: '',
        placeholder: '按鈕文字'
      },
      {
        id: 'button_1_text',
        type: 'text',
        label: '按鈕1訊息',
        value: '',
        placeholder: '點擊時送出的訊息'
      }
    ],
    code: `template = ButtonsTemplate(
    title="{{title}}",
    text="{{text_content}}",
    actions=[MessageAction(label="{{button_1_label}}", text="{{button_1_text}}")]
)
line_bot_api.reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[TemplateMessage(alt_text="{{alt_text}}", template=template)]))`,
    previousConnection: true,
    nextConnection: true
  }
];

// 按類別分組區塊
export const blockCategories = {
  events: {
    name: '事件',
    color: '#FFB84D',
    blocks: blockDefinitions.filter(block => block.category === 'events')
  },
  messages: {
    name: '訊息',
    color: '#4A90E2',
    blocks: blockDefinitions.filter(block => block.category === 'messages')
  },
  logic: {
    name: '邏輯',
    color: '#F5A623',
    blocks: blockDefinitions.filter(block => block.category === 'logic')
  },
  variables: {
    name: '變數',
    color: '#FF6B6B',
    blocks: blockDefinitions.filter(block => block.category === 'variables')
  },
  linebot_api: {
    name: 'LINE Bot API',
    color: '#BD10E0',
    blocks: blockDefinitions.filter(block => block.category === 'linebot_api')
  },
  templates: {
    name: '範本訊息',
    color: '#50E3C2',
    blocks: blockDefinitions.filter(block => block.category === 'templates')
  }
};