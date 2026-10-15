"""
Browser connection management using CDP

This module provides CDP-based browser connection and management.
"""

from .connection import CDPSession
from .browser_manager import CDPBrowserManager

__all__ = ["CDPSession", "CDPBrowserManager"]
