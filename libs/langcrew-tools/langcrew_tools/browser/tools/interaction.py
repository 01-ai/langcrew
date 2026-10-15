"""
Interaction tools for browser automation

This module provides tools for interacting with web page elements using CSS selectors.
Interaction tools return a simplified element summary to maintain context.

Supports index system: Can click elements directly by index (recommended) or use traditional CSS selectors.
"""

import asyncio
import logging
from typing import ClassVar

from langchain_core.callbacks import AsyncCallbackManagerForToolRun
from pydantic import BaseModel, Field

from langcrew_tools.base import BaseToolInput

from ..helpers.element_selector import CSSElementSelector, ElementNotFoundError
from ..middleware.element_index import get_element
from .base import CDPBrowserTool, _get_interaction_lock_for_session

logger = logging.getLogger(__name__)


class ScrollInput(BaseModel):
    """Input schema for scroll tool"""

    direction: str = Field(
        ..., description="Direction: 'down', 'up', 'to_bottom', 'to_top'"
    )
    pixels: int = Field(
        800, description="Pixels to scroll each time (only for down/up)"
    )


class ScrollTool(CDPBrowserTool):
    """Unified tool for scrolling the page in any direction"""

    name: str = "browser_scroll"
    description: str = (
        "Scroll the current page. Use 'to_bottom' for infinite scroll pages."
    )
    args_schema: type[BaseModel] = ScrollInput

    async def _arun(
        self,
        direction: str,
        pixels: int = 800,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """
        Scroll the page in the specified direction

        Args:
            direction: Direction to scroll ('down', 'up', 'to_bottom', 'to_top')
            pixels: Number of pixels to scroll for down/up directions
            run_manager: Optional callback manager

        Returns:
            String describing the scroll action performed
        """
        try:
            page = await self._get_page()

            # Method 1: CDP synthesizeScrollGesture (browser-use level, most reliable)
            cdp_success = False
            try:
                # Get CDP session
                cdp = await page.context.new_cdp_session(page)

                # Key: Use actual window dimensions, not layoutViewport
                # layoutViewport may return monitor resolution, causing "Position out of bounds"
                viewport_info = await page.evaluate("""
                    () => ({
                        width: window.innerWidth,
                        height: window.innerHeight,
                        scrollY: window.scrollY
                    })
                """)
                viewport_width = viewport_info["width"]
                viewport_height = viewport_info["height"]
                scroll_before = viewport_info["scrollY"]

                # Calculate center point
                center_x = viewport_width / 2
                center_y = viewport_height / 2

                if direction.lower() == "down":
                    y_distance = -pixels  # In CDP, negative values mean scroll down

                elif direction.lower() == "up":
                    y_distance = pixels  # Positive values mean scroll up

                elif direction.lower() in ("to_bottom", "bottom"):
                    # Get total page height
                    max_height = await page.evaluate("""
                        Math.max(
                            document.body.scrollHeight,
                            document.documentElement.scrollHeight,
                            document.body.offsetHeight,
                            document.documentElement.offsetHeight
                        )
                    """)
                    y_distance = -max_height  # Scroll to bottom

                elif direction.lower() in ("to_top", "top"):
                    y_distance = 10000  # Large positive value, scroll to top

                else:
                    return self._error_response(
                        "Invalid direction. Use: down, up, to_bottom, to_top"
                    )

                # Use CDP synthesizeScrollGesture (browser-use implementation)
                await cdp.send(
                    "Input.synthesizeScrollGesture",
                    {
                        "x": center_x,
                        "y": center_y,
                        "xDistance": 0,
                        "yDistance": y_distance,
                        "speed": 50000,  # High speed scrolling (browser-use setting)
                    },
                )

                # 🎯 Key: Wait and verify if scrolling actually took effect
                await asyncio.sleep(0.3)
                scroll_after = await page.evaluate("window.scrollY")

                # Check if scrolling actually occurred
                if scroll_after != scroll_before:
                    cdp_success = True
                    logger.info(
                        f"Scrolled {direction} using CDP gesture: {scroll_before}px → {scroll_after}px"
                    )

                    if direction.lower() in ("down", "up"):
                        return await self._return_with_screenshot(
                            f"Scrolled {direction} by {pixels}px (CDP)", page
                        )

                    else:
                        return await self._return_with_screenshot(
                            f"Scrolled to {direction.replace('to_', '')} (CDP)", page
                        )

                else:
                    # CDP command executed but no scrolling effect (possibly due to CSS restrictions like overflow:hidden)
                    logger.debug(
                        "CDP gesture executed but no scroll occurred (CSS restrictions?)"
                    )

            except Exception as cdp_error:
                logger.debug(
                    f"CDP gesture scroll failed: {cdp_error}, falling back to JS"
                )

            # Method 2: Smart JavaScript scrolling (modify CSS restrictions, fallback method)
            if not cdp_success:
                # Check and temporarily remove overflow:hidden and fixed height
                scroll_enabled = await page.evaluate("""
                    () => {
                        const html = document.documentElement;
                        const body = document.body;
                        const htmlStyle = window.getComputedStyle(html);
                        const bodyScrollable = body.scrollHeight > window.innerHeight;
                        const htmlScrollable = html.scrollHeight > window.innerHeight;
                        const hasHiddenOverflow = htmlStyle.overflowY === 'hidden';
                        const hasFixedHeight = htmlStyle.height !== 'auto';
                        
                        let modifications = {};
                        
                        // If body has content but html has overflow:hidden set, temporarily enable scrolling
                        if (hasHiddenOverflow && bodyScrollable) {
                            modifications.overflow = html.style.overflow;
                            modifications.overflowY = html.style.overflowY;
                            html.style.overflow = 'auto';
                            html.style.overflowY = 'auto';
                        }
                        
                        // Key fix: If html has fixed height, also need to remove it
                        if (hasFixedHeight && bodyScrollable && !htmlScrollable) {
                            modifications.height = html.style.height;
                            html.style.height = 'auto';
                        }
                        
                        return {
                            enabled: bodyScrollable || htmlScrollable,
                            wasModified: Object.keys(modifications).length > 0,
                            modifications: modifications
                        };
                    }
                """)

                if direction.lower() == "down":
                    await page.evaluate(f"window.scrollBy(0, {pixels})")
                    await page.mouse.wheel(0, pixels)
                    result = f"Scrolled down by {pixels}px"

                elif direction.lower() == "up":
                    await page.evaluate(f"window.scrollBy(0, -{pixels})")
                    await page.mouse.wheel(0, -pixels)
                    result = f"Scrolled up by {pixels}px"

                elif direction.lower() in ("to_bottom", "bottom"):
                    await page.evaluate("""
                        const maxHeight = Math.max(
                            document.body.scrollHeight,
                            document.documentElement.scrollHeight,
                            document.body.offsetHeight,
                            document.documentElement.offsetHeight,
                            document.body.clientHeight,
                            document.documentElement.clientHeight
                        );
                        window.scrollTo(0, maxHeight);
                    """)
                    await page.keyboard.press("End")
                    result = "Scrolled to bottom"

                elif direction.lower() in ("to_top", "top"):
                    await page.evaluate("window.scrollTo(0, 0)")
                    await page.keyboard.press("Home")
                    result = "Scrolled to top"

                else:
                    return self._error_response(
                        "Invalid direction. Use: down, up, to_bottom, to_top"
                    )

                # 🎯 Restore original style settings (if previously modified)
                if scroll_enabled.get("wasModified"):
                    modifications = scroll_enabled.get("modifications", {})
                    await page.evaluate(f"""
                        const html = document.documentElement;
                        const mods = {modifications};
                        if ('overflow' in mods) html.style.overflow = mods.overflow || '';
                        if ('overflowY' in mods) html.style.overflowY = mods.overflowY || '';
                        if ('height' in mods) html.style.height = mods.height || '';
                    """)
                    result += " (CSS modified)"

                # ✅ Return dictionary format and use unified screenshot return method
                result_dict = {
                    "action": "scroll",
                    "direction": direction,
                    "message": result,
                }
                return await self._return_with_screenshot(result_dict, page)

        except Exception as e:
            logger.error(f"Scroll failed: {e}")
            return self._error_response(f"Scroll failed: {str(e)}")


class BrowserClickInput(BaseModel):
    """Input schema for clicking elements (supports index or selector)"""

    css_selector: str | None = Field(
        default=None,
        description="CSS selector for the element to click (e.g., '#submit-btn', 'button.primary', '[data-testid=login]'). Use this OR index, not both.",
    )

    index: int | None = Field(
        default=None,
        description="Element index from page state (e.g., 5 to click element #5). RECOMMENDED: More reliable than CSS selectors.",
    )


class BrowserClickTool(CDPBrowserTool):
    """Tool for clicking on web page elements (supports index or CSS selector)"""

    name: str = "browser_click"
    description: str = (
        "Click on an element using element index (RECOMMENDED) or CSS selector. "
        "🎯 Use index from page state for reliability (e.g., index=5 to click element #5). "
        "Alternatively, use CSS selector examples: '#submit-btn', 'button.primary', '[data-testid=login]', "
        "'input[type=submit]', 'form > button:first-child'. "
        "Returns a summary of page elements after the action."
    )
    args_schema: type[BaseModel] = BrowserClickInput

    async def _arun(
        self,
        css_selector: str | None = None,
        index: int | None = None,  # Add index parameter
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Click on an element using index (recommended) or CSS selector"""
        # 🔒 Get interaction lock for current session to prevent race conditions during parallel calls within the same session
        # Use cdp_url as session identifier, different browser instances can execute in parallel
        session_key = f"{self.cdp_url}:{self.session_id}"
        lock = _get_interaction_lock_for_session(session_key)

        async with lock:
            return await self._click_impl(css_selector, index, run_manager)

    async def _click_impl(
        self,
        css_selector: str | None,
        index: int | None,
        run_manager: AsyncCallbackManagerForToolRun | None,
    ) -> str:
        """Internal implementation of click (called within lock)"""
        try:
            page = await self._get_page()

            # Prioritize using index for positioning
            if index is not None:
                # Get element information from index mapping
                session_id = self.session_id  # 🔧 Fix: use self.session_id
                logger.info(
                    f"Looking up element index {index} in session '{session_id}'"
                )
                elem_info = get_element(session_id, index)

                if not elem_info:
                    return self._error_response(
                        f"Error: Element index {index} not found in session '{session_id}'. The page may have changed. Try refreshing the page state."
                    )
                css_selector = elem_info["selector"]
                text = elem_info.get("text", "")

                logger.info(
                    f"Clicking element #{index}: {text[:30]} using selector: {css_selector[:50]}"
                )

            elif css_selector:
                # Traditional method: directly use CSS selector
                logger.info(f"Clicking element with CSS selector: {css_selector}")

            else:
                return self._error_response(
                    "Must provide either 'index' or 'css_selector'"
                )

            # Below is the original click logic
            # Try to find a visible element first
            element = None
            try:
                # First attempt: Find visible element
                element = await CSSElementSelector.find_element(
                    page, css_selector, state="visible", timeout=3000
                )
                logger.info(f"Found visible element with CSS selector: {css_selector}")
            except Exception as e:
                # If no visible element, try attached (may be hidden)
                logger.debug(f"No visible element found, trying attached state: {e}")
                element = await CSSElementSelector.find_element(
                    page, css_selector, state="attached", timeout=2000
                )
                logger.warning(
                    f"Found element in DOM but may not be visible: {css_selector}"
                )

            # Try to scroll element into view before clicking
            try:
                await element.scroll_into_view_if_needed(timeout=2000)
                logger.debug("Element scrolled into view")
            except Exception as e:
                logger.warning(f"Could not scroll element into view: {e}")

            # Try clicking - use force if normal click fails, use JS as last resort
            try:
                await element.click(timeout=3000, force=False)
                logger.info(f"Successfully clicked: {css_selector}")
            except Exception as e:
                logger.warning(f"Normal click failed, trying force click: {e}")
                try:
                    # Force click bypasses visibility/actionability checks
                    await element.click(timeout=2000, force=True)
                    logger.info(f"Force click succeeded: {css_selector}")
                except Exception as force_error:
                    # Last resort: JavaScript click
                    logger.warning(
                        f"Force click failed, trying JavaScript click: {force_error}"
                    )
                    try:
                        # Use JavaScript to click - bypasses ALL visibility checks
                        await page.evaluate("(element) => element.click()", element)
                        logger.info(f"JavaScript click succeeded: {css_selector}")
                    except Exception as js_error:
                        # All methods failed - return detailed error
                        return self._error_response(
                            f"Cannot click element '{css_selector}': "
                            f"Element exists in DOM but is not clickable by any method. "
                            f"Tried: normal click, force click, JavaScript click. "
                            f"Possible reasons: "
                            f"1) Element is truly hidden (display:none, visibility:hidden), "
                            f"2) Element is disabled or has no click handler, "
                            f"3) Wrong element selected (multiple elements match this selector). "
                            f"Try using a more specific selector or check if the element is actually interactive. "
                            f"Original error: {js_error}"
                        )

            # Wait for potential navigation/updates
            await asyncio.sleep(1)

            # Get browser state
            state = await self._get_browser_state(page)

            # Build result (includes index information)
            action_desc = (
                f"click(index={index})"
                if index is not None
                else f"click({css_selector})"
            )
            result = {
                "action": action_desc,
                "selector": css_selector,
                "url": state.get("url", ""),
                "title": state.get("title", ""),
            }

            if index is not None:
                result["element_index"] = index
                if elem_info.get("text"):
                    result["element_text"] = elem_info["text"][:50]

            # ✅ Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except ElementNotFoundError as e:
            logger.error(f"Element not found: {e}")
            return self._error_response(f"Element not found: {str(e)}")
        except Exception as e:
            logger.error(f"Click error: {e}")
            return self._error_response(f"Failed to click: {str(e)}")


class BrowserInputTextInput(BaseModel):
    """Input schema for text input (supports index or selector)"""

    css_selector: str | None = Field(
        default=None,
        description="CSS selector for the element (e.g., '#email-input', 'input[name=email]'). Use this OR index, not both.",
    )

    index: int | None = Field(
        default=None,
        description="Element index from page state (e.g., 5 to input into element #5). RECOMMENDED: More reliable than CSS selectors.",
    )

    text: str = Field(description="The text to input")


class BrowserInputTextTool(CDPBrowserTool):
    """Tool for inputting text into form elements (supports index or CSS selector)"""

    name: str = "browser_input"
    description: str = (
        "Input text into an element using element index (RECOMMENDED) or CSS selector. "
        "🎯 Use index from page state for reliability (e.g., index=5 to input into element #5). "
        "Clears existing text before inputting. "
        "Alternatively, use CSS selector examples: '#email-input', 'input[name=email]', '.username-field'. "
        "Returns a summary of page elements after the action."
    )
    args_schema: type[BaseModel] = BrowserInputTextInput

    async def _arun(
        self,
        css_selector: str | None = None,
        index: int | None = None,  # Add index parameter
        text: str = "",
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Input text into an element using index (recommended) or CSS selector"""
        # 🔒 Get interaction lock for current session to prevent race conditions during parallel calls within the same session
        # Use cdp_url as session identifier, different browser instances can execute in parallel
        session_key = f"{self.cdp_url}:{self.session_id}"
        lock = _get_interaction_lock_for_session(session_key)

        async with lock:
            return await self._input_impl(css_selector, index, text, run_manager)

    async def _input_impl(
        self,
        css_selector: str | None,
        index: int | None,
        text: str,
        run_manager: AsyncCallbackManagerForToolRun | None,
    ) -> str:
        """Internal implementation of input (called within lock)"""
        try:
            page = await self._get_page()
            elem_info = {}  # Initialize elem_info

            # Prioritize using index for positioning
            if index is not None:
                # Get element information from index mapping
                session_id = self.session_id  # 🔧 Fix: use self.session_id
                logger.info(
                    f"Looking up element index {index} in session '{session_id}'"
                )
                elem_info = get_element(session_id, index)

                if not elem_info:
                    return self._error_response(
                        f"Element index {index} not found in session '{session_id}'. The page may have changed. Try refreshing the page state."
                    )

                css_selector = elem_info["selector"]
                elem_text = elem_info.get("text", "")

                logger.info(
                    f"Inputting text into element #{index}: {elem_text[:30]} using selector: {css_selector[:50]}"
                )

            elif css_selector:
                # Traditional method: directly use CSS selector
                logger.info(
                    f"Inputting text into element with CSS selector: {css_selector}"
                )

            else:
                return self._error_response(
                    "Must provide either 'index' or 'css_selector'"
                )

            # Try to find a visible element first
            element = None
            try:
                # First attempt: Find visible element
                element = await CSSElementSelector.find_element(
                    page, css_selector, state="visible", timeout=3000
                )
                logger.info(f"Found visible element with CSS selector: {css_selector}")
            except Exception as e:
                # If no visible element, try attached (may be hidden)
                logger.debug(f"No visible element found, trying attached state: {e}")
                element = await CSSElementSelector.find_element(
                    page, css_selector, state="attached", timeout=2000
                )
                logger.warning(
                    f"Found element in DOM but may not be visible: {css_selector}"
                )

            # Try to scroll element into view before interacting
            try:
                await element.scroll_into_view_if_needed(timeout=2000)
                logger.debug("Element scrolled into view")
            except Exception as e:
                logger.warning(f"Could not scroll element into view: {e}")

            # Try to fill the element (clears existing text)
            try:
                await element.fill(text, timeout=3000)
                logger.info(f"Successfully input text into: {css_selector}")
            except Exception as e:
                # If fill fails, try click + type
                logger.warning(f"Fill failed, trying click + type: {e}")
                try:
                    await element.click(timeout=2000, force=True)
                    await element.type(text, delay=50)
                    logger.info(f"Successfully typed text into: {css_selector}")
                except Exception as type_error:
                    return self._error_response(
                        f"Cannot input text into element '{css_selector}': "
                        f"Element exists in DOM but is not editable. "
                        f"Possible reasons: "
                        f"1) Element is hidden or disabled, "
                        f"2) Element is not an input/textarea/contenteditable, "
                        f"3) Element is read-only. "
                        f"Original error: {type_error}"
                    )

            await asyncio.sleep(0.5)

            # Get browser state
            state = await self._get_browser_state(page)

            # Build result (includes index information)
            action_desc = (
                f"input(index={index}, '{text}')"
                if index is not None
                else f"input({css_selector}, '{text}')"
            )
            result = {
                "action": action_desc,
                "selector": css_selector,
                "text": text,
                "url": state.get("url", ""),
                "title": state.get("title", ""),
            }

            if index is not None:
                result["element_index"] = index
                if elem_info.get("text"):
                    result["element_text"] = elem_info["text"][:50]

            # ✅ Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except ElementNotFoundError as e:
            logger.error(f"Element not found: {e}")
            return self._error_response(f"Element not found: {str(e)}")
        except Exception as e:
            logger.error(f"Input text error: {e}")
            return self._error_response(f"Failed to input text: {str(e)}")


class BrowserPressKeysInput(BaseModel):
    """Input schema for sending keyboard keys"""

    keys: str = Field(
        description="The keys to send (e.g., 'Enter', 'Escape', 'Control+a', 'ArrowDown')"
    )


class BrowserPressKeysTool(CDPBrowserTool):
    """Tool for sending keyboard keys"""

    name: str = "browser_press_keys"
    description: str = (
        "Send keyboard keys such as Enter, Escape, Arrow keys, or keyboard shortcuts. "
        "Common keys: Enter, Escape, Backspace, Tab, ArrowUp, ArrowDown, "
        "Control+a (select all), Control+c (copy), Control+v (paste). "
        "Returns a summary of page elements after the action."
    )
    args_schema: type[BaseModel] = BrowserPressKeysInput

    async def _arun(
        self,
        keys: str,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Send keyboard keys"""
        try:
            page = await self._get_page()
            logger.info(f"Sending keys: '{keys}'")

            await page.keyboard.press(keys)
            await asyncio.sleep(0.5)

            # Get browser state
            state = await self._get_browser_state(page)

            result = {
                "keys": keys,
                "url": state.get("url", ""),
                "title": state.get("title", ""),
            }

            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Send keys error: {e}")
            return self._error_response(f"Failed to send keys: {str(e)}")


class BrowserSwitchTabInput(BaseModel):
    """Input schema for switching tabs"""

    page_id: int = Field(description="The ID (index) of the tab to switch to")


class BrowserSwitchTabTool(CDPBrowserTool):
    """Tool for switching between browser tabs"""

    name: str = "browser_switch_tab"
    description: str = (
        "Switch to a different browser tab by page ID (index). "
        "Returns a summary of elements on the new tab."
    )
    args_schema: type[BaseModel] = BrowserSwitchTabInput

    async def _arun(
        self,
        page_id: int,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Switch to a different browser tab"""
        try:
            logger.info(f"Switching to tab {page_id}")

            success = await self.browser_manager.switch_page(page_id)

            if not success:
                return self._error_response(f"Tab {page_id} not found")

            # Get browser state
            page = await self._get_page()
            state = await self._get_browser_state(page)

            # Get page info
            page_info = await self.browser_manager.get_page_info_async()

            result = {
                "current_page_id": page_id,
                "total_pages": self.browser_manager.page_count,
                "pages": page_info,
                "url": state.get("url", ""),
                "title": state.get("title", ""),
            }

            # ✅ Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Switch tab error: {e}")
            return self._error_response(f"Failed to switch tab: {str(e)}")


class BrowserCloseTabInput(BaseModel):
    """Input schema for closing tabs"""

    page_id: int = Field(description="The ID (index) of the tab to close")


class BrowserCloseTabTool(CDPBrowserTool):
    """Tool for closing browser tabs"""

    name: str = "browser_close_tab"
    description: str = "Close a browser tab by page ID (index)"
    args_schema: type[BaseModel] = BrowserCloseTabInput

    async def _arun(
        self,
        page_id: int,
        run_manager: AsyncCallbackManagerForToolRun | None = None,
    ) -> str:
        """Close a browser tab"""
        try:
            logger.info(f"Closing tab {page_id}")

            success = await self.browser_manager.close_page(page_id)

            if not success:
                return self._error_response(f"Tab {page_id} not found")

            # Get browser state
            page = await self._get_page()
            state = await self._get_browser_state(page)

            # Get page info
            page_info = await self.browser_manager.get_page_info_async()

            result = {
                "closed_page_id": page_id,
                "current_page_id": self.browser_manager.current_page_index,
                "total_pages": self.browser_manager.page_count,
                "pages": page_info,
                "url": state.get("url", ""),
                "title": state.get("title", ""),
            }

            # Use unified screenshot return method
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"Close tab error: {e}")
            return self._error_response(f"Failed to close tab: {str(e)}")


class BrowserListTabsInput(BaseModel):
    """Input schema for listing tabs (no parameters needed)"""

    pass


class BrowserListTabsTool(CDPBrowserTool):
    """Tool for listing all open browser tabs"""

    name: str = "browser_list_tabs"
    description: str = (
        "List all open browser tabs with their index, URL, and title. "
        "Use this tool to see what tabs are available before switching to a specific tab."
    )
    args_schema: type[BaseModel] = BrowserListTabsInput

    async def _arun(
        self, run_manager: AsyncCallbackManagerForToolRun | None = None
    ) -> tuple[str | dict, dict | None]:
        """List all browser tabs"""
        try:
            logger.info("Listing all browser tabs")

            # 🔧 Fix: sync all pages in browser (including manually opened ones)
            await self.browser_manager.sync_pages()

            # Use async method to get complete page information (including title)
            page_info = await self.browser_manager.get_page_info_async()

            result = {
                "current_tab_index": self.browser_manager.current_page_index,
                "total_tabs": self.browser_manager.page_count,
                "tabs": page_info,
            }

            logger.info(f"Found {self.browser_manager.page_count} tabs")
            # ✅ Use unified screenshot return method (capture current tab)
            page = await self._get_page()
            return await self._return_with_screenshot(result, page)

        except Exception as e:
            logger.error(f"List tabs error: {e}")
            return self._error_response(f"Failed to list tabs: {str(e)}")


class UserTakeOverToolInput(BaseToolInput):
    """Input for UserTakeOverTool."""

    reason: str = Field(
        ...,
        description="Explain why human intervention is needed and what specific issue you encountered",
    )
    question: str = Field(
        default="",
        description="Specific question or guidance needed from the human (optional)",
    )
    # context: str = Field(
    #     ...,
    #     description="Current state of the task and what has been attempted so far"
    # )


class UserTakeOverTool(CDPBrowserTool):
    name: ClassVar[str] = "browser_user_takeover"
    args_schema: ClassVar[type[BaseModel]] = UserTakeOverToolInput
    description: ClassVar[str] = (
        "Request human intervention when autonomous methods fail. "
        "Use this when you have exhausted all possible automated solutions "
        "and need human assistance to proceed. This will pause the task and request human help."
    )
    return_direct: bool = True

    async def _arun(self, **kwargs) -> tuple[str, dict | None]:
        return "requested user takeover", None
