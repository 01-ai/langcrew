"""Token counting utilities using litellm."""

import logging
from typing import Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.messages.utils import count_tokens_approximately
from litellm import token_counter

logger = logging.getLogger(__name__)


def _to_litellm_format(messages: list[BaseMessage]) -> list[dict[str, Any]]:
    """Convert LangChain messages to litellm format."""
    litellm_messages = []

    for msg in messages:
        if isinstance(msg, SystemMessage):
            litellm_messages.append({
                "role": "system",
                "content": str(msg.content) if msg.content else "",
            })
        elif isinstance(msg, HumanMessage):
            litellm_messages.append({
                "role": "user",
                "content": str(msg.content) if msg.content else "",
            })
        elif isinstance(msg, AIMessage):
            message_dict = {
                "role": "assistant",
                "content": str(msg.content) if msg.content else "",
            }
            # Include tool_calls if present for accurate token counting
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                message_dict["tool_calls"] = msg.tool_calls
            litellm_messages.append(message_dict)
        elif isinstance(msg, ToolMessage):
            # Keep tool role and tool_call_id for accurate token counting
            message_dict = {
                "role": "tool",
                "content": str(msg.content) if msg.content else "",
            }
            if hasattr(msg, "tool_call_id") and msg.tool_call_id:
                message_dict["tool_call_id"] = msg.tool_call_id
            litellm_messages.append(message_dict)
        else:
            # For any other message type, convert to user message
            litellm_messages.append({
                "role": "user",
                "content": str(msg.content) if msg.content else "",
            })

    return litellm_messages


def count_message_tokens(
    messages: list[BaseMessage], llm: BaseLanguageModel | None = None
) -> int:
    """
    Count tokens in messages using litellm.token_counter.
    Falls back to approximate counting if litellm fails.
    """
    # Get model name from llm
    if not llm or not hasattr(llm, "model_name"):
        raise ValueError("LLM must have model_name attribute")
    effective_model_name = llm.model_name

    # Convert messages to litellm format
    litellm_messages = _to_litellm_format(messages)

    try:
        token_count = token_counter(
            model=effective_model_name, messages=litellm_messages
        )
        logger.info(
            f"litellm token count: {token_count} for model {effective_model_name}"
        )
        return token_count
    except Exception as e:
        logger.warning(
            f"litellm token calculation failed for model {effective_model_name}: {e}"
        )
        # Use LangChain's approximate token counting as fallback
        fallback_count = count_tokens_approximately(messages)
        logger.info(f"Using LangChain approximate token count: {fallback_count}")
        return fallback_count
