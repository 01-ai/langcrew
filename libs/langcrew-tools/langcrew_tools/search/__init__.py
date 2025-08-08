# Search Module

# Import and re-export LangChain tools
from .langchain_tools import (
    WebSearchInput,
    WebSearchTool,
)

# Export simple class-based interface
__all__ = [
    # LangChain tools
    "WebSearchTool",
    # Input schemas
    "WebSearchInput",
]
