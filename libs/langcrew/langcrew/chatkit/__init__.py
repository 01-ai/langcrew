"""
LangCrew ChatKit Compatibility Layer

Provides OpenAI ChatKit-compatible features for building interactive chat applications:
- Widgets: UI components rendered in the chat (optional, requires chatkit package)
- Client Tools: Agent can trigger client-side operations

This module unifies Widget and Client Tool functionality into a cohesive
ChatKit-compatible layer for LangCrew.

Quick Start:
    ```python
    from langcrew import Agent
    from langcrew.chatkit import (
        # Client Tools (always available)
        create_client_tool,

        # Widgets (requires: pip install langcrew[chatkit])
        Card, Text, Button,
        stream_widget,
    )

    # Create client tool
    get_location = create_client_tool(
        name="get_location",
        description="Get user location",
        wait_for_result=True,
    )

    # Create agent with client tool
    agent = Agent(tools=[get_location])

    # For custom action handling, subclass AdapterServer:
    from langcrew.web import AdapterServer

    class MyServer(AdapterServer):
        async def on_action(self, action, session_id, **kwargs):
            if action.type == "refresh":
                # Handle action and forward to agent
                data = await self.fetch_data()
                async for msg in self.adapter.stream(
                    content=f"Refreshed: {data}",
                    session_id=session_id,
                ):
                    yield msg
    ```

For detailed documentation, see:
- Widgets: langcrew.chatkit.widgets
- Client Tools: langcrew.chatkit.client_tools
- Actions: langcrew.web.AdapterServer.on_action()
"""

# ========== Client Tools (always available) ==========
from .client_tools import create_client_tool, trigger_client_tool_call

# ========== Widgets (optional) ==========
# Try to import widgets, but don't fail if chatkit package is not installed
_widgets_available = False
try:
    from .widgets import *  # noqa: F401, F403

    _widgets_available = True
except ImportError:
    # Widgets require chatkit package: pip install langcrew[chatkit]
    pass

# ========== Define Exports ==========
__all__ = [
    # Client Tools (always available)
    "create_client_tool",
    "trigger_client_tool_call",
]

# Add widgets exports if available
if _widgets_available:
    __all__.extend(
        getattr(
            __import__("langcrew.chatkit.widgets", fromlist=["__all__"]), "__all__", []
        )
    )
