#!/usr/bin/env python3
"""
Web Chat API Server using LangCrew Web Components

This server provides a RESTful API for chat interactions with streaming support.
It's designed to be consumed by frontend applications, mobile apps, or other services.

Two modes available:
- Simple mode: Uses basic langcrew HTTP server without custom endpoints
- Full mode (default): Includes additional API information endpoints and features
"""

import argparse
import logging

from fastapi.middleware.cors import CORSMiddleware
from langcrew.web import create_server
from .crew import WebChatCrew

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_simple_server():
    """Create a simple server using langcrew's built-in HTTP server"""

    logger.info("🤖 Initializing Web Chat Crew...")
    crew = WebChatCrew()

    logger.info("🌐 Creating simple LangCrew web server...")
    # Just use the default create_server without any customization
    server = create_server(crew=crew.crew())

    return server


def create_full_server():
    """Create AdapterServer with LangCrew web server and additional endpoints"""

    logger.info("🤖 Initializing Web Chat Crew...")
    crew = WebChatCrew()

    logger.info("🌐 Creating full-featured LangCrew web server...")
    server = create_server(crew=crew.crew())

    # Configure CORS for production-like environment
    # This overrides the default permissive CORS settings
    logger.info("🔒 Configuring CORS middleware...")
    server.app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add custom root endpoint with API information
    @server.app.get("/", tags=["Info"])
    async def root():
        """API information and available endpoints"""
        return {
            "name": "Web Chat API",
            "version": "0.1.0",
            "description": "LangCrew Web Chat API with streaming support",
            "endpoints": {
                "chat": "POST /api/v1/chat",
                "stop": "POST /api/v1/chat/stop",
                "health": "GET /api/v1/health",
                "docs": "GET /docs",
                "redoc": "GET /redoc",
            },
            "features": [
                "Multi-turn conversations",
                "Tool calling (calculator, search, weather, timezone, user_input)",
                "Real-time streaming responses",
                "Session management",
                "Stop/resume functionality",
            ],
        }

    # Add additional API information
    @server.app.get("/api/v1/info", tags=["Info"])
    async def info():
        """Detailed API information"""
        return {
            "api_version": "v1",
            "server_version": "0.1.0",
            "supported_features": {
                "streaming": True,
                "multi_turn": True,
                "tool_calling": True,
                "session_management": True,
                "stop_resume": True,
            },
            "available_tools": [
                "calculator",
                "web_search",
                "weather",
                "timezone",
                "user_input",
            ],
            "rate_limits": {
                "requests_per_minute": 60,
                "concurrent_sessions": 10,
            },
        }

    return server


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Web Chat API Server")
    parser.add_argument(
        "--mode",
        type=str,
        choices=["simple", "full"],
        default="full",
        help="Server mode: 'simple' for basic server, 'full' for server with additional endpoints (default: full)",
    )
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


def main():
    """Main entry point"""
    args = parse_args()

    # Set log level
    log_level = getattr(logging, args.log_level.upper())
    logging.getLogger().setLevel(log_level)

    # Create server based on mode
    if args.mode == "simple":
        logger.info("🔧 Running in SIMPLE mode (basic langcrew server)")
        server = create_simple_server()
    else:
        logger.info("🔧 Running in FULL mode (with additional endpoints)")
        server = create_full_server()

    # Log startup information
    if args.mode == "simple":
        logger.info("🚀 Starting Simple Web Chat Server")
        logger.info(f"📡 Server: http://{args.host}:{args.port}")
        logger.info(f"📚 API Docs: http://localhost:{args.port}/docs")
    else:
        logger.info("🚀 Starting Full Web Chat API Server")
        logger.info(f"📡 Server: http://{args.host}:{args.port}")
        logger.info(f"📚 API Docs: http://localhost:{args.port}/docs")
        logger.info(f"📖 ReDoc: http://localhost:{args.port}/redoc")
        logger.info(f"❤️  Health Check: http://localhost:{args.port}/api/v1/health")
        logger.info(f"ℹ️  API Info: http://localhost:{args.port}/api/v1/info")

    # Start server using the encapsulated run method
    server.run(
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        access_log=True,
    )


if __name__ == "__main__":
    main()
