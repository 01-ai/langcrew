"""
ChatKit Widget components for LangCrew.

This module provides ChatKit widget support with graceful fallback when ChatKit
dependencies are not available.

Install ChatKit dependencies with: pip install langcrew[chatkit]

Example - Basic Widget:
    ```python
    from langcrew.chatkit import Card, Text, Button, stream_widget
    from langchain_core.tools import tool
    from langchain_core.runnables.config import RunnableConfig

    @tool
    async def show_weather(city: str, config: RunnableConfig):
        '''Show weather information as a widget'''
        widget = Card(
            children=[
                Text(value=f"Weather in {city}", size="lg"),
                Text(value="Temperature: 25°C"),
                Button(label="Refresh"),
            ]
        )
        await stream_widget(config, widget)
        return f"Weather widget displayed for {city}"
    ```
"""

# ===== Always-available imports (LangCrew-specific helpers) =====
from .helpers import remove_widget, replace_widget, stream_widget  # noqa: E402
from .formats import Widget  # noqa: E402
from .tool_factory import create_widget_tool  # noqa: E402

# ===== ChatKit widget components (optional) =====
# Try to import ChatKit widget components if available
_chatkit_exports = []

try:
    import inspect
    from chatkit import widgets as _chatkit_widgets
    from pydantic import BaseModel

    # Automatically import all ChatKit widget components
    for _name in dir(_chatkit_widgets):
        # Skip private members
        if _name.startswith("_"):
            continue

        _obj = getattr(_chatkit_widgets, _name)

        # Only import classes (mainly Pydantic models)
        if inspect.isclass(_obj):
            # Additional filter: only BaseModel subclasses (all widgets are BaseModel)
            try:
                if issubclass(_obj, BaseModel):
                    globals()[_name] = _obj
                    _chatkit_exports.append(_name)
            except TypeError:
                # Not a class that can be checked with issubclass, skip
                pass

    # Import essential type aliases for type hints
    for _name in ["WidgetRoot", "WidgetComponent", "Series"]:
        if hasattr(_chatkit_widgets, _name):
            _obj = getattr(_chatkit_widgets, _name)
            globals()[_name] = _obj
            _chatkit_exports.append(_name)

    # Cleanup temporary variables (keep BaseModel to avoid AttributeError during star imports)
    del _chatkit_widgets, _name, _obj, inspect

except ImportError:
    # ChatKit widgets package not installed - that's okay
    # Users can still use Widget, stream_widget, etc.
    pass

# ===== Define exports =====
__all__ = [
    # All ChatKit widgets (automatically populated if chatkit package is installed)
    *_chatkit_exports,
    # LangCrew helpers (always available)
    "stream_widget",
    "remove_widget",
    "replace_widget",
    # Widget class (always available)
    "Widget",
    # Widget tool factory (always available)
    "create_widget_tool",
]
