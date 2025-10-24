// LINE Bot 程式碼生成器

interface BlockData {
  [key: string]: unknown;
  eventType?: string;
  condition?: string;
  replyType?: string;
  content?: string;
  controlType?: string;
  settingType?: string;
  variableName?: string;
  value?: string;
  loopCount?: number;
  waitTime?: number;
}

interface Block {
  blockType: string;
  blockData: BlockData;
  children?: string[];  // 子積木 ID 列表
  id?: string;          // 積木 ID
}

interface EventHandler {
  type: string;
  messageType?: string;
  condition?: string;
  actions: Action[];
}

interface Action {
  type: string;
  content?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  altText?: string;
  contents?: Record<string, unknown>;
  packageId?: string;
  stickerId?: string;
  controlType?: string;
  condition?: string;
  loopCount?: number;
  waitTime?: number;
  variableName?: string;
  value?: string;
  children?: Action[];  // 子動作列表（用於控制積木）
}

export class LineBotCodeGenerator {
  private imports: Set<string>;
  private eventHandlers: EventHandler[];
  private variables: Map<string, string>;

  constructor() {
    this.imports = new Set();
    this.eventHandlers = [];
    this.variables = new Map();
  }

  generateCode(blocks: Block[]): string {
    this.reset();
    
    // 分析積木並生成對應的程式碼
    blocks.forEach(block => {
      this.processBlock(block);
    });

    return this.buildFinalCode();
  }

  private reset(): void {
    this.imports.clear();
    this.eventHandlers = [];
    this.variables.clear();
    
    // 基本的 imports
    this.imports.add("from flask import Flask, request, abort");
    this.imports.add("from linebot import LineBotApi, WebhookHandler");
    this.imports.add("from linebot.exceptions import InvalidSignatureError");
    this.imports.add("from linebot.models import MessageEvent, TextMessage, TextSendMessage");
  }

  private processBlock(block: Block): void {
    switch (block.blockType) {
      case 'event':
        this.processEventBlock(block);
        break;
      case 'reply':
        this.processReplyBlock(block);
        break;
      case 'control':
        this.processControlBlock(block);
        break;
      case 'setting':
        this.processSettingBlock(block);
        break;
    }
  }

  private processEventBlock(block: Block): void {
    const { eventType, condition, pattern, matchMode, caseSensitive } = block.blockData;

    switch (eventType) {
      case 'message.text':
        // 根據匹配模式生成條件表達式
        let textCondition = '';
        if (pattern) {
          const patternStr = pattern as string;
          const mode = (matchMode as string) || 'contains';
          const isCaseSensitive = caseSensitive as boolean;

          switch (mode) {
            case 'contains':
              textCondition = isCaseSensitive
                ? `"${patternStr}" in user_message`
                : `"${patternStr.toLowerCase()}" in user_message.lower()`;
              break;
            case 'exact':
              textCondition = isCaseSensitive
                ? `user_message == "${patternStr}"`
                : `user_message.lower() == "${patternStr.toLowerCase()}"`;
              break;
            case 'startsWith':
              textCondition = isCaseSensitive
                ? `user_message.startswith("${patternStr}")`
                : `user_message.lower().startswith("${patternStr.toLowerCase()}")`;
              break;
            case 'endsWith':
              textCondition = isCaseSensitive
                ? `user_message.endswith("${patternStr}")`
                : `user_message.lower().endswith("${patternStr.toLowerCase()}")`;
              break;
            case 'regex':
              this.imports.add("import re");
              textCondition = isCaseSensitive
                ? `re.search(r"${patternStr}", user_message)`
                : `re.search(r"${patternStr}", user_message, re.IGNORECASE)`;
              break;
            default:
              textCondition = `"${patternStr}" in user_message`;
          }
        }

        this.eventHandlers.push({
          type: 'message',
          messageType: 'text',
          condition: textCondition || condition || pattern || '',
          actions: []
        });
        break;
      case 'message.image':
        this.imports.add("from linebot.models import ImageMessage");
        this.eventHandlers.push({
          type: 'message',
          messageType: 'image',
          condition: condition || pattern || '',
          actions: []
        });
        break;
      case 'follow':
        this.imports.add("from linebot.models import FollowEvent");
        this.eventHandlers.push({
          type: 'follow',
          actions: []
        });
        break;
      case 'postback':
        this.imports.add("from linebot.models import PostbackEvent");
        this.eventHandlers.push({
          type: 'postback',
          condition: condition || pattern || '',
          actions: []
        });
        break;
    }
  }

  private processReplyBlock(block: Block): void {
    const { replyType, content, text } = block.blockData;
    
    // 將回覆動作加入到最後一個事件處理器
    if (this.eventHandlers.length > 0) {
      const lastHandler = this.eventHandlers[this.eventHandlers.length - 1];
      
      switch (replyType) {
        case 'text':
          lastHandler.actions.push({
            type: 'reply_text',
            content: content || text || '預設回覆訊息'
          });
          break;
        case 'image':
          this.imports.add("from linebot.models import ImageSendMessage");
          lastHandler.actions.push({
            type: 'reply_image',
            originalContentUrl: content || text || 'https://example.com/image.jpg',
            previewImageUrl: content || text || 'https://example.com/image.jpg'
          });
          break;
        case 'flex':
          this.imports.add("from linebot.models import FlexSendMessage");
          lastHandler.actions.push({
            type: 'reply_flex',
            altText: 'Flex Message',
            contents: content || text || {}
          });
          break;
        case 'sticker':
          this.imports.add("from linebot.models import StickerSendMessage");
          lastHandler.actions.push({
            type: 'reply_sticker',
            packageId: '1',
            stickerId: '1'
          });
          break;
      }
    }
  }

  private processControlBlock(block: Block): void {
    const { controlType, condition, loopCount, waitTime, conditionType, operator, compareValue } = block.blockData;

    // 控制邏輯的處理
    if (this.eventHandlers.length > 0) {
      const lastHandler = this.eventHandlers[this.eventHandlers.length - 1];

      switch (controlType) {
        case 'if':
          // 根據條件建構器生成條件表達式
          let finalCondition = condition as string;

          if (conditionType && conditionType !== 'custom') {
            const leftSide = conditionType === 'message' ? 'user_message' :
                           conditionType === 'variable' ? (compareValue as string || 'variable') :
                           'user_id';
            const op = operator as string || '==';
            const rightSide = `"${compareValue as string || ''}"`;

            if (op === 'in') {
              finalCondition = `"${compareValue as string || ''}" in ${leftSide}`;
            } else if (op === 'not in') {
              finalCondition = `"${compareValue as string || ''}" not in ${leftSide}`;
            } else {
              finalCondition = `${leftSide} ${op} ${rightSide}`;
            }
          }

          lastHandler.actions.push({
            type: 'control_if',
            controlType: 'if',
            condition: finalCondition || 'True'
          });
          break;
        case 'loop':
          lastHandler.actions.push({
            type: 'control_loop',
            controlType: 'loop',
            loopCount: loopCount || 5
          });
          break;
        case 'wait':
          lastHandler.actions.push({
            type: 'control_wait',
            controlType: 'wait',
            waitTime: waitTime || 1000
          });
          break;
      }
    }
  }

  private processSettingBlock(block: Block): void {
    const { settingType, variableName, variableValue, value, defaultValue, dataKey, dataValue } = block.blockData;

    // 將設定動作加入到最後一個事件處理器
    if (this.eventHandlers.length > 0) {
      const lastHandler = this.eventHandlers[this.eventHandlers.length - 1];

      switch (settingType) {
        case 'setVariable':
          // 使用 variableValue 而不是 value
          const varValue = (variableValue || value || '') as string;
          this.variables.set((variableName || 'variable') as string, varValue);
          lastHandler.actions.push({
            type: 'set_variable',
            variableName: (variableName || 'variable') as string,
            value: varValue
          });
          break;
        case 'getVariable':
          lastHandler.actions.push({
            type: 'get_variable',
            variableName: (variableName || 'variable') as string,
            value: (defaultValue || '') as string  // 添加預設值支援
          });
          break;
        case 'saveUserData':
          lastHandler.actions.push({
            type: 'save_user_data',
            variableName: (dataKey || variableName || 'userData') as string,
            value: (dataValue || value || '') as string
          });
          break;
      }
    }
  }

  private buildFinalCode(): string {
    let code = '';
    
    // 加入 imports
    code += Array.from(this.imports).join('\n') + '\n\n';
    
    // 加入基本設定
    code += `app = Flask(__name__)

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

    // 生成事件處理器
    this.eventHandlers.forEach(handler => {
      code += this.generateEventHandler(handler) + '\n';
    });

    // 加入主程式
    code += `
if __name__ == "__main__":
    app.run(debug=True)
`;

    return code;
  }

  private generateEventHandler(handler: EventHandler): string {
    let code = '';

    switch (handler.type) {
      case 'message':
        if (handler.messageType === 'text') {
          code += `@handler.add(MessageEvent, message=TextMessage)
def handle_text_message(event):
    user_message = event.message.text
    reply_messages = []
    `;
          if (handler.condition) {
            code += `
    if "${handler.condition}" in user_message:
        `;
          }
        } else if (handler.messageType === 'image') {
          code += `@handler.add(MessageEvent, message=ImageMessage)
def handle_image_message(event):
    reply_messages = []
    `;
        }
        break;

      case 'follow':
        code += `@handler.add(FollowEvent)
def handle_follow(event):
    reply_messages = []
    `;
        break;

      case 'postback':
        code += `@handler.add(PostbackEvent)
def handle_postback(event):
    reply_messages = []
    `;
        if (handler.condition) {
          code += `
    if event.postback.data == "${handler.condition}":
        `;
        }
        break;
    }

    // 加入動作
    handler.actions.forEach(action => {
      code += this.generateAction(action);
    });

    // 在最後一次性調用 reply_message
    code += `
    if reply_messages:
        line_bot_api.reply_message(event.reply_token, reply_messages)
`;

    return code;
  }

  private generateAction(action: Action): string {
    let code = '';

    switch (action.type) {
      case 'reply_text':
        code += `    reply_messages.append(TextSendMessage(text="${action.content}"))
`;
        break;

      case 'reply_image':
        code += `    reply_messages.append(ImageSendMessage(
        original_content_url="${action.originalContentUrl}",
        preview_image_url="${action.previewImageUrl}"
    ))
`;
        break;

      case 'reply_flex':
        code += `    reply_messages.append(FlexSendMessage(
        alt_text="${action.altText}",
        contents=${JSON.stringify(action.contents, null, 12)}
    ))
`;
        break;

      case 'reply_sticker':
        code += `    reply_messages.append(StickerSendMessage(
        package_id="${action.packageId}",
        sticker_id="${action.stickerId}"
    ))
`;
        break;
      
      case 'control_if':
        code += `
    # 條件判斷
    if ${action.condition}:
`;
        // 處理條件為真時的子動作
        if (action.children && action.children.length > 0) {
          action.children.forEach(childAction => {
            const childCode = this.generateAction(childAction);
            // 為子動作添加額外的縮進
            code += childCode.split('\n').map(line => line ? '    ' + line : line).join('\n');
          });
        } else {
          code += `        # 在這裡加入條件為真時的邏輯
        pass
`;
        }
        code += `    else:
        # 在這裡加入條件為假時的邏輯
        pass
`;
        break;

      case 'control_loop':
        code += `
    # 迴圈執行
    for i in range(${action.loopCount}):
`;
        // 處理迴圈內的子動作
        if (action.children && action.children.length > 0) {
          action.children.forEach(childAction => {
            const childCode = this.generateAction(childAction);
            // 為子動作添加額外的縮進
            code += childCode.split('\n').map(line => line ? '    ' + line : line).join('\n');
          });
        } else {
          code += `        # 在這裡加入要重複執行的邏輯
        pass
`;
        }
        break;
      
      case 'control_wait':
        this.imports.add("import time");
        code += `
    # 等待 ${(action.waitTime || 1000) / 1000} 秒
    time.sleep(${(action.waitTime || 1000) / 1000})
`;
        break;
        
      case 'set_variable':
        code += `    # 設定變數
    ${action.variableName} = "${action.value}"
`;
        break;

      case 'get_variable':
        // 如果有預設值，使用 or 運算符提供預設值
        if (action.value) {
          code += `    # 取得變數值（含預設值）
    value = ${action.variableName} if '${action.variableName}' in locals() else "${action.value}"
`;
        } else {
          code += `    # 取得變數值
    value = ${action.variableName}
`;
        }
        break;
        
      case 'save_user_data':
        code += `
    # 儲存用戶資料 (此處需要實作資料庫邏輯)
    # user_data[user_id] = {"${action.variableName}": "${action.value}"}
    pass
`;
        break;
    }
    
    return code;
  }
}

export default LineBotCodeGenerator;