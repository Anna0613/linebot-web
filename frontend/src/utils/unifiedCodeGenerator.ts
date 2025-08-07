/**
 * 統一積木代碼生成器
 * 支援邏輯積木和 Flex 積木的混合代碼生成
 */

import { UnifiedBlock, BlockCategory } from '../types/block';
import { migrateBlock } from './blockCompatibility';

// 向後相容的舊格式介面
interface LegacyBlock {
  blockType: string;
  blockData: { [key: string]: unknown };
}

/**
 * 生成 LINE Bot 的完整程式碼
 */
export function generateUnifiedCode(
  logicBlocks: (UnifiedBlock | LegacyBlock)[],
  flexBlocks: (UnifiedBlock | LegacyBlock)[] = []
): string {
  // 轉換所有積木到統一格式
  const normalizedLogicBlocks = normalizeBlocks(logicBlocks);
  const normalizedFlexBlocks = normalizeBlocks(flexBlocks);
  
  // 合併所有積木進行統一處理
  const allBlocks = [...normalizedLogicBlocks, ...normalizedFlexBlocks];
  
  let code = generatePythonTemplate();
  
  // 生成事件處理器
  code += generateEventHandlers(allBlocks);
  
  // 生成 Flex 訊息定義
  code += generateFlexMessageDefinitions(normalizedFlexBlocks);
  
  // 生成主程式碼
  code += generateMainCode();
  
  return code;
}

/**
 * 轉換積木到統一格式
 */
function normalizeBlocks(blocks: (UnifiedBlock | LegacyBlock)[]): UnifiedBlock[] {
  return blocks.map(block => {
    if ('category' in block) {
      return block as UnifiedBlock;
    } else {
      return migrateBlock(block as LegacyBlock);
    }
  });
}

/**
 * 生成 Python 模板
 */
function generatePythonTemplate(): string {
  return `# LINE Bot 自動生成程式碼
# 使用統一積木系統生成

from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage, FlexSendMessage

app = Flask(__name__)

# LINE Bot 設定
line_bot_api = LineBotApi('YOUR_CHANNEL_ACCESS_TOKEN')
handler = WebhookHandler('YOUR_CHANNEL_SECRET')

@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    
    return 'OK'

`;
}

/**
 * 生成事件處理器
 */
function generateEventHandlers(blocks: UnifiedBlock[]): string {
  let code = '';
  
  const eventBlocks = blocks.filter(block => block.category === BlockCategory.EVENT);
  const replyBlocks = blocks.filter(block => block.category === BlockCategory.REPLY);
  const controlBlocks = blocks.filter(block => block.category === BlockCategory.CONTROL);
  
  // 為每個事件積木生成處理器
  eventBlocks.forEach((eventBlock, index) => {
    const _eventType = eventBlock.blockData.eventType as string;
    
    code += `@handler.add(MessageEvent, message=TextMessage)
def handle_message_${index}(event):
    user_message = event.message.text
    reply_messages = []
    
`;
    
    // 查找相關的回覆積木
    replyBlocks.forEach(replyBlock => {
      code += generateReplyCode(replyBlock, blocks);
    });
    
    // 處理控制邏輯
    controlBlocks.forEach(controlBlock => {
      code += generateControlCode(controlBlock);
    });
    
    code += `    
    if reply_messages:
        line_bot_api.reply_message(event.reply_token, reply_messages)

`;
  });
  
  return code;
}

/**
 * 生成回覆積木代碼
 */
function generateReplyCode(replyBlock: UnifiedBlock, allBlocks: UnifiedBlock[]): string {
  const replyType = replyBlock.blockData.replyType as string;
  
  switch (replyType) {
    case 'text':
      return `    reply_messages.append(TextSendMessage(text="${replyBlock.blockData.title || '回覆訊息'}"))
`;
    
    case 'flex': {
      // 查找相關的 Flex 積木
      const flexBlocks = allBlocks.filter(block => 
        block.category === BlockCategory.FLEX_CONTAINER ||
        block.category === BlockCategory.FLEX_CONTENT ||
        block.category === BlockCategory.FLEX_LAYOUT
      );
      
      if (flexBlocks.length > 0) {
        return `    reply_messages.append(FlexSendMessage(alt_text="Flex 訊息", contents=flex_message_${Date.now()}))
`;
      }
      return `    reply_messages.append(TextSendMessage(text="Flex 訊息功能尚未完整設定"))
`;
    }
    
    case 'image':
      return `    reply_messages.append(ImageSendMessage(
        original_content_url="https://example.com/image.jpg",
        preview_image_url="https://example.com/preview.jpg"
    ))
`;
    
    default:
      return `    reply_messages.append(TextSendMessage(text="未支援的回覆類型"))
`;
  }
}

/**
 * 生成控制積木代碼
 */
function generateControlCode(controlBlock: UnifiedBlock): string {
  const controlType = controlBlock.blockData.controlType as string;
  
  switch (controlType) {
    case 'if':
      return `    # 條件判斷邏輯
    if user_message == "條件":
        # 條件為真時的處理
        pass
    else:
        # 條件為假時的處理
        pass
`;
    
    case 'loop':
      return `    # 迴圈處理邏輯
    for i in range(3):
        # 重複執行的邏輯
        pass
`;
    
    case 'wait':
      return `    # 等待處理邏輯
    import time
    time.sleep(1)
`;
    
    default:
      return `    # 未知的控制類型: ${controlType}
`;
  }
}

/**
 * 生成 Flex 訊息定義
 */
function generateFlexMessageDefinitions(flexBlocks: UnifiedBlock[]): string {
  if (flexBlocks.length === 0) {
    return '';
  }
  
  let code = '# Flex 訊息定義\n';
  
  const containerBlocks = flexBlocks.filter(block => block.category === BlockCategory.FLEX_CONTAINER);
  const contentBlocks = flexBlocks.filter(block => block.category === BlockCategory.FLEX_CONTENT);
  
  containerBlocks.forEach((container, index) => {
    const containerType = container.blockData.containerType as string;
    
    code += `
def flex_message_${Date.now() + index}():
    return {
        "type": "${containerType}",
`;
    
    if (containerType === 'bubble') {
      code += `        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
`;
      
      // 添加內容積木
      contentBlocks.forEach(content => {
        const contentType = content.blockData.contentType as string;
        
        switch (contentType) {
          case 'text':
            code += `                {
                    "type": "text",
                    "text": "${content.blockData.title || '文字內容'}"
                },
`;
            break;
          case 'button':
            code += `                {
                    "type": "button",
                    "action": {
                        "type": "postback",
                        "label": "${content.blockData.title || '按鈕'}",
                        "data": "button_clicked"
                    }
                },
`;
            break;
        }
      });
      
      code += `            ]
        }
`;
    }
    
    code += `    }

`;
  });
  
  return code;
}

/**
 * 生成主程式碼
 */
function generateMainCode(): string {
  return `
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
`;
}

/**
 * 生成 Flex 訊息預覽 JSON
 */
export function generateFlexPreview(flexBlocks: (UnifiedBlock | LegacyBlock)[]): object {
  const normalizedBlocks = normalizeBlocks(flexBlocks);
  
  const containerBlocks = normalizedBlocks.filter(block => block.category === BlockCategory.FLEX_CONTAINER);
  const contentBlocks = normalizedBlocks.filter(block => block.category === BlockCategory.FLEX_CONTENT);
  
  if (containerBlocks.length === 0) {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "請添加 Flex 容器積木"
          }
        ]
      }
    };
  }
  
  const container = containerBlocks[0];
  const containerType = container.blockData.containerType as string;
  
  const flexMessage: Record<string, unknown> = {
    type: containerType
  };
  
  if (containerType === 'bubble') {
    flexMessage.body = {
      type: "box",
      layout: "vertical",
      contents: contentBlocks.map(content => {
        const contentType = content.blockData.contentType as string;
        
        switch (contentType) {
          case 'text':
            return {
              type: "text",
              text: content.blockData.title || '文字內容'
            };
          case 'button':
            return {
              type: "button",
              action: {
                type: "postback",
                label: content.blockData.title || '按鈕',
                data: "button_clicked"
              }
            };
          case 'image':
            return {
              type: "image",
              url: "https://via.placeholder.com/300x200",
              aspectMode: "cover"
            };
          default:
            return {
              type: "text",
              text: `未支援的內容類型: ${contentType}`
            };
        }
      })
    };
  }
  
  return flexMessage;
}