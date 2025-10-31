"""LangGraph Adapter for Web Server.

This adapter directly uses LangGraph's streaming capabilities to provide
real-time updates to web clients via SSE (Server-Sent Events).

Key Features:
- Tool internal event filtering to prevent message stream pollution
- Near-stateless design with minimal stop control state
- Task-level execution control (stop flags, etc.)
- Comprehensive event handling with proper cleanup
"""

import json
import logging
import os
import time
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any, Optional, Union

from langchain_core.messages import AIMessage, AIMessageChunk, ToolMessage
from langchain_core.messages.human import HumanMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command
from opentelemetry import trace

from ..crew import Crew
from ..utils.language import detect_language
from ..utils.message_utils import generate_message_id
from .protocol import (
    MessageType,
    StepStatus,
    StreamMessage,
    TaskExecutionStatus,
    TaskInput,
    ToolResult,
)
from .tool_display import ToolDisplayManager

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from langgraph.graph import CompiledStateGraph


class LangGraphAdapter:
    """Adapter that directly uses LangGraph's streaming capabilities"""

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

        self._session_stop_flags: dict[str, dict[str, Any]] = (
            {}
        )  # session_id -> stop_info
        self._functon_call_stream: bool = os.getenv("LANGCREW_FUNCTION_CALL_STREAM", "false").lower() == "true"
        logger.info(f"LANGCREW_FUNCTION_CALL_STREAM: {self._functon_call_stream}")
    

    # ============ PROPERTIES ============

    @property
    def executor(self) -> Union[Crew, "CompiledStateGraph"]:
        """Get the executor instance."""
        if self.crew:
            return self.crew
        return self.compiled_graph

    # ============ TASK EXECUTION CONTROL ============

    def _get_task_id(self, task_input: TaskInput) -> str:
        """Generate a unique task ID for this execution."""
        # Use complete session_id + timestamp suffix for task-level control
        timestamp = int(time.time() * 1000)
        timestamp_suffix = str(timestamp)[-6:]  # 取时间戳后6位
        return f"{task_input.session_id}_{timestamp_suffix}"

    async def set_stop_flag(
        self, session_id: str, reason: str = "User stopped"
    ) -> bool:
        """Set stop flag for a specific session."""
        self._session_stop_flags[session_id] = {
            "stop_requested": True,
            "stop_reason": reason,
            "timestamp": int(time.time() * 1000),
        }
        logger.info(f"Stop flag set for session {session_id}: {reason}")
        return True

    def _get_stop_flag(self, session_id: str) -> dict[str, Any] | None:
        """Get stop flag for a specific session."""
        return self._session_stop_flags.get(session_id)

    def _clear_stop_flag(self, session_id: str) -> None:
        """Clear stop flag for a specific session."""
        if session_id in self._session_stop_flags:
            del self._session_stop_flags[session_id]
            logger.info(f"Stop flag cleared for session {session_id}")

    # ============ LANGUAGE MANAGEMENT ============

    def _get_display_language(
        self,
        message: str | None = None,
        explicit_language: str | None = None,
    ) -> str:
        """Get display language (stateless).

        Priority: explicit_language > detected_language > default

        Args:
            message: User message text for language detection (optional)
            explicit_language: Explicitly specified language (optional)

        Returns:
            Language code ('zh' or 'en')
        """
        # Priority 1: Explicit language specification
        if explicit_language:
            return explicit_language

        # Priority 2: Detect from user message
        if message:
            return detect_language(message)

        # Priority 3: Default to English
        return "en"

    # ============ CORE EXECUTION LOGIC ============

    def _build_config(
        self,
        session_id: str,
        user_id: str | None = None,
        config: RunnableConfig | None = None,
    ) -> RunnableConfig:
        """Build RunnableConfig for LangGraph execution.

        Args:
            session_id: Session identifier used as thread_id
            user_id: User identifier for long-term memory (None disables user-specific memory)
            config: Optional RunnableConfig for advanced users

        Returns:
            RunnableConfig with session_id and user_id properly set
        """
        if config:
            # Advanced users provide RunnableConfig, ensure session_id and user_id are set
            result_config = config.copy() if hasattr(config, "copy") else dict(config)
            if "configurable" not in result_config:
                result_config["configurable"] = {}
            result_config["configurable"]["thread_id"] = session_id
            if user_id:  # Only set if user_id is not None and not empty
                result_config["configurable"]["user_id"] = user_id
            return result_config

        # Default configuration for normal users
        config_dict = {"configurable": {"thread_id": session_id}}
        if user_id:  # Only set if user_id is not None and not empty
            config_dict["configurable"]["user_id"] = user_id
        return config_dict

    def _prepare_input(self, task_input: TaskInput):
        """Prepare input data for execution based on execution mode."""
        if task_input.is_resume:
            return Command(resume=task_input.message)
        else:
            messages = []
            if task_input.message:
                messages.append(HumanMessage(content=task_input.message))
            return {"messages": messages}

    def _format_sse_message(self, message: StreamMessage) -> str:
        """Format a message for SSE transmission."""
        return f"data: {message.model_dump_json()}\n\n"

    async def execute(
        self, task_input: TaskInput, config: RunnableConfig | None = None
    ) -> AsyncGenerator[str, None]:
        """Unified execution method for both new conversations and resume scenarios."""

        try:
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span("super_agent_start") as span:
                # ============ 1. INITIALIZATION ============
                # Local execution state (no instance state)
                executing_tools: set[str] = set()  # Tool internal event filtering
                task_ended = False
                need_user_input = False
                should_send_messages = True

                # Generate unique task ID for this execution
                task_id = self._get_task_id(task_input)
                span.set_attribute("agentops.tags", [task_input.session_id, task_id])

                # Log task start with context
                logger.info(
                    f"Starting execution for session {task_input.session_id}, task {task_id}"
                )

                # Get display language (stateless)
                display_language = self._get_display_language(
                    task_input.message,
                    task_input.language,
                )

                # Configure message sending behavior for resume mode
                if task_input.is_resume:
                    interrupt_type = (
                        task_input.interrupt_data.get("type", "")
                        if task_input.interrupt_data
                        else ""
                    )
                    # Only generic interrupts can send messages immediately
                    # Tool and user_input interrupts need to wait for completion events to avoid duplicate messages
                    should_send_messages = interrupt_type == "generic_interrupt"

                # Prepare input data and configuration
                input_data = self._prepare_input(task_input)
                config = self._build_config(
                    task_input.session_id, task_input.user_id, config
                )

                # ============ 2. EVENT PROCESSING LOOP ============
                async for event in self.executor.astream_events(
                    input=input_data, config=config
                ):
                    event_type = event.get("event")
                    # -------- 2.1 Stop Flag Check --------
                    # Check stop signal at the beginning of each event processing
                    control_data = self._get_stop_flag(task_input.session_id)
                    if control_data or event_type == TaskExecutionStatus.CANCELLED:
                        task_ended = True
                        stop_reason = (
                            control_data.get("stop_reason", "User requested")
                            if control_data
                            else "User requested"
                        )
                        yield self._handle_finish_signal(
                            task_input.session_id,
                            task_id,
                            stop_reason,
                            TaskExecutionStatus.CANCELLED,
                        )
                        break

                    event_data = event.get("data", {})

                    # -------- 2.2 High Priority: Interrupts & State Updates --------

                    # Handle LangGraph native node interrupts
                    if (
                        "chunk" in event_data
                        and event_data["chunk"]
                        and "__interrupt__" in event_data["chunk"]
                    ):
                        chunk_data = event_data.get("chunk", {})
                        interrupt_obj = chunk_data.get("__interrupt__")

                        # Skip tool interrupts and user_input interrupts
                        if interrupt_obj:
                            interrupt_type = None

                            # Extract interrupt type from various possible structures
                            if (
                                isinstance(interrupt_obj, tuple)
                                and len(interrupt_obj) > 0
                            ):
                                # LangGraph Interrupt objects in tuple
                                first_interrupt = interrupt_obj[0]
                                if hasattr(first_interrupt, "value") and isinstance(
                                    first_interrupt.value, dict
                                ):
                                    interrupt_type = first_interrupt.value.get("type")
                            elif isinstance(interrupt_obj, dict):
                                # Direct dict format
                                interrupt_type = interrupt_obj.get("type")

                            if interrupt_type in [
                                "tool_interrupt_before",
                                "tool_interrupt_after",
                                "user_input",
                                "dynamic_form",
                            ]:
                                continue  # Don't send generic interrupt message

                        interrupt_message = self._handle_node_interrupt(
                            event_data, task_input.session_id, task_id
                        )
                        yield self._format_sse_message(interrupt_message)

                    # Resume mode: enable messages after tool completion events
                    if (
                        task_input.is_resume
                        and not should_send_messages
                        and event_type == "on_custom_event"
                    ):
                        event_name = event.get("name")
                        if event_name in [
                            "on_langcrew_user_input_completed",
                            "on_langcrew_tool_interrupt_before_completed",
                            "on_langcrew_tool_interrupt_after_completed",
                        ]:
                            logger.info(
                                f"{event_name} for session {task_input.session_id}. "
                                f"Resuming execution with response: {event.get('data', {})}"
                            )
                            should_send_messages = True

                    # -------- 2.3 Termination Conditions --------

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
                            yield self._handle_finish_signal(
                                task_input.session_id, task_id, reason, status
                            )
                            break
                        elif event_type == "on_chain_error":
                            task_ended = True
                            error_msg = event.get("data", {}).get(
                                "error", "Unknown error"
                            )
                            yield self._handle_finish_signal(
                                task_input.session_id,
                                task_id,
                                f"Task failed: {error_msg}",
                                TaskExecutionStatus.FAILED,
                            )
                            break

                    # -------- 2.4 Tool Internal Event Filtering --------

                    # Extract event metadata for filtering
                    run_id = event.get("run_id")
                    parent_ids = event.get("parent_ids", [])

                    # Track tool execution state
                    if event_type == "on_tool_start":
                        executing_tools.add(run_id)
                        logger.debug(
                            f"Tool execution started: {event.get('name')} "
                            f"(session: {task_input.session_id}, task: {task_id}, run_id: {run_id})"
                        )
                    elif event_type == "on_tool_end":
                        executing_tools.discard(run_id)
                        logger.debug(
                            f"Tool execution ended: {event.get('name')} "
                            f"(session: {task_input.session_id}, task: {task_id}, run_id: {run_id})"
                        )
                    elif any(parent_id in executing_tools for parent_id in parent_ids):
                        # Filter tool internal events
                        logger.debug(
                            f"Filtered tool internal event: {event_type} {event.get('name', '')} "
                            f"(session: {task_input.session_id}, task: {task_id}, "
                            f"parent_ids: {parent_ids}, executing_tools: {executing_tools})"
                        )
                        continue

                    # -------- 2.5 Regular Event Processing --------

                    # Process tracked event types - only send if enabled
                    if event_type in self.TRACKED_EVENTS and should_send_messages:
                        message = await self._convert_langgraph_event(
                            event, task_input.session_id, display_language, task_id
                        )
                        if message:
                            # Update user input requirement flags
                            if message.type == MessageType.USER_INPUT:
                                need_user_input = True
                                logger.debug(
                                    "User input needed due to USER_INPUT message"
                                )
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
                            message.trace_id = f"{span.get_span_context().trace_id:x}"
                            yield self._format_sse_message(message)

                # ============ 3. COMPLETION HANDLING ============

                # Handle abnormal completion
                if not task_ended:
                    yield self._handle_finish_signal(
                        task_input.session_id,
                        task_id,
                        "Task completed: abnormal end",
                        TaskExecutionStatus.FAILED,
                    )

        except Exception as e:
            # ============ 4. ERROR HANDLING ============
            logger.exception(f"Execution failed: {e}")
            yield self._handle_finish_signal(
                task_input.session_id, task_id, str(e), TaskExecutionStatus.FAILED
            )
        finally:
            # ============ 5. CLEANUP ============
            # Clear session-specific stop flag
            self._clear_stop_flag(task_input.session_id)
            logger.info(
                f"Task cleanup completed for session {task_input.session_id}, task {task_id}"
            )

    # ============ EVENT PROCESSING ============

    async def _convert_langgraph_event(
        self,
        event: dict[str, Any],
        session_id: str,
        display_language: str,
        task_id: str,
    ) -> StreamMessage | None:
        """Convert LangGraph event to StreamMessage (stateless).

        Tool internal event filtering is now handled in the main execute loop.
        """
        event_type = event.get("event")

        # ============ STANDARD EVENT CONVERSION LOGIC ============

        if event_type == "on_chat_model_stream":
            return self._handle_model_stream(event, session_id, task_id)
        elif event_type == "on_chat_model_end":
            return self._handle_model_end(event, session_id, task_id)
        elif event_type == "on_chat_model_error":
            return self._handle_model_error(event, session_id, task_id)
        elif event_type == "on_tool_start":
            return self._handle_tool_start(event, session_id, task_id, display_language)
        elif event_type == "on_tool_end":
            return self._handle_tool_end(event, session_id, task_id)
        elif event_type == "on_tool_error":
            return self._handle_tool_error(event, session_id, task_id)
        elif event_type == "on_custom_event":
            return self._handle_custom_event(
                event, session_id, task_id, display_language
            )

        return None

    # ============ EVENT HANDLERS ============

    def _handle_model_stream(
        self, event: dict[str, Any], session_id: str, task_id: str
    ) -> StreamMessage | None:
        """Handle streaming model output - no content filtering."""
        chunk = event.get("data", {}).get("chunk")
        if not chunk:
            return None

        content = self._extract_content_from_chunk(chunk)
        if content:
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
                task_id=task_id,
                field_name="content",
            )
        elif self._functon_call_stream and isinstance(chunk, AIMessageChunk) and hasattr(chunk, "tool_call_chunks"):
            for tool_call_chunk in chunk.tool_call_chunks:
                return StreamMessage(
                    id=generate_message_id(),
                    type=MessageType.TOOL_CALL_CHUNK,
                    field_name="detail.name" if tool_call_chunk.get("name") else "detail.args",
                    content="",
                    detail={
                        "streaming": True,
                        "run_id": event.get("run_id"),
                        "tool_call_id": tool_call_chunk.get("id"),
                        "args": tool_call_chunk.get("args"),
                        "name": tool_call_chunk.get("name"),
                        "index": tool_call_chunk.get("index"),
                    },
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,  
                    task_id=task_id,
                )
        return None

    def _handle_model_end(
        self, event: dict[str, Any], session_id: str, task_id: str
    ) -> StreamMessage | None:
        """Handle model completion - provide complete information with empty content to avoid duplication."""
        output = event.get("data", {}).get("output")
        run_id = event.get("run_id")

        # Initialize default values
        full_content = ""
        tool_calls = []
        usage_metadata = {}
        # response_metadata = {}

        # Extract complete information if output exists
        if output:
            message: AIMessage = output
            full_content = self._extract_content(message)
            tool_calls = getattr(message, "tool_calls", [])

            if hasattr(message, "usage_metadata") and message.usage_metadata:
                usage_metadata = message.usage_metadata

            # if hasattr(message, "response_metadata") and message.response_metadata:
            #     response_metadata = message.response_metadata

        if not message.content:
            if not message.tool_calls:
                message.content = "END"
                logger.info("AI message content is empty, set to END")

            return None

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

        # if response_metadata:
        #     detail["response_metadata"] = response_metadata

        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TEXT,
            content="",  # Empty content to avoid duplication, full content in detail.full_content
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            task_id=task_id,
        )

    def _handle_model_error(
        self, event: dict[str, Any], session_id: str, task_id: str
    ) -> StreamMessage | None:
        """Handle model errors."""
        error = event.get("data", {}).get("error", "Unknown model error")
        error_message = self._extract_error_message(error)

        detail = {
            "run_id": event.get("run_id"),
            "error": str(error),
            "error_type": (
                type(error).__name__ if hasattr(error, "__class__") else "Unknown"
            ),
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
            task_id=task_id,
        )

    def _handle_tool_start(
        self,
        event: dict[str, Any],
        session_id: str,
        task_id: str,
        display_language: str,
    ) -> StreamMessage | None:
        """Handle tool start events."""
        tool_name = event.get("name")
        if not tool_name:
            return None

        # Skip special tools (business logic, not content judgment) and memory tools
        if tool_name in [
            "message_to_user",
            "user_input",
            "dynamic_form_user_input",
            # Memory tools
            "manage_user_memory",
            "search_user_memory",
            "manage_app_memory",
            "search_app_memory",
        ]:
            return None

        tool_input = event.get("data", {}).get("input", {})

        # Special handling for plan tool
        if tool_name == "plan":
            return self._handle_plan_tool(event, session_id, task_id)

        # Get display information using passed language
        display_fields = ToolDisplayManager.get_display(
            tool_name, tool_input, display_language
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
            task_id=task_id,
        )

    def _handle_tool_end(
        self, event: dict[str, Any], session_id: str, task_id: str
    ) -> StreamMessage | None:
        """Handle tool completion events."""
        tool_name = event.get("name")
        if not tool_name or tool_name in [
            "user_input",
            "dynamic_form_user_input",
            "plan",
            # Memory tools
            "manage_user_memory",
            "search_user_memory",
            "manage_app_memory",
            "search_app_memory",
        ]:
            return None

        tool_input = event.get("data", {}).get("input", {}) or {}
        output = event.get("data", {}).get("output", "")

        detail = {
            "run_id": event.get("run_id"),
            "tool": tool_name,
            "result": output,
            "status": ToolResult.SUCCESS,
        }

        # Special handling for agent_result_delivery tool
        if tool_name == "agent_result_delivery":
            result_message = self._handle_agent_result_delivery(
                detail, output, session_id, task_id
            )
            if result_message:
                return result_message

        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TOOL_RESULT,
            content=tool_input.get("brief", ""),
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            task_id=task_id,
        )

    def _handle_tool_error(
        self, event: dict[str, Any], session_id: str, task_id: str
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
            "error_type": (
                type(error).__name__ if hasattr(error, "__class__") else "Unknown"
            ),
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
            task_id=task_id,
        )

    def _handle_custom_event(
        self,
        event: dict[str, Any],
        session_id: str,
        task_id: str,
        display_language: str,
    ) -> StreamMessage | None:
        """Handle custom events from LangCrew."""
        data = event.get("data", {})
        event_name = event.get("name")
        message_id = generate_message_id()

        if event_name == "on_langcrew_sandbox_created":
            # Sandbox creation event from E2B tools
            sandbox_data = data
            return StreamMessage(
                id=message_id,
                type=MessageType.CONFIG,
                content="update_session",
                detail=self._enhance_detail_with_metadata(
                    event,
                    {
                        "session_id": sandbox_data.get("session_id"),
                        "sandbox_id": sandbox_data.get("sandbox_id"),
                        "sandbox_url": sandbox_data.get("sandbox_url"),
                    },
                ),
                role="inner_message",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )
        elif event_name == "on_langcrew_agentbox_created":
            # Agentbox creation event from cloud phone tools
            agentbox_data = data
            return StreamMessage(
                id=message_id,
                type=MessageType.CONFIG,
                content="update_session",
                detail=self._enhance_detail_with_metadata(
                    event,
                    {
                        "session_id": agentbox_data.get("session_id"),
                        "sandbox_id": agentbox_data.get("sandbox_id"),
                        "instance_no": agentbox_data.get("instance_no"),
                        "access_key": agentbox_data.get("access_key"),
                        "access_secret_key": agentbox_data.get("access_secret_key"),
                        "expire_time": agentbox_data.get("expire_time"),
                        "user_id": agentbox_data.get("user_id"),
                    },
                ),
                role="inner_message",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )

        elif event_name == "on_langcrew_user_input_required":
            # User input required event from HITL tools
            input_data = data

            # Build detail with options if available
            detail = {
                "interrupt_data": input_data,
                "session_id": session_id,
            }

            # Add options if they exist
            if "options" in input_data and input_data["options"]:
                detail["options"] = input_data["options"]

            # Enhance detail with langcrew metadata
            detail = self._enhance_detail_with_metadata(event, detail)

            return StreamMessage(
                id=message_id,
                type=MessageType.USER_INPUT,
                content=input_data.get("question", "Please provide input"),
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )
        elif event_name == "on_langcrew_tool_interrupt_before":
            # Tool before interrupt event from HITL tools
            approval_data = data
            tool_info = approval_data.get("tool", {})

            # Use display language for content
            is_chinese = display_language == "zh"
            if is_chinese:
                content = f"工具执行前中断: {tool_info.get('name', 'unknown')}"
            else:
                content = f"Tool before interrupt: {tool_info.get('name', 'unknown')}"

            return StreamMessage(
                id=message_id,
                type=MessageType.USER_INPUT,
                content=content,
                detail=self._enhance_detail_with_metadata(
                    event,
                    {
                        "interaction_type": "tool_approval",
                        "approval_type": "before_execution",
                        "tool_name": tool_info.get("name"),
                        "tool_args": tool_info.get("args", {}),
                        "tool_description": tool_info.get("description", ""),
                        "interrupt_data": approval_data,
                        "supports_modification": True,
                        "modification_hint": "You can approve/deny or provide modified parameters",
                        "options": (
                            ["批准", "拒绝"] if is_chinese else ["Approve", "Deny"]
                        ),
                    },
                ),
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )
        elif event_name == "on_langcrew_tool_interrupt_after":
            # Tool after interrupt event from HITL tools
            review_data = data
            tool_info = review_data.get("tool", {})

            # Use display language for content
            is_chinese = display_language == "zh"
            if is_chinese:
                content = f"工具执行后审查: {tool_info.get('name', 'unknown')}"
            else:
                content = f"Tool after interrupt: {tool_info.get('name', 'unknown')}"

            return StreamMessage(
                id=message_id,
                type=MessageType.USER_INPUT,
                content=content,
                detail=self._enhance_detail_with_metadata(
                    event,
                    {
                        "interaction_type": "tool_approval",
                        "approval_type": "after_execution",
                        "tool_name": tool_info.get("name"),
                        "tool_args": tool_info.get("args", {}),
                        "tool_result": tool_info.get("result"),
                        "tool_description": tool_info.get("description", ""),
                        "interrupt_data": review_data,
                        "supports_modification": True,
                        "modification_hint": "You can approve/deny or provide modified result",
                        "options": (
                            ["确认", "拒绝"] if is_chinese else ["Confirm", "Deny"]
                        ),
                    },
                ),
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )
        elif event_name == "on_langcrew_tool_interrupt_before_completed":
            logger.info(f"Tool before interrupt completed: {data.get('tool_name')}")
            return None  # Do not send to frontend, just log
        elif event_name == "on_langcrew_tool_interrupt_after_completed":
            logger.info(f"Tool after interrupt completed: {data.get('tool_name')}")
            return None  # Do not send to frontend, just log
        elif event_name == "on_langcrew_new_message":
            new_message = data.get("new_message", "")

            return StreamMessage(
                id=message_id,
                type=MessageType.TEXT,
                content=new_message,
                detail=self._enhance_detail_with_metadata(event, {}),
                role="user",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )

        # Log unknown events for debugging (but don't send to frontend)
        if event_name:
            logger.debug(f"Unhandled custom event: {event_name}")

        return None

    def _handle_finish_signal(
        self,
        session_id: str,
        task_id: str,
        reason: str = "Task completed",
        status: TaskExecutionStatus = TaskExecutionStatus.COMPLETED,
    ) -> str:
        """Send finish signal."""
        return self._format_sse_message(
            StreamMessage(
                id=generate_message_id(),
                type=MessageType.FINISH_REASON,
                content=reason,
                detail={"reason": reason, "status": status},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )
        )

    def _handle_node_interrupt(
        self, event_data: dict, session_id: str, task_id: str
    ) -> StreamMessage:
        """Handle any interrupts - return generic message to user"""
        chunk_data = event_data.get("chunk", {})
        interrupt_obj = chunk_data.get("__interrupt__")

        return self._create_generic_interrupt_message(
            interrupt_obj, session_id, task_id
        )

    def _create_generic_interrupt_message(
        self, interrupt_obj, session_id: str, task_id: str
    ) -> StreamMessage:
        """Create generic interrupt message for user input"""
        message_id = generate_message_id()
        # Use default English for generic interrupts (no display_language available in this context)
        is_chinese = False

        content = (
            "执行过程中遇到中断，请提供必要信息以继续执行。"
            if is_chinese
            else "Execution interrupted. Please provide necessary information to continue."
        )

        return StreamMessage(
            id=message_id,
            type=MessageType.USER_INPUT,
            content=content,
            detail={
                "interaction_type": "generic_interrupt",
                "interrupt_data": {
                    "type": "generic_interrupt",
                    "interrupt_obj": str(
                        interrupt_obj
                    ),  # Convert to string for serialization
                    "requires_user_input": True,
                },
                "session_id": session_id,
            },
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            task_id=task_id,
        )

    # ============ UTILITY METHODS ============

    def _enhance_detail_with_metadata(
        self, event: dict[str, Any], detail: dict[str, Any]
    ) -> dict[str, Any]:
        """Enhance detail dictionary with langcrew metadata."""
        metadata = event.get("metadata", {})
        langcrew_info = {}

        if metadata.get("langcrew_agent"):
            langcrew_info["langcrew_agent"] = metadata["langcrew_agent"]

        if metadata.get("langcrew_task"):
            langcrew_info["langcrew_task"] = metadata["langcrew_task"]

        return {**detail, **langcrew_info}

    def _extract_content(self, message: AIMessage) -> str:
        """Extract content from AIMessage - handle different model formats."""
        if not message or not message.content:
            return ""

        # Handle Claude's list format and GPT's string format
        if isinstance(message.content, list):
            content = ""
            for item in message.content:
                if isinstance(item, str):
                    content += item
                elif isinstance(item, dict) and item.get("type") == "text":
                    content += item.get("text", "")
            return content.strip()

        return str(message.content).strip()

    def _extract_content_from_chunk(self, chunk) -> str:
        """Extract content from streaming chunk."""
        if hasattr(chunk, "content"):
            content = chunk.content
            if isinstance(content, list):
                extracted = ""
                for item in content:
                    if isinstance(item, dict) and "text" in item:
                        extracted += item.get("text", "")
                    elif isinstance(item, str):
                        extracted += item
                return extracted
            return str(content) if content else ""
        elif isinstance(chunk, dict):
            return chunk.get("content", "")

        return str(chunk) if chunk else ""

    def _extract_error_message(self, error) -> str:
        """Extract error message from different error types."""
        if hasattr(error, "message"):
            return error.message
        elif hasattr(error, "args") and error.args:
            return str(error.args[0])
        else:
            return str(error)

    def _handle_plan_tool(
        self,
        event: dict[str, Any],
        session_id: str,
        task_id: str,
    ) -> StreamMessage | None:
        """Handle plan tool start events.

        This method processes plan tool events from the PlanTool defined in langchain_tool.py,
        converting them to the appropriate StreamMessage format for the frontend.

        Args:
            event: The LangGraph event containing plan data
            session_id: Current session identifier
            task_id: Current task identifier
            display_language: Display language (zh or en)

        Returns:
            A StreamMessage with plan data formatted for frontend rendering
        """
        # We only handle on_tool_start events for plan tool
        if event.get("event") != "on_tool_start":
            return None

        # Extract data from event
        tool_input = event.get("data", {}).get("input", {})
        plans = tool_input.get("plans", [])

        if not plans or not isinstance(plans, list):
            logger.error(f"Invalid plans data: {plans}")
            return None

        # Convert plan items to steps for frontend
        steps = []
        timestamp = int(time.time() * 1000)

        # Process each plan item
        for plan in plans:
            # Extract plan data, handling both dict and object formats
            plan_id = str(
                plan.get("id") if isinstance(plan, dict) else getattr(plan, "id", "")
            )
            plan_content = (
                plan.get("content")
                if isinstance(plan, dict)
                else getattr(plan, "content", "")
            )
            plan_status = (
                plan.get("status")
                if isinstance(plan, dict)
                else getattr(plan, "status", "pending")
            )

            # Map status from PlanItem format to StepStatus format
            if plan_status == "running":
                status = StepStatus.RUNNING
            elif plan_status == "done":
                status = StepStatus.SUCCESS
            else:  # "pending" or any other value
                status = StepStatus.PENDING

            # Create step object for frontend matching the required format
            steps.append(
                {
                    "id": plan_id,
                    "title": plan_content,
                    "status": status,
                    "started_at": timestamp,
                }
            )

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.PLAN,
            content="",
            detail={"steps": steps},
            role="assistant",
            timestamp=timestamp,
            session_id=session_id,
            task_id=task_id,
        )

    def _handle_agent_result_delivery(
        self, detail: dict[str, Any], output: Any, session_id: str, task_id: str
    ) -> StreamMessage | None:
        """Handle special processing for agent_result_delivery tool output.

        Extracts attachments from result.content and moves them to the same level as result,
        while removing the content field from result.

        Args:
            detail: The detail dictionary to modify
            output: The tool output data
            session_id: Current session identifier
            task_id: Current task identifier

        Returns:
            A StreamMessage with processed agent result data or None if processing fails
        """
        try:
            # Check if output has the expected structure
            if not isinstance(output, ToolMessage) or not hasattr(output, "content"):
                logger.info(
                    "agent_result_delivery output missing expected structure, skipping special processing"
                )
                return None

            content_str = output.content
            if not isinstance(content_str, str):
                logger.info(
                    "agent_result_delivery content is not a string, skipping special processing"
                )
                return None

            content_data = json.loads(content_str)

            # Extract attachments if they exist
            if "attachments" in content_data and isinstance(
                content_data["attachments"], list
            ):
                # Move attachments to same level as result
                detail["attachments"] = content_data["attachments"]
                logger.info(
                    f"Extracted {len(content_data['attachments'])} attachments from agent_result_delivery"
                )

                # Create new result without content
                new_result = output.model_dump(exclude={"content"})
                detail["result"] = new_result
                logger.info("Removed content field from agent_result_delivery result")
            else:
                logger.info("No attachments found in agent_result_delivery content")

            # Enhance detail with metadata
            detail = self._enhance_detail_with_metadata({}, detail)

            # Return StreamMessage with processed data
            return StreamMessage(
                id=generate_message_id(),
                type=MessageType.TOOL_RESULT,
                content="",  # Empty content as attachments are in detail
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                task_id=task_id,
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON content in agent_result_delivery: {e}")
            logger.error(f"Invalid JSON content: {output.get('content', 'N/A')}")
            return None
        except Exception as e:
            logger.error(
                f"Unexpected error processing agent_result_delivery output: {e}",
                exc_info=True,
            )
            return None
