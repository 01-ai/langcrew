"""
Tool display field generator for web frontend.

Generates display fields (action, action_content) based on
tool name and parameters without modifying existing tool definitions.

Usage Examples:
    # Register action only
    ToolDisplayManager.register_action("web_search", {
        "zh": "正在搜索",
        "en": "Searching"
    })

    # Register with parameter extraction
    ToolDisplayManager.register_tool_display(
        "read_file",
        "path",
        {"zh": "读取文件", "en": "Reading file"}
    )

    # Register with custom function
    def extract_query_info(tool_input):
        query = tool_input.get("query", "")
        return query[:30] + "..." if len(query) > 30 else query

    ToolDisplayManager.register_tool_display_with_func(
        "advanced_search",
        extract_query_info,
        {"zh": "智能搜索", "en": "Smart Search"}
    )

    # Batch registration
    ToolDisplayManager.register_actions_batch({
        "tool1": {"zh": "工具1", "en": "Tool 1"},
        "tool2": {"zh": "工具2", "en": "Tool 2"},
    })
"""

from collections.abc import Callable
from typing import Any


class ToolDisplayManager:
    """Manager for tool display fields in web frontend."""

    # Storage for configurations
    _actions: dict[str, dict[str, str]] = {}  # {tool_name: {lang: action}}
    _action_content_params: dict[str, str] = {}
    _action_content_funcs: dict[str, Callable] = {}

    @classmethod
    def register(
        cls,
        tool_name: str,
        display_names: dict[str, str],
        display_content_param: str = None,
    ):
        """Register tool display configuration.

        Args:
            tool_name: Tool name
            display_names: Display names for different languages {"zh": "正在搜索", "en": "Searching"}
            display_content_param: Parameter name to extract for display content (optional)

        Examples:
            # Simple display only
            ToolDisplayManager.register("browser-use", {
                "zh": "使用浏览器",
                "en": "Using browser"
            })

            # With content extraction
            ToolDisplayManager.register("web_search", {
                "zh": "正在搜索",
                "en": "Searching"
            }, display_content_param="query")
        """
        cls._actions[tool_name] = display_names
        if display_content_param:
            cls._action_content_params[tool_name] = display_content_param

    @classmethod
    def register_with_func(
        cls,
        tool_name: str,
        display_names: dict[str, str],
        display_content_func: Callable[[dict[str, Any]], str],
    ):
        """Register tool with custom display content extraction function.

        Args:
            tool_name: Tool name
            display_names: Display names for different languages
            display_content_func: Function to extract display content from tool input

        Examples:
            def extract_query_info(tool_input):
                query = tool_input.get("query", "")
                return query[:30] + "..." if len(query) > 30 else query

            ToolDisplayManager.register_with_func(
                "advanced_search",
                {"zh": "智能搜索", "en": "Smart Search"},
                extract_query_info
            )
        """
        cls._actions[tool_name] = display_names
        cls._action_content_funcs[tool_name] = display_content_func

    @classmethod
    def register_batch(cls, tools: list[dict]):
        """Batch register tools.

        Args:
            tools: List of tool configurations

        Example:
            ToolDisplayManager.register_batch([
                {
                    "name": "web_search",
                    "display_names": {"zh": "正在搜索", "en": "Searching"},
                    "display_content_param": "query"
                },
                {
                    "name": "advanced_search",
                    "display_names": {"zh": "智能搜索", "en": "Smart Search"},
                    "display_content_func": lambda x: x.get("query", "")[:30] + "..."
                },
                {
                    "name": "browser-use",
                    "display_names": {"zh": "使用浏览器", "en": "Using browser"}
                    # no display_content_param/display_content_func = no content extraction
                }
            ])
        """
        for tool_config in tools:
            tool_name = tool_config["name"]
            display_names = tool_config["display_names"]
            display_content_param = tool_config.get("display_content_param")
            display_content_func = tool_config.get("display_content_func")

            if display_content_func:
                cls.register_with_func(tool_name, display_names, display_content_func)
            else:
                cls.register(tool_name, display_names, display_content_param)

    @classmethod
    def get_display(
        cls, tool_name: str, tool_input: dict[str, Any], language: str = None
    ) -> dict[str, str]:
        """Get tool display information.

        Args:
            tool_name: Name of the tool
            tool_input: Tool input parameters
            language: Language to use ('zh' or 'en'). If None, defaults to 'zh'

        Returns:
            Dict with frontend required fields: {"action": "正在搜索", "action_content": "Python教程"}
        """
        if language is None:
            language = "zh"  # Default to Chinese

        action = cls._get_action(tool_name, language)
        action_content = cls._get_action_content(tool_name, tool_input)

        return {
            "action": action,
            "action_content": action_content,
        }

    @classmethod
    def _get_action(cls, tool_name: str, language: str = "zh") -> str:
        """Get action text for specified language."""
        if tool_name in cls._actions:
            actions = cls._actions[tool_name]
            # Priority: specified language -> first available language
            if language in actions:
                return actions[language]
            elif actions:  # If any language available, use the first one
                return next(iter(actions.values()))

        # No registration found, generate default text
        prefix = "正在调用" if language == "zh" else "Calling"
        return f"{prefix} {tool_name}"

    @classmethod
    def _get_action_content(cls, tool_name: str, tool_input: dict[str, Any]) -> str:
        """Extract action content from tool input."""

        # 1. Check custom function
        if tool_name in cls._action_content_funcs:
            try:
                return cls._action_content_funcs[tool_name](tool_input)
            except Exception:
                return ""

        # 2. Check custom parameter name
        if tool_name in cls._action_content_params:
            param_name = cls._action_content_params[tool_name]
            if param_name in tool_input:
                value = tool_input[param_name]
                str_value = str(value)
                return str_value[:50] + "..." if len(str_value) > 50 else str_value

        # 3. No registration found, return empty
        return ""
