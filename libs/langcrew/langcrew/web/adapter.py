"""LangGraph Adapter for Web Server.

This adapter directly uses LangGraph's streaming capabilities to provide
real-time updates to web clients via SSE (Server-Sent Events).

Key Features:
- Tool internal event filtering to prevent message stream pollution
- Near-stateless design with minimal stop control state
- Task-level execution control (stop flags, etc.)
- Comprehensive event handling with proper cleanup
"""

import asyncio
import json
import logging
import os
import time
from collections.abc import AsyncGenerator
from dataclasses import dataclass, replace
from typing import Any

from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, ToolMessage
from langchain_core.messages.human import HumanMessage
from langchain_core.messages.utils import convert_to_messages
from langchain_core.runnables.config import RunnableConfig
from langgraph.errors import GraphInterrupt
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command

from ..citation import (
    CitationRegistry,
    CitationStreamParser,
    normalize_citation_content,
    public_artifact,
    sources_from_message,
)
from ..citation.artifact import CITATION_SOURCES_KEY, sources_from_artifact
from ..controllable import StopReason
from ..crew import Crew
from ..guardrail import GuardrailError
from ..utils.language import detect_language
from ..utils.message_utils import (
    extract_text_content,
    generate_message_id,
    generate_response_id,
)
from .protocol import (
    MessageType,
    StepStatus,
    StreamMessage,
    TaskExecutionStatus,
    ToolResult,
)
from .tool_display import ToolDisplayManager

logger = logging.getLogger(__name__)


@dataclass
class _CitationModelRunState:
    registry: CitationRegistry
    parser: CitationStreamParser


class LangGraphAdapter:
    """Adapter for LangCrew crews and compiled LangGraph executions."""

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
        "on_chain_start",
        "on_chain_end",
        "on_chain_error",
    }

    def __init__(
        self,
        crew: Crew | None = None,
        stream_reasoning: bool = True,
        *,
        compiled_graph: CompiledStateGraph | None = None,
    ):
        """Initialize the adapter with one executable.

        Args:
            crew: LangCrew Crew instance to execute
            stream_reasoning: Whether to emit reasoning chunks to clients
            compiled_graph: Compiled LangGraph using the messages state convention
        """
        if (crew is None) == (compiled_graph is None):
            raise ValueError("Exactly one of crew or compiled_graph must be provided")

        self.crew = crew
        self.compiled_graph = compiled_graph
        self.executor = crew if crew is not None else compiled_graph
        self.stream_reasoning = stream_reasoning
        self._graph_tasks: dict[str, set[asyncio.Task[Any]]] = {}
        self._graph_stop_reasons: dict[str, StopReason] = {}

        self._functon_call_stream: bool = (
            os.getenv("LANGCREW_FUNCTION_CALL_STREAM", "false").lower() == "true"
        )
        logger.info(f"LANGCREW_FUNCTION_CALL_STREAM: {self._functon_call_stream}")

    # ============ LANGUAGE MANAGEMENT ============

    def _get_display_language(
        self,
        message: Any | None = None,
        explicit_language: str | None = None,
    ) -> str:
        """Get display language (stateless).

        Priority: explicit_language > detected_language > default

        Args:
            message: User message content for language detection (optional)
            explicit_language: Explicitly specified language (optional)

        Returns:
            Language code ('zh' or 'en')
        """
        # Priority 1: Explicit language specification
        if explicit_language:
            return explicit_language

        # Priority 2: Detect from user message
        message_text = extract_text_content(message).strip()
        if message_text:
            return detect_language(message_text)

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
            session_id: Session identifier used as thread_id (= conversation ID)
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
        config_dict: dict[str, Any] = {"configurable": {"thread_id": session_id}}
        if user_id:  # Only set if user_id is not None and not empty
            config_dict["configurable"]["user_id"] = user_id
        return config_dict

    def _prepare_input(
        self,
        content: str | list[dict],
        interrupt_data: dict[str, Any] | None,
        metadata: dict[str, Any] | None = None,
    ):
        """Prepare input data for execution based on execution mode."""
        is_resume = interrupt_data is not None

        if is_resume:
            # Resume mode: use content as resume value
            return Command(resume=content)
        else:
            # Normal mode: create HumanMessage with content
            messages = []
            if content:
                additional_kwargs = {}
                metadata = metadata or {}
                raw_sources = metadata.get(CITATION_SOURCES_KEY)
                if self._citation_enabled and isinstance(raw_sources, list):
                    additional_kwargs[CITATION_SOURCES_KEY] = raw_sources
                messages.append(
                    HumanMessage(
                        content=content,
                        additional_kwargs=additional_kwargs,
                    )
                )
            return {"messages": messages}

    @property
    def _citation_enabled(self) -> bool:
        return self.crew is not None and self.crew.citation_config.enabled

    async def stream(
        self,
        content: str | list[dict],
        session_id: str,
        user_id: str | None = None,
        language: str | None = None,
        interrupt_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
    ) -> AsyncGenerator[StreamMessage, None]:
        """
        Execute crew and yield StreamMessage objects (PRIMARY METHOD).

        This is the recommended way to execute crews. Returns parsed
        StreamMessage objects with all details properly extracted.

        Args:
            content: User content (str or OpenAI-style list of dicts)
            session_id: Session identifier (used as thread_id)
            user_id: User identifier (optional, for user-specific memory)
            language: Language preference (optional, for UI display)
            interrupt_data: Resume data (optional, for resumption)
            config: Optional runnable config (advanced usage)

        Yields:
            StreamMessage: Structured message objects

        Example:
            async for message in adapter.stream(
                content="Hello",
                session_id="session_123"
            ):
                if message.type == MessageType.TEXT:
                    print(message.content)
        """
        response_id = generate_response_id()
        citation_runs: dict[str, _CitationModelRunState] = {}
        task = asyncio.current_task()
        if self.compiled_graph is not None and task is not None:
            self._graph_tasks.setdefault(session_id, set()).add(task)
        try:
            # ============ INITIALIZATION ============
            # Local execution state (no instance state)
            executing_tools: set[str] = (
                set()
            )  # Track executing tools for internal event filtering
            task_ended = (
                False  # Track if task execution has completed or been interrupted
            )
            need_user_input = False  # Track if waiting for user input (USER_INPUT/TOOL_APPROVAL_REQUEST)
            should_send_messages = True  # Control message sending in resume mode
            is_waiting_for_client = False  # Track if waiting for client tool result (suppress finish_reason)

            # Every message emitted by this execution shares one response ID.
            logger.info(
                "Starting execution for session %s, response %s",
                session_id,
                response_id,
            )

            # Get display language (stateless)
            display_language = self._get_display_language(content, language)

            # Configure message sending behavior for resume mode
            is_resume = interrupt_data is not None
            if is_resume:
                interrupt_type = (
                    interrupt_data.get("type", "") if interrupt_data else ""
                )
                # Only generic interrupts can send messages immediately
                # Tool and user_input interrupts need to wait for completion events to avoid duplicate messages
                should_send_messages = interrupt_type == "generic_interrupt"

            # Prepare input data and configuration
            input_data = self._prepare_input(content, interrupt_data, metadata)
            config = self._build_config(session_id, user_id, config)

            # ============ EVENT PROCESSING LOOP ============
            if self.executor is None:
                raise RuntimeError("No executor configured")

            async for event in self.executor.astream_events(
                input=input_data, config=config
            ):
                event_type = event.get("event")

                event_data = event.get("data", {})
                event_name = event.get("name", "")

                if event_type == "on_chat_model_start":
                    self._handle_model_start(event, citation_runs)
                    continue

                # Allow tool-emitted custom events (widgets, tool simulation, etc.) even when nested under a tool run.
                is_simulated_standard_event = (
                    event_type == "on_custom_event"
                    and isinstance(event_data, dict)
                    and "event" in event_data
                )
                is_langcrew_custom_event = (
                    event_type == "on_custom_event"
                    and isinstance(event_name, str)
                    and event_name.startswith("on_langcrew_")
                )

                # -------- High Priority: Interrupts & State Updates --------

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
                        if isinstance(interrupt_obj, tuple) and len(interrupt_obj) > 0:
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
                            "client_tool_call",
                        ]:
                            continue  # Don't send generic interrupt message

                    interrupt_message = self._handle_node_interrupt(
                        event_data, session_id, response_id
                    )
                    yield interrupt_message

                # Resume mode: enable messages after tool completion events
                if (
                    is_resume
                    and not should_send_messages
                    and event_type == "on_custom_event"
                ):
                    if event_name in [
                        "on_langcrew_user_input_completed",
                        "on_langcrew_tool_interrupt_before_completed",
                        "on_langcrew_tool_interrupt_after_completed",
                        "on_langcrew_client_tool_call_completed",
                    ]:
                        logger.info(
                            f"{event_name} for session {session_id}. "
                            f"Resuming execution with response: {event.get('data', {})}"
                        )
                        should_send_messages = True

                # -------- Termination Conditions --------

                # Check task end conditions - ROOT EVENTS ONLY
                is_root_event = len(event.get("parent_ids", [])) == 0
                if is_root_event:
                    if event_type == "on_chain_end":
                        task_ended = True

                        # If waiting for client tool result, don't send finish_reason
                        # The client_tool_call message has already been sent
                        if is_waiting_for_client:
                            logger.debug(
                                f"Client tool call waiting for result, not sending finish_reason "
                                f"(session: {session_id}, response: {response_id})"
                            )
                            break

                        # Normal completion: send finish_reason
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
                            session_id, response_id, reason, status
                        )
                        break
                    elif event_type == "on_chain_error":
                        task_ended = True
                        error_msg = event.get("data", {}).get("error", "Unknown error")
                        yield self._handle_finish_signal(
                            session_id,
                            response_id,
                            f"Task failed: {error_msg}",
                            TaskExecutionStatus.FAILED,
                        )
                        break

                # -------- Tool Event Filtering --------

                event_type = event.get("event")
                tool_name = event.get("name", "")

                # 1. Filter by tool name
                if self._should_filter_tool_by_name(event_type, tool_name):
                    logger.debug(
                        f"Filtered tool event by name: {event_type} {tool_name} "
                        f"(session: {session_id}, response: {response_id})"
                    )
                    continue

                # 2. Track and filter tool internal events
                run_id = event.get("run_id")
                parent_ids = event.get("parent_ids", [])
                event_metadata = event.get("metadata", {})
                allow_tool_nested_events = bool(
                    isinstance(event_metadata, dict)
                    and event_metadata.get("langcrew_allow_tool_nested_events")
                )

                # Track tool execution state
                if event_type == "on_tool_start":
                    executing_tools.add(run_id)
                    logger.debug(
                        f"Tool execution started: {tool_name} "
                        f"(session: {session_id}, response: {response_id}, run_id: {run_id})"
                    )
                elif event_type == "on_tool_end":
                    executing_tools.discard(run_id)
                    logger.debug(
                        f"Tool execution ended: {tool_name} "
                        f"(session: {session_id}, response: {response_id}, run_id: {run_id})"
                    )
                elif event_type == "on_tool_error":
                    # Treat tool errors as terminal for execution tracking; otherwise nested events
                    # can be incorrectly filtered after failures (e.g., timeouts).
                    executing_tools.discard(run_id)
                    logger.debug(
                        f"Tool execution error: {tool_name} "
                        f"(session: {session_id}, response: {response_id}, run_id: {run_id})"
                    )
                elif any(parent_id in executing_tools for parent_id in parent_ids):
                    # Exempt client tool call events from filtering
                    # These events are sent from within client tools and must reach frontend
                    event_name = event.get("name", "")
                    if allow_tool_nested_events:
                        logger.debug(
                            f"Allowed nested events under tool: {event_type} {event_name} "
                            f"(session: {session_id}, response: {response_id}, "
                            f"parent_ids: {parent_ids})"
                        )
                    elif is_simulated_standard_event or is_langcrew_custom_event:
                        pass  # let it through
                    elif event_name not in [
                        "on_langcrew_client_tool_call",
                        "on_langcrew_client_tool_call_completed",
                    ]:
                        # Filter other tool internal events
                        logger.debug(
                            f"Filtered tool internal event: {event_type} {event_name} "
                            f"(session: {session_id}, response: {response_id}, "
                            f"parent_ids: {parent_ids}, executing_tools: {executing_tools})"
                        )
                        continue

                # -------- Regular Event Processing --------

                # Process tracked event types - only send if enabled
                if event_type in self.TRACKED_EVENTS and should_send_messages:
                    messages = await self._convert_langgraph_event(
                        event,
                        session_id,
                        display_language,
                        response_id,
                        citation_runs,
                    )

                    for message in messages:
                        # Update user input requirement flags
                        if message.type == MessageType.USER_INPUT:
                            need_user_input = True
                            logger.debug("User input needed due to USER_INPUT message")
                        elif message.type == MessageType.TOOL_APPROVAL_REQUEST:
                            need_user_input = True
                            logger.debug(
                                "Tool approval needed due to TOOL_APPROVAL_REQUEST message"
                            )
                        elif message.type == MessageType.CLIENT_TOOL_CALL:
                            # Check if client tool is waiting for result
                            wait_for_result = message.detail.get(
                                "wait_for_result", True
                            )
                            if wait_for_result:
                                is_waiting_for_client = True
                                logger.debug(
                                    f"Client tool call waiting for result: {message.detail.get('name')}"
                                )
                        elif (
                            message.type == MessageType.MESSAGE_TO_USER
                            and message.detail.get("intent_type") == "asking_user"
                        ):
                            need_user_input = True

                        yield message

            # ============ COMPLETION HANDLING ============

            # Handle abnormal completion
            if not task_ended:
                yield self._handle_finish_signal(
                    session_id,
                    response_id,
                    "Task completed: abnormal end",
                    TaskExecutionStatus.FAILED,
                )

        except asyncio.CancelledError:
            # ============ CANCELLATION HANDLING ============
            # Task was cancelled via Controllable.stop()
            logger.info(
                f"Response cancelled for session {session_id}, response {response_id}"
            )

            # Determine status based on stop reason
            stop_reason = (
                getattr(self.crew, "_stop_reason", None)
                if self.crew is not None
                else self._graph_stop_reasons.get(session_id)
            )

            if stop_reason == StopReason.USER_NEW_MESSAGE:
                # User sent new message - silent stop (no UI notification)
                # Don't send finish signal to frontend
                logger.info(
                    f"Silent stop for session {session_id}, no finish signal sent"
                )
            elif stop_reason == StopReason.GRACEFUL_STOP:
                # Graceful stop for service restart - send notification
                logger.info(f"Crew gracefully stopped for session {session_id}")
                yield self._handle_finish_signal(
                    session_id,
                    response_id,
                    "Agent stopped for service restart",
                    TaskExecutionStatus.FAILED,
                )
            else:
                # User actively cancelled or other reasons - send finish signal
                yield self._handle_finish_signal(
                    session_id,
                    response_id,
                    "Task cancelled by user",
                    TaskExecutionStatus.CANCELLED,
                )
        except GuardrailError as e:
            # ============ GUARDRAIL ERROR HANDLING ============
            logger.warning(
                f"Guardrail check failed for session {session_id}, response {response_id}: {e}"
            )
            yield self._handle_finish_signal(
                session_id,
                response_id,
                str(e),
                TaskExecutionStatus.FAILED,
            )
        except Exception as e:
            # ============ ERROR HANDLING ============
            logger.exception(f"Execution failed: {e}")
            yield self._handle_finish_signal(
                session_id, response_id, str(e), TaskExecutionStatus.FAILED
            )
        finally:
            # ============ CLEANUP ============
            citation_runs.clear()
            if self.compiled_graph is not None and task is not None:
                tasks = self._graph_tasks.get(session_id)
                if tasks is not None:
                    tasks.discard(task)
                    if not tasks:
                        self._graph_tasks.pop(session_id, None)
                        self._graph_stop_reasons.pop(session_id, None)
            logger.info(
                f"Response cleanup completed for session {session_id}, response {response_id}"
            )

    async def stop(
        self,
        session_id: str,
        reason: StopReason = StopReason.USER_CANCEL,
    ) -> bool:
        """Stop the active execution for a session."""
        if self.crew is not None:
            return await self.crew.stop(stop_reason=reason)

        tasks = list(self._graph_tasks.get(session_id, ()))
        if not tasks:
            logger.warning(
                "Compiled graph has no active run for session %s", session_id
            )
            return False

        self._graph_stop_reasons[session_id] = reason
        for task in tasks:
            task.cancel()
        return True

    async def stream_sse(
        self,
        content: str | list[dict],
        session_id: str,
        user_id: str | None = None,
        language: str | None = None,
        interrupt_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Execute crew and yield SSE formatted strings.

        This is a convenience wrapper around stream() that formats messages as SSE.
        Use this for HTTP streaming endpoints.

        Args:
            content: User content (str or OpenAI-style list of dicts)
            session_id: Session identifier
            user_id: User identifier (optional)
            language: Language preference (optional)
            interrupt_data: Resume data (optional)
            config: Optional runnable config

        Yields:
            str: SSE formatted strings (e.g., "data: {...}\\n\\n")

        Example:
            async for sse_chunk in adapter.stream_sse(
                content="Hello",
                session_id="session_123"
            ):
                # sse_chunk is ready for HTTP streaming
                yield sse_chunk
        """
        async for message in self.stream(
            content=content,
            session_id=session_id,
            user_id=user_id,
            language=language,
            interrupt_data=interrupt_data,
            metadata=metadata,
            config=config,
        ):
            yield message.to_sse()

    async def invoke(
        self,
        content: str | list[dict],
        session_id: str,
        user_id: str | None = None,
        language: str | None = None,
        interrupt_data: dict[str, Any] | None = None,
        config: RunnableConfig | None = None,
    ) -> dict:
        """
        Non-streaming execution (NOT IMPLEMENTED YET).

        Streaming is currently the supported execution mode for Web adapters.

        Raises:
            NotImplementedError: Use stream() for now
        """
        raise NotImplementedError(
            "invoke() is not implemented yet. "
            "Please use stream() or stream_sse() instead."
        )

    async def execute(
        self, task_input, config: RunnableConfig | None = None
    ) -> AsyncGenerator[str, None]:
        """
        Legacy method for backward compatibility.

        Args:
            task_input: TaskInput object (now aliased to Request)
            config: Optional RunnableConfig for advanced usage

        Yields:
            str: SSE formatted strings

        Deprecated:
            Use stream_sse() instead. This method will be removed in v2.0.

        Example:
            # Old way (deprecated)
            task_input = TaskInput(
                session_id="123",
                message="Hello",
                language="zh",
                interrupt_data=None
            )
            async for chunk in adapter.execute(task_input):
                yield chunk

            # New way (recommended)
            async for chunk in adapter.stream_sse(
                content="Hello",
                session_id="123",
                language="zh"
            ):
                yield chunk
        """
        import warnings

        warnings.warn(
            "adapter.execute() is deprecated and will be removed in v2.0. "
            "Use adapter.stream_sse() instead.",
            DeprecationWarning,
            stacklevel=2,
        )

        # Extract data from TaskInput (legacy format with message field)
        content = task_input.message
        session_id = task_input.session_id
        user_id = getattr(task_input, "user_id", None)
        language = getattr(task_input, "language", None)
        interrupt_data = getattr(task_input, "interrupt_data", None)

        # Delegate to stream_sse
        async for sse_chunk in self.stream_sse(
            content=content,
            session_id=session_id,
            user_id=user_id,
            language=language,
            interrupt_data=interrupt_data,
            config=config,
        ):
            yield sse_chunk

    def _format_sse_message(self, message: StreamMessage) -> str:
        """
        Format StreamMessage as SSE string (legacy method).

        Args:
            message: StreamMessage object

        Returns:
            str: SSE formatted string

        Deprecated:
            Use message.to_sse() instead. This method will be removed in v2.0.

        Example:
            # Old way (deprecated)
            sse_str = adapter._format_sse_message(message)

            # New way (recommended)
            sse_str = message.to_sse()
        """
        import warnings

        warnings.warn(
            "adapter._format_sse_message() is deprecated and will be removed in v2.0. "
            "Use message.to_sse() instead.",
            DeprecationWarning,
            stacklevel=2,
        )

        return message.to_sse()

    # ============ EVENT PROCESSING ============

    def _should_filter_tool_by_name(self, event_type: str, tool_name: str) -> bool:
        """
        Check if tool event should be filtered based on tool name.

        Filters are ordered from fast-to-slow and common-to-rare for optimal performance.

        Args:
            event_type: Event type (on_tool_start, on_tool_end, on_tool_error)
            tool_name: Name of the tool

        Returns:
            True if the event should be filtered (skipped), False otherwise
        """
        # Fast path: only check tool events
        if event_type not in ["on_tool_start", "on_tool_end", "on_tool_error"]:
            return False

        # Fast path: empty tool name
        if not tool_name:
            return False

        # Optimization 1: Check prefix matches first (most common, O(k) where k is prefix length)
        # Widget tools - have their own widget events (common in UI-heavy apps)
        if tool_name.startswith("langcrew_widget_"):
            return True

        # Client tools - use client_tool_call events instead (common in interactive apps)
        if tool_name.startswith("langcrew_client_tool_"):
            return True

        # Optimization 2: Set lookup for exact matches (O(1) average case)
        # Tools that should be filtered from display:
        # - Tools with custom event mechanisms (browser-use, cloud-phone)
        # - Special business logic tools (message_to_user, user_input, etc.)
        # - Memory management tools
        if tool_name in {
            # Custom event tools
            "browser-use",
            "cloud-phone",
            "computer-use",
            # Business logic tools
            "message_to_user",
            "user_input",
            "dynamic_form_user_input",
            # Memory tools
            "manage_user_memory",
            "search_user_memory",
            "manage_app_memory",
            "search_app_memory",
        }:
            return True

        # Optimization 3: Special case with extra condition (rare, most expensive check)
        # Plan tool - only filtered on tool_end (has special handling in tool_start)
        if event_type == "on_tool_end" and tool_name == "plan":
            return True

        return False

    async def _convert_langgraph_event(
        self,
        event: dict[str, Any],
        session_id: str,
        display_language: str,
        response_id: str,
        citation_runs: dict[str, _CitationModelRunState],
    ) -> list[StreamMessage]:
        """Convert LangGraph event to StreamMessage(s).

        Tool event filtering is now handled in the main stream loop.

        Returns:
            List of messages (may be empty, single item, or multiple items)
        """
        event_type = event.get("event")

        # ============ STANDARD EVENT CONVERSION LOGIC ============

        if event_type == "on_chat_model_stream":
            result = self._handle_model_stream(
                event, session_id, response_id, citation_runs
            )
        elif event_type == "on_chat_model_end":
            result = self._handle_model_end(
                event, session_id, response_id, citation_runs
            )
        elif event_type == "on_chat_model_error":
            result = self._handle_model_error(
                event, session_id, response_id, citation_runs
            )
        elif event_type == "on_tool_start":
            result = self._handle_tool_start(
                event, session_id, response_id, display_language
            )
        elif event_type == "on_tool_end":
            result = self._handle_tool_end(event, session_id, response_id)
        elif event_type == "on_tool_error":
            result = self._handle_tool_error(event, session_id, response_id)
        elif event_type == "on_chain_start":
            result = self._handle_chain_start(event, session_id, response_id)
        elif event_type == "on_chain_end":
            result = self._handle_chain_end(event, session_id, response_id)
        elif event_type == "on_chain_error":
            result = self._handle_chain_error(event, session_id, response_id)
        elif event_type == "on_custom_event":
            result = self._handle_custom_event(
                event, session_id, response_id, display_language
            )
        else:
            return []

        # Normalize to list
        if result is None:
            return []
        elif isinstance(result, list):
            return result
        else:
            return [result]

    # ============ EVENT HANDLERS ============

    def _handle_model_start(
        self,
        event: dict[str, Any],
        citation_runs: dict[str, _CitationModelRunState],
    ) -> None:
        if not self._citation_enabled:
            return

        registry = CitationRegistry()
        for message in self._model_input_messages(event):
            sources = sources_from_message(message)
            if isinstance(message, ToolMessage):
                sources.extend(sources_from_artifact(message.artifact))
            for source in sources:
                try:
                    registry.register(source)
                except (TypeError, ValueError):
                    logger.exception("Invalid Citation source in model input")

        run_id = self._citation_run_id(event)
        citation_runs[run_id] = _CitationModelRunState(
            registry=registry,
            parser=CitationStreamParser(registry),
        )

    @staticmethod
    def _model_input_messages(event: dict[str, Any]) -> list[BaseMessage]:
        value = event.get("data", {}).get("input")
        if isinstance(value, dict):
            value = value.get("messages", [])
        while (
            isinstance(value, (list, tuple))
            and len(value) == 1
            and isinstance(value[0], (list, tuple))
        ):
            value = value[0]
        if not isinstance(value, (list, tuple)):
            return []
        try:
            return list(convert_to_messages(value))
        except (TypeError, ValueError):
            logger.exception("Unable to read model input messages for Citation")
            return []

    @staticmethod
    def _citation_run_id(event: dict[str, Any]) -> str:
        run_id = str(event.get("run_id") or "")
        suffix = event.get("data", {}).get("ext", {}).get("run_id_suffix", "")
        return f"{run_id}-{suffix}" if suffix else run_id

    def _handle_model_stream(
        self,
        event: dict[str, Any],
        session_id: str,
        response_id: str,
        citation_runs: dict[str, _CitationModelRunState],
    ) -> StreamMessage | None:
        """Handle streaming model output - no content filtering."""
        chunk = event.get("data", {}).get("chunk")
        if not chunk:
            return None

        extracted = self._extract_content_from_chunk(chunk)
        text_content = extracted.get("content", "")
        reasoning_content = extracted.get("reasoning", "")

        # Send text content as normal. Citation parsing only buffers a possible
        # marker suffix; ordinary model output remains streaming.
        if text_content:
            run_id = self._citation_run_id(event)
            citation_sources = []
            state = citation_runs.get(run_id)
            if state is not None:
                parsed = state.parser.feed(text_content)
                text_content = parsed.content
                citation_sources = parsed.citation_sources

            if not text_content and not citation_sources:
                return None

            detail = {
                "streaming": True,
                "run_id": run_id,
            }
            if citation_sources:
                detail["citation_sources"] = citation_sources
            detail = self._enhance_detail_with_metadata(event, detail)
            return StreamMessage(
                id=generate_message_id(),
                type=MessageType.TEXT,
                content=text_content,
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )
            # Send reasoning as a separate message if available
        if reasoning_content:
            if not self.stream_reasoning:
                return None

            run_id = event.get("run_id")
            if suffix := event.get("data", {}).get("ext", {}).get("run_id_suffix", ""):
                run_id = f"{run_id}-{suffix}"

            detail = {
                "streaming": True,
                "run_id": run_id,
            }
            detail = self._enhance_detail_with_metadata(event, detail)
            return StreamMessage(
                id=generate_message_id(),
                type=MessageType.REASONING,
                content=reasoning_content,
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )

        # Handle tool call chunks if no text or reasoning content
        if (
            self._functon_call_stream
            and isinstance(chunk, AIMessageChunk)
            and hasattr(chunk, "tool_call_chunks")
        ):
            for tool_call_chunk in chunk.tool_call_chunks:
                return StreamMessage(
                    id=generate_message_id(),
                    type=MessageType.TOOL_CALL_CHUNK,
                    field_name="detail.name"
                    if tool_call_chunk.get("name")
                    else "detail.args",
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
                    response_id=response_id,
                )
        return None

    def _handle_model_end(
        self,
        event: dict[str, Any],
        session_id: str,
        response_id: str,
        citation_runs: dict[str, _CitationModelRunState],
    ) -> list[StreamMessage] | None:
        """Handle model completion - send reasoning and content as separate messages."""
        output = event.get("data", {}).get("output")
        run_id = self._citation_run_id(event)

        # Initialize default values
        full_content = ""
        full_reasoning = ""
        tool_calls = []
        usage_metadata = {}
        # response_metadata = {}

        # Extract complete information if output exists
        if output:
            message: AIMessage = output
            full_content = self._extract_content(message)
            full_reasoning = self._extract_reasoning(message)
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

        citation_sources = []
        state = citation_runs.pop(run_id, None)
        if state is not None:
            parsed = normalize_citation_content(full_content, state.registry)
            full_content = parsed.content
            citation_sources = parsed.citation_sources
            state.parser.discard_buffer()

        messages = []
        content_detail = {
            "run_id": run_id,
            "full_content": full_content,
        }
        if citation_sources:
            content_detail["citation_sources"] = citation_sources
        if full_reasoning and self.stream_reasoning:
            content_detail["full_reasoning"] = full_reasoning

        # Include tool_calls if they exist
        if tool_calls:
            content_detail["tool_calls"] = tool_calls

        if usage_metadata:
            content_detail["usage"] = usage_metadata

        # if response_metadata:
        #     content_detail["response_metadata"] = response_metadata

        content_detail = self._enhance_detail_with_metadata(event, content_detail)

        messages.append(
            StreamMessage(
                id=generate_message_id(),
                type=MessageType.MESSAGE_RESULT,
                content="",  # Empty content to avoid duplication, full content in detail.full_content
                detail=content_detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )
        )

        return messages

    def _handle_model_error(
        self,
        event: dict[str, Any],
        session_id: str,
        response_id: str,
        citation_runs: dict[str, _CitationModelRunState],
    ) -> StreamMessage | None:
        """Handle model errors."""
        citation_runs.pop(self._citation_run_id(event), None)
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
            response_id=response_id,
        )

    def _handle_tool_start(
        self,
        event: dict[str, Any],
        session_id: str,
        response_id: str,
        display_language: str,
    ) -> StreamMessage | None:
        """Handle tool start events.

        Tool name filtering is now handled in the main stream loop.
        """
        tool_name = event.get("name")
        if not tool_name:
            return None

        tool_input = event.get("data", {}).get("input", {})

        # Ensure param is JSON-serializable
        try:
            json.dumps(tool_input)
            param = tool_input
        except (TypeError, ValueError):
            # Failed - filter out framework-injected objects and retry
            if isinstance(tool_input, dict):
                EXCLUDE_KEYS = {
                    # LangChain internals (auto-injected by framework)
                    "run_manager",
                    "callbacks",
                    "callback_manager",
                    "config",
                    # LangGraph runtime injection (contains full state and callbacks)
                    "runtime",
                }
                filtered = {
                    k: v for k, v in tool_input.items() if k not in EXCLUDE_KEYS
                }
                try:
                    json.dumps(filtered)
                    param = filtered
                except (TypeError, ValueError):
                    # Still not serializable, use string representation
                    param = str(filtered)
            else:
                param = str(tool_input)

        # Special handling for plan tool
        if tool_name == "plan":
            return self._handle_plan_tool(event, session_id, response_id)

        # Get display information
        ext = event.get("data", {}).get("ext", {})
        display_fields = ToolDisplayManager.get_display(tool_name, tool_input, ext)

        run_id = event.get("run_id")
        detail = {
            "run_id": run_id,
            "tool": tool_name,
            "status": ToolResult.PENDING,
            "param": param,  # Use serializable param
            "action": display_fields["action"],
            "action_content": display_fields["action_content"],
        }

        # Check for run_id_suffix and mark source as skills
        if suffix := ext.get("run_id_suffix", ""):
            run_id = f"{run_id}-{suffix}"
            detail["run_id"] = run_id

        detail = self._enhance_detail_with_metadata(event, detail)

        # Simple logging (param is always serializable)
        logger.info(f"Tool {tool_name} called: {param}")

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TOOL_CALL,
            content=tool_input.get("brief", ""),
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            response_id=response_id,
        )

    def _handle_tool_end(
        self, event: dict[str, Any], session_id: str, response_id: str
    ) -> StreamMessage | None:
        """Handle tool completion events.

        Tool name filtering is now handled in the main stream loop.
        """
        tool_name = event.get("name")
        if not tool_name:
            return None

        tool_input = event.get("data", {}).get("input", {}) or {}
        output = event.get("data", {}).get("output", "")
        public_output = self._public_tool_output(output)

        ext = event.get("data", {}).get("ext", {})
        run_id = event.get("run_id")

        detail = {
            "run_id": run_id,
            "tool": tool_name,
            "result": public_output,
            "status": ToolResult.SUCCESS,
        }

        # Check for run_id_suffix and mark source as skills
        if suffix := ext.get("run_id_suffix", ""):
            run_id = f"{run_id}-{suffix}"
            detail["run_id"] = run_id

        # Special handling for agent_result_delivery tool
        if tool_name == "view_image_url":
            result_message = self._handle_view_image_url_result(
                event, detail, output, session_id, response_id
            )
            if result_message:
                return result_message

        if tool_name in ["agent_result_delivery", "workspace_file_delivery"]:
            result_message = self._handle_agent_result_delivery(
                event, detail, output, session_id, response_id
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
            response_id=response_id,
        )

    @staticmethod
    def _public_tool_output(output: Any) -> Any:
        if isinstance(output, ToolMessage):
            return output.model_copy(
                update={"artifact": public_artifact(output.artifact)}
            )
        if isinstance(output, Command) and isinstance(output.update, dict):
            messages = [
                message.model_copy(
                    update={"artifact": public_artifact(message.artifact)}
                )
                if isinstance(message, ToolMessage)
                else message
                for message in output.update.get("messages", [])
            ]
            return replace(
                output,
                update={**output.update, "messages": messages},
            )
        return output

    def _handle_tool_error(
        self, event: dict[str, Any], session_id: str, response_id: str
    ) -> StreamMessage | None:
        """Handle tool error events."""
        tool_name = event.get("name")
        error = event.get("data", {}).get("error", "Unknown tool error")

        if isinstance(error, GraphInterrupt):
            return None

        # Extract error information (reused in both special and normal handling)
        error_message = self._extract_error_message(error)
        error_type = type(error).__name__ if hasattr(error, "__class__") else "Unknown"

        # Special handling: plan tool errors are logged but not sent to frontend
        if tool_name == "plan":
            logger.error(
                f"Plan tool error: {error_message}, error_type: {error_type}, "
                f"run_id: {event.get('run_id', 'N/A')}"
            )
            return None

        detail = {
            "run_id": event.get("run_id"),
            "tool": tool_name,
            "status": ToolResult.FAILED,
            "output": error_message,
            "error": error_message,
            "error_type": error_type,
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
            response_id=response_id,
        )

    def _handle_chain_start(
        self, event: dict[str, Any], session_id: str, response_id: str
    ) -> StreamMessage | None:
        """Handle chain start events (on_chain_start).

        Only sends events for workflow mode user-defined nodes.
        Filters out task/agent mode and internal executor nodes.

        Args:
            event: LangGraph event with node metadata
            session_id: Current session identifier
            response_id: Current response identifier

        Returns:
            StreamMessage with NODE_START type or None if internal node
        """
        metadata = event.get("metadata", {})

        # Filter non-workflow nodes (task/agent mode, __start__, __end__)
        # Only workflow nodes have node_type metadata (set by WorkflowBuilder)
        node_type = metadata.get("node_type")
        if not node_type:
            return None

        # Filter deep nested events (internal executor implementation)
        # User-defined workflow nodes: parent_ids <= 1
        # Internal executor nodes: parent_ids > 1
        parent_ids = event.get("parent_ids", [])
        if len(parent_ids) > 1:
            return None

        # Get node_id after filtering
        node_id = metadata.get("langgraph_node")

        # Build detail with node information
        detail = {
            "node_id": node_id,
            "started_at": int(time.time() * 1000),
        }

        # Add node type and label from metadata (if available)
        if "node_type" in metadata:
            detail["node_type"] = metadata["node_type"]

        if "node_label" in metadata:
            detail["node_label"] = metadata["node_label"]

        # Enhance with additional metadata
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.NODE_START,
            content="",
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            response_id=response_id,
        )

    def _handle_chain_end(
        self, event: dict[str, Any], session_id: str, response_id: str
    ) -> StreamMessage | list[StreamMessage] | None:
        """Handle chain completion events (on_chain_end).

        Only sends events for workflow mode user-defined nodes.
        Filters out task/agent mode and internal executor nodes.

        Args:
            event: LangGraph event with node metadata
            session_id: Current session identifier
            response_id: Current response identifier

        Returns:
            Single message, list of messages, or None if internal node
        """
        metadata = event.get("metadata", {})

        # Filter non-workflow nodes (same logic as node_start)
        node_type = metadata.get("node_type")
        if not node_type:
            return None

        # Filter deep nested events
        parent_ids = event.get("parent_ids", [])
        if len(parent_ids) > 1:
            return None

        # Get node_id after filtering
        node_id = metadata.get("langgraph_node")
        completed_at = int(time.time() * 1000)

        # Extract output from state
        output_data = event.get("data", {}).get("output", {})
        previous_output = output_data.get("previous_node_output", {})

        messages = []

        # Check for output_display content (unified handling for all nodes)
        output_display = previous_output.get("output_display")
        if output_display:
            messages.append(
                StreamMessage(
                    id=generate_message_id(),
                    type=MessageType.TEXT,  # TEXT type supports Markdown
                    content=output_display,
                    detail={
                        "node_id": node_id,
                        "node_type": node_type,
                        "is_node_display": True,
                    },
                    role="assistant",
                    timestamp=completed_at,
                    session_id=session_id,
                    response_id=response_id,
                )
            )

        # Send NODE_END event
        detail = {
            "node_id": node_id,
            "node_type": node_type,
            "completed_at": completed_at,
        }

        # Add node label from metadata
        if "node_label" in metadata:
            detail["node_label"] = metadata["node_label"]

        # Enhance with metadata
        detail = self._enhance_detail_with_metadata(event, detail)

        messages.append(
            StreamMessage(
                id=generate_message_id(),
                type=MessageType.NODE_END,
                content="",
                detail=detail,
                role="assistant",
                timestamp=completed_at,
                session_id=session_id,
                response_id=response_id,
            )
        )

        return messages if len(messages) > 1 else messages[0] if messages else None

    def _handle_chain_error(
        self, event: dict[str, Any], session_id: str, response_id: str
    ) -> StreamMessage | None:
        """Handle chain error events (on_chain_error).

        Only sends events for workflow mode user-defined nodes.
        Uses same filtering logic as chain_start/chain_end for consistency.

        Args:
            event: LangGraph event with error information
            session_id: Current session identifier
            response_id: Current response identifier

        Returns:
            StreamMessage with NODE_ERROR type or None if internal node
        """
        metadata = event.get("metadata", {})
        parent_ids = event.get("parent_ids", [])

        # Add debug logging for troubleshooting
        logger.debug(
            f"on_chain_error event - node_id: {metadata.get('langgraph_node')}, "
            f"node_type: {metadata.get('node_type')}, "
            f"parent_ids: {parent_ids}, "
            f"metadata: {metadata}"
        )

        # Filter non-workflow nodes (same logic as chain_start/chain_end)
        # Only workflow nodes have node_type metadata (set by WorkflowBuilder)
        node_type = metadata.get("node_type")
        if not node_type:
            logger.debug(
                f"Filtered chain_error: no node_type (node_id: {metadata.get('langgraph_node')})"
            )
            return None

        # Filter deep nested events (internal executor implementation)
        # User-defined workflow nodes: parent_ids <= 1
        # Internal executor nodes: parent_ids > 1
        if len(parent_ids) > 1:
            logger.debug(
                f"Filtered chain_error: parent_ids > 1 (node_id: {metadata.get('langgraph_node')})"
            )
            return None

        # Get node_id after filtering
        node_id = metadata.get("langgraph_node")

        # Extract error information
        error = event.get("data", {}).get("error", "Unknown node error")
        error_message = self._extract_error_message(error)

        logger.info(
            f"Sending NODE_ERROR for node {node_id} (type: {node_type}): {error_message}"
        )

        # Build detail with error information
        failed_at = int(time.time() * 1000)
        detail = {
            "node_id": node_id,
            "error": error_message,
            "error_type": (
                type(error).__name__ if hasattr(error, "__class__") else "Unknown"
            ),
            "failed_at": failed_at,
        }

        # Add node type and label from metadata (same as chain_start/chain_end)
        if "node_type" in metadata:
            detail["node_type"] = metadata["node_type"]

        if "node_label" in metadata:
            detail["node_label"] = metadata["node_label"]

        # Enhance with metadata
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.NODE_ERROR,
            content=error_message,
            detail=detail,
            role="assistant",
            timestamp=failed_at,
            session_id=session_id,
            response_id=response_id,
        )

    @staticmethod
    def _supports_hitl_modification(interrupt_data: Any) -> bool:
        """Return whether a HITL interrupt permits editing action arguments."""
        if not isinstance(interrupt_data, dict):
            return False

        review_configs = interrupt_data.get("review_configs")
        if not isinstance(review_configs, list):
            return False

        for review_config in review_configs:
            if not isinstance(review_config, dict):
                continue
            allowed_decisions = review_config.get("allowed_decisions")
            if isinstance(allowed_decisions, list) and "edit" in allowed_decisions:
                return True
        return False

    def _handle_custom_event(
        self,
        event: dict[str, Any],
        session_id: str,
        response_id: str,
        display_language: str,
    ) -> StreamMessage | None:
        """Handle custom events from LangCrew."""
        data = event.get("data", {})
        event_name = event.get("name")
        message_id = generate_message_id()

        # ============ STANDARD EVENT SIMULATION ============
        # Check if this custom event is simulating a standard event
        # This allows tools (like SkillTool) to emit standard events via emit_standard_event
        if isinstance(data, dict) and "event" in data:
            simulated_event_type = data.get("event")

            # Define event type to handler mapping
            event_handler_map = {
                "on_chat_model_stream": self._handle_model_stream,
                "on_chat_model_end": self._handle_model_end,
                "on_tool_start": self._handle_tool_start,
                "on_tool_end": self._handle_tool_end,
            }

            # Check if this is a supported simulated event type
            handler = event_handler_map.get(simulated_event_type)
            if handler:
                # Reconstruct event structure for handler
                # For tool events, prioritize data.name over event.name
                event_name = (
                    data.get("name", event.get("name", ""))
                    if simulated_event_type in ["on_tool_start", "on_tool_end"]
                    else event.get("name", "")
                )

                simulated_event = {
                    "event": simulated_event_type,
                    "run_id": event.get("run_id", ""),
                    "name": event_name,
                    "data": data.get("data", {}),
                    "metadata": event.get("metadata", {}),
                }

                # Tool handlers - on_tool_start needs display_language, on_tool_end does not
                if simulated_event_type == "on_tool_start":
                    return handler(
                        simulated_event, session_id, response_id, display_language
                    )
                elif simulated_event_type == "on_tool_end":
                    return handler(simulated_event, session_id, response_id)
                else:
                    return handler(simulated_event, session_id, response_id)

        # ============ LANGCREW CUSTOM EVENTS ============
        # Handle LangCrew-specific custom events
        if event_name == "on_langcrew_user_input_required":
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

            # Batched questions payload: summarize question texts as content
            if isinstance(input_data.get("questions"), list) and input_data["questions"]:
                content = "; ".join(
                    question.get("question", "")
                    for question in input_data["questions"]
                    if isinstance(question, dict)
                )
            else:
                content = input_data.get("question", "")

            return StreamMessage(
                id=message_id,
                type=MessageType.USER_INPUT,
                content=content or "Please provide input",
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )
        elif event_name == "on_langcrew_tool_interrupt_before":
            # Tool before interrupt event from HITL tools
            approval_data = data
            tool_info = approval_data.get("tool", {})
            supports_modification = self._supports_hitl_modification(approval_data)

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
                        "supports_modification": supports_modification,
                        "modification_hint": (
                            "You can approve/deny or provide modified parameters"
                            if supports_modification
                            else "You can approve or deny this action"
                        ),
                        "options": (
                            ["批准", "拒绝"] if is_chinese else ["Approve", "Deny"]
                        ),
                    },
                ),
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )
        elif event_name == "on_langcrew_tool_interrupt_after":
            # Tool after interrupt event from HITL tools
            review_data = data
            tool_info = review_data.get("tool", {})
            supports_modification = self._supports_hitl_modification(review_data)

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
                        "supports_modification": supports_modification,
                        "modification_hint": (
                            "You can approve/deny or provide modified result"
                            if supports_modification
                            else "You can confirm or deny this result"
                        ),
                        "options": (
                            ["确认", "拒绝"] if is_chinese else ["Confirm", "Deny"]
                        ),
                    },
                ),
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
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
                response_id=response_id,
            )

        elif event_name == "on_langcrew_widget":
            # Widget event from stream_widget helper
            # Event data is already in final format (type: added/update/done/removed)

            # Use data directly as detail, enhance with metadata
            detail = self._enhance_detail_with_metadata(event, dict(data))

            return StreamMessage(
                id=message_id,
                type=MessageType.WIDGET,
                content="",
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )

        elif event_name == "on_langcrew_client_tool_call":
            # Client tool call event
            detail = self._enhance_detail_with_metadata(event, dict(data))

            return StreamMessage(
                id=message_id,
                type=MessageType.CLIENT_TOOL_CALL,
                content="",
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )

        elif event_name == "on_langcrew_client_tool_call_completed":
            # Client tool call completed event - notify frontend for UI state update
            detail = self._enhance_detail_with_metadata(event, dict(data))

            return StreamMessage(
                id=message_id,
                type=MessageType.CLIENT_TOOL_RESULT,
                content="",
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )

        elif event_name == "on_langcrew_event":
            # Generic passthrough for tool/agent custom events.
            # Payload should be a dict; put the business name in "name"
            # (avoid a top-level "event" key — that is reserved for simulated
            # standard events like on_tool_start).
            detail = self._enhance_detail_with_metadata(
                event, dict(data) if isinstance(data, dict) else {"data": data}
            )
            return StreamMessage(
                id=message_id,
                type=MessageType.NOTICE,
                content="",
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
            )

        # Log unknown events for debugging (but don't send to frontend)
        if event_name:
            logger.debug(f"Unhandled custom event: {event_name}")

        return None

    def _handle_finish_signal(
        self,
        session_id: str,
        response_id: str,
        reason: str = "Task completed",
        status: TaskExecutionStatus = TaskExecutionStatus.COMPLETED,
    ) -> StreamMessage:
        """Handle finish signal and return StreamMessage object."""
        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.FINISH_REASON,
            content=reason,
            detail={"reason": reason, "status": status},
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            response_id=response_id,
        )

    def _handle_node_interrupt(
        self, event_data: dict, session_id: str, response_id: str
    ) -> StreamMessage:
        """Handle any interrupts - return generic message to user"""
        chunk_data = event_data.get("chunk", {})
        interrupt_obj = chunk_data.get("__interrupt__")

        # Extract interrupt data with fallback
        interrupt_data = {}
        try:
            if interrupt_obj and len(interrupt_obj) > 0:
                interrupt_data = interrupt_obj[0].value
                if not isinstance(interrupt_data, dict):
                    interrupt_data = {}
                interrupt_data["type"] = "generic_interrupt"
        except (AttributeError, IndexError, TypeError) as e:
            logger.error(f"Failed to extract interrupt_data: {e}")

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.USER_INPUT,
            content=interrupt_data.get("question", "User input required"),
            detail={
                "interaction_type": "generic_interrupt",
                "interrupt_data": interrupt_data,
                "session_id": session_id,
            },
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            response_id=response_id,
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
        """Extract content from AIMessage - handle different model formats.

        Note: This method only extracts text content, not reasoning.
        For reasoning support in streaming, see _extract_content_from_chunk.
        """
        if not message:
            return ""

        # Check if message has content_blocks (new format supporting reasoning)
        if hasattr(message, "content_blocks") and message.content_blocks:
            content_blocks = message.content_blocks
            if isinstance(content_blocks, list):
                text_content = ""
                for block in content_blocks:
                    if isinstance(block, dict):
                        block_type = block.get("type", "")
                        # Only extract text blocks for backward compatibility
                        if block_type == "text":
                            text_content += block.get("text", "")
                if text_content.strip():
                    return text_content.strip()

        return extract_text_content(message.content).strip()

    def _extract_reasoning(self, message: AIMessage) -> str:
        """Extract reasoning content from AIMessage.

        Returns:
            Reasoning content if available, empty string otherwise.
        """
        if not message:
            return ""

        # Check if message has content_blocks (new format supporting reasoning)
        if hasattr(message, "content_blocks") and message.content_blocks:
            content_blocks = message.content_blocks
            if isinstance(content_blocks, list):
                reasoning_content = ""
                for block in content_blocks:
                    if isinstance(block, dict):
                        block_type = block.get("type", "")
                        if block_type == "reasoning":
                            reasoning_content += block.get("reasoning", "")
                return reasoning_content.strip()

        return ""

    def _extract_content_from_chunk(self, chunk) -> dict[str, str]:
        """Extract content from streaming chunk.

        Returns:
            dict with keys:
                - 'content': text content from the chunk
                - 'reasoning': reasoning content from the chunk (if available)
        """
        result = {"content": "", "reasoning": ""}

        # Check if chunk has content_blocks (new format supporting reasoning)
        if hasattr(chunk, "content_blocks"):
            content_blocks = chunk.content_blocks
            if isinstance(content_blocks, list):
                for block in content_blocks:
                    if isinstance(block, dict):
                        block_type = block.get("type", "")
                        if block_type == "text":
                            result["content"] += block.get("text", "")
                        elif block_type == "reasoning":
                            result["reasoning"] += block.get("reasoning", "")
                return result

        # Fallback to original content field (legacy format)
        if hasattr(chunk, "content"):
            content = chunk.content
            result["content"] = extract_text_content(content) if content else ""
            return result
        elif isinstance(chunk, dict):
            result["content"] = extract_text_content(chunk.get("content", ""))
            return result

        result["content"] = extract_text_content(chunk) if chunk else ""
        return result

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
        response_id: str,
    ) -> StreamMessage | None:
        """Handle plan tool start events.

        This method processes plan tool events from the PlanTool defined in langchain_tool.py,
        converting them to the appropriate StreamMessage format for the frontend.

        Args:
            event: The LangGraph event containing plan data
            session_id: Current session identifier
            response_id: Current response identifier
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
            steps.append({
                "id": plan_id,
                "title": plan_content,
                "status": status,
                "started_at": timestamp,
            })

        # Ensure plan messages carry langcrew metadata
        detail = self._enhance_detail_with_metadata(event, {"steps": steps})

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.PLAN,
            content="",
            detail=detail,
            role="assistant",
            timestamp=timestamp,
            session_id=session_id,
            response_id=response_id,
        )

    def _handle_agent_result_delivery(
        self,
        event: dict[str, Any],
        detail: dict[str, Any],
        output: Any,
        session_id: str,
        response_id: str,
    ) -> StreamMessage | None:
        """Handle special processing for agent_result_delivery tool output.

        Extracts attachments from result.content and moves them to the same level as result,
        while removing the content field from result.

        Args:
            detail: The detail dictionary to modify
            output: The tool output data
            session_id: Current session identifier
            response_id: Current response identifier

        Returns:
            A StreamMessage with processed agent result data or None if processing fails
        """
        try:
            # Aggregate metadata to ensure delivery messages include agent information
            metadata: dict[str, Any] = {}
            event_metadata = event.get("metadata")
            if isinstance(event_metadata, dict):
                metadata.update(event_metadata)

            event_data = event.get("data")
            if isinstance(event_data, dict):
                data_metadata = event_data.get("metadata")
                if isinstance(data_metadata, dict):
                    metadata.update(data_metadata)

                config_obj = event_data.get("config")
                if isinstance(config_obj, dict):
                    config_metadata = config_obj.get("metadata")
                    if isinstance(config_metadata, dict):
                        metadata.update(config_metadata)

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
            detail = self._enhance_detail_with_metadata({"metadata": metadata}, detail)

            # Return StreamMessage with processed data
            return StreamMessage(
                id=generate_message_id(),
                type=MessageType.TOOL_RESULT,
                content="",  # Empty content as attachments are in detail
                detail=detail,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
                response_id=response_id,
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

    def _extract_first_tool_message_from_output(
        self, output: Any
    ) -> ToolMessage | None:
        """Extract the first ToolMessage from a tool result payload."""
        if isinstance(output, ToolMessage):
            return output

        if isinstance(output, Command):
            update = output.update
            if isinstance(update, dict):
                messages = update.get("messages")
                if isinstance(messages, list):
                    for message in messages:
                        if isinstance(message, ToolMessage):
                            return message

        return None

    def _extract_view_image_url_content(
        self, tool_message: ToolMessage
    ) -> tuple[str | None, str | None]:
        """Extract summary text and image URL from a multimodal ToolMessage."""
        content = tool_message.content
        if not isinstance(content, list):
            return None, None

        summary: str | None = None
        image_url: str | None = None

        for block in content:
            if not isinstance(block, dict):
                continue

            block_type = block.get("type")
            if block_type == "text" and summary is None:
                text = block.get("text")
                if isinstance(text, str) and text:
                    summary = text
            elif block_type == "image_url" and image_url is None:
                image_url_block = block.get("image_url")
                if isinstance(image_url_block, dict):
                    url = image_url_block.get("url")
                    if isinstance(url, str) and url:
                        image_url = url
                elif isinstance(image_url_block, str) and image_url_block:
                    image_url = image_url_block

        return summary, image_url

    def _handle_view_image_url_result(
        self,
        event: dict[str, Any],
        detail: dict[str, Any],
        output: Any,
        session_id: str,
        response_id: str,
    ) -> StreamMessage | None:
        """Project view_image_url results into a UI-friendly tool result message."""
        tool_message = self._extract_first_tool_message_from_output(output)
        if tool_message is None:
            return None

        summary, image_url = self._extract_view_image_url_content(tool_message)
        if not summary or not image_url:
            return None

        detail["full_content"] = summary
        detail = self._enhance_detail_with_metadata(event, detail)

        return StreamMessage(
            id=generate_message_id(),
            type=MessageType.TOOL_RESULT,
            content=summary,
            detail=detail,
            role="assistant",
            timestamp=int(time.time() * 1000),
            session_id=session_id,
            response_id=response_id,
        )
