"""
Page inspection tools for browser automation

This module provides tools for inspecting page elements to enable
intelligent element selection by AI agents.
"""

import logging

from langchain_core.callbacks import AsyncCallbackManagerForToolRun
from pydantic import BaseModel, Field

from .base import CDPBrowserTool

logger = logging.getLogger(__name__)


class BrowserGetElementsInput(BaseModel):
    """Input schema for getting page elements"""

    filter_text: str | None = Field(
        default=None,
        description="Optional text filter to only return elements containing this text",
    )


class BrowserGetElementsTool(CDPBrowserTool):
    """
    Tool for getting all interactive elements on the current page

    This tool returns a complete list of all interactive elements (buttons, inputs, links, etc.)
    with their recommended CSS selectors. Use this tool when you need to discover what elements
    are available on the page before interacting with them.

    The returned information includes:
        - tag: HTML tag name
        - text: Visible text content
        - id: Element ID (if present)
        - class: Element class names
        - selector: Recommended CSS selector for this element
        - Other attributes (name, type, placeholder, data-testid, etc.)
    """

    name: str = "browser_get_elements"
    description: str = (
        "Search for interactive elements on the page. If multiple attempts fail to find the corresponding clickable element, you can use this tool to search"
        # "Get ALL interactive elements on the current page with their CSS selectors. "
        # "Use this tool to discover available elements before clicking or interacting. "
        "Returns: tag, text, id, class, and recommended CSS selector for each element."
    )
    args_schema: type[BaseModel] = BrowserGetElementsInput

    async def _arun(
        self,
        filter_text: str | None = None,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """
        Get all interactive elements on the current page

        Args:
            filter_text: Optional text filter to only return elements containing this text
            run_manager: Optional callback manager

        Returns:
            JSON string with list of elements and their selectors
        """
        try:
            page = await self._get_page()

            # Get full element list using base class method
            elements = await self._get_full_elements(page, viewport_only=False)

            # Filter by text if provided
            if filter_text:
                filter_lower = filter_text.lower()
                elements = [
                    e
                    for e in elements
                    if filter_lower in (e.get("text") or "").lower()
                    or filter_lower in (e.get("id") or "").lower()
                    or filter_lower in (e.get("class") or "").lower()
                    or filter_lower in (e.get("placeholder") or "").lower()
                ]
                logger.info(
                    f"Filtered to {len(elements)} elements matching '{filter_text}'"
                )

            # Get browser state
            state = await self._get_browser_state(page)

            result = {
                "url": state.get("url", ""),
                "title": state.get("title", ""),
                "element_count": len(elements),
                "elements": elements,
            }

            logger.info(f"Found {len(elements)} interactive elements")
            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Get elements error: {e}")
            return self._error_response(f"Failed to get elements: {str(e)}")
