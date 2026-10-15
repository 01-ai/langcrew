"""Tool display field generator with i18n support for concurrent requests.

Stores i18n keys and translates in real-time based on request context,
preventing language interference in concurrent scenarios.

Usage:
    # Setup at startup
    ToolDisplayManager.set_translate_function(t)

    # Register tools
    ToolDisplayManager.register("web_search", "agent.tool.display.web_search")

    # Get translated display
    display = ToolDisplayManager.get_display("web_search", {"query": "Python"})
"""

import inspect
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class ToolDisplayConfig:
    """Tool display configuration."""

    display_name_i18n_key: str  # I18n key for display name
    content_param: str | None = None  # Parameter to extract for content
    content_func: Callable[[dict[str, Any]], str] | None = None  # Custom extractor


class ToolDisplayManager:
    """Manager for tool display with concurrent-safe i18n support."""

    _configs: dict[str, ToolDisplayConfig] = {}  # tool_name -> config
    _translate_func: Callable[[str], str] | None = None  # Translation function
    DEFAULT_CALLING_I18N_KEY = "Calling"  # Default i18n key for unregistered tools

    @classmethod
    def set_translate_function(cls, func: Callable[[str], str]) -> None:
        """Set translation function (call once at startup).

        Args:
            func: Function that translates i18n key to text based on current context.
        """
        cls._translate_func = func

    @classmethod
    def register(
        cls,
        tool_name: str,
        display_name_i18n_key: str,
        content_param: str | None = None,
        content_func: Callable[[dict[str, Any]], str] | None = None,
    ) -> None:
        """Register tool with i18n key (not translated text).

        Args:
            tool_name: Tool name
            display_name_i18n_key: I18n key (e.g., "agent.tool.display.web_search")
            content_param: Parameter name for content extraction
            content_func: Custom content extractor function
        """
        cls._configs[tool_name] = ToolDisplayConfig(
            display_name_i18n_key=display_name_i18n_key,
            content_param=content_param,
            content_func=content_func,
        )

    @classmethod
    def register_batch(cls, tools: list[dict]) -> None:
        """Batch register tools.

        Args:
            tools: List of dicts with 'name', 'display_name_i18n_key', etc.
        """
        for config in tools:
            cls.register(
                tool_name=config["name"],
                display_name_i18n_key=config["display_name_i18n_key"],
                content_param=config.get("content_param"),
                content_func=config.get("content_func"),
            )

    @classmethod
    def get_display(
        cls,
        tool_name: str,
        tool_input: dict[str, Any],
        ext: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        """Get display info with real-time translation based on current context.

        Args:
            tool_name: Tool name
            tool_input: Tool input parameters
            ext: Extra information

        Returns:
            {"action": "translated_text", "action_content": "extracted_content"}
        """
        action = cls._get_action(tool_name)
        action_content = cls._get_action_content(tool_name, tool_input, ext)

        return {
            "action": action,
            "action_content": action_content,
        }

    @classmethod
    def _get_action(cls, tool_name: str) -> str:
        """Get translated action text (registered tool or default "Calling {tool_name}")."""
        if tool_name in cls._configs:
            i18n_key = cls._configs[tool_name].display_name_i18n_key
            return cls._translate(i18n_key)

        calling_text = cls._translate(cls.DEFAULT_CALLING_I18N_KEY)
        return f"{calling_text} {tool_name}"

    @classmethod
    def _get_action_content(
        cls,
        tool_name: str,
        tool_input: dict[str, Any],
        ext: dict[str, Any] | None = None,
    ) -> str:
        """Extract content using custom func or param name (truncated to 50 chars)."""
        if tool_name not in cls._configs:
            return ""

        config = cls._configs[tool_name]

        # Try custom function
        if config.content_func:
            try:
                sig = inspect.signature(config.content_func)
                if "ext" in sig.parameters:
                    return config.content_func(tool_input, ext=ext)
                else:
                    return config.content_func(tool_input)
            except Exception:
                return ""

        # Try parameter extraction
        if config.content_param and config.content_param in tool_input:
            value = str(tool_input[config.content_param])
            return value[:50] + "..." if len(value) > 50 else value

        return ""

    @classmethod
    def _translate(cls, i18n_key: str) -> str:
        """Translate i18n key using injected function (fallback to key if fails)."""
        if cls._translate_func:
            try:
                return cls._translate_func(i18n_key)
            except Exception:
                pass
        return i18n_key
