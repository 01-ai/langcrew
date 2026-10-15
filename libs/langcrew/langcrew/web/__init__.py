"""LangCrew Web - HTTP streaming for crews and compiled graphs."""

from ..utils.message_utils import generate_message_id
from .adapter import LangGraphAdapter
from .citation import attach_citation_sources_to_request
from .http_server import create_langgraph_server, create_server
from .protocol import (
    Action,
    ChatRequest,
    MessageType,
    Request,
    RequestType,
    StepStatus,
    StopRequest,
    StreamMessage,
    TaskExecutionStatus,
    TaskInput,
    ToolResult,
)
from .server import AdapterServer
from .tool_display import ToolDisplayManager

__all__ = [
    # Standalone deployment
    "create_server",
    "create_langgraph_server",
    # Core server (for integration)
    "AdapterServer",
    # Advanced
    "LangGraphAdapter",
    # Protocol
    "Request",  # Primary request class
    "ChatRequest",  # Backward compatibility alias
    "StopRequest",
    "TaskInput",  # Deprecated, use Request instead
    "StreamMessage",
    "Action",
    "MessageType",
    "RequestType",
    "TaskExecutionStatus",
    "StepStatus",
    "ToolResult",
    # Tool display
    "ToolDisplayManager",
    # Utils
    "generate_message_id",
    "attach_citation_sources_to_request",
]
