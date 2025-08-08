"""
Browser tools package

This package provides browser automation tools for LangChain agents.
Includes browser_use tools and patches for enhanced functionality.
"""

# Browser streaming tool and related models
# Browser use patches
from .browser_use_patches import (
    apply_browser_use_patches,
)
from .browser_use_streaming_tool import (
    BrowserStreamingTool,
    BrowserUseInput,
)

# Automatically apply browser_use patches
apply_browser_use_patches()

__all__ = [
    # Browser streaming tool and models (V1)
    "BrowserStreamingTool",
    "BrowserUseInput",
    # Patches and helpers
    "apply_browser_use_patches",
]
