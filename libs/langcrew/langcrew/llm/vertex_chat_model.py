import logging
from typing import Any

from google import genai
from google.genai.types import HttpOptions
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field

from ..utils import extract_text_content

logger = logging.getLogger(__name__)


class VertexAIChat(BaseChatModel):
    """LangChain ChatModel wrapper for Google GenAI (Vertex).

    Args:
        name: Model name, e.g., "gemini-2.5-flash"
        api_key: API Key
        proxy: Optional HTTP/HTTPS proxy URL, e.g., "http://proxy.example.com:8080"
        timeout: Optional timeout in seconds for HTTP requests
    """

    name: str = Field(..., description="Vertex/GenAI model name")
    api_key: str = Field(..., description="API key for Google GenAI")
    proxy: str | None = Field(default=None, description="HTTP/HTTPS proxy URL")
    timeout: float = Field(default=180.0, description="Timeout in seconds for HTTP requests")

    # Identifying parameters for LangSmith/Tracing
    @property
    def _identifying_params(self) -> dict[str, Any]:
        params = {"model_name": self.name, "vertexai": True}
        if self.proxy:
            params["proxy"] = self.proxy
        return params

    # String that uniquely identifies the model type
    @property
    def _llm_type(self) -> str:  # noqa: D401
        return "vertex-ai-chat"

    def _messages_to_prompt(self, messages: list[BaseMessage]) -> str:
        """Convert message list to string prompt.

        Uses simple role: content concatenation for clarity and readability.
        """
        # Concatenate messages of different roles in order into a text prompt
        parts: list[str] = []
        for msg in messages:
            role = "user"
            if isinstance(msg, SystemMessage):
                role = "system"
            elif isinstance(msg, AIMessage):
                role = "assistant"
            elif isinstance(msg, HumanMessage):
                role = "user"
            content = extract_text_content(msg.content)
            parts.append(f"{role}: {content}")
        return "\n".join(parts)

    def _apply_stop_tokens(self, text: str, stop: list[str] | None) -> str:
        """Apply stop tokens; include stop string in output per LangChain convention.

        Find the earliest occurring stop token and retain it.
        """
        if not stop:
            return text
        earliest_idx: int | None = None
        chosen: str | None = None
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
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,  # CallbackManagerForLLMRun | None
        **kwargs: Any,
    ) -> ChatResult:
        """Synchronous generation implementation, calls google.genai's generate_content.

        Converts LangChain messages to string, calls GenAI, and synchronously returns AIMessage.
        """
        prompt = self._messages_to_prompt(messages)

        # For troubleshooting purposes
        logger.info(
            "VertexAIChat invoking model=%s via Vertex=%s, proxy=%s",
            self.name,
            True,
            self.proxy or "None",
        )

        # Prepare HTTP options with proxy and timeout
        client_args: dict[str, Any] = {}
        
        if self.proxy:
            # httpx expects proxies as a dict mapping protocol to URL
            client_args["proxies"] = {
                "http://": self.proxy,
                "https://": self.proxy,
            }
        
        # Always set timeout
        client_args["timeout"] = self.timeout
        
        http_options = HttpOptions(client_args=client_args) if client_args else None

        # Create client on-demand for each call to ensure thread safety and simplicity
        api_key_value = self.api_key
        with genai.Client(
            vertexai=True, 
            api_key=api_key_value,
            http_options=http_options,
        ) as client:
            res = client.models.generate_content(model=self.name, contents=prompt)
            output_text: str = getattr(res, "text", "") or ""

        # Apply stop rules
        output_text = self._apply_stop_tokens(output_text, stop)

        # Construct LangChain return structure
        ai_message = AIMessage(
            content=output_text,
            response_metadata={"model_name": self.name},
        )
        generation = ChatGeneration(message=ai_message)
        return ChatResult(generations=[generation])
