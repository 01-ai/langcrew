# Search Module

# Import and re-export LangChain tools
from .langchain_tools import SearchSource, WebSearchInput, WebSearchTool

# Export simple class-based interface
__all__ = [
    # LangChain tools
    "SearchSource",
    "WebSearchTool",
    # Input schemas
    "WebSearchInput",
]
