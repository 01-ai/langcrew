"""
Advanced interaction tools for browser automation

This module provides tools for advanced interactions like hover, select, checkbox, etc.
"""

import logging

from langchain_core.callbacks import AsyncCallbackManagerForToolRun
from pydantic import BaseModel, Field

from .base import CDPBrowserTool

logger = logging.getLogger(__name__)


class BrowserExecuteJSInput(BaseModel):
    """Input schema for execute JavaScript tool"""

    javascript: str = Field(description="JavaScript code to execute in the page")


class BrowserExecuteJSTool(CDPBrowserTool):
    """
    Tool for executing custom JavaScript in the page context

    This is a powerful tool for advanced operations not covered by other tools.
    Use with caution and only when necessary.
    """

    name: str = "browser_execute_js"
    description: str = (
        "Execute custom JavaScript code in the page . "
        "Returns the result of the last expression. "
        "Examples: 'document.title', 'window.scrollY', "
        "'[...document.querySelectorAll(\"a\")].map(a => a.href)' "
        "Use this for advanced operations not covered by other tools."
    )
    args_schema: type[BaseModel] = BrowserExecuteJSInput

    async def _arun(
        self,
        javascript: str,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Execute JavaScript code"""
        try:
            page = await self._get_page()
            logger.info(f"Executing JavaScript: {javascript[:100]}...")

            js_result = await page.evaluate(javascript)

            # Try to serialize the result
            try:
                import json

                serialized = json.dumps(js_result, ensure_ascii=False, default=str)
            except Exception as e:
                logger.error(f"Failed to serialize JavaScript result: {e}")
                serialized = str(js_result)

            result = {
                "javascript": javascript,
                "result": serialized,
            }

            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Execute JS error: {e}")
            return self._error_response(f"Failed to execute JavaScript: {str(e)}")
