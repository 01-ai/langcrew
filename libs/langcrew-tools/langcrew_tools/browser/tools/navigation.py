"""
Navigation tools for browser automation

This module provides tools for navigating web pages.
"""

import asyncio
import logging
import re

from langchain_core.callbacks import AsyncCallbackManagerForToolRun
from pydantic import BaseModel, Field

from .base import CDPBrowserTool
from .content import _extract_markdown_from_html

logger = logging.getLogger(__name__)


class BrowserNavigateInput(BaseModel):
    """Input schema for browser navigation"""

    url: str = Field(description="The URL to navigate to")
    new_page: bool = Field(default=False, description="Open in new tab/page")
    include_content: bool = Field(
        default=False, description="Whether to extract and return page text content"
    )


class BrowserNavigateTool(CDPBrowserTool):
    """Tool for navigating to a specific URL"""

    name: str = "browser_navigate"
    description: str = (
        "Navigate to a specific URL in the browser. "
        "Use include_content=True to automatically extract page text content. "
        "Returns the page information and optionally the text content."
    )
    args_schema: type[BaseModel] = BrowserNavigateInput

    @staticmethod
    def _extract_page_content(html_content: str) -> str | None:
        """
        Optimized content extraction with fallback strategies.

        Strategies (in order):
        1. Trafilatura (best for articles/content)
        2. Regex-based cleanup (faster than BeautifulSoup)
        3. BeautifulSoup (fallback for complex cases)

        Args:
            html_content: Raw HTML content

        Returns:
            Extracted text content or None if extraction fails
        """
        # Strategy 1: Try trafilatura first (best for content extraction)
        content = _extract_markdown_from_html(html_content)

        if content and len(content.strip()) >= 50:
            return content

        logger.warning("Markdown extraction insufficient, trying regex-based cleanup")

        # Strategy 2: Fast regex-based cleanup (much faster than BeautifulSoup)
        try:
            # Remove scripts and styles
            text = re.sub(
                r"<script[^>]*>.*?</script>",
                "",
                html_content,
                flags=re.DOTALL | re.IGNORECASE,
            )
            text = re.sub(
                r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE
            )
            # Remove comments
            text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
            # Remove all tags
            text = re.sub(r"<[^>]+>", " ", text)
            # Decode HTML entities
            import html

            text = html.unescape(text)
            # Normalize whitespace
            text = " ".join(text.split())

            if text and len(text.strip()) >= 50:
                logger.info("Successfully extracted content using regex method")
                return text
        except Exception as e:
            logger.warning(f"Regex extraction failed: {e}")

        # Strategy 3: BeautifulSoup fallback (slower but more reliable)
        try:
            from bs4 import BeautifulSoup

            logger.info("Falling back to BeautifulSoup extraction")
            soup = BeautifulSoup(html_content, "lxml")

            # Remove unwanted tags
            for tag in soup(["script", "style", "meta", "noscript", "svg", "path"]):
                tag.decompose()

            content = " ".join(soup.stripped_strings)

            if content and len(content.strip()) >= 50:
                return content
        except ImportError:
            logger.warning("BeautifulSoup not available")
        except Exception as e:
            logger.warning(f"BeautifulSoup extraction failed: {e}")

        return None

    async def _arun(
        self,
        url: str,
        new_page: bool = False,
        include_content: bool = False,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> tuple[str, dict]:
        """
        Navigate to a specific URL

        Args:
            url: The URL to navigate to
            new_page: Whether to open in a new tab
            include_content: Whether to extract and return page text content
            run_manager: Optional callback manager

        Returns:
            JSON string with navigation result and optionally text content
        """
        try:
            if new_page:
                page = await self.browser_manager.new_page()
                logger.info(f"Opened new page and navigating to {url}")
            else:
                page = await self._get_page()
                logger.info(f"Navigating to {url}")

            # Optimized navigation: use domcontentloaded for fast initial load
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)

            # Try to wait for network idle with a short timeout (best effort)
            # This balances speed and completeness
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                # Network idle timeout is not critical, page is already usable
                pass

            # Get browser state
            state = await self._get_browser_state(page)
            result = {
                "url": state.get("url", url),
                "title": state.get("title", ""),
                "viewport": state.get("viewport"),
            }

            # Extract text content if requested
            if include_content:
                html_content = await page.content()
                content = self._extract_page_content(html_content)
                if content:
                    result["page_content"] = {
                        "text": content,
                        "char_count": len(content),
                    }
                    logger.info(f"Extracted {len(content)} characters from {url}")
                else:
                    result["page_content"] = {
                        "error": "Failed to extract content from page"
                    }

            logger.info(f"Successfully navigated to {url}")
            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Navigation error: {e}")
            return self._error_response(f"Failed to navigate to {url}: {str(e)}")


class BrowserGoBackInput(BaseModel):
    """Input schema for browser go back (no parameters needed)"""

    pass


class BrowserGoBackTool(CDPBrowserTool):
    """Tool for navigating back in browser history"""

    name: str = "browser_back"
    description: str = (
        "Navigate back in browser history. "
        "Returns the full list of interactive elements on the page."
    )
    args_schema: type[BaseModel] = BrowserGoBackInput

    async def _arun(
        self, run_manager: AsyncCallbackManagerForToolRun | None = None
    ) -> str:
        """
        Navigate back in browser history

        Args:
            run_manager: Optional callback manager

        Returns:
            JSON string with navigation result and full element list
        """
        try:
            page = await self._get_page()
            logger.info("Going back in browser history")

            await page.go_back(wait_until="domcontentloaded", timeout=30000)

            # Wait for network idle (with timeout)
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                logger.warning("Network idle timeout going back")

            # Get browser state
            state = await self._get_browser_state(page)

            # Simplified return: does not include element list
            result = {
                "url": state.get("url", ""),
                "title": state.get("title", ""),
                "viewport": state.get("viewport"),
            }

            logger.info("Successfully went back")
            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Go back error: {e}")
            return self._error_response(f"Failed to go back: {str(e)}")


class BrowserWaitInput(BaseModel):
    """Input schema for browser wait"""

    seconds: int = Field(default=3, description="Number of seconds to wait")


class BrowserWaitTool(CDPBrowserTool):
    """Tool for waiting and getting updated page state"""

    name: str = "browser_wait"
    description: str = (
        "Wait for the specified number of seconds and get updated page state. "
        "Returns a summary of page elements (not full list)."
    )
    args_schema: type[BaseModel] = BrowserWaitInput

    async def _arun(
        self,
        seconds: int = 3,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> tuple[str | dict, dict | None]:
        """
        Wait for specified seconds and return updated state

        Args:
            seconds: Number of seconds to wait
            run_manager: Optional callback manager

        Returns:
            JSON string with wait result and element summary
        """
        try:
            page = await self._get_page()
            logger.info(f"Waiting {seconds} seconds")

            await asyncio.sleep(seconds)

            # Get browser state
            state = await self._get_browser_state(page)

            result = {
                "waited_seconds": seconds,
                "url": state.get("url", ""),
                "title": state.get("title", ""),
            }

            logger.info(f"Successfully waited {seconds} seconds")
            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Wait error: {e}")
            return self._error_response(f"Failed to wait: {str(e)}")
