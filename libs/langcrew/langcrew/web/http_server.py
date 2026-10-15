"""FastAPI server for standalone deployment."""

import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langgraph.graph.state import CompiledStateGraph

from .protocol import Request, StopRequest
from .server import AdapterServer

logger = logging.getLogger(__name__)


def create_app(server: AdapterServer) -> FastAPI:
    """Create FastAPI app with AdapterServer."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("🚀 LangCrew HTTP server started")
        yield
        logger.info("🛑 LangCrew HTTP server stopped")

    app = FastAPI(
        title="LangCrew HTTP Server",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"status": "ok", "timestamp": int(time.time() * 1000)}

    @app.post("/api/v1/stream")
    @app.post("/api/v1/chat")  # Backward compatibility alias
    async def stream(request: Request):
        """
        Unified streaming execution endpoint.

        Endpoints:
            - /api/v1/stream (primary)
            - /api/v1/chat (deprecated, backward compatibility)
        """
        return StreamingResponse(
            server.stream_sse(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Session-ID": request.session_id or "",
            },
        )

    @app.post("/api/v1/invoke")
    async def invoke(request: Request):
        """
        Non-streaming execution endpoint (NOT IMPLEMENTED).

        Returns error with guidance to use /stream instead.
        """
        return {
            "error": "NotImplementedError",
            "message": (
                "invoke() is not implemented yet. "
                "Please use POST /api/v1/stream instead for now."
            ),
            "use_instead": "/api/v1/stream",
        }

    @app.post("/api/v1/stop")
    @app.post("/api/v1/chat/stop")  # Backward compatibility alias
    async def stop(request: StopRequest):
        """
        Stop execution endpoint.

        Endpoints:
            - /api/v1/stop (primary)
            - /api/v1/chat/stop (deprecated, backward compatibility)
        """
        success = await server.stop(request.session_id, request.reason)
        return {
            "success": success,
            "session_id": request.session_id,
            "message": "Stop sent" if success else "Stop failed",
        }

    return app


class Server:
    """Server wrapper providing both app access and run method."""

    def __init__(self, app: FastAPI):
        self.app = app

    def run(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        log_level: str = "info",
        access_log: bool = True,
    ):
        """Run the server with uvicorn."""
        uvicorn.run(
            self.app,
            host=host,
            port=port,
            log_level=log_level,
            access_log=access_log,
        )


def create_server(crew):
    """
    Create FastAPI server for LangCrew.

    Args:
        crew: Crew instance to serve

    Returns:
        Server: Server wrapper with .app (FastAPI) and .run() method

    Examples:
        # Basic usage with .run()
        from langcrew.web import create_server
        server = create_server(crew)
        server.run(host="0.0.0.0", port=8000)

        # Advanced usage with custom routes
        from langcrew.web import create_server
        server = create_server(crew)

        @server.app.get("/custom")
        async def custom():
            return {"message": "custom"}

        server.run()

        # Direct uvicorn usage
        from langcrew.web import create_server
        import uvicorn
        server = create_server(crew)
        uvicorn.run(server.app, host="0.0.0.0", port=8000)
    """
    if crew is None:
        raise ValueError("Crew required")

    adapter_server = AdapterServer(crew)
    app = create_app(adapter_server)
    return Server(app)


def create_langgraph_server(compiled_graph: CompiledStateGraph) -> Server:
    """Create a FastAPI server for a compiled LangChain or LangGraph agent.

    The graph must follow the messages state convention used by LangChain agents:
    normal requests are passed as ``{"messages": [HumanMessage(...)]}``, and
    interrupted executions are resumed with ``Command(resume=...)``.
    """
    if not isinstance(compiled_graph, CompiledStateGraph):
        raise TypeError(
            "compiled_graph must be a CompiledStateGraph. "
            "Compile a StateGraph first, or pass the result of "
            "langchain.agents.create_agent()."
        )

    adapter_server = AdapterServer(compiled_graph=compiled_graph)
    app = create_app(adapter_server)
    return Server(app)
