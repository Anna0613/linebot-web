"""
上下文管理服務
提供智能的對話記憶管理和上下文窗口控制。
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import tiktoken

logger = logging.getLogger(__name__)


class MessageRole(Enum):
    """訊息角色"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class Message:
    """訊息資料結構"""
    role: MessageRole
    content: str
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典格式"""
        return {
            "role": self.role.value,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        """從字典創建訊息"""
        return cls(
            role=MessageRole(data["role"]),
            content=data["content"],
            timestamp=data.get("timestamp"),
            metadata=data.get("metadata")
        )


class TokenCounter:
    """Token 計數器"""
    
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        """
        初始化 Token 計數器
        
        Args:
            model_name: 模型名稱，用於選擇對應的編碼器
        """
        self.model_name = model_name
        try:
            self.encoding = tiktoken.encoding_for_model(model_name)
        except KeyError:
            # 如果模型不存在，使用 cl100k_base 編碼器
            self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """計算文本的 token 數量"""
        try:
            return len(self.encoding.encode(text))
        except Exception as e:
            logger.warning(f"Token 計數失敗，使用字符數估算: {e}")
            # 回退到字符數估算（大約 4 個字符 = 1 token）
            return len(text) // 4
    
    def count_messages_tokens(self, messages: List[Message]) -> int:
        """計算訊息列表的總 token 數量"""
        total_tokens = 0
        for message in messages:
            # 每個訊息的基礎 token 開銷
            total_tokens += 4  # 角色和格式開銷
            total_tokens += self.count_tokens(message.content)
        
        # 對話的額外開銷
        total_tokens += 2
        return total_tokens


class ContextWindow:
    """上下文窗口管理器"""
    
    def __init__(
        self,
        max_tokens: int = 4096,
        reserved_tokens: int = 512,
        model_name: str = "gpt-3.5-turbo"
    ):
        """
        初始化上下文窗口
        
        Args:
            max_tokens: 最大 token 數量
            reserved_tokens: 為回應保留的 token 數量
            model_name: 模型名稱
        """
        self.max_tokens = max_tokens
        self.reserved_tokens = reserved_tokens
        self.available_tokens = max_tokens - reserved_tokens
        self.token_counter = TokenCounter(model_name)
    
    def fit_messages(
        self,
        messages: List[Message],
        priority_messages: Optional[List[Message]] = None
    ) -> List[Message]:
        """
        將訊息適配到上下文窗口中
        
        Args:
            messages: 訊息列表
            priority_messages: 優先保留的訊息（如系統提示）
        
        Returns:
            適配後的訊息列表
        """
        if not messages:
            return priority_messages or []
        
        # 計算優先訊息的 token 數量
        priority_tokens = 0
        if priority_messages:
            priority_tokens = self.token_counter.count_messages_tokens(priority_messages)
        
        # 可用於歷史訊息的 token 數量
        available_for_history = self.available_tokens - priority_tokens
        
        if available_for_history <= 0:
            logger.warning("優先訊息已超出可用 token 限制")
            return priority_messages or []
        
        # 從最新的訊息開始，逐步添加到上下文中
        fitted_messages = []
        current_tokens = 0
        
        for message in reversed(messages):
            message_tokens = self.token_counter.count_messages_tokens([message])
            
            if current_tokens + message_tokens <= available_for_history:
                fitted_messages.insert(0, message)
                current_tokens += message_tokens
            else:
                break
        
        # 合併優先訊息和歷史訊息
        result = (priority_messages or []) + fitted_messages
        
        logger.debug(f"上下文適配完成: {len(result)} 條訊息, {current_tokens + priority_tokens} tokens")
        return result


class ConversationMemory:
    """對話記憶管理器"""
    
    def __init__(
        self,
        max_history_length: int = 20,
        summarization_threshold: int = 50,
        context_window: Optional[ContextWindow] = None
    ):
        """
        初始化對話記憶
        
        Args:
            max_history_length: 最大歷史訊息數量
            summarization_threshold: 觸發摘要的訊息數量門檻
            context_window: 上下文窗口管理器
        """
        self.max_history_length = max_history_length
        self.summarization_threshold = summarization_threshold
        self.context_window = context_window or ContextWindow()
        
        self.messages: List[Message] = []
        self.summary: Optional[str] = None
        self.summary_up_to_index: int = 0
    
    def add_message(self, role: MessageRole, content: str, metadata: Optional[Dict] = None):
        """添加新訊息"""
        message = Message(role=role, content=content, metadata=metadata)
        self.messages.append(message)
        
        # 檢查是否需要清理歷史
        if len(self.messages) > self.max_history_length:
            self._cleanup_history()
    
    def get_context_messages(
        self,
        include_summary: bool = True,
        system_prompt: Optional[str] = None
    ) -> List[Message]:
        """
        獲取適合當前上下文的訊息
        
        Args:
            include_summary: 是否包含摘要
            system_prompt: 系統提示詞
        
        Returns:
            上下文訊息列表
        """
        priority_messages = []
        
        # 添加系統提示
        if system_prompt:
            priority_messages.append(Message(
                role=MessageRole.SYSTEM,
                content=system_prompt
            ))
        
        # 添加摘要
        if include_summary and self.summary:
            priority_messages.append(Message(
                role=MessageRole.SYSTEM,
                content=f"對話摘要：{self.summary}"
            ))
        
        # 獲取最近的訊息（排除已摘要的部分）
        recent_messages = self.messages[self.summary_up_to_index:]
        
        # 使用上下文窗口適配訊息
        return self.context_window.fit_messages(recent_messages, priority_messages)
    
    def _cleanup_history(self):
        """清理歷史訊息"""
        if len(self.messages) >= self.summarization_threshold:
            # 觸發摘要
            self._create_summary()
        else:
            # 簡單截斷
            excess = len(self.messages) - self.max_history_length
            if excess > 0:
                self.messages = self.messages[excess:]
                self.summary_up_to_index = max(0, self.summary_up_to_index - excess)
    
    def _create_summary(self):
        """創建對話摘要（簡化版本）"""
        # 這裡可以整合 AI 服務來生成更智能的摘要
        # 目前使用簡化的摘要邏輯
        
        messages_to_summarize = self.messages[:self.summarization_threshold // 2]
        
        if not messages_to_summarize:
            return
        
        # 簡單的摘要邏輯
        user_messages = [m.content for m in messages_to_summarize if m.role == MessageRole.USER]
        assistant_messages = [m.content for m in messages_to_summarize if m.role == MessageRole.ASSISTANT]
        
        summary_parts = []
        if user_messages:
            summary_parts.append(f"用戶主要詢問了 {len(user_messages)} 個問題")
        if assistant_messages:
            summary_parts.append(f"助手提供了 {len(assistant_messages)} 次回應")
        
        self.summary = "；".join(summary_parts)
        self.summary_up_to_index = len(messages_to_summarize)
        
        # 移除已摘要的訊息
        self.messages = self.messages[len(messages_to_summarize):]
        self.summary_up_to_index = 0
        
        logger.info(f"創建對話摘要: {self.summary}")
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """獲取記憶統計資訊"""
        total_tokens = self.context_window.token_counter.count_messages_tokens(self.messages)
        
        return {
            "total_messages": len(self.messages),
            "total_tokens": total_tokens,
            "has_summary": self.summary is not None,
            "summary_up_to_index": self.summary_up_to_index,
            "max_history_length": self.max_history_length,
            "available_tokens": self.context_window.available_tokens,
            "token_usage_percentage": (total_tokens / self.context_window.available_tokens) * 100
        }
    
    def clear_memory(self):
        """清除記憶"""
        self.messages.clear()
        self.summary = None
        self.summary_up_to_index = 0
        logger.info("對話記憶已清除")


class ContextManager:
    """上下文管理器主類"""
    
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        """
        初始化上下文管理器
        
        Args:
            model_name: 模型名稱
        """
        self.model_name = model_name
        self.conversations: Dict[str, ConversationMemory] = {}
    
    def get_conversation(self, conversation_id: str) -> ConversationMemory:
        """獲取或創建對話記憶"""
        if conversation_id not in self.conversations:
            # 根據模型選擇合適的上下文窗口大小
            max_tokens = self._get_model_context_size(self.model_name)
            context_window = ContextWindow(max_tokens=max_tokens, model_name=self.model_name)
            
            self.conversations[conversation_id] = ConversationMemory(
                context_window=context_window
            )
        
        return self.conversations[conversation_id]
    
    def _get_model_context_size(self, model_name: str) -> int:
        """獲取模型的上下文大小"""
        model_context_sizes = {
            "gpt-3.5-turbo": 4096,
            "gpt-3.5-turbo-16k": 16384,
            "gpt-4": 8192,
            "gpt-4-32k": 32768,
            "llama-3.3-70b-versatile": 32768,
            "llama-3.1-8b-instant": 131072,
        }
        
        return model_context_sizes.get(model_name, 4096)
    
    def add_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        metadata: Optional[Dict] = None
    ):
        """添加訊息到對話"""
        conversation = self.get_conversation(conversation_id)
        conversation.add_message(role, content, metadata)
    
    def get_context_for_ai(
        self,
        conversation_id: str,
        system_prompt: Optional[str] = None,
        include_summary: bool = True
    ) -> List[Dict[str, str]]:
        """
        獲取適合 AI 模型的上下文格式
        
        Returns:
            適合 AI 模型的訊息格式
        """
        conversation = self.get_conversation(conversation_id)
        messages = conversation.get_context_messages(include_summary, system_prompt)
        
        return [message.to_dict() for message in messages]
    
    def cleanup_old_conversations(self, max_conversations: int = 100):
        """清理舊的對話"""
        if len(self.conversations) > max_conversations:
            # 簡單的 LRU 清理策略
            # 在實際應用中，可以根據最後活動時間來清理
            oldest_keys = list(self.conversations.keys())[:-max_conversations]
            for key in oldest_keys:
                del self.conversations[key]
            
            logger.info(f"清理了 {len(oldest_keys)} 個舊對話")


# 全域上下文管理器實例
global_context_manager = ContextManager()
