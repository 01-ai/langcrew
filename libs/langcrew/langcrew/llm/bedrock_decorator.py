"""
Bedrock ChatBedrockConverse decorator tool
Used to modify client's converse and converse_stream methods after initialization
"""

import functools
import logging
from collections.abc import Callable
from typing import Any

from langchain_aws import ChatBedrockConverse

logger = logging.getLogger(__name__)


def create_message_modifier_decorator(
    message_modifier: Callable[[list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    system_modifier: Callable[[list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    tools_modifier: Callable[[list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    enable_logging: bool = True,
) -> Callable:
    """
    Create a decorator to modify messages and system parameters of converse and converse_stream methods

    Args:
        message_modifier: Function to modify messages parameter
        system_modifier: Function to modify system parameter
        tools_modifier: Function to modify tools parameter
        enable_logging: Whether to enable logging

    Returns:
        Decorator function
    """

    def decorator(original_method: Callable) -> Callable:
        @functools.wraps(original_method)
        def wrapper(*args, **kwargs):
            # Get messages and system parameters
            messages = kwargs.get("messages")
            system = kwargs.get("system")

            # Get tools (from toolConfig)
            tool_config = kwargs.get("toolConfig")
            tools = None
            if tool_config and isinstance(tool_config, dict):
                tools = tool_config.get("tools")

            if enable_logging:
                logger.debug(f"Original messages: {messages}")
                logger.debug(f"Original system: {system}")
                logger.debug(f"Original tools: {tools}")
            # Modify messages
            if message_modifier and messages is not None:
                try:
                    modified_messages = message_modifier(messages)
                    kwargs["messages"] = modified_messages
                    if enable_logging:
                        logger.debug(f"Modified messages: {modified_messages}")
                except Exception as e:
                    logger.error(f"Error modifying messages: {e}")
                    # Use original messages if modification fails

            # Modify system
            if system_modifier and system is not None:
                try:
                    modified_system = system_modifier(system)
                    kwargs["system"] = modified_system
                    if enable_logging:
                        logger.debug(f"Modified system: {modified_system}")
                except Exception as e:
                    logger.error(f"Error modifying system: {e}")
                    # Use original system if modification fails

            # Modify tools
            if tools_modifier and tools is not None:
                try:
                    modified_tools = tools_modifier(tools)
                    tool_config["tools"] = modified_tools
                    if enable_logging:
                        logger.debug(f"Modified tools: {modified_tools}")
                except Exception as e:
                    logger.error(f"Error modifying tools: {e}")

            # Call original method
            return original_method(*args, **kwargs)

        return wrapper

    return decorator


def apply_bedrock_decorator(
    llm: ChatBedrockConverse,
    message_modifier: Callable[[list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    system_modifier: Callable[[list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    tools_modifier: Callable[[list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    enable_logging: bool = True,
) -> ChatBedrockConverse:
    """
    Add decorators to client.converse and client.converse_stream methods of ChatBedrockConverse instance

    Args:
        llm: ChatBedrockConverse instance
        message_modifier: Function to modify messages parameter
        system_modifier: Function to modify system parameter
        enable_logging: Whether to enable logging

    Returns:
        Modified ChatBedrockConverse instance
    """

    if not hasattr(llm, "client") or llm.client is None:
        raise ValueError(
            "ChatBedrockConverse instance does not have initialized client"
        )

    # Create decorator
    decorator = create_message_modifier_decorator(
        message_modifier=message_modifier,
        system_modifier=system_modifier,
        tools_modifier=tools_modifier,
        enable_logging=enable_logging,
    )

    # Save original methods
    original_converse = llm.client.converse
    original_converse_stream = llm.client.converse_stream

    # Apply decorator
    llm.client.converse = decorator(original_converse)
    llm.client.converse_stream = decorator(original_converse_stream)

    if enable_logging:
        logger.info("Successfully added decorator to ChatBedrockConverse client")

    return llm


def restore_original_methods(llm: ChatBedrockConverse) -> ChatBedrockConverse:
    """
    Restore original methods of ChatBedrockConverse instance

    Args:
        llm: ChatBedrockConverse instance

    Returns:
        Restored ChatBedrockConverse instance
    """

    if not hasattr(llm, "client") or llm.client is None:
        raise ValueError(
            "ChatBedrockConverse instance does not have initialized client"
        )

    # Check if there are decorated methods
    if hasattr(llm.client.converse, "__wrapped__"):
        llm.client.converse = llm.client.converse.__wrapped__

    if hasattr(llm.client.converse_stream, "__wrapped__"):
        llm.client.converse_stream = llm.client.converse_stream.__wrapped__

    logger.info("Successfully restored original methods of ChatBedrockConverse client")

    return llm


# Predefined model cache configurations
# link: https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
MODEL_CACHE_CONFIGS = {
    "anthropic.claude-opus-4-20250514-v1:0": {
        "min_tokens": 1024,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages", "tools"],
    },
    "anthropic.claude-sonnet-4-20250514-v1:0": {
        "min_tokens": 1024,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages", "tools"],
    },
    "anthropic.claude-3-7-sonnet-20250219-v1:0": {
        "min_tokens": 1024,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages", "tools"],
    },
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0": {
        "min_tokens": 1024,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages", "tools"],
    },
    "anthropic.claude-3-5-haiku-20241022-v1:0": {
        "min_tokens": 2048,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages", "tools"],
    },
    "anthropic.claude-3-5-sonnet-20241022-v2:0": {
        "min_tokens": 1024,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages", "tools"],
    },
    "amazon.nova-micro-v1:0": {
        "min_tokens": 1000,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages"],
    },
    "amazon.nova-lite-v1:0": {
        "min_tokens": 1000,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages"],
    },
    "amazon.nova-pro-v1:0": {
        "min_tokens": 1000,
        "max_checkpoints": 4,
        "supported_fields": ["system", "messages"],
    },
}


def get_model_cache_config(model_id: str) -> dict[str, Any] | None:
    """
    Get cache configuration for a model

    Args:
        model_id: Model ID

    Returns:
        Model cache configuration, returns None if not supported
    """
    return MODEL_CACHE_CONFIGS.get(model_id)


def is_cache_supported(model_id: str) -> bool:
    """
    Check if model supports prompt caching

    Args:
        model_id: Model ID

    Returns:
        Whether caching is supported
    """
    return model_id in MODEL_CACHE_CONFIGS


def create_cache_modifier(
    model_id: str,
) -> tuple[
    Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
    Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
    Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
]:
    """
    Create cache modifier
    """
    cache_config = get_model_cache_config(model_id)

    system_modifier, message_modifier, tools_modifier = None, None, None
    if not cache_config:
        return system_modifier, message_modifier, tools_modifier

    if "system" in cache_config.get("supported_fields", []):

        def system_modifier(x):
            if x:
                x = x + [{"cachePoint": {"type": "default"}}]
            return x

    if "tools" in cache_config.get("supported_fields", []):

        def tools_modifier(x: list[dict[str, Any]]) -> list[dict[str, Any]]:
            return x + [{"cachePoint": {"type": "default"}}]

    # Ignore messages

    return system_modifier, message_modifier, tools_modifier
