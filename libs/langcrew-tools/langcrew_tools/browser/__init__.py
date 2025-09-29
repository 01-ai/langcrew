"""
Browser tools package

This package provides browser automation tools for LangChain agents.
Includes browser_use tools and patches for enhanced functionality.
"""

import sys

# Validate environment and dependency before import to avoid failures on Python 3.10
if sys.version_info < (3, 11):
    raise ImportError(
        "langcrew_tools.browser requires Python >= 3.11. "
        f"Detected {sys.version_info.major}.{sys.version_info.minor}. "
        "Upgrade Python to use browser tools, or avoid importing this subpackage."
    )

try:
    # Browser streaming tool and related models
    # Browser use patches
    from .browser_use_patches import (
        apply_browser_use_patches,
    )
    from .browser_use_streaming_tool import (
        BrowserStreamingTool,
        BrowserUseInput,
    )
except Exception as exc:
    # Provide clear guidance when optional dependency is missing
    raise ImportError(
        "Browser tools require the optional dependency 'browser-use'. "
        "Install it on Python >=3.11, e.g.: pip install 'browser-use==0.5.5'."
    ) from exc

# Automatically apply browser_use patches
apply_browser_use_patches()

__all__ = [
    # Browser streaming tool and models (V1)
    "BrowserStreamingTool",
    "BrowserUseInput",
    # Patches and helpers
    "apply_browser_use_patches",
]
