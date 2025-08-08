"""LangGraph Adapter for Web Server.

This adapter directly uses LangGraph's streaming capabilities to provide
real-time updates to web clients via SSE (Server-Sent Events).
"""

import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any, Optional, Union

from langchain_core.messages import AIMessage
from langchain_core.messages.human import HumanMessage
from langchain_core.messages.tool import ToolMessage
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
        "on_tool_start",
        "on_tool_end",
        "on_chat_model_end",
        "on_custom_event",
    }

    # Simple session state storage
    _session_states: dict[str, dict[str, Any]] = {}

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
        self._display_language: str = "en"  # Default to English

    @classmethod
    def _get_session_state(cls, session_id: str) -> dict[str, Any]:
        """Get session state for the given session_id."""
        if session_id not in cls._session_states:
            cls._session_states[session_id] = {}
        return cls._session_states[session_id]

    @classmethod
    def _set_session_state(cls, session_id: str, key: str, value: Any) -> None:
        """Set a value in session state."""
        if session_id not in cls._session_states:
            cls._session_states[session_id] = {}
        cls._session_states[session_id][key] = value

    @classmethod
    def _get_session_value(cls, session_id: str, key: str, default: Any = None) -> Any:
        """Get a value from session state."""
        return cls._get_session_state(session_id).get(key, default)

    @classmethod
    async def set_stop_flag(
        cls, session_id: str, reason: str = "User requested"
    ) -> bool:
        """Set stop flag for a session.

        Args:
            session_id: The session ID to stop
            reason: The reason for stopping

        Returns:
            True if stop flag was set successfully
        """
        cls._set_session_state(session_id, "user_stop", 3)
        cls._set_session_state(session_id, "stop_reason", reason)
        logger.info(f"Stop flag set for session {session_id}: {reason}")
        return True

    @classmethod
    def clear_stop_flag(cls, session_id: str) -> None:
        """Clear stop flag for a session.

        Args:
            session_id: The session ID to clear
        """
        cls._set_session_state(session_id, "user_stop", None)
        cls._set_session_state(session_id, "stop_reason", None)
        logger.info(f"Stop flag cleared for session {session_id}")

    @property
    def executor(self) -> Union[Crew, "CompiledStateGraph"]:
        """Get the executor instance."""
        if self.crew:
            return self.crew
        return self.compiled_graph

    @property
    def checkpointer(self):
        """Get checkpointer from executor with proper handling for both types."""
        if self.crew and hasattr(self.crew, "checkpointer"):
            return self.crew.checkpointer
        elif self.compiled_graph:
            # CompiledStateGraph stores checkpointer differently
            return getattr(self.compiled_graph, "checkpointer", None)
        return None

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
        config = self._build_config(execution_input.session_id, **config_kwargs)

        # Detect display language
        if execution_input.language:
            self._display_language = execution_input.language
        elif execution_input.user_input:
            self._display_language = detect_language(execution_input.user_input)
        else:
            self._display_language = "en"

        try:
            input_data = self._prepare_input(execution_input)

            # Control whether to send messages to client
            # Non-resume: send all, Resume: wait for completed event
            should_send_messages = not execution_input.is_resume

            # Execution state tracking
            task_ended = False
            need_user_input = False

            async for event in self.executor.astream_events(
                input=input_data, config=config, version="v2"
            ):
                event_type = event.get("event")

                # Resume mode: check for completed events
                if execution_input.is_resume and event_type == "on_custom_event":
                    event_name = event.get("name")
                    if event_name in [
                        "on_langcrew_user_input_completed",
                        "on_langcrew_tool_approval_completed",
                    ]:
                        logger.info(
                            f"{event_name} for session {execution_input.session_id}. "
                            f"Resuming execution with response: {event.get('data', {})}"
                        )
                        should_send_messages = True
                        continue

                # Check task end conditions
                is_root_event = len(event.get("parent_ids", [])) == 0
                if is_root_event:
                    if event_type == "on_chain_end":
                        task_ended = True
                        if need_user_input:
                            async for finish_message in self._handle_finish_signal(
                                execution_input.session_id,
                                "Waiting for user input",
                                TaskExecutionStatus.USER_INPUT,
                            ):
                                yield finish_message
                        else:
                            async for finish_message in self._handle_finish_signal(
                                execution_input.session_id,
                                "Task completed",
                                TaskExecutionStatus.COMPLETED,
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

                # Process tracked event types - only send if enabled
                if event_type in self.TRACKED_EVENTS and should_send_messages:
                    message = await self._convert_langgraph_event(
                        event, execution_input.session_id
                    )

                    if message:
                        # Check if user input is needed
                        if message.type == MessageType.USER_INPUT:
                            need_user_input = True
                            logger.debug("User input needed due to USER_INPUT message")
                        elif message.type == MessageType.TOOL_APPROVAL_REQUEST:
                            need_user_input = True
                            logger.debug(
                                "Tool approval needed due to TOOL_APPROVAL_REQUEST message"
                            )
                        elif (
                            message.type == MessageType.MESSAGE_NOTIFY_USER
                            and message.detail.get("intent_type") == "asking_user"
                        ):
                            need_user_input = True

                        # Handle special tool events
                        message = await self._handle_special_tool_events(
                            event, execution_input.session_id, message
                        )

                        if message:
                            yield await self._format_sse_message(message)

                # Check stop signal
                if event_type == "on_tool_end":
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
            logger.error(f"Execution failed: {e}")
            async for finish_message in self._handle_finish_signal(
                execution_input.session_id,
                str(e),
                TaskExecutionStatus.FAILED,
            ):
                yield finish_message

    async def _convert_langgraph_event(
        self, event: dict[str, Any], session_id: str
    ) -> StreamMessage | None:
        """Convert LangGraph v2 event format to StreamMessage."""
        event_type = event.get("event")
        data = event.get("data", {})

        # Extract common fields
        message_id = generate_message_id()

        # Convert based on event type
        if event_type == "on_chain_start":
            return StreamMessage(
                id=message_id,
                type=MessageType.LIVE_STATUS,
                content=f"Starting: {event.get('name', 'chain')}",
                detail={"event": "chain_start", "name": event.get("name")},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_chain_end":
            return StreamMessage(
                id=message_id,
                type=MessageType.LIVE_STATUS,
                content=f"Completed: {event.get('name', 'chain')}",
                detail={"event": "chain_end", "name": event.get("name")},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_tool_start":
            run_id = event.get("run_id")  # Use run_id as correlation ID
            tool_name = event.get("name", None)

            # Skip sending tool_start message for message_notify_user tool
            # We'll only send the final result with MessageType.MESSAGE_NOTIFY_USER
            if tool_name == "message_notify_user":
                return None

            # Skip sending tool_start message for user_input tool
            # This prevents the tool_call message from being sent to frontend
            if tool_name == "user_input":
                return None

            tool_input = data.get("input", {})
            brief = tool_input.get("brief", "")

            # Generate display fields with current task language
            display_fields = ToolDisplayManager.get_display(
                tool_name, tool_input, self._display_language
            )

            return StreamMessage(
                id=message_id,
                type=MessageType.TOOL_CALL,
                content=brief,
                detail={
                    "run_id": run_id,  # Use run_id instead of call_id
                    "tool": tool_name,
                    "status": ToolResult.PENDING,
                    "param": tool_input,
                    "action": display_fields["action"],
                    "action_content": display_fields["action_content"],
                },
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )
        elif event_type == "on_tool_end":
            run_id = event.get("run_id")  # Use run_id as correlation ID
            tool_name = event.get("name", None)
            output = data.get("output", "")
            # BUG: content may be an empty list, which needs special handling
            content = str(getattr(output, "content", str(output)))
            tool_input = data.get("input", {}) or {}
            brief = tool_input.get("brief", "")

            return StreamMessage(
                id=message_id,
                type=MessageType.TOOL_RESULT,
                content=brief,
                detail={
                    "tool": tool_name,
                    "run_id": run_id,  # Use run_id for correlation
                    "result": output,
                    "status": ToolResult.SUCCESS,
                },
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_tool_error":
            run_id = event.get("run_id")  # Use run_id as correlation ID
            tool_name = event.get("name", None)
            error = data.get("error", "Unknown tool error")

            # Extract error message
            if hasattr(error, "message"):
                error_message = error.message
            elif hasattr(error, "args") and error.args:
                error_message = str(error.args[0])
            else:
                error_message = str(error)

            return StreamMessage(
                id=message_id,
                type=MessageType.TOOL_RESULT,
                content=error_message,
                detail={
                    "run_id": run_id,  # Use run_id for correlation
                    "tool": tool_name,
                    "status": ToolResult.FAILED,
                    "output": error_message,
                    "error": error_message,
                    "error_type": type(error).__name__
                    if hasattr(error, "__class__")
                    else "Unknown",
                },
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )
        elif event_type == "on_chat_model_end":
            output = event["data"].get("output")
            if output:
                message: AIMessage = output
                content: str = ""
                if isinstance(message.content, list):
                    for c in message.content:
                        if isinstance(c, str):
                            content += c
                        elif isinstance(c, dict):
                            if c.get("type") == "text":
                                content += c.get("text", "")
                else:
                    content = message.content

                if len(message.tool_calls) > 0:
                    # If tool calls exist, don't output content. Claude has content, most models don't.
                    # Sometimes Claude's output content is like thinking, which is not user-friendly
                    logger.info(
                        f"tool_calls exists, content ignored content: {content}"
                    )
                    return None

                if len(message.tool_calls) == 0:
                    input = event["data"].get("input")
                    if input:
                        input_messages = input.get("messages")
                        if (
                            len(input_messages) >= 1
                            and isinstance(input_messages[0][-1], ToolMessage)
                            and input_messages[0][-1].name == "message_notify_user"
                        ):
                            return None

                # Default processing for regular messages
                # If content is empty string, return None
                if not content:
                    return None
                # ignore summary message
                metadata = event.get("metadata", {})
                if metadata.get("langgraph_node") == "pre_model_hook":
                    logger.info(f"pre_model_hook, ignore content: {content}")
                    return None
                return StreamMessage(
                    id=message_id,
                    type=MessageType.TEXT,
                    content=content,
                    detail={"streaming": False, "final": True},
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )

        elif event_type == "on_chat_model_stream":
            # Handle streaming LLM output
            chunk = data.get("chunk")
            if chunk:
                # Handle AIMessageChunk objects
                if hasattr(chunk, "content"):
                    content = chunk.content
                    # Handle Claude's content structure which can be [{"text": "xx"}]
                    if isinstance(content, list):
                        extracted_content = ""
                        for item in content:
                            if isinstance(item, dict) and "text" in item:
                                extracted_content += item.get("text", "")
                            elif isinstance(item, str):
                                extracted_content += item
                        content = extracted_content
                elif isinstance(chunk, dict):
                    content = chunk.get("content", "")
                else:
                    content = str(chunk)

                if content:
                    return StreamMessage(
                        id=message_id,
                        type=MessageType.TEXT,
                        content=content,
                        detail={"streaming": True},
                        role="assistant",
                        timestamp=int(time.time() * 1000),
                        session_id=session_id,
                    )

        elif event_type == "on_llm_error":
            error = data.get("error", "Unknown error")
            return StreamMessage(
                id=message_id,
                type=MessageType.ERROR,
                content=f"LLM Error: {error}",
                detail={"error": str(error)},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_agent_action":
            # Agent planning or action
            action = data.get("action", "")
            return StreamMessage(
                id=message_id,
                type=MessageType.PLAN,
                content=action,
                detail=data,
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_llm_start":
            # LLM thinking/processing
            return StreamMessage(
                id=message_id,
                type=MessageType.LIVE_STATUS,
                content="Thinking...",
                detail={"event": "llm_start", "model": event.get("name")},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_retriever_start":
            # Retriever/search started
            return StreamMessage(
                id=message_id,
                type=MessageType.LIVE_STATUS,
                content=f"Searching: {event.get('name', 'information')}",
                detail={"event": "retriever_start"},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_parser_start":
            # Parser started
            return StreamMessage(
                id=message_id,
                type=MessageType.LIVE_STATUS,
                content="Processing response...",
                detail={"event": "parser_start"},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif event_type == "on_custom_event":
            # Handle custom events from LangCrew
            event_name = event.get("name")

            if event_name == "on_langcrew_plan_start":
                # Plan creation event from Plan-and-Execute executor
                plan_data = data
                # Convert phases to steps format for frontend compatibility
                steps = []
                current_phase_id = plan_data.get("current_phase_id", 1)

                for phase in plan_data.get("phases", []):
                    phase_id = phase.get("id")

                    # Determine status based on phase_id and current_phase_id
                    status = StepStatus.PENDING
                    if phase_id == current_phase_id:
                        status = StepStatus.RUNNING
                    elif phase_id < current_phase_id:
                        status = StepStatus.SUCCESS

                    steps.append({
                        "id": str(phase_id),
                        "title": phase["title"],
                        "description": phase.get("expected_output", ""),
                        "status": status,
                        "started_at": int(time.time() * 1000),
                    })

                return StreamMessage(
                    id=message_id,
                    type=MessageType.PLAN,
                    content=plan_data.get("goal", "Planning execution"),
                    detail={
                        "steps": steps,
                    },
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )

            elif event_name == "on_langcrew_step_start":
                # Step start event from Plan-and-Execute executor
                step_data = data
                step_id = step_data.get("step_id", "")

                # Create steps array with current step marked as running
                # and previous step (if any) marked as success
                steps = []

                # If this isn't the first step, add the previous step as completed
                if step_id > 1:
                    steps.append({
                        "id": f"{step_id - 1}",
                        "status": StepStatus.SUCCESS,
                        "started_at": int(time.time() * 1000),
                    })

                # Add current step as running
                steps.append({
                    "id": f"{step_id}",
                    "status": StepStatus.RUNNING,
                    "started_at": int(time.time() * 1000),
                })

                return StreamMessage(
                    id=message_id,
                    type=MessageType.PLAN_UPDATE,
                    content=f"开始执行步骤 {step_id}: {step_data.get('step_description', '')}",
                    detail={
                        "action": PlanAction.UPDATE,
                        "steps": steps,
                    },
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )
            elif event_name == "on_langcrew_step_end":
                # Step end event from Plan-and-Execute executor
                step_data = data
                steps = []
                steps.append({
                    "id": f"{step_data.get('step_id', '')}",
                    "status": StepStatus.SUCCESS,
                    "started_at": int(time.time() * 1000),
                })
                return StreamMessage(
                    id=message_id,
                    type=MessageType.PLAN_UPDATE,
                    content=f"步骤 {step_data.get('step_id', '')} 完成",
                    detail={
                        "action": PlanAction.UPDATE,
                        "steps": steps,
                    },
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )

            elif event_name == "on_langcrew_plan_created":
                # Plan creation event from Plan-and-Execute executor
                plan_data = data
                task_type = plan_data.get("task_type", "")

                # For simple tasks, return a text message with the direct response
                if task_type == "simple":
                    direct_response = plan_data.get("direct_response", "")
                    return StreamMessage(
                        id=message_id,
                        type=MessageType.TEXT,
                        content=direct_response,
                        detail={"streaming": False, "final": True},
                        role="assistant",
                        timestamp=int(time.time() * 1000),
                        session_id=session_id,
                    )

                steps = []
                if "plan" in plan_data:
                    plan = plan_data.get("plan", {})
                    steps_data = plan.get("steps", [])
                    for i, step in enumerate(steps_data):
                        steps.append({
                            "id": str(i + 1),
                            "title": step.get("description", "Step"),
                            "status": StepStatus.PENDING
                            if i > 0
                            else StepStatus.RUNNING,
                            "started_at": int(time.time() * 1000),
                        })

                return StreamMessage(
                    id=message_id,
                    type=MessageType.PLAN,
                    content=plan_data.get("task_type", "Planning execution"),
                    detail={"steps": steps},
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )

            elif event_name == "on_langcrew_sandbox_created":
                # Sandbox creation event from E2B tools
                sandbox_data = data
                return StreamMessage(
                    id=message_id,
                    type=MessageType.CONFIG,
                    content="update_session",
                    detail={
                        "session_id": sandbox_data.get("session_id"),
                        "sandbox_id": sandbox_data.get("sandbox_id"),
                        "sandbox_url": sandbox_data.get("sandbox_url"),
                    },
                    role="inner_message",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
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

                return StreamMessage(
                    id=message_id,
                    type=MessageType.USER_INPUT,
                    content=input_data.get("question", "Please provide input"),
                    detail=detail,
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )
            elif event_name == "on_langcrew_tool_approval_required":
                # Tool approval required event from HITL tools
                approval_data = data
                tool_info = approval_data.get("tool", {})

                # Use current task language for content
                is_chinese = self._display_language == "zh"
                if is_chinese:
                    content = f"需要审批工具: {tool_info.get('name', 'unknown')}"
                else:
                    content = (
                        f"Tool approval required: {tool_info.get('name', 'unknown')}"
                    )

                return StreamMessage(
                    id=message_id,
                    type=MessageType.TOOL_APPROVAL_REQUEST,
                    content=content,
                    detail={
                        "tool_name": tool_info.get("name"),
                        "tool_args": tool_info.get("args", {}),
                        "tool_description": tool_info.get("description", ""),
                        "approval_type": "tool_execution",
                        "interrupt_data": approval_data,
                    },
                    role="assistant",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )
            elif event_name == "on_langcrew_new_message":
                new_message = data.get("new_message", "")
                return StreamMessage(
                    id=message_id,
                    type=MessageType.TEXT,
                    content=new_message,
                    detail={},
                    role="user",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )

        # Log unknown events for debugging (but don't send to frontend)
        if event_type and not event_type.startswith("on_chain"):
            logger.debug(f"Unhandled event type: {event_type}")

        # Filter out events we don't need to send to frontend
        return None

    async def _handle_special_tool_events(
        self,
        event: dict[str, Any],
        session_id: str,
        original_msg: StreamMessage | None = None,
    ) -> StreamMessage | None:
        """Handle special tool events for agent_update_plan and agent_advance_phase.

        Args:
            event: LangGraph event dictionary
            session_id: Session identifier
            original_msg: Original message from adapter (if any)

        Returns:
            Special StreamMessage for plan tools or original_msg for other tools
        """
        event_type = event.get("event", "unknown")
        tool_name = event.get("name", "unknown_tool")

        if event_type == "on_tool_start" and tool_name in ["agent_advance_phase"]:
            return None

        if tool_name not in [
            "agent_update_plan",
            "agent_advance_phase",
        ]:
            return original_msg

        message_id = generate_message_id()

        if event_type == "on_tool_start" and tool_name == "agent_update_plan":
            tool_input = event.get("data", {}).get("input", {})
            phases = tool_input.get("phases", [])
            # Validate phases type
            if not isinstance(phases, list):
                logger.error(
                    f"Invalid phases type: {type(phases)}, expected list, got {phases}"
                )
                return None
            # Use current task language instead of detecting from goal
            is_chinese = self._display_language == "zh"
            if is_chinese:
                goal_lines = ["我将按照下列计划进行工作：\n"]
            else:
                goal_lines = ["I will work according to the following plan:\n"]
            steps = []
            for phase in phases:
                phase_id = (
                    phase.get("id")
                    if isinstance(phase, dict)
                    else getattr(phase, "id", None)
                )
                phase_title = (
                    phase.get("title")
                    if isinstance(phase, dict)
                    else getattr(phase, "title", "")
                )
                goal_lines.append(f"{phase_id}. {phase_title}")
            if is_chinese:
                goal_lines.append(
                    "\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。"
                )
            else:
                goal_lines.append(
                    "\nDuring my work, you can interrupt me at any time to provide new information or adjust the plan."
                )
            content = "\n".join(goal_lines)
            return StreamMessage(
                id=message_id,
                type=MessageType.MESSAGE_NOTIFY_USER,
                content=content,
                detail={},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )
        # Special handling for agent_update_plan tool
        if tool_name == "agent_update_plan":
            tool_input = event.get("data", {}).get("input", {})
            goal = tool_input.get("goal", "AI 的规划")
            phases = tool_input.get("phases", [])
            current_phase_id = tool_input.get("current_phase_id", 1)

            steps = []
            for phase in phases:
                phase_id = (
                    phase.get("id")
                    if isinstance(phase, dict)
                    else getattr(phase, "id", None)
                )
                phase_title = (
                    phase.get("title")
                    if isinstance(phase, dict)
                    else getattr(phase, "title", "")
                )

                status = (
                    StepStatus.RUNNING
                    if phase_id == current_phase_id
                    else StepStatus.PENDING
                )
                if phase_id < current_phase_id:
                    status = StepStatus.SUCCESS

                steps.append({
                    "id": f"{phase_id}",
                    "title": phase_title,
                    "status": status,
                    "started_at": int(time.time() * 1000),
                })

            return StreamMessage(
                id=message_id,
                type=MessageType.PLAN,
                content=goal,
                detail={
                    "steps": steps,
                },
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        elif tool_name == "agent_advance_phase":
            tool_input = event.get("data", {}).get("input", {})
            from_phase_id = tool_input.get("from_phase_id", 1)
            to_phase_id = tool_input.get("to_phase_id", 2)
            steps = [
                {
                    "id": f"{from_phase_id}",
                    "status": StepStatus.SUCCESS,
                    "started_at": int(time.time() * 1000),
                },
                {
                    "id": f"{to_phase_id}",
                    "status": StepStatus.RUNNING,
                    "started_at": int(time.time() * 1000),
                },
            ]

            return StreamMessage(
                id=message_id,
                type=MessageType.PLAN_UPDATE,
                content="计划推进说明",
                detail={
                    "action": PlanAction.UPDATE.value,
                    "steps": steps,
                },
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )

        return original_msg

    async def _handle_finish_signal(
        self,
        session_id: str,
        reason: str = "Task completed",
        status: str = "completed",
    ):
        """Send finish signal.

        Args:
            session_id: Session identifier
            reason: Reason for finishing
            status: Task execution status

        Yields:
            SSE formatted finish message
        """
        yield await self._format_sse_message(
            StreamMessage(
                id=generate_message_id(),
                type=MessageType.FINISH_REASON,
                content="Task finished",
                detail={"reason": reason, "status": status},
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )
        )

    async def _check_stop_signal(self, session_id: str) -> dict[str, Any] | None:
        """Check for stop signal from session state.

        Args:
            session_id: Session identifier

        Returns:
            Stop signal data if stop is requested, None otherwise
        """
        stop_flag = self._get_session_value(session_id, "user_stop")
        if stop_flag and stop_flag > 2:
            logger.warning(
                "User requested to stop the task, but the task not stopped, please check the task"
            )
            return {"stop_requested": True, "stop_reason": "User requested"}
        return None

    async def _handle_stop_signal(
        self,
        control_data: dict[str, Any],
        session_id: str,
    ):
        """Handle stop signal by sending cancellation message and clearing flag.

        Args:
            control_data: The control data containing stop information
            session_id: The session ID

        Yields:
            SSE formatted cancellation message
        """
        # Send cancellation message
        yield await self._format_sse_message(
            StreamMessage(
                id=generate_message_id(),
                type=MessageType.FINISH_REASON,
                content="Task cancelled by user",
                detail={
                    "reason": control_data.get("stop_reason", "User requested"),
                    "status": TaskExecutionStatus.CANCELLED,
                },
                role="assistant",
                timestamp=int(time.time() * 1000),
                session_id=session_id,
            )
        )
        # Clear the stop flag
        self.clear_stop_flag(session_id)

    @staticmethod
    def create_sse_handler(crew):
        """
        Create a simple SSE handler for integration with custom servers.

        Args:
            crew: LangCrew Crew instance

        Returns:
            Async function that accepts ExecutionInput and yields SSE strings

        Example:
            from langcrew.web import LangGraphAdapter

            # Create SSE handler
            sse_handler = LangGraphAdapter.create_sse_handler(crew)

            # Use in your FastAPI/Flask app
            @app.post("/chat")
            async def chat(request: dict):
                execution_input = ExecutionInput(
                    session_id=request.get("session_id"),
                    user_input=request.get("content")
                )

                return StreamingResponse(
                    sse_handler(execution_input),
                    media_type="text/event-stream"
                )
        """
        adapter = LangGraphAdapter(crew)
        return adapter.execute

    @staticmethod
    def create_message_generator(crew):
        """
        Create a message generator for direct integration without SSE formatting.

        Args:
            crew: LangCrew Crew instance

        Returns:
            Async function that yields StreamMessage objects

        Example:
            from langcrew.web import LangGraphAdapter

            # Create message generator
            message_gen = LangGraphAdapter.create_message_generator(crew)

            # Use in your custom implementation
            async for message in message_gen(execution_input):
                # Process message as needed
                await websocket.send(message.model_dump_json())
        """
        adapter = LangGraphAdapter(crew)

        async def generate_messages(execution_input: ExecutionInput):
            """Generate StreamMessage objects without SSE formatting."""
            async for sse_chunk in adapter.execute(execution_input):
                # Parse SSE format back to message
                if sse_chunk.startswith("data: "):
                    message_data = json.loads(sse_chunk[6:].strip())
                    yield StreamMessage(**message_data)

        return generate_messages
