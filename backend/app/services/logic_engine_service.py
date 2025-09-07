"""
Logic Engine Service
根據視覺化編輯器保存的邏輯模板（logic_blocks）與 Flex 訊息模板，
在 Webhook 收到事件時進行匹配並發送對應的回覆。

設計目標：
- 支援多個模板同時啟用（is_active == "true"）
- 事件匹配優先順序：
  - 依模板 updated_at desc 順序依次嘗試
  - 每個模板內先找「有條件」的事件，再退回「無條件」事件
  - 預設策略：命中一個模板即停止（避免刷屏）；可擴展為 multi-reply
- 回覆類型：text、flex（支援 flexMessageId 或 blocks 設計稿）、image（可選）
- 內容轉換：將 blocks 設計稿轉換為 LINE Flex bubble 結構
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.bot import LogicTemplate, FlexMessage, Bot
from app.services.conversation_service import ConversationService

logger = logging.getLogger(__name__)


class LogicEngineService:
    """視覺化邏輯引擎服務"""

    @staticmethod
    def _normalize_blocks(blocks: Any) -> List[Dict[str, Any]]:
        """確保 blocks 是 list[dict] 型別。"""
        if not blocks:
            return []
        if isinstance(blocks, list):
            return [b for b in blocks if isinstance(b, dict)]
        # 有時可能是字串 JSON，這裡不嘗試解析（schema 已驗證），直接忽略
        return []

    @staticmethod
    def _extract_event_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [b for b in blocks if b.get("blockType") == "event"]

    @staticmethod
    def _extract_reply_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [b for b in blocks if b.get("blockType") == "reply"]

    @staticmethod
    def _get_block_id(block: Dict[str, Any]) -> Optional[str]:
        data = block.get("blockData") or {}
        return data.get("id") or block.get("id")

    @staticmethod
    def _find_connected_reply_block(event_block: Dict[str, Any], reply_blocks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """模擬前端的連接規則：connectedTo/parentId/id；否則回退第一個 reply。"""
        event_id = LogicEngineService._get_block_id(event_block)
        if event_id:
            for rb in reply_blocks:
                rb_data = rb.get("blockData") or {}
                if (
                    rb_data.get("connectedTo") == event_id
                    or rb_data.get("parentId") == event_id
                    or rb.get("parentId") == event_id
                ):
                    return rb
        return reply_blocks[0] if reply_blocks else None

    @staticmethod
    def _message_match(user_message: str, condition: Optional[str], case_sensitive: bool = False) -> bool:
        """文字匹配規則：
        - condition 为空：True
        - 全等 or 包含匹配（不區分大小寫，或依 case_sensitive）
        - 逗號分隔關鍵字任一命中
        """
        if not condition:
            return True
        if not isinstance(user_message, str):
            return False
        msg = user_message if case_sensitive else user_message.lower()
        cond = condition if case_sensitive else condition.lower()

        if "," in cond:
            keywords = [k.strip() for k in cond.split(",") if k.strip()]
            return any((k == msg) or (k in msg) for k in keywords)

        return (msg == cond) or (cond in msg)

    @staticmethod
    def _to_flex_contents_from_blocks(blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """將設計器 blocks 轉為簡化的 LINE Flex bubble 結構（與前端邏輯對齊）。"""
        header_blocks: List[Dict[str, Any]] = []
        body_blocks: List[Dict[str, Any]] = []
        footer_blocks: List[Dict[str, Any]] = []

        def push(area_list: List[Dict[str, Any]], item: Dict[str, Any]):
            area_list.append(item)

        for block in blocks:
            data = block.get("blockData") or {}
            target = body_blocks
            if data.get("area") == "header":
                target = header_blocks
            elif data.get("area") == "footer":
                target = footer_blocks

            btype = block.get("blockType")
            ctype = data.get("contentType")

            if btype == "flex-content":
                if ctype == "text":
                    push(target, {
                        "type": "text",
                        "text": data.get("text") or "文字內容",
                        "color": data.get("color") or "#000000",
                        "size": data.get("size") or "md",
                        "weight": data.get("weight") or "regular",
                        "align": data.get("align") or "start",
                        "wrap": data.get("wrap", True),
                    })
                elif ctype == "image":
                    push(target, {
                        "type": "image",
                        "url": data.get("url") or "https://via.placeholder.com/300x200",
                        "aspectRatio": data.get("aspectRatio") or "20:13",
                        "aspectMode": data.get("aspectMode") or "cover",
                        "size": data.get("size") or "full",
                    })
                elif ctype == "button":
                    action = data.get("action") or {}
                    push(target, {
                        "type": "button",
                        "action": {
                            "type": action.get("type") or "message",
                            "label": action.get("label") or data.get("label") or "按鈕",
                            "text": action.get("text") or data.get("text") or data.get("label") or "按鈕",
                            "data": action.get("data")
                        },
                        "style": data.get("style") or "primary",
                        "color": data.get("color") or None
                    })
                elif ctype == "separator":
                    push(target, {
                        "type": "separator",
                        "margin": data.get("margin") or "md",
                        "color": data.get("color") or "#E0E0E0",
                    })
            elif btype == "flex-layout":
                layout_type = data.get("layoutType")
                if layout_type == "spacer":
                    push(target, {"type": "spacer", "size": data.get("size") or "md"})
                elif layout_type == "box":
                    push(target, {
                        "type": "box",
                        "layout": data.get("layout") or "vertical",
                        "contents": [],
                        "spacing": data.get("spacing") or "md",
                        "margin": data.get("margin") or "none",
                    })

        bubble: Dict[str, Any] = {"type": "bubble"}
        if header_blocks:
            bubble["header"] = {"type": "box", "layout": "vertical", "contents": header_blocks}
        bubble["body"] = {
            "type": "box",
            "layout": "vertical",
            "contents": body_blocks or [{"type": "text", "text": "請在 Flex 設計器中添加內容", "color": "#999999", "align": "center"}],
        }
        if footer_blocks:
            bubble["footer"] = {"type": "box", "layout": "vertical", "contents": footer_blocks}
        return bubble

    @staticmethod
    def _to_flex_contents(stored_content: Any) -> Dict[str, Any]:
        """將 FlexMessage.content 或 block 內的 flexContent 轉為 LINE Flex contents。"""
        # 若為空字串
        if stored_content is None or stored_content == "":
            return {"type": "bubble", "body": {"type": "box", "layout": "vertical", "contents": [{"type": "text", "text": "Empty Flex Message"}]}}

        # 若是字串，嘗試解析
        if isinstance(stored_content, str):
            raw = stored_content.strip()
            if not raw:
                return {"type": "bubble", "body": {"type": "box", "layout": "vertical", "contents": [{"type": "text", "text": "Empty Flex Message"}]}}
            try:
                import json as _json
                stored_content = _json.loads(raw)
            except Exception:
                # 無法解析：包成 bubble text
                return {"type": "bubble", "body": {"type": "box", "layout": "vertical", "contents": [{"type": "text", "text": raw}]}}

        # 若是設計器格式（帶 blocks）
        if isinstance(stored_content, dict) and isinstance(stored_content.get("blocks"), list):
            blocks = LogicEngineService._normalize_blocks(stored_content.get("blocks"))
            return LogicEngineService._to_flex_contents_from_blocks(blocks)

        # 若本身即為 bubble/contents 結構
        if isinstance(stored_content, dict):
            if stored_content.get("type") in ("bubble", "carousel") or stored_content.get("body") or stored_content.get("contents"):
                return stored_content

        # 其他情況：序列化為文字
        return {"type": "bubble", "body": {"type": "box", "layout": "vertical", "contents": [{"type": "text", "text": str(stored_content)}]}}

    @staticmethod
    def _select_reply_block(event_blocks: List[Dict[str, Any]], reply_blocks: List[Dict[str, Any]],
                            message_event: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        """根據事件找到匹配的 (event_block, reply_block) 配對。"""
        # 取出 user 文字與 postback 數據
        user_text: Optional[str] = None
        postback_data: Optional[str] = None
        etype = message_event.get("type")
        if etype == "message" and message_event.get("message", {}).get("type") == "text":
            user_text = message_event.get("message", {}).get("text")
        elif etype == "postback":
            postback = message_event.get("postback", {})
            postback_data = postback.get("data")

        # 先有條件
        conditional_events = []
        unconditional_events = []
        for eb in event_blocks:
            d = eb.get("blockData") or {}
            e_t = d.get("eventType")
            if e_t == "message.text":
                cond = (d.get("condition") or d.get("pattern") or "").strip()
                if cond:
                    conditional_events.append(eb)
                else:
                    unconditional_events.append(eb)
            elif e_t == "postback":
                # postback 視為有條件（需 data 匹配），無 data 視為無條件
                if d.get("data"):
                    conditional_events.append(eb)
                else:
                    unconditional_events.append(eb)
            elif e_t in ("follow", "unfollow", "message.image", "message.video", "message.audio"):
                unconditional_events.append(eb)

        # 嘗試有條件的
        for eb in conditional_events:
            d = eb.get("blockData") or {}
            e_t = d.get("eventType")
            if e_t == "message.text":
                cond = (d.get("condition") or d.get("pattern") or "").strip()
                case_sensitive = bool(d.get("caseSensitive"))
                if user_text is not None and LogicEngineService._message_match(user_text, cond, case_sensitive):
                    rb = LogicEngineService._find_connected_reply_block(eb, reply_blocks)
                    if rb:
                        return eb, rb
            elif e_t == "postback":
                data_cond = (d.get("data") or "").strip()
                if postback_data is not None and data_cond and postback_data == data_cond:
                    rb = LogicEngineService._find_connected_reply_block(eb, reply_blocks)
                    if rb:
                        return eb, rb

        # 再試無條件的
        for eb in unconditional_events:
            rb = LogicEngineService._find_connected_reply_block(eb, reply_blocks)
            if rb:
                return eb, rb

        return None

    @staticmethod
    async def evaluate_and_reply(db: Session, bot: Bot, line_bot_service, user_id: str,
                                 event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """根據啟用中的邏輯模板嘗試匹配並回覆。返回已執行的回覆結果。"""
        results: List[Dict[str, Any]] = []
        try:
            # 取得啟用中的模板，按 updated_at desc
            templates: List[LogicTemplate] = (
                db.query(LogicTemplate)
                .filter(LogicTemplate.bot_id == bot.id, LogicTemplate.is_active == "true")
                .order_by(LogicTemplate.updated_at.desc())
                .all()
            )

            if not templates:
                logger.info("沒有啟用中的邏輯模板，跳過自動回覆")
                return results

            # 預設策略：命中一個模板即停止
            for tpl in templates:
                blocks = LogicEngineService._normalize_blocks(tpl.logic_blocks)
                event_blocks = LogicEngineService._extract_event_blocks(blocks)
                reply_blocks = LogicEngineService._extract_reply_blocks(blocks)
                if not event_blocks or not reply_blocks:
                    continue

                pair = LogicEngineService._select_reply_block(event_blocks, reply_blocks, event)
                if not pair:
                    continue

                eb, rb = pair
                rb_data = rb.get("blockData") or {}
                rtype = (rb_data.get("replyType") or "text").lower()

                # 發送 text
                if rtype == "text":
                    text = str(rb_data.get("text") or "")
                    if not text:
                        text = "\u6211\u9084\u4e0d\u77e5\u9053\u5982\u4f55\u56de\u61c9\u60a8\u7684\u8a0a\u606f"
                    send_result = line_bot_service.send_text_message(user_id, text)
                    try:
                        await ConversationService.add_bot_message(
                            bot_id=str(bot.id),
                            line_user_id=user_id,
                            message_content={"text": text},
                            message_type="text",
                        )
                    except Exception as log_err:
                        logger.warning(f"寫入 bot 訊息至 Mongo 失敗: {log_err}")
                    results.append({"type": "text", "text": text, "result": send_result})
                    break  # 命中一個即停止

                # 發送 flex
                elif rtype == "flex":
                    alt_text = str(rb_data.get("altText") or "Flex 訊息")
                    contents: Optional[Dict[str, Any]] = None

                    # 1) 指向 FlexMessage 資源
                    flex_id = rb_data.get("flexMessageId")
                    if flex_id:
                        fm: Optional[FlexMessage] = (
                            db.query(FlexMessage)
                            .filter(FlexMessage.id == flex_id, FlexMessage.user_id == bot.user_id)
                            .first()
                        )
                        if fm:
                            contents = LogicEngineService._to_flex_contents(fm.content)

                    # 2) 直接使用 block 內的 flexContent
                    if not contents and rb_data.get("flexContent") is not None:
                        contents = LogicEngineService._to_flex_contents(rb_data.get("flexContent"))

                    # 3) 無內容時給個 fallback
                    if not contents:
                        contents = {"type": "bubble", "body": {"type": "box", "layout": "vertical", "contents": [{"type": "text", "text": "Flex 無內容"}]}}

                    send_result = line_bot_service.send_flex_message(user_id, alt_text, contents)
                    try:
                        await ConversationService.add_bot_message(
                            bot_id=str(bot.id),
                            line_user_id=user_id,
                            message_content={"altText": alt_text, "contents": contents},
                            message_type="flex",
                        )
                    except Exception as log_err:
                        logger.warning(f"寫入 bot 訊息至 Mongo 失敗: {log_err}")

                    results.append({"type": "flex", "altText": alt_text, "contents": contents, "result": send_result})
                    break

                # 發送 image（可選）
                elif rtype == "image":
                    image_url = rb_data.get("originalContentUrl") or rb_data.get("url")
                    preview_url = rb_data.get("previewImageUrl") or image_url
                    if image_url:
                        send_result = line_bot_service.send_image_message(user_id, image_url, preview_url)
                        try:
                            await ConversationService.add_bot_message(
                                bot_id=str(bot.id),
                                line_user_id=user_id,
                                message_content={"originalContentUrl": image_url, "previewImageUrl": preview_url},
                                message_type="image",
                            )
                        except Exception as log_err:
                            logger.warning(f"寫入 bot 訊息至 Mongo 失敗: {log_err}")
                        results.append({"type": "image", "url": image_url, "result": send_result})
                        break

                else:
                    # 其他回覆暫不支援，跳過此模板
                    logger.info(f"回覆類型尚未支援: {rtype}")
                    continue

        except Exception as e:
            logger.error(f"邏輯引擎處理失敗: {e}")

        return results

