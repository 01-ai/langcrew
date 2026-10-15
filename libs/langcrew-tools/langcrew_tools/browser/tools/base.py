"""
Base class for CDP browser tools

This module provides the base class for all browser tools.
"""

import asyncio
import logging
import uuid

from langchain.tools import BaseTool
from langchain_core.callbacks import CallbackManagerForToolRun
from pydantic import Field

from ...utils.s3.base_s3_client import S3ClientMixin
from ...utils.sandbox.s3_integration import SandboxS3Toolkit
from ..cdp.browser_manager import CDPBrowserManager
from ..helpers.element_selector_enhanced import EnhancedElementSelector

logger = logging.getLogger(__name__)

# 🔒 Session-level interaction locks to prevent race conditions
# Each browser session has its own lock, allowing parallel operations across different sessions
# while preventing focus conflicts within the same session
_session_interaction_locks: dict[str, asyncio.Lock] = {}


def _get_interaction_lock_for_session(session_key: str) -> asyncio.Lock:
    """
    Get or create an interaction lock for a specific browser session

    Args:
        session_key: Unique identifier for the browser session (e.g., cdp_url:session_id)

    Returns:
        Lock for the specified session

    Note:
        Different browser sessions can execute in parallel (different locks).
        Operations within the same session are serialized (same lock).
        Uses dict.setdefault() which is atomic and thread-safe.
    """
    # setdefault is atomic - no race condition, no need for extra lock
    return _session_interaction_locks.setdefault(session_key, asyncio.Lock())


def remove_interaction_lock(session_key: str):
    """
    Remove interaction lock for a specific browser session (called when agent ends)

    Args:
        session_key: Unique identifier for the browser session (e.g., cdp_url:session_id)
    """
    if session_key in _session_interaction_locks:
        del _session_interaction_locks[session_key]


class CDPBrowserTool(BaseTool, S3ClientMixin):
    """
    Base class for all CDP browser tools

    This class provides common functionality for browser tools including:
    - Browser manager access
    - Error handling
    - JSON response formatting
    - Sync-to-async conversion
    - Session ID for element index mapping
    """

    cdp_url: str = Field(
        ..., description="Chrome DevTools Protocol URL (e.g., 'http://localhost:9222')"
    )
    browser_manager: CDPBrowserManager | None = Field(
        default=None, description="Browser manager instance"
    )
    session_id: str = Field(
        default="default", description="Session ID for element index mapping"
    )  # Add session_id
    sandbox_id: str | None = Field(None, description="Sandbox ID for screenshot upload")
    use_local_browser: bool = Field(
        default=False,
        description="Whether to use local browser (if True, no screenshot will be returned)",
    )

    # All browser tools return artifacts (including screenshots) to frontend by default
    response_format: str = "content_and_artifact"

    def __init__(self, **kwargs):
        """
        Initialize browser tool

        Args:
            cdp_url: Chrome DevTools Protocol URL
        """
        cdp_url = kwargs.pop("cdp_url")
        super().__init__(cdp_url=cdp_url, **kwargs)
        self.browser_manager = CDPBrowserManager.get_instance(cdp_url=cdp_url)

    def _run(
        self, *args, run_manager: CallbackManagerForToolRun | None = None, **kwargs
    ) -> str:
        """
        Synchronous wrapper that runs the async _arun method

        Args:
            *args: Positional arguments to pass to _arun
            run_manager: Optional callback manager for tool run
            **kwargs: Keyword arguments to pass to _arun

        Returns:
            JSON string with result
        """
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                result = loop.run_until_complete(self._arun(*args, **kwargs))
                return result
            finally:
                loop.close()

        except Exception as e:
            logger.error(
                f"Error in sync-to-async conversion for {self.__class__.__name__}: {e}"
            )
            return self._error_response(str(e))

    async def _arun(self, **kwargs) -> tuple[str | dict, dict | None]:
        """
        Async implementation (must be overridden by subclasses)

        Args:
            **kwargs: Tool-specific arguments

        Returns:
            tuple: (result, artifact) where result is string/dict and artifact contains metadata
        """
        raise NotImplementedError(f"{self.__class__.__name__}._arun() not implemented")

    def _error_response(self, error_message: str) -> tuple[dict, None]:
        """Create an error response in tuple format for content_and_artifact"""
        return {"success": False, "error": error_message}, None

    async def _get_page(self):
        """Get the current page from browser manager"""
        await self.browser_manager.ensure_browser()
        return await self.browser_manager.get_current_page()

    async def _capture_screenshot(
        self, page, include_screenshot: bool = False, full_page: bool = False
    ) -> str | None:
        """
        Capture a screenshot as base64

        Args:
            page: Playwright page object
            include_screenshot: Whether to actually capture the screenshot (default: False to save tokens)
            full_page: Whether to capture the full scrollable page (default: False, viewport only)

        Returns:
            Base64 encoded screenshot or None
        """
        # Skip screenshot capture by default to save tokens
        if not include_screenshot:
            return None

        try:
            import base64

            screenshot_bytes = await page.screenshot(type="png", full_page=full_page)
            screenshot = base64.b64encode(screenshot_bytes).decode("utf-8")
            return await self._upload_screenshot_to_s3(screenshot)
        except Exception as e:
            logger.warning(f"Failed to capture screenshot: {e}")
            return None

    async def _upload_screenshot_to_s3(self, screenshot: str) -> str:
        # Upload screenshot to S3 if present
        async_s3_client = await self.get_s3_client()
        if async_s3_client:
            try:
                screenshot_url = await SandboxS3Toolkit.upload_base64_image(
                    async_s3_client=async_s3_client,
                    base64_data=screenshot,
                    sandbox_id=self.sandbox_id
                    or str(uuid.uuid4())[:8] + "_local_browser",
                )
                logger.info(f"Successfully uploaded screenshot to S3: {screenshot_url}")
                return screenshot_url
            except Exception as e:
                logger.error(f"Failed to upload screenshot to S3: {e}")
        return None

    async def _return_with_screenshot(
        self, result: str | dict, page=None, full_page: bool = False
    ) -> tuple[str | dict, dict | None]:
        """
        Unified return method: automatically capture screenshot and return (result, artifact)

        Every tool should use this method to return results, which provides screenshots uniformly to the frontend.

        Args:
            result: Tool execution result (string or dictionary)
            page: Playwright page object (if not provided, will automatically get current page)
            full_page: Whether to capture entire page (default False, only capture viewport)

        Returns:
            (result, artifact) tuple, where artifact contains screenshot URL

        Example:
            return await self._return_with_screenshot({"status": "success"})
            return await self._return_with_screenshot({"status": "success"}, full_page=True)
        """
        try:
            # If using local browser, don't return screenshot
            if self.use_local_browser:
                return result, None

            # If no page provided, try to get current page
            if page is None:
                page = await self._get_page()

            # Capture screenshot and upload
            screenshot_url = await self._capture_screenshot(
                page, include_screenshot=True, full_page=full_page
            )

            # Construct artifact
            artifact = {"image_url": screenshot_url} if screenshot_url else None

            return result, artifact

        except Exception as e:
            logger.warning(f"Failed to capture screenshot for tool response: {e}")
            # Return result even if screenshot fails
            return result, None

    async def _get_browser_state(self, page) -> dict:
        """
        Get current browser state

        Args:
            page: Playwright page object

        Returns:
            Dictionary with browser state
        """
        try:
            url = page.url
            title = await page.title()
            viewport = page.viewport_size
            # scroll_x = await page.evaluate("window.pageXOffset || 0")
            # scroll_y = await page.evaluate("window.pageYOffset || 0")

            return {
                "url": url,
                "title": title,
                "viewport": viewport,
                # "scroll_x": scroll_x,
                # "scroll_y": scroll_y,
            }
        except Exception as e:
            logger.warning(f"Failed to get browser state: {e}")
            return {}

    async def _get_full_elements(
        self, page, max_elements: int = 1000, viewport_only: bool = True
    ) -> list:
        """
        Get full list of interactive elements with all details

        Args:
            page: Playwright page object
            max_elements: Maximum number of elements to return (default: 1000 to save tokens)
            viewport_only: If True, only return elements in current viewport (default: True)

        Returns:
            Full list of elements with all attributes (limited to max_elements)
        """
        # 🎯 Use enhanced element selector (consistent with page_state_injection.py)
        # This provides better accuracy for Shadow DOM and complex interactive elements
        elements = await EnhancedElementSelector.get_interactive_elements(
            page, viewport_only=viewport_only
        )
        logger.debug(f"Found {len(elements)} interactive elements")

        # Add recommended selector for each element
        for element in elements:
            element["selector"] = EnhancedElementSelector.generate_selector(element)

        # Limit number of elements to save tokens
        if len(elements) > max_elements:
            logger.info(
                f"Limiting elements from {len(elements)} to {max_elements} to save tokens"
            )
            return elements[:max_elements]

        return elements

    def _generate_selector(self, element: dict) -> str:
        """
        Generate a recommended CSS selector for an element

        Use unified priority logic consistent with page_state_injection.py

        Priority order (consistent with page_state_injection._generate_css_selector):
        1. id (unique identifier)
        2. data-* attributes (testing convention)
        3. onclick (for elements with onclick handlers)
        4. name (form elements)
        5. placeholder (input elements)
        6. href (for links - increased priority, more stable than class)
        7. class + tag (class selector)
        8. text content (fallback)
        """
        tag = element.get("tag", "")
        text = element.get("text", "")
        onclick = element.get("onclick", "")

        # Priority 1: id (unique)
        if element.get("id"):
            return f"#{element['id']}"

        # Priority 2: data-* attributes (e.g., data-testid)
        for key in ["dataTestId", "data-testid", "data-test-id", "data-test"]:
            if element.get(key):
                value = element[key]
                # Convert camelCase to kebab-case
                attr_name = key if key.startswith("data-") else "data-testid"
                return f"[{attr_name}='{value}']"

        # Priority 3: onclick + text (most precise combination)
        if onclick and text:
            onclick_escaped = onclick.replace('"', '\\"').replace("'", "\\'")
            return f'{tag}[onclick="{onclick_escaped}"]'

        # Priority 4: name (form elements)
        if element.get("name"):
            name = element["name"]
            elem_type = element.get("type", "")

            # 🎯 修复：radio 和 checkbox 必须包含 value 属性，否则会选中同名的第一个元素
            if elem_type in ["radio", "checkbox"] and element.get("value"):
                value = element["value"]
                return f"{tag}[name='{name}'][value='{value}']"

            return f"{tag}[name='{name}']"

        # Priority 5: placeholder (input elements)
        if element.get("placeholder"):
            placeholder = element["placeholder"][:30].replace('"', '\\"')
            return f'{tag}[placeholder="{placeholder}"]'

        # Priority 6: href (for links - increased priority, more stable than class)
        if tag == "a" and element.get("href"):
            href = element["href"]
            if href:
                # Relative path: use directly
                if not href.startswith("http"):
                    href_escaped = href.replace('"', '\\"')
                    return f'a[href="{href_escaped}"]'
                else:
                    # Absolute path: extract key parts of path
                    path_without_query = href.split("?")[0]
                    path_parts = path_without_query.split("/")

                    # Find the last meaningful part
                    meaningful_part = None
                    for part in reversed(path_parts):
                        if part and part not in [
                            "http:",
                            "https:",
                            "",
                            "www",
                            "com",
                            "cn",
                            "net",
                            "org",
                        ]:
                            meaningful_part = part
                            break

                    # Use "second-to-last/last" combination (more unique)
                    if (
                        len(path_parts) >= 4
                        and meaningful_part
                        and len(meaningful_part) > 3
                    ):
                        second_last = None
                        found_last = False
                        for part in reversed(path_parts):
                            if part and part not in [
                                "http:",
                                "https:",
                                "",
                                "www",
                                "com",
                                "cn",
                                "net",
                                "org",
                            ]:
                                if not found_last:
                                    found_last = True
                                else:
                                    second_last = part
                                    break

                        if second_last:
                            combined = f"{second_last}/{meaningful_part}"
                            combined_escaped = combined.replace('"', '\\"')
                            return f'a[href*="{combined_escaped}"]'

                    # If no second-to-last segment, use last segment
                    if meaningful_part and len(meaningful_part) > 3:
                        part_escaped = meaningful_part.replace('"', '\\"')
                        return f'a[href*="{part_escaped}"]'

        # Priority 7: class + tag (class selector)
        if element.get("class"):
            class_str = element["class"]
            if isinstance(class_str, str) and class_str.strip():
                classes = class_str.strip().split()
                # Find first meaningful class name
                for cls in classes:
                    if cls and len(cls) > 1 and not cls.startswith("_"):
                        return f"{tag}.{cls}"

        # Priority 8: text content (fallback)
        if text:
            text_escaped = text[:30].replace('"', '\\"')
            return f'{tag}:has-text("{text_escaped}")'

        # Fallback: just tag
        return tag
