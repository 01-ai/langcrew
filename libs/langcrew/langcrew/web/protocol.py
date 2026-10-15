"""
Protocol definitions for Adapter SDK
"""

import time
from enum import Enum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, Field

from ..controllable import StopReason
from ..utils.message_utils import generate_message_id


class MessageType(str, Enum):
    """Message types for frontend rendering"""

    # ============ System ============
    ERROR = "error"

    CONFIG = "config"
    LIVE_STATUS = "live_status"

    SESSION_INIT = "session_init"
    FINISH_REASON = "finish_reason"

    # ============ Stream Content ============
    TEXT = "text"  # Markdown-rendered text content
    REASONING = "reasoning"
    TOOL_CALL_CHUNK = "tool_call_chunk"
    PLAN = "plan"

    # Not yet implemented:
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    MARKDOWN = "markdown"  # Redundant: TEXT already supports Markdown

    MESSAGE_RESULT = "message_result"

    # ============ Tools ============
    # Server-side
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"

    # Client-side
    CLIENT_TOOL_CALL = "client_tool_call"
    CLIENT_TOOL_RESULT = "client_tool_result"

    # ============ User Interaction ============
    USER_INPUT = "user_input"
    TOOL_APPROVAL_REQUEST = "tool_approval_request"
    MESSAGE_TO_USER = "message_to_user"

    # ============ Widgets ============
    WIDGET = "widget"

    # Out-of-band notice from tools/agents (adispatch on_langcrew_event).
    # Business kind is detail["name"], e.g. computer_use_desktop.
    NOTICE = "notice"

    # ============ Workflow ============
    NODE_START = "node_start"
    NODE_END = "node_end"
    NODE_ERROR = "node_error"


# Stream message protocol
class StreamMessage(BaseModel):
    """
    Stream message for HTTP streaming.

    Fields:
        id: Message ID
        type: Message type (see MessageType enum)
        content: Message content
        detail: Type-specific data (optional)
        role: "user" or "assistant"
        timestamp: Unix timestamp (ms)
        session_id: Session identifier
        response_id: Agent response identifier

    Detail structures vary by type. Common patterns:

    TOOL_CALL: {tool_name, tool_input, tool_call_id}
    TOOL_RESULT: {tool_name, tool_output, tool_call_id}
    CLIENT_TOOL_CALL: {call_id, name, arguments, wait_for_result}
    CLIENT_TOOL_RESULT: {call_id, status}
    USER_INPUT: {interrupt_data: {questions: [{question_id, question,
        question_type?, options?, form_schema?}]}}
        question_type values: text, single_select, multi_select, approval.
        question_id is a stable per-batch index ("q_0", "q_1", ...); the client
        resumes once with a JSON list of {question_id, response} entries.
        Complete lists are reorganized by question_id; partial answers and
        host-enriched file or multimodal content are left for the model to
        interpret. Single-question bare strings remain supported.
        single_select questions always allow one predefined option or a custom answer.
        approval questions resume with string content for approval-button clicks
        (sending the visible button label), or string content for custom text replies.
    WIDGET: {type, item_id, widget}
    NOTICE: {name, ...payload}  # name is the business kind, e.g. computer_use_desktop
    NODE_START: {node_id, node_type, node_label, started_at}
    NODE_END: {node_id, node_type, completed_at, is_workflow_output?, output_parsed?, format?}
    NODE_ERROR: {node_id, error, error_type, failed_at}
    """

    id: str
    type: MessageType
    content: str
    role: str = "assistant"
    detail: dict[str, Any] | None = None
    timestamp: int
    session_id: str | None = None
    response_id: str | None = None
    field_name: str | None = None

    @classmethod
    def create_error(
        cls,
        content: str,
        session_id: str = "",
        response_id: str = "",
        detail: dict[str, Any] | None = None,
    ) -> "StreamMessage":
        """Create error message."""
        return cls(
            id=generate_message_id(),
            type=MessageType.ERROR,
            role="assistant",
            content=content,
            detail=detail if detail is not None else {"error": True},
            session_id=session_id,
            response_id=response_id,
            timestamp=int(time.time() * 1000),
        )

    def to_sse(self) -> str:
        """Format as SSE string."""
        return f"data: {self.model_dump_json()}\n\n"


class TaskExecutionStatus(str, Enum):
    """Task execution status"""

    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    USER_INPUT = "user_input"


class StepStatus(str, Enum):
    """Step status"""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class ToolResult(str, Enum):
    """Tool execution result"""

    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class ClientToolCallStatus(str, Enum):
    """Client tool call status"""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


# ============= Request Type Discriminator =============


class RequestType(str, Enum):
    """Request types for unified execution API"""

    USER_MESSAGE = "user_message"
    CUSTOM_ACTION = "custom_action"
    CLIENT_TOOL_RESULT = "client_tool_result"


def add_default_message_type(value: Any) -> Any:
    """Add default type='user_message' if not present and handle legacy 'message' field."""
    if isinstance(value, dict):
        if "message" in value and "content" not in value:
            value = {**value, "content": value.pop("message")}
        if "type" not in value:
            value = {**value, "type": "user_message"}
    return value


# ============= Action Classes =============


class Action(BaseModel):
    """
    Custom action from frontend.

    Represents user interactions such as button clicks, menu selections,
    widget interactions, or any custom frontend operations.

    Attributes:
        type: Action type identifier for backend routing (e.g., 'refresh_data', 'close_widget')
        payload: Action-specific parameters and data
        label: Optional human-readable label for UI display (e.g., 'Refresh Data', '关闭窗口')

    Example:
        ```python
        {
            "type": "refresh_data",
            "label": "Refresh Data",
            "payload": {"data_id": "123", "force": True}
        }
        ```
    """

    type: str = Field(..., description="Action type identifier")
    payload: dict[str, Any] = Field(
        default_factory=dict, description="Action-specific data"
    )
    label: str | None = Field(None, description="Human-readable label for display")


# ============= Params Classes =============


class CustomActionParams(BaseModel):
    """Parameters for custom action."""

    action: Action


class ClientToolResultParams(BaseModel):
    """Parameters for client tool result."""

    call_id: str
    status: ClientToolCallStatus = ClientToolCallStatus.COMPLETED
    output: dict[str, Any] | None = None


# ============= Base Request =============


class BaseRequest(BaseModel):
    """Base class for all requests."""

    session_id: str | None = None
    is_new_session: bool | None = None
    user_id: str | None = None
    language: str | None = None

    metadata: dict[str, Any] | None = Field(
        None,
        description="Additional metadata for the request (flexible key-value pairs for custom context)",
    )


# ============= Specific Request Classes =============


class UserMessageRequest(BaseRequest):
    """
    User message request.

    Example:
        ```python
        # Modern format
        request = UserMessageRequest(
            type="user_message",
            content="Hello, how are you?",
            session_id="session_123"
        )

        # Simplified (via Request Union)
        {"content": "Hello"}  # type defaults to 'user_message'
        {"message": "Hello"}  # legacy field supported
        ```
    """

    type: Literal[RequestType.USER_MESSAGE] = RequestType.USER_MESSAGE
    content: str | list[dict] = Field(..., description="User message content")
    interrupt_data: dict[str, Any] | None = Field(
        None,
        description=(
            "Interrupt context for resuming execution. "
            "If provided, content is the user's response to the interrupt. "
            "Common types: 'tool_interrupt_before', 'tool_interrupt_after', "
            "'user_input', 'dynamic_form', 'client_tool_call'"
        ),
    )


class CustomActionRequest(BaseRequest):
    """Custom action request. Requires explicit 'type' field."""

    type: Literal[RequestType.CUSTOM_ACTION] = RequestType.CUSTOM_ACTION
    params: CustomActionParams


class ClientToolResultRequest(BaseRequest):
    """Client tool result request. Requires explicit 'type' field."""

    type: Literal[RequestType.CLIENT_TOOL_RESULT] = RequestType.CLIENT_TOOL_RESULT
    params: ClientToolResultParams


# ============= Union Type with Discriminator =============


Request = Annotated[
    Annotated[
        UserMessageRequest | CustomActionRequest | ClientToolResultRequest,
        Field(discriminator="type"),
    ],
    BeforeValidator(add_default_message_type),
]
"""
Unified request type with automatic discrimination.

Supports backward compatibility for user_message:
- {"content": "Hello"} - type defaults to 'user_message'
- {"message": "Hello"} - legacy 'message' field supported

Other types require explicit 'type' field.
"""


# ============= Backward Compatibility =============


# Deprecated aliases (for backward compatibility)
TaskInput = Request
"""Deprecated: Use Request instead. Will be removed in v2.0."""

ChatRequest = Request
"""Deprecated: Use Request instead."""
"""Alias for Request (for backward compatibility)."""


def normalize_stop_reason(value: Any) -> Any:
    """Map the legacy Web default to the canonical stop reason."""
    if value in (None, "", "User stopped"):
        return StopReason.USER_CANCEL
    return value


class StopRequest(BaseModel):
    """Stop execution request."""

    session_id: str
    reason: Annotated[StopReason, BeforeValidator(normalize_stop_reason)] = (
        StopReason.USER_CANCEL
    )


class WidgetEventType(str, Enum):
    """Widget event types"""

    ADDED = "added"
    UPDATE = "update"
    DONE = "done"
    REMOVED = "removed"


class WidgetUpdateType(str, Enum):
    """Widget update types"""

    STREAMING_TEXT_DELTA = "streaming_text_delta"
    COMPONENT_UPDATED = "component_updated"
    ROOT_UPDATED = "root_updated"
