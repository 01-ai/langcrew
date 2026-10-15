"""
Widget Tool Factory

This module provides factory functions for creating widget display tools.
Widgets are converted to LangChain tools that can be used by agents.
"""

import logging
from typing import ClassVar

import jsonschema
from langchain_core.runnables.config import RunnableConfig
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


def create_widget_tool(
    widget,
    description: str | None = None,
    name: str | None = None,
) -> BaseTool:
    """
    Create a dedicated widget display tool from a Widget object.

    This function converts a Widget object into a LangChain BaseTool
    that can be added to an agent's tools list. When the LLM calls this tool, it should
    generate data matching the widget's JSON schema, which will then be rendered
    and displayed to the user.

    Args:
        widget: Widget object (required)
        description: Tool description for LLM to decide when to use this tool.
                    This is REQUIRED because widget files don't contain usage descriptions.
        name: Optional custom tool name. If not provided, auto-generated from widget name

    Returns:
        BaseTool instance that can be added to agent.tools

    Raises:
        ImportError: If ChatKit dependencies are not installed
        ValueError: If widget is not provided or is not a Widget object

    Example:
        >>> from langcrew.widgets import Widget
        >>> widget = Widget.from_file("draftEmail.widget")
        >>> email_tool = create_widget_tool(
        ...     widget=widget,
        ...     description="Compose and send email messages with recipient, subject and body"
        ... )
        >>> agent = Agent(
        ...     name="assistant",
        ...     prompt="You are a helpful assistant",
        ...     tools=[email_tool],
        ...     llm=llm
        ... )
    """
    # Validate inputs
    if widget is None:
        raise ValueError("'widget' parameter is required")

    # Validate widget type (with delayed import)
    try:
        from .formats import Widget as WidgetClass
    except ImportError as e:
        raise ImportError(
            "Widget support requires ChatKit dependencies. "
            "Install with: pip install langcrew[chatkit]"
        ) from e

    if not isinstance(widget, WidgetClass):
        raise TypeError(f"'widget' must be a Widget object, got {type(widget)}")

    # Auto-generate tool name if not provided
    # Prefix with "langcrew_widget_" to avoid conflicts with user-defined tools
    if not name:
        # Convert widget name to valid Python identifier and add widget prefix
        name = f"langcrew_widget_{widget.name.lower().replace(' ', '_')}"
    else:
        # Force widget prefix to avoid naming conflicts if name is provided
        if not name.startswith("langcrew_widget_"):
            name = f"langcrew_widget_{name}"

    # Handle missing description
    if not description:
        logger.warning(
            f"Widget '{widget.name}' has no description. "
            f"Auto-generated description may not be accurate for LLM tool selection. "
            f"Strongly recommend providing description in widget config."
        )
        description = f"Display {widget.name} widget to show structured information"

    # Capture variables before class definition (to avoid Python scoping issues with ClassVar)
    _tool_name = name
    _tool_description = description
    _tool_widget_schema = widget.schema  # Use JSON Schema directly
    _tool_widget = widget

    # Create the tool class dynamically
    class WidgetTool(BaseTool):
        name: ClassVar[str] = _tool_name
        description: str = _tool_description
        args_schema: dict = (
            _tool_widget_schema  # BaseTool natively supports JSON Schema dict
        )

        # Store widget reference
        _widget = _tool_widget

        def _run(self, config: RunnableConfig | None = None, **kwargs) -> str:
            """Synchronous execution (calls async version)"""
            import asyncio

            try:
                return asyncio.run(self._arun(config=config, **kwargs))
            except RuntimeError:
                # If already in event loop, raise helpful error
                raise RuntimeError(
                    f"Widget tool '{_tool_name}' requires async execution. "
                    f"Use ainvoke() instead of invoke() when calling from async context."
                )

        async def _arun(self, config: RunnableConfig | None = None, **kwargs) -> str:
            """Asynchronous execution"""
            # Import helpers (delayed import)
            try:
                from chatkit.widgets import WidgetRoot
                from pydantic import TypeAdapter

                from . import stream_widget
            except ImportError as e:
                raise ImportError(
                    "Widget support requires ChatKit dependencies. "
                    "Install with: pip install langcrew[chatkit]"
                ) from e

            # 1. Validate data against widget schema
            try:
                jsonschema.validate(kwargs, self._widget.schema)
            except jsonschema.ValidationError as e:
                raise ValueError(
                    f"Data validation failed for widget '{self._widget.name}':\n\n{e}\n\n"
                    f"Received data: {kwargs}"
                ) from e

            # 2. Render widget UI to dict
            try:
                rendered_dict = self._widget.render(kwargs)
            except Exception as e:
                raise ValueError(
                    f"Widget rendering failed for {self._widget.name}: {e}. "
                    f"Input data: {kwargs}"
                )

            # 3. Convert dict to WidgetRoot (type-safe validation)
            try:
                adapter = TypeAdapter(WidgetRoot)
                widget_root = adapter.validate_python(rendered_dict)
            except Exception as e:
                raise ValueError(
                    f"Widget data validation failed for {self._widget.name}. "
                    f"The rendered output doesn't conform to ChatKit WidgetRoot schema: {e}"
                )

            # 4. Stream widget to frontend
            # config is explicitly passed as parameter (can be None)
            try:
                await stream_widget(config, widget_root)
            except Exception as e:
                raise ValueError(
                    f"Failed to send {self._widget.name} widget to frontend: {e}"
                )

            return ""

    return WidgetTool()
