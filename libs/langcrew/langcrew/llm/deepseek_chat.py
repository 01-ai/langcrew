"""DeepSeek chat model compatibility fixes."""

from typing import Any

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage
from langchain_deepseek import ChatDeepSeek as _ChatDeepSeek


class ChatDeepSeek(_ChatDeepSeek):
    """DeepSeek chat model that preserves reasoning across tool calls."""

    def _get_request_payload(
        self,
        input_: LanguageModelInput,
        *,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> dict:
        source_messages = self._convert_input(input_).to_messages()
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)
        serialized_messages = payload.get("messages")

        reasoning_messages = {
            index: reasoning_content
            for index, message in enumerate(source_messages)
            if isinstance(message, AIMessage)
            and (
                reasoning_content := message.additional_kwargs.get("reasoning_content")
            )
            is not None
        }
        if not reasoning_messages:
            return payload

        if not isinstance(serialized_messages, list) or len(serialized_messages) != len(
            source_messages
        ):
            raise ValueError(
                "Cannot preserve DeepSeek reasoning_content because the serialized "
                "message sequence does not match the source messages"
            )

        for index, reasoning_content in reasoning_messages.items():
            serialized_messages[index]["reasoning_content"] = reasoning_content

        return payload


__all__ = ["ChatDeepSeek"]
