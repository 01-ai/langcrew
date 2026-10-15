"""
Browser tools for LangChain agents

This module provides CDP-based browser tools for automation.

File organization:
- base.py: Base class for all browser tools
- navigation.py: Page navigation tools (navigate, back, wait)
- interaction.py: User interaction tools (click, input, scroll, tabs, enhanced_click)
- inspection.py: Page inspection tools (get_elements)
- content.py: Content extraction tools (extract_text, extract_hyperlinks)
- vision.py: Visual tools (screenshot, visual_analysis)
- utility.py: Utility tools (execute_js)
"""

from .base import CDPBrowserTool
from .content import ExtractHyperlinksTool, ExtractTextTool
from .inspection import BrowserGetElementsTool
from .interaction import (
    BrowserClickTool,
    BrowserCloseTabTool,
    BrowserInputTextTool,
    BrowserListTabsTool,
    BrowserPressKeysTool,
    BrowserSwitchTabTool,
    ScrollTool,
    UserTakeOverTool,
)
from .navigation import BrowserGoBackTool, BrowserNavigateTool, BrowserWaitTool
from .utility import BrowserExecuteJSTool
from .vision import BrowserScreenshotTool, BrowserVisualAnalysisTool

__all__ = [
    # Base
    "CDPBrowserTool",
    # Navigation
    "BrowserNavigateTool",
    "BrowserGoBackTool",
    "BrowserWaitTool",
    # Inspection
    "BrowserGetElementsTool",
    "ScrollTool",
    # Basic Interaction
    "BrowserClickTool",
    "BrowserInputTextTool",
    "BrowserPressKeysTool",
    # Tab management
    "BrowserSwitchTabTool",
    "BrowserCloseTabTool",
    "BrowserListTabsTool",
    "UserTakeOverTool",
    # Content extraction
    "ExtractTextTool",
    "ExtractHyperlinksTool",
    # Visual tools
    "BrowserScreenshotTool",
    "BrowserVisualAnalysisTool",
    # Utility
    "BrowserExecuteJSTool",
]
