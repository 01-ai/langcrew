"""LangGraph Adapter for Web Server.

This adapter directly uses LangGraph's streaming capabilities to provide
real-time updates to web clients via SSE (Server-Sent Events).

Key Features:
- Tool internal event filtering to prevent message stream pollution
- Instance-level session state management
- Comprehensive event handling with proper cleanup
"""

import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any, Optional, Union

from langchain_core.messages import AIMessage
from langchain_core.messages.human import HumanMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command

from ..crew import Crew
from ..utils.language import detect_language
from ..utils.message_utils import generate_message_id
from .protocol import (
    ExecutionInput,
    MessageType,
    PlanAction,
    StepStatus,
    StreamMessage,
    TaskExecutionStatus,
    ToolResult,
)
from .tool_display import ToolDisplayManager

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from langgraph.graph import CompiledStateGraph


class LangGraphAdapter:
    """Adapter that directly uses LangGraph's streaming capabilities."""

    # Define tracked events as class constant
    TRACKED_EVENTS = {
        "on_chat_model_stream",
        "on_chat_model_end",
        "on_chat_model_error",
        "on_llm_error",
        "on_tool_start",
        "on_tool_end",
        "on_tool_error",
        "on_custom_event",
    }

    def __init__(
        self,
        crew: Crew | None = None,
        compiled_graph: Optional["CompiledStateGraph"] = None,
    ):
        """Initialize the adapter with either a Crew or a compiled LangGraph."""
        if crew is None and compiled_graph is None:
            raise ValueError("Either crew or compiled_graph must be provided")

        self.crew = crew
        self.compiled_graph = compiled_graph

        # Instance-level state management - no global state
        self._session_states: dict[str, dict[str, Any]] = {}
        self._active_tool_runs: dict[str, set[str]] = {}

    # ============ Properties ============

    @property
    def executor(self) -> Union[Crew, "CompiledStateGraph"]:
        """Get the executor instance."""
        if self.crew:
            return self.crew
        return self.compiled_graph

    @property
    def checkpointer(self) -> Any:
        """Get checkpointer from executor with proper handling for both types."""
        if self.crew and hasattr(self.crew, "checkpointer"):
            return self.crew.checkpointer
        elif self.compiled_graph:
            # CompiledStateGraph stores checkpointer differently
            return getattr(self.compiled_graph, "checkpointer", None)
        return None

    # ============ Session State Management ============

    def _get_session_state(self, session_id: str) -> dict[str, Any]:
        """Get session state for the given session_id."""
        if session_id not in self._session_states:
            self._session_states[session_id] = {}
        return self._session_states[session_id]

    def _set_session_state(self, session_id: str, key: str, value: Any) -> None:
        """Set a value in session state."""
        if session_id not in self._session_states:
            self._session_states[session_id] = {}
        self._session_states[session_id][key] = value

    def _get_session_value(self, session_id: str, key: str, default: Any = None) -> Any:
        """Get a value from session state."""
        return self._get_session_state(session_id).get(key, default)

    def _delete_session_key(self, session_id: str, key: str) -> None:
        """Delete a key from session state."""
        if session_id in self._session_states:
            self._session_states[session_id].pop(key, None)

    def _cleanup_session_state(self, session_id: str) -> None:
        """Clean up all state for a session."""
        if session_id in self._session_states:
            del self._session_states[session_id]
        if session_id in self._active_tool_runs:
            del self._active_tool_runs[session_id]
        logger.debug(f"Cleaned up all state for session: {session_id}")

    # ============ Tool State Management ============

    def _get_active_tool_runs(self, session_id: str) -> set[str]:
        """Get active tool runs for the given session_id."""
        if session_id not in self._active_tool_runs:
            self._active_tool_runs[session_id] = set()
        return self._active_tool_runs[session_id]

    def _add_active_tool_run(self, session_id: str, run_id: str) -> None:
        """Add an active tool run for a session."""
        if session_id not in self._active_tool_runs:
            self._active_tool_runs[session_id] = set()
        self._active_tool_runs[session_id].add(run_id)

    def _remove_active_tool_run(self, session_id: str, run_id: str) -> None:
        """Remove an active tool run for a session."""
        if session_id in self._active_tool_runs:
            self._active_tool_runs[session_id].discard(run_id)

    # ============ Display Language Management ============

    def _get_session_display_language(
        self,
        session_id: str,
        user_input: str | None = None,
        explicit_language: str | None = None,
    ) -> str:
        """Get session-level display language.

        Priority: explicit_language > cached_language > detected_language > default

        Args:
            session_id: Session identifier
            user_input: User input text for language detection (optional)
            explicit_language: Explicitly specified language (optional)

        Returns:
            Language code ('zh' or 'en')
        """
        # Priority 1: Explicit language specification
        if explicit_language:
            self._set_session_state(session_id, "display_language", explicit_language)
            return explicit_language

        # Priority 2: Cached session language
        cached_language = self._get_session_value(session_id, "display_language")
        if cached_language:
            return cached_language

        # Priority 3: Detect from user input and cache
        if user_input:
            detected_language = detect_language(user_input)
        else:
            detected_language = "en"  # Default to English

        self._set_session_state(session_id, "display_language", detected_language)
        return detected_language

    # ============ Stop Flag Management ============

    async def set_stop_flag(
        self, session_id: str, reason: str = "User requested"
    ) -> bool:
        """Set stop flag for a session."""
        self._set_session_state(session_id, "user_stop", True)
        self._set_session_state(session_id, "stop_reason", reason)
        logger.info(f"Stop flag set for session {session_id}: {reason}")
        return True

    def clear_stop_flag(self, session_id: str) -> None:
        """Clear stop flag for a session."""
        self._delete_session_key(session_id, "user_stop")
        self._delete_session_key(session_id, "stop_reason")
        logger.info(f"Stop flag cleared for session {session_id}")

    # ============ Core Functionality ============

    def _build_config(self, session_id: str, **additional_config) -> RunnableConfig:
        """Build RunnableConfig for LangGraph execution."""
        config = {
            "configurable": {
                "thread_id": session_id,
                **additional_config.get("configurable", {}),
            }
        }

        for key, value in additional_config.items():
            if key != "configurable":
                config[key] = value

        return config

    def _prepare_input(self, execution_input: ExecutionInput):
        """Prepare input data for execution based on execution mode."""
        if execution_input.is_resume:
            return Command(resume=execution_input.user_input)
        else:
            messages = []
            if execution_input.user_input:
                messages.append(HumanMessage(content=execution_input.user_input))
            return {"messages": messages}

    async def _format_sse_message(self, message: StreamMessage) -> str:
        """Format a message for SSE transmission."""
        return f"data: {message.model_dump_json()}\n\n"

    async def execute(
        self, execution_input: ExecutionInput, **config_kwargs
    ) -> AsyncGenerator[str, None]:
        """Unified execution method for both new conversations and resume scenarios."""

        try:
            # ============ 1. INITIALIZATION ============
            # Initialize session-level display language (cached for this session)
            self._get_session_display_language(
                execution_input.session_id,
                execution_input.user_input,
                execution_input.language,
            )

            # Initialize execution state
            task_ended = False
            need_user_input = False
            should_send_messages = True

            # Configure message sending behavior for resume mode
            if execution_input.is_resume:
                interrupt_type = (
                    execution_input.interrupt_data.get("type", "")
                    if execution_input.interrupt_data
                    else ""
                )
                # Only generic interrupts can send messages immediately
                # Tool and user_input interrupts need to wait for completion events to avoid duplicate messages
                should_send_messages = interrupt_type == "generic_interrupt"

            # Prepare input data and configuration
            input_data = self._prepare_input(execution_input)
            config = self._build_config(execution_input.session_id, **config_kwargs)

            # ============ 2. EVENT PROCESSING LOOP ============
            async for event in self.executor.astream_events(
                input=input_data, config=config
            ):
                event_type = event.get("event")
                event_data = event.get("data", {})

                # -------- 2.1 High Priority: Interrupts & State Updates --------

                # Handle LangGraph native node interrupts
                if "chunk" in event_data and "__interrupt__" in event_data["chunk"]:
                    interrupt_message = self._handle_node_interrupt(
                        event_data, event, execution_input.session_id
                    )
                    yield await self._format_sse_message(interrupt_message)

                # Resume mode: enable messages after tool completion events
                if execution_input.is_resume and event_type == "on_custom_event":
                    event_name = event.get("name")
                    if event_name in [
                        "on_langcrew_user_input_completed",
                        "on_langcrew_tool_interrupt_before_completed",
                        "on_langcrew_tool_interrupt_after_completed",
                    ]:
                        logger.info(
                            f"{event_name} for session {execution_input.session_id}. "
                            f"Resuming execution with response: {event.get('data', {})}"
                        )
                        should_send_messages = True

                # -------- 2.2 Termination Conditions --------

                # Check task end conditions - ROOT EVENTS ONLY
                is_root_event = len(event.get("parent_ids", [])) == 0
                if is_root_event:
                    if event_type == "on_chain_end":
                        task_ended = True
                        status = (
                            TaskExecutionStatus.USER_INPUT
                            if need_user_input
                            else TaskExecutionStatus.COMPLETED
                        )
                        reason = (
                            "Waiting for user input"
                            if need_user_input
                            else "Task completed"
                        )
                        async for finish_message in self._handle_finish_signal(
                            execution_input.session_id, reason, status
                        ):
                            yield finish_message
                        break
                    elif event_type == "on_chain_error":
                        task_ended = True
                        error_msg = event.get("data", {}).get("error", "Unknown error")
                        async for finish_message in self._handle_finish_signal(
                            execution_input.session_id,
                            f"Task failed: {error_msg}",
                            TaskExecutionStatus.FAILED,
                        ):
                            yield finish_message
                        break

                # Check stop signal - USER REQUESTED TERMINATION
                if event_type in [
                    "on_tool_end",
                    "on_chat_model_end",
                    "on_custom_event",
                ]:
                    control_data = await self._check_stop_signal(
                        execution_input.session_id
                    )
                    if control_data:
                        task_ended = True
                        async for stop_message in self._handle_stop_signal(
                            control_data, execution_input.session_id
                        ):
                            yield stop_message
                        break

                # -------- 2.3 Regular Event Processing --------

                # Process tracked event types - only send if enabled
                if event_type in self.TRACKED_EVENTS and should_send_messages:
                    message = await self._convert_langgraph_event(
                        event, execution_input.session_id
                    )
                    if message:
                        # Update user input requirement flags
                        if message.type == MessageType.USER_INPUT:
                            need_user_input = True
                            logger.debug("User input needed due to USER_INPUT message")
                        elif message.type == MessageType.TOOL_APPROVAL_REQUEST:
                            need_user_input = True
                            logger.debug(
                                "Tool approval needed due to TOOL_APPROVAL_REQUEST message"
                            )
                        elif (
                            message.type == MessageType.MESSAGE_TO_USER
                            and message.detail.get("intent_type") == "asking_user"
                        ):
                            need_user_input = True

                        # Handle special tool events
                        message = await self._handle_special_tool_events(
                            event, execution_input.session_id, message
                        )
                        if message:
                            yield await self._format_sse_message(message)

            # ============ 3. COMPLETION HANDLING ============

            # Handle abnormal completion
            if not task_ended:
                async for finish_message in self._handle_finish_signal(
                    execution_input.session_id,
                    "Task completed: abnormal end",
                    TaskExecutionStatus.ABNORMAL,
                ):
                    yield finish_message
            elif execution_input.is_resume and task_ended and not need_user_input:
                # Resume mode normal completion
                async for finish_message in self._handle_finish_signal(
                    execution_input.session_id,
                    "Task completed",
                    TaskExecutionStatus.COMPLETED,
                ):
                    yield finish_message

        except Exception as e:
            # ============ 4. ERROR HANDLING ============
            logger.error(f"Execution failed: {e}")
            async for finish_message in self._handle_finish_signal(
                execution_input.session_id, str(e), TaskExecutionStatus.FAILED
            ):
                yield finish_message
        finally:
            # ============ 5. CLEANUP ============
            # Clean up session state
            self._cleanup_session_state(execution_input.session_id)

    async def _convert_langgraph_event(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Convert LangGraph event to StreamMessage with tool internal event filtering.

        This method implements the core tool internal event filtering logic to prevent
        tool-internal LLM calls and other nested events from polluting the message stream.
        """
        event_type = event.get("event")
        run_id = event.get("run_id")
        parent_ids = event.get("parent_ids", [])

        # ============ TOOL INTERNAL EVENT FILTERING LOGIC ============
        active_tools = self._get_active_tool_runs(session_id)

        # Track tool execution state
        if event_type == "on_tool_start":
            self._add_active_tool_run(session_id, run_id)
            logger.debug(f"Tool started: {event.get('name')} (run_id: {run_id})")
        elif event_type == "on_tool_end":
            self._remove_active_tool_run(session_id, run_id)
            logger.debug(f"Tool ended: {event.get('name')} (run_id: {run_id})")
        else:
            # Filter all intermediate events during tool execution
            # If any parent_id matches an active tool's run_id, this is a nested event
            if any(parent_id in active_tools for parent_id in parent_ids):
                logger.debug(
                    f"Filtered tool internal event: {event_type} {event.get('name', '')} "
                    f"(parent_ids: {parent_ids}, active_tools: {active_tools})"
                )
                return None

        # ============ STANDARD EVENT CONVERSION LOGIC ============

        if event_type == "on_chat_model_stream":
            return self._handle_model_stream(event, session_id)

        elif event_type == "on_chat_model_end":
            return self._handle_model_end(event, session_id)

        elif event_type in ["on_chat_model_error", "on_llm_error"]:
            return self._handle_model_error(event, session_id)

        elif event_type == "on_tool_start":
            return self._handle_tool_start(event, session_id)
        elif event_type == "on_tool_end":
            return self._handle_tool_end(event, session_id)

        elif event_type == "on_tool_error":
            return self._handle_tool_error(event, session_id)
        elif event_type == "on_custom_event":
            return self._handle_custom_event(event, session_id)

        return None

    # ============ Helper Methods ============

    def _handle_model_stream(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Handle streaming model output - no content filtering."""
        chunk = event.get("data", {}).get("chunk")
        if not chunk:
            return None

        content = self._extract_content_from_chunk(chunk)
        if not content:
            return None

        detail = {
            "streaming": True,
            "run_id": event.get("run_id"),
        }
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TEXT,
            content=content,
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )

    def _handle_model_end(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Handle model completion - provide complete information with empty content to avoid duplication."""
        output = event.get("data", {}).get("output")
        run_id = event.get("run_id")

        # Initialize default values
        full_content = ""
        tool_calls = []
        usage_metadata = {}
        response_metadata = {}

        # Extract complete information if output exists
        if output:
            message: AIMessage = output
            full_content = self._extract_content(message)
            tool_calls = getattr(message, "tool_calls", [])

            if hasattr(message, "usage_metadata") and message.usage_metadata:
                usage_metadata = message.usage_metadata

            if hasattr(message, "response_metadata") and message.response_metadata:
                response_metadata = message.response_metadata

        # Build detail with essential information
        detail = {
            "run_id": run_id,
            "full_content": full_content,  # Complete content as backup
        }

        # Include tool_calls if they exist
        if tool_calls:
            detail["tool_calls"] = tool_calls

        if usage_metadata:
            detail["usage"] = usage_metadata

        if response_metadata:
            detail["response_metadata"] = response_metadata

        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TEXT,
            content="",  # Empty content to avoid duplication, full content in detail.full_content
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )

    def _handle_model_error(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Handle model errors."""
        error = event.get("data", {}).get("error", "Unknown model error")
        error_message = self._extract_error_message(error)

        detail = {
            "run_id": event.get("run_id"),
            "error": str(error),
            "error_type": type(error).__name__
            if hasattr(error, "__class__")
            else "Unknown",
        }
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.ERROR,
            content=f"Model Error: {error_message}",
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )

    def _handle_tool_start(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Handle tool start events."""
        tool_name = event.get("name")
        if not tool_name:
            return None

        # Skip special tools (business logic, not content judgment)
        if tool_name in ["message_to_user", "user_input"]:
            return None

        tool_input = event.get("data", {}).get("input", {})

        # Get display information
        session_language = self._get_session_display_language(session_id)
        display_fields = ToolDisplayManager.get_display(
            tool_name, tool_input, session_language
        )

        detail = {
            "run_id": event.get("run_id"),
            "tool": tool_name,
            "status": ToolResult.PENDING,
            "param": tool_input,
            "action": display_fields["action"],
            "action_content": display_fields["action_content"],
        }
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TOOL_CALL,
            content=tool_input.get("brief", ""),
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )

    def _handle_tool_end(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Handle tool completion events."""
        tool_name = event.get("name")
        if not tool_name or tool_name in ["user_input"]:
            return None

        tool_input = event.get("data", {}).get("input", {}) or {}
        output = event.get("data", {}).get("output", "")

        detail = {
            "run_id": event.get("run_id"),
            "tool": tool_name,
            "result": output,
            "status": ToolResult.SUCCESS,
        }
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TOOL_RESULT,
            content=tool_input.get("brief", ""),
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )

    def _handle_tool_error(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Handle tool error events."""
        tool_name = event.get("name")
        error = event.get("data", {}).get("error", "Unknown tool error")
        error_message = self._extract_error_message(error)

        detail = {
            "run_id": event.get("run_id"),
            "tool": tool_name,
            "status": ToolResult.FAILED,
            "output": error_message,
            "error": error_message,
            "error_type": type(error).__name__
            if hasattr(error, "__class__")
            else "Unknown",
        }
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TOOL_RESULT,
            content=error_message,
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )
