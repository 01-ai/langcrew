"""Core server logic (framework-agnostic)."""

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator

from langchain_core.runnables.config import RunnableConfig
from langgraph.graph.state import CompiledStateGraph

from ..controllable import StopReason
from ..crew import Crew
from ..utils.message_utils import (
    extract_text_content,
    generate_message_id,
    generate_session_id,
)
from .adapter import LangGraphAdapter
from .protocol import (
    Action,
    ClientToolResultRequest,
    CustomActionRequest,
    MessageType,
    Request,
    StreamMessage,
    UserMessageRequest,
)

logger = logging.getLogger(__name__)


class AdapterServer:
    """
    Core server for LangCrew crews.

    Subclass and override on_action() to customize action handling:

    Example:
        ```python
        class MyServer(AdapterServer):
            async def on_action(self, action, session_id, **kwargs):
                if action.type == "refresh_data":
                    data = await self.fetch_data(action.payload["id"])
                    async for msg in self.adapter.stream(
                        content=f"Refreshed data: {data}",
                        session_id=session_id,
                    ):
                        yield msg

        server = MyServer(crew)
        ```

    Default behavior (without subclassing):
        ```python
        server = AdapterServer(crew)  # Actions forwarded to agent
        ```
    """

    def __init__(
        self,
        crew: Crew | None = None,
        stream_reasoning: bool = True,
        *,
        compiled_graph: CompiledStateGraph | None = None,
    ):
        """
        Initialize server.

        Args:
            crew: Crew instance to serve
            stream_reasoning: Whether to emit reasoning chunks to clients
            compiled_graph: Compiled LangGraph to serve
        """
        self.crew = crew
        self.compiled_graph = compiled_graph
        self.adapter = LangGraphAdapter(
            crew=crew,
            compiled_graph=compiled_graph,
            stream_reasoning=stream_reasoning,
        )

    async def stream(
        self,
        request: Request,
        config: RunnableConfig | None = None,
    ) -> AsyncGenerator[StreamMessage, None]:
        """
        Process request and stream responses.

        Handles all request types:
        - USER_MESSAGE: User sends a message
        - CUSTOM_ACTION: Widget interactions
        - CLIENT_TOOL_RESULT: Client tool execution results

        Args:
            request: The request to process
            config: Optional RunnableConfig for LangGraph execution
        """
        match request:
            case UserMessageRequest():
                async for msg in self._handle_user_message(request, config):
                    yield msg
            case CustomActionRequest():
                async for msg in self._handle_custom_action(request, config):
                    yield msg
            case ClientToolResultRequest():
                async for msg in self._handle_client_tool_result(request, config):
                    yield msg

    async def stream_sse(
        self,
        request: Request,
        config: RunnableConfig | None = None,
    ) -> AsyncGenerator[str, None]:
        """Process request and stream SSE formatted responses."""
        async for msg in self.stream(request, config):
            yield msg.to_sse()

    async def invoke(self, request: Request) -> dict:
        """
        Non-streaming execution (NOT IMPLEMENTED YET).

        Streaming is currently the supported execution mode for Web servers.

        Raises:
            NotImplementedError: Use stream() for now
        """
        raise NotImplementedError(
            "invoke() is not implemented yet. "
            "Please use stream() or stream_sse() instead."
        )

    async def stop(
        self, session_id: str, reason: StopReason = StopReason.USER_CANCEL
    ) -> bool:
        """Stop execution for session.

        Args:
            session_id: Session identifier
            reason: Stop reason

        Returns:
            bool: Whether stop was successful
        """
        try:
            return await self.adapter.stop(session_id, reason)
        except Exception:
            logger.exception("Failed to stop session %s", session_id)
            return False

    # ============ User-overridable method ============

    async def on_action(
        self,
        action: Action,
        session_id: str,
        user_id: str | None = None,
        language: str | None = None,
    ) -> AsyncGenerator[StreamMessage, None]:
        """
        Handle custom action (override in subclass to customize).

        **This method is not called by default.** Actions are automatically
        forwarded to the agent as JSON unless you override this method in a subclass.

        Override this method to implement custom action handling logic. You can:
        - Return direct responses (e.g., UI updates, data)
        - Forward to agent with custom context
        - Perform side effects (e.g., database updates)

        Args:
            action: The action from frontend
            session_id: Session identifier
            user_id: Optional user identifier
            language: Optional language preference

        Yields:
            StreamMessage: Response messages to send to client

        Example:
            ```python
            class MyServer(AdapterServer):
                async def on_action(self, action, session_id, **kwargs):
                    if action.type == "refresh_data":
                        # Fetch data from your database
                        data = await self.db.get_data(action.payload["id"])

                        # Forward to agent with context (multiple yields)
                        async for msg in self.adapter.stream(
                            content=f"User refreshed data: {data}",
                            session_id=session_id,
                        ):
                            yield msg

                    elif action.type == "send_notification":
                        # Return direct response (single yield)
                        yield StreamMessage(
                            id=generate_message_id(),
                            type=MessageType.TEXT,
                            content="Notification sent!",
                            session_id=session_id,
                            timestamp=int(time.time() * 1000),
                        )

            server = MyServer(crew)
            ```

        Note:
            - **Default behavior**: Actions are forwarded to agent as JSON
            - **Override behavior**: Your custom logic handles the action
            - **Must use `yield`**: Use `yield` to send messages (not `return`)
            - Can yield once or multiple times as needed
        """
        # This method is not called unless overridden (framework checks at runtime)
        # When overriding, use 'yield' to send messages - see examples above
        return
        yield  # Makes this an async generator - DO NOT REMOVE

    # ============ Internal implementation (do not override) ============

    async def _handle_user_message(
        self,
        request: UserMessageRequest,
        config: RunnableConfig | None = None,
    ) -> AsyncGenerator[StreamMessage, None]:
        """Handle user message."""
        try:
            # Direct access to flat fields
            content = request.content
            interrupt_data = request.interrupt_data

            if isinstance(content, (str, list)) and not content:
                raise ValueError("content is required for user_message")

            # Determine session_id and whether to send session_init
            if request.is_new_session is True:
                is_new_session = True
                session_id = request.session_id or generate_session_id()
            elif request.session_id:
                is_new_session = False
                session_id = request.session_id
            else:
                is_new_session = True
                session_id = generate_session_id()

            if is_new_session:
                title = extract_text_content(content).strip()
                yield self._create_session_init(session_id, title)

            # Call adapter.stream with config
            async for msg in self.adapter.stream(
                content=content,
                session_id=session_id,
                user_id=request.user_id,
                language=request.language,
                interrupt_data=interrupt_data,
                metadata=request.metadata,
                config=config,
            ):
                yield msg

        except asyncio.CancelledError:
            logger.warning(f"Client disconnected: {request.session_id}")
            raise
        except Exception as e:
            logger.error(f"User message handling failed: {e}", exc_info=True)
            yield StreamMessage.create_error(str(e), request.session_id or "")

    async def _handle_custom_action(
        self, request: CustomActionRequest, config: RunnableConfig | None = None
    ) -> AsyncGenerator[StreamMessage, None]:
        """Handle custom action (internal, do not override)."""
        try:
            # Access action from params
            action = request.params.action
            session_id = request.session_id or ""

            # Check if on_action was overridden by a subclass
            if type(self).on_action is not AdapterServer.on_action:
                # User provided custom implementation
                logger.debug(f"Handling action '{action.type}' with custom handler")
                async for msg in self.on_action(
                    action=action,
                    session_id=session_id,
                    user_id=request.user_id,
                    language=request.language,
                ):
                    yield msg
                return

            # Default behavior: forward action to agent as JSON
            logger.debug(
                f"Action '{action.type}' forwarded to agent (no custom handler)"
            )
            message = json.dumps(
                {
                    "action_type": action.type,
                    "action_payload": action.payload,
                    "action_label": action.label,
                },
                ensure_ascii=False,
            )

            async for msg in self.adapter.stream(
                content=message,
                session_id=session_id,
                user_id=request.user_id,
                language=request.language,
                config=config,
            ):
                yield msg

        except Exception as e:
            logger.error(f"Custom action handling failed: {e}", exc_info=True)
            yield StreamMessage.create_error(str(e), request.session_id or "")

    async def _handle_client_tool_result(
        self, request: ClientToolResultRequest, config: RunnableConfig | None = None
    ) -> AsyncGenerator[StreamMessage, None]:
        """Handle client tool result."""
        try:
            # Access fields from params
            call_id = request.params.call_id
            output = request.params.output

            logger.info(f"Client tool result: {call_id}")

            message = json.dumps({"call_id": call_id, "result": output})
            interrupt_data = {"type": "client_tool_call"}

            async for msg in self.adapter.stream(
                content=message,
                session_id=request.session_id or "",
                user_id=request.user_id,
                language=request.language,
                interrupt_data=interrupt_data,
                config=config,
            ):
                yield msg

        except Exception as e:
            logger.error(f"Client tool result handling failed: {e}", exc_info=True)
            yield StreamMessage.create_error(str(e), request.session_id or "")

    def _create_session_init(self, session_id: str, title: str) -> StreamMessage:
        """Create SESSION_INIT message."""
        return StreamMessage(
            id=generate_message_id(),
            role="assistant",
            type=MessageType.SESSION_INIT,
            content=title,
            detail={
                "session_id": session_id,
                "title": title,
            },
            timestamp=int(time.time() * 1000),
            session_id=session_id,
        )
