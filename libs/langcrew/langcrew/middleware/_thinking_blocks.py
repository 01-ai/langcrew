"""Compatibility handling for malformed streamed thinking blocks."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Sequence
from typing import Any

from langchain.agents.middleware.types import AgentMiddleware, ModelRequest
from langchain_core.messages import AIMessage, AnyMessage


def _normalize_thinking_blocks(
    messages: Sequence[AnyMessage],
) -> Sequence[AnyMessage]:
    """Restore empty thinking content omitted by streamed response assembly."""
    normalized_messages: list[AnyMessage] = []
    messages_changed = False

    for message in messages:
        content = message.content
        if not isinstance(message, AIMessage) or not isinstance(content, list):
            normalized_messages.append(message)
            continue

        normalized_content: list[str | dict[str, Any]] = []
        content_changed = False
        for block in content:
            if (
                isinstance(block, dict)
                and block.get("type") == "thinking"
                and isinstance(block.get("signature"), str)
                and "thinking" not in block
            ):
                normalized_content.append({**block, "thinking": ""})
                content_changed = True
            else:
                normalized_content.append(block)

        if content_changed:
            normalized_messages.append(
                message.model_copy(update={"content": normalized_content})
            )
            messages_changed = True
        else:
            normalized_messages.append(message)

    return normalized_messages if messages_changed else messages


class _ThinkingBlockNormalizationMiddleware(AgentMiddleware):
    """Repair signature-only thinking blocks immediately before model calls."""

    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Any],
    ) -> Any:
        normalized_messages = _normalize_thinking_blocks(request.messages)
        if normalized_messages is not request.messages:
            request = request.override(messages=list(normalized_messages))
        return handler(request)

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[Any]],
    ) -> Any:
        normalized_messages = _normalize_thinking_blocks(request.messages)
        if normalized_messages is not request.messages:
            request = request.override(messages=list(normalized_messages))
        return await handler(request)
