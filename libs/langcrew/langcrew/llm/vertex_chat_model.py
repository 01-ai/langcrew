from typing import Any, Dict, List, Optional

import logging
from pydantic import Field
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from google import genai


logger = logging.getLogger(__name__)


class VertexAIChat(BaseChatModel):
    """基于 Google GenAI (Vertex) 的 LangChain ChatModel 封装。

    参数:
    - name: 模型名称，例如 "gemini-2.5-flash"
    - api_key: API Key
    """

    name: str = Field(..., description="Vertex/GenAI model name")
    api_key: str = Field(..., description="API key for Google GenAI")

    # 识别参数用于 LangSmith/Tracing
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        return {"model_name": self.name, "vertexai": True}

    # 唯一标识模型类型的字符串
    @property
    def _llm_type(self) -> str:  # noqa: D401
        return "vertex-ai-chat"

    def _messages_to_prompt(self, messages: List[BaseMessage]) -> str:
        """将消息列表转换为字符串提示。

        使用简单的 role: content 连接，保持清晰可读。
        """
        # 将不同角色的消息按顺序串接成一个文本提示
        parts: List[str] = []
        for msg in messages:
            role = "user"
            if isinstance(msg, SystemMessage):
                role = "system"
            elif isinstance(msg, AIMessage):
                role = "assistant"
            elif isinstance(msg, HumanMessage):
                role = "user"
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            parts.append(f"{role}: {content}")
        return "\n".join(parts)

    def _apply_stop_tokens(self, text: str, stop: Optional[List[str]]) -> str:
        """应用 stop tokens；按 LangChain 约定将 stop 字符串包含在输出中。

        找到最早出现的 stop，并保留该 stop。
        """
        if not stop:
            return text
        earliest_idx: Optional[int] = None
        chosen: Optional[str] = None
        for token in stop:
            idx = text.find(token)
            if idx != -1 and (earliest_idx is None or idx < earliest_idx):
                earliest_idx = idx
                chosen = token
        if earliest_idx is not None and chosen is not None:
            return text[: earliest_idx + len(chosen)]
        return text

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,  # CallbackManagerForLLMRun | None
        **kwargs: Any,
    ) -> ChatResult:
        """同步生成实现，调用 google.genai 的 generate_content。

        将 LangChain 的消息转换成字符串，调用 GenAI，同步返回 AIMessage。
        """
        prompt = self._messages_to_prompt(messages)

        # 便于排查问题
        logger.info(
            "VertexAIChat invoking model=%s via Vertex=%s",
            self.name,
            True,
        )

        # 每次调用时按需创建客户端，确保线程安全与简单性
        api_key_value = self.api_key
        with genai.Client(vertexai=True, api_key=api_key_value) as client:
            res = client.models.generate_content(model=self.name, contents=prompt)
            output_text: str = getattr(res, "text", "") or ""

        # 应用 stop 规则
        output_text = self._apply_stop_tokens(output_text, stop)

        # 构造 LangChain 的返回结构
        ai_message = AIMessage(
            content=output_text,
            response_metadata={"model_name": self.name},
        )
        generation = ChatGeneration(message=ai_message)
        return ChatResult(generations=[generation])
