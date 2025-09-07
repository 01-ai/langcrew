"""
LangCrew HTTP Server - Minimal & Focused
"""

import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .adapter import LangGraphAdapter
from .protocol import (
    ChatRequest,
    MessageType,
    StopRequest,
    StreamMessage,
    TaskInput,
)
from ..utils.message_utils import generate_message_id

logger = logging.getLogger(__name__)


class AdapterServer:
    """Minimal HTTP server - just protocol conversion"""

    def __init__(self, adapter: LangGraphAdapter):
        if adapter is None:
            raise ValueError("adapter must be provided")

        self.adapter = adapter
        self.app = self._create_app()

    def _create_app(self) -> FastAPI:
        """Create minimal FastAPI application"""

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Application lifecycle management"""
            logger.info("🚀 Starting LangCrew HTTP server")
            yield
            logger.info("🛑 Shutting down LangCrew HTTP server")

        app = FastAPI(
            title="LangCrew HTTP Server",
            description="HTTP API for LangCrew agents with streaming support",
            version="1.0.0",
            lifespan=lifespan,
        )

        # Basic CORS - can be overridden by user middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        self._register_routes(app)
        return app

    def _register_routes(self, app: FastAPI):
        """Register core API routes"""

        @app.get("/health")
        async def health_check():
            """Basic health check"""
            return {"status": "ok", "timestamp": int(time.time() * 1000)}

        @app.post(
            "/api/v1/chat",
            summary="Unified chat interface",
            response_class=StreamingResponse,
        )
        async def chat(request: ChatRequest) -> StreamingResponse:
            """
            Unified chat interface
            - Normal chat: provide message
            - Resume conversation: provide message + interrupt_data
            - Auto-handle new session creation and session continuation

            Session management, rate limiting, etc. should be handled by:
            - Frontend applications
            - API gateways
            - Reverse proxies
            - Custom middleware
            """

            # Session ID handling - unified logic for empty/None session_id
            is_new_session = not request.session_id or request.session_id.strip() == ""
            session_id = (
                uuid.uuid4().hex[:16]  # 16位十六进制，无前缀
                if is_new_session
                else request.session_id
            )

            async def generate():
                try:
                    # Send SESSION_INIT message for new sessions
                    if is_new_session:
                        init_message = StreamMessage(
                            id=generate_message_id(),
                            role="assistant",
                            type=MessageType.SESSION_INIT,
                            content=request.message,
                            detail={
                                "session_id": session_id,
                                "title": request.message,
                            },
                            timestamp=int(time.time() * 1000),
                            session_id=session_id,
                            task_id="",
                        )
                        yield self.adapter._format_sse_message(init_message)

                    # Create task input
                    task_input = TaskInput(
                        session_id=session_id,
                        message=request.message,
                        user_id=request.user_id,
                        language=request.language,
                        interrupt_data=request.interrupt_data,
                    )

                    # Stream execution results
                    async for chunk in self.adapter.execute(task_input):
                        yield chunk

                except asyncio.CancelledError:
                    # Client disconnected - just log and exit gracefully
                    # Don't re-raise, let the generator end naturally
                    logger.warning(f"Client disconnected for session: {session_id}")
                    return

                except Exception as e:
                    logger.error(f"Execution failed for session {session_id}: {e}")

            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Session-ID": session_id,
                },
            )

        @app.post("/api/v1/chat/stop", summary="Stop chat execution")
        async def stop_chat(request: StopRequest):
            """
            Stop chat execution by session ID

            This endpoint stops the current execution for a specific session.
            The session_id can be obtained from the chat API response headers.
            """
            success = False
            if hasattr(self.adapter, "set_stop_flag"):
                try:
                    success = await self.adapter.set_stop_flag(
                        request.session_id, request.reason
                    )
                except Exception as e:
                    logger.error(f"Failed to stop session {request.session_id}: {e}")

            return {
                "success": success,
                "session_id": request.session_id,
                "reason": request.reason,
                "message": "Stop request sent"
                if success
                else "Session not found or stop failed",
            }

    def run(self, host: str = "0.0.0.0", port: int = 8000, **kwargs):
        """
        Start server - follows uvicorn.run() signature

        Args:
            host: Host to bind to
            port: Port to bind to
            **kwargs: Additional uvicorn options (log_level, access_log, etc.)
        """
        import uvicorn

        logger.info(f"Starting server on {host}:{port}")

        uvicorn.run(self.app, host=host, port=port, **kwargs)


def create_server(crew) -> AdapterServer:
    """
    Create minimal HTTP server for LangCrew

    Args:
        crew: LangCrew Crew instance

    Returns:
        AdapterServer with .app attribute for adding custom routes

    Example:
        # Basic usage
        server = create_server(crew)
        server.run()

        # Custom host/port
        server = create_server(crew)
        server.run(host="127.0.0.1", port=8080)

        # With uvicorn options
        server = create_server(crew)
        server.run(host="0.0.0.0", port=8000, log_level="debug", access_log=True)

        # Add custom routes
        server = create_server(crew)

        @server.app.get("/custom")
        async def custom_endpoint():
            return {"message": "Custom endpoint"}

        server.run()
    """
    if crew is None:
        raise ValueError("Crew instance must be provided")

    adapter = LangGraphAdapter(crew)
    return AdapterServer(adapter=adapter)


def create_langgraph_server(compiled_graph) -> AdapterServer:
    """
    Create minimal HTTP server for pure LangGraph usage

    Args:
        compiled_graph: CompiledStateGraph instance (must be pre-compiled)
                       This bypasses all LangCrew logic and uses pure LangGraph

                       💡 TIP: For best web performance, use async components:
                       - AsyncSqliteSaver instead of SqliteSaver
                       - AsyncPostgresSaver instead of PostgresSaver
                       - InMemorySaver works for both sync/async

    Returns:
        AdapterServer with .app attribute for adding custom routes

    Example:
        # Pure LangGraph usage
        from langgraph.graph import StateGraph
        from langgraph.checkpoint.aiosqlite import AsyncSqliteSaver

        # Build and compile your graph
        builder = StateGraph(YourState)
        builder.add_node("node1", your_function)
        # ... build your graph

        # Compile with async configuration
        compiled_graph = builder.compile(
            checkpointer=AsyncSqliteSaver.from_conn_string("sqlite:///test.db")
        )

        # Create server (no LangCrew logic involved)
        server = create_langgraph_server(compiled_graph)
        server.run()

        # Custom host/port
        server = create_langgraph_server(compiled_graph)
        server.run(host="127.0.0.1", port=8080)

        # With uvicorn options
        server = create_langgraph_server(compiled_graph)
        server.run(host="0.0.0.0", port=8000, log_level="debug", access_log=True)

        # Add custom routes
        server = create_langgraph_server(compiled_graph)

        @server.app.get("/custom")
        async def custom_endpoint():
            return {"message": "Custom endpoint"}

        server.run()
    """
    if compiled_graph is None:
        raise ValueError("Compiled graph instance must be provided")

    # Only accept CompiledStateGraph for pure LangGraph usage
    from langgraph.graph.state import CompiledStateGraph

    if not isinstance(compiled_graph, CompiledStateGraph):
        raise ValueError(
            f"compiled_graph must be a CompiledStateGraph (pre-compiled). "
            f"Got {type(compiled_graph)}. "
            f"If you want LangCrew to compile the graph, use create_server() with a Crew instead."
        )

    # Simple performance hint (optional)
    _log_performance_hint(compiled_graph)

    # Use graph directly without any LangCrew logic
    adapter = LangGraphAdapter(compiled_graph=compiled_graph)
    return AdapterServer(adapter=adapter)


def _log_performance_hint(compiled_graph) -> None:
    """Log performance warnings if sync components detected."""
    import logging

    logger = logging.getLogger(__name__)

    hints = []

    # Check checkpointer
    if hasattr(compiled_graph, "checkpointer") and compiled_graph.checkpointer:
        checkpointer_name = type(compiled_graph.checkpointer).__name__
        if "Async" not in checkpointer_name and "InMemory" not in checkpointer_name:
            hints.append(f"checkpointer ({checkpointer_name})")

    # Check store
    if hasattr(compiled_graph, "store") and compiled_graph.store:
        store_name = type(compiled_graph.store).__name__
        if "Async" not in store_name and "InMemory" not in store_name:
            hints.append(f"store ({store_name})")

    # Log enhanced warning if any issues found
    if hints:
        components = " and ".join(hints)

        warning_msg = (
            f"\n{'=' * 60}\n"
            f"⚠️  PERFORMANCE WARNING: Web Server Optimization\n"
            f"{'=' * 60}\n"
            f"Detected potentially synchronous {components} in web context.\n"
            f"This may impact server performance and responsiveness.\n\n"
            f"💡 Consider using async alternatives for better performance:\n"
            f"  • AsyncSqliteSaver, AsyncPostgresSaver, or InMemorySaver\n"
            f"  • Async store implementations when available\n\n"
            f"ℹ️  Synchronous components can block the web server event loop\n"
            f"{'=' * 60}"
        )

        logger.warning(warning_msg)
