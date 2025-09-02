#!/usr/bin/env python3
"""
Simplified Web Chat API Server using FastAPI directly

This is a simplified version of the chat API server that uses FastAPI directly
while maintaining the original langcrew dependencies and logic. It removes the
langcrew web component wrapper for easier customization.

Features:
- Direct FastAPI implementation
- Original LangGraphAdapter and dependencies
- Identical chat and stop endpoint logic to original version
- Streaming response support
- CORS support
- Automatic API documentation
"""

import argparse
import asyncio
import logging
import time
import uuid

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from super_agent.agent.crew import SuperAgentCrew
from langcrew.web import LangGraphAdapter
from langcrew.web.protocol import (
    ChatRequest,
    StreamMessage,
    StopRequest,
    TaskInput,
    MessageType,
)
from langcrew.web import generate_message_id

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.base import BaseCheckpointSaver

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global session management - using original crew_adapter_manager
crew_adapter_manager: dict[str, LangGraphAdapter] = {}

CHECKPOINTER: BaseCheckpointSaver = InMemorySaver()


def create_app() -> FastAPI:
    """Create FastAPI application"""

    app = FastAPI(
        title="Super Agent Chat API",
        description="Simplified chat API server using FastAPI directly",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", tags=["Info"])
    async def root():
        """API root endpoint, returns basic information"""
        return {
            "name": "Super Agent Chat API",
            "version": "0.1.0",
            "description": "Simplified chat API server using FastAPI directly",
            "endpoints": {
                "chat": "POST /api/v1/chat",
                "stop": "POST /api/v1/chat/stop",
                "health": "GET /api/v1/health",
                "docs": "GET /docs",
                "redoc": "GET /redoc",
            },
            "features": [
                "Multi-turn conversations",
                "Tool calling",
                "Real-time streaming responses",
                "Session management",
                "Stop/resume functionality",
            ],
        }

    @app.get("/api/v1/health", tags=["Health Check"])
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "timestamp": int(time.time() * 1000),
            "version": "0.1.0",
        }

    @app.post(
        "/api/v1/chat",
        summary="Unified chat interface",
        response_class=StreamingResponse,
        tags=["Chat"],
    )
    async def chat(request: ChatRequest) -> StreamingResponse:
        """
        Unified chat interface - completely consistent with original version logic
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
            f"session_{uuid.uuid4().hex[:16]}" if is_new_session else request.session_id
        )

        async def generate():
            crew = SuperAgentCrew(session_id, checkpointer=CHECKPOINTER).crew()
            adapter = LangGraphAdapter(crew)
            # clear stop flag
            crew_adapter_manager[session_id] = adapter
            try:
                # Send session init for new sessions
                if is_new_session:
                    init_message = StreamMessage(
                        id=generate_message_id(),
                        role="assistant",
                        type=MessageType.SESSION_INIT,
                        content=request.message,
                        detail={"session_id": session_id, "title": request.message},
                        timestamp=int(time.time() * 1000),
                        session_id=session_id,
                    )
                    yield adapter._format_sse_message(init_message)

                # Create execution input
                execution_input = TaskInput(
                    session_id=session_id,
                    message=request.message,
                    language=request.language,
                    interrupt_data=request.interrupt_data,
                )

                # Stream execution results
                async for chunk in adapter.execute(execution_input):
                    yield chunk
                async with adapter.execute(execution_input) as result:
                   result

            except asyncio.CancelledError:
                # Client disconnected - just log and exit gracefully
                # Don't re-raise, let the generator end naturally
                logger.warning(f"Client disconnected for session: {session_id}")
                return  # Exit generator cleanly

            except Exception as e:
                logger.exception(f"Execution failed for session {session_id}: {e}")
                error_message = StreamMessage(
                    id=generate_message_id(),
                    role="assistant",
                    type=MessageType.ERROR,
                    content=f"Execution failed: {str(e)}",
                    timestamp=int(time.time() * 1000),
                    session_id=session_id,
                )
                yield await adapter._format_sse_message(error_message)

            finally:
                logger.info(f"Session {session_id} completed")
                crew_adapter_manager.pop(session_id, None)

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Session-ID": session_id,
            },
        )

    @app.post("/api/v1/chat/stop", summary="Stop chat execution", tags=["Chat"])
    async def stop_chat(request: StopRequest):
        """Stop chat execution - completely consistent with original version logic"""
        success = False
        session_id = request.session_id
        logger.info(f"Stopping chat for session {session_id}")
        if session_id in crew_adapter_manager:
            adapter = crew_adapter_manager[session_id]
            try:
                success = await adapter.crew.stop_agent()
                if hasattr(adapter, "set_stop_flag"):
                    success = await adapter.set_stop_flag(
                        request.session_id, "User stopped"
                    )
            except Exception as e:
                logger.error(f"Failed to stop session {request.session_id}: {e}")
        else:
            logger.warning(f"Session {session_id} not found")
        return {
            "success": success,
            "session_id": request.session_id,
            "message": "Stop request sent"
            if success
            else "Stop not supported or failed",
        }

    @app.post("/api/v1/update_task", summary="Update task", tags=["update task"])
    async def update_task(request: ChatRequest):
        """Update task - completely consistent with original version logic"""
        success = False
        session_id = request.session_id
        logger.info(f"Updating task for session {session_id}")
        if session_id in crew_adapter_manager:
            adapter = crew_adapter_manager[session_id]
            try:
                success = await adapter.crew.send_new_message(request.message)
            except Exception as e:
                logger.error(f"Failed to update task {request.session_id}: {e}")
        else:
            logger.warning(f"Session {session_id} not found")
        return {
            "success": success,
            "session_id": request.session_id,
            "message": "update task request sent"
            if success
            else "update task not supported or failed",
        }

    return app


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Simplified Web Chat API Server")
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind the server to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind the server to (default: 8000)",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error"],
        help="Log level (default: info)",
    )

    return parser.parse_args()


# Create the ASGI application instance at module level
# This allows uvicorn to find it when using "uvicorn super_agent.server:app"
app = create_app()


def main():
    """Main entry point"""
    args = parse_args()

    # Set log level
    log_level = getattr(logging, args.log_level.upper())
    logging.getLogger().setLevel(log_level)

    logger.info("Initializing Simplified Web Chat API Server...")
    logger.info("Starting FastAPI Server")
    logger.info(f"Server: http://{args.host}:{args.port}")
    logger.info(f"API Docs: http://localhost:{args.port}/docs")
    logger.info(f"ReDoc: http://localhost:{args.port}/redoc")
    logger.info(f"Health Check: http://localhost:{args.port}/api/v1/health")

    # Start server using the module-level app
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        access_log=True,
    )


if __name__ == "__main__":
    main()
