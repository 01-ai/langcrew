"""LangCrew Web module for HTTP server and adapters.

This module provides a clean API for web integration with LangCrew.
The main entry points are the factory functions that create properly
configured adapters and handlers.
"""

from ..utils.message_utils import generate_message_id
from .adapter import LangGraphAdapter
from .factory import create_message_generator, create_sse_handler
from .http_server import AdapterServer, create_langgraph_server, create_server
from .protocol import (
    ChatRequest,
    MessageType,
    StepStatus,
    StopRequest,
    StreamMessage,
    TaskExecutionStatus,
    TaskInput,
    ToolResult,
)
from .tool_display import ToolDisplayManager

__all__ = [
    # Factory functions (recommended API)
    "create_sse_handler",
    "create_message_generator",
    # HTTP Server
    "AdapterServer",
    "create_server",
    "create_langgraph_server",
    # LangGraph Adapter (for advanced usage)
    "LangGraphAdapter",
    # Protocol types
    "ChatRequest",
    "StopRequest",
    "TaskInput",
    "StreamMessage",
    "MessageType",
    "TaskExecutionStatus",
    "StepStatus",
    "ToolResult",
    "generate_message_id",
    # Tool display
    "ToolDisplayManager",
]
