# Fetch Module

# Import and re-export LangChain tools
from .langchain_tools import (
    WebFetchInput,
    WebFetchTool,
)

# Export simple class-based interface
__all__ = [
    # LangChain tools
    "WebFetchTool",
    # Input schemas
    "WebFetchInput",
]