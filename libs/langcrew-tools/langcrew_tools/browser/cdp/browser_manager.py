"""
Browser lifecycle and page management using CDP

This module provides a singleton manager for browser instances and page contexts.
Connects to a Chrome browser with CDP enabled.
"""

import asyncio
import logging

from playwright.async_api import Page

from .connection import CDPSession

logger = logging.getLogger(__name__)


class CDPBrowserManager:
    """
    Manages browser lifecycle using CDP

    This class provides a singleton pattern for managing the browser connection
    and multiple page contexts (tabs). Connects to a Chrome browser with CDP enabled.

    Usage:
        # Start Chrome with CDP enabled:
        # chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

        manager = CDPBrowserManager.get_instance(cdp_url="http://localhost:9222")
        await manager.ensure_browser()
        page = await manager.get_current_page()
        await page.goto("https://example.com")
    """

    # Class-level cache for singleton pattern
    _instances: dict[str, "CDPBrowserManager"] = {}

    def __init__(
        self,
        cdp_url: str,
    ):
        """
        Initialize browser manager

        Args:
            cdp_url: Chrome DevTools Protocol URL (e.g., "http://localhost:9222")
        """
        self.cdp_url = cdp_url
        self.session = CDPSession(cdp_url=cdp_url)
        self.pages: list[Page] = []
        self.current_page_index = 0
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(
        cls,
        cdp_url: str,
    ) -> "CDPBrowserManager":
        """
        Get or create singleton instance

        Args:
            cdp_url: Chrome DevTools Protocol URL

        Returns:
            CDPBrowserManager instance
        """
        key = f"cdp={cdp_url}"

        if key not in cls._instances:
            cls._instances[key] = cls(cdp_url=cdp_url)
        return cls._instances[key]

    @classmethod
    def remove_instance(cls, cdp_url: str) -> None:
        """
        Remove instance from cache (for cleanup)

        This should be called when a task is complete to free resources.
        The instance will be recreated if needed on next get_instance call.

        Args:
            cdp_url: Chrome DevTools Protocol URL
        """
        key = f"cdp={cdp_url}"
        if key in cls._instances:
            del cls._instances[key]
            logger.debug(f"Removed BrowserManager instance for {cdp_url}")

    async def ensure_browser(self) -> None:
        """
        Initialize browser connection if not already initialized

        This method is safe to call multiple times and will reconnect if connection is lost.
        Playwright's connect() has its own timeout (60s) which handles transient issues.

        State is determined solely by connection validity: self.session.is_connected

        Raises:
            ConnectionError: If connection fails
        """
        async with self._lock:
            # If already connected, check if we need to sync pages
            if self.session.is_connected:
                if not self.pages:
                    await self._sync_pages_unlocked()
                return

            # Connection lost - reconnect
            logger.warning("Browser connection lost, reconnecting...")

            await self.session.connect()

            # Sync existing pages from the browser
            await self._sync_pages_unlocked()

            logger.info("Browser initialized via CDP")

            await self._register_event_handlers_unlocked()

    async def _sync_pages_unlocked(self) -> None:
        """
        Internal method: Sync all pages in the browser without lock.
        Maintains current_page_index by tracking the actual Page object reference.
        """
        if not self.session.browser:
            return

        try:
            contexts = self.session.browser.contexts
            if not contexts:
                self.pages = []
                self.current_page_index = 0
                return

            # Capture the current page object before sync to maintain index later
            current_page_obj = None
            if 0 <= self.current_page_index < len(self.pages):
                current_page_obj = self.pages[self.current_page_index]

            browser_pages = contexts[0].pages

            # Filter out closed pages
            valid_pages = []
            for page in browser_pages:
                if not await self._is_page_valid(page):
                    continue
                valid_pages.append(page)

            self.pages = valid_pages

            # 💡 优化：根据对象引用重新计算索引，而不是简单重置
            if current_page_obj and current_page_obj in self.pages:
                self.current_page_index = self.pages.index(current_page_obj)
            else:
                # If original page is gone, clamp the index
                if self.current_page_index >= len(self.pages):
                    self.current_page_index = max(0, len(self.pages) - 1)

            logger.debug(
                f"Synced {len(self.pages)} pages, current index: {self.current_page_index}"
            )
        except Exception as e:
            logger.warning(f"Error during internal page sync: {e}")

    async def get_current_page(self) -> Page:
        """
        Get or create current page context with automatic error recovery
        """
        await self.ensure_browser()

        async with self._lock:
            # 1. Quick cleanup of closed pages
            if self.pages:
                # Only remove explicitly closed ones to keep it O(n) but lightweight
                self.pages = [p for p in self.pages if not p.is_closed()]

            # 2. Create new page if none exist
            if not self.pages:
                page = await self._create_page_with_retry()
                if page:
                    self.pages = [page]
                    self.current_page_index = 0
                else:
                    raise RuntimeError("Failed to create page context")

            # 3. Validate index range
            if self.current_page_index >= len(self.pages):
                self.current_page_index = max(0, len(self.pages) - 1)

            current_page = self.pages[self.current_page_index]

            # 4. Double-check the current page is valid/responsive
            if not await self._is_page_valid(current_page):
                logger.warning(
                    "Current page is invalid, attempting to sync and recover..."
                )
                await self._sync_pages_unlocked()
                if not self.pages:
                    page = await self._create_page_with_retry()
                    self.pages = [page]
                    self.current_page_index = 0
                return self.pages[self.current_page_index]

            return current_page

    async def _is_page_valid(self, page: Page) -> bool:
        """Check if a page is still valid and not closed"""
        try:
            return not page.is_closed()
        except Exception:
            return False

    async def _create_page_with_retry(self, max_retries: int = 3) -> Page:
        """Create a new page with retry logic"""
        for attempt in range(max_retries):
            try:
                if not self.session.browser or not self.session.browser.contexts:
                    await self.session.connect()

                context = self.session.browser.contexts[0]
                return await context.new_page()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                await asyncio.sleep(1)
                await self.session.connect()
        raise RuntimeError("Create page failed")

    async def new_page(self) -> Page:
        """Create and switch to a new tab"""
        await self.ensure_browser()
        async with self._lock:
            page = await self._create_page_with_retry()
            self.pages.append(page)
            self.current_page_index = len(self.pages) - 1
            return page

    async def switch_page(self, page_id: int) -> bool:
        """Switch to a different page by index"""
        async with self._lock:
            if 0 <= page_id < len(self.pages):
                self.current_page_index = page_id
                try:
                    await self.pages[page_id].bring_to_front()
                    return True
                except Exception:
                    return False
            return False

    async def close_page(self, page_id: int) -> bool:
        """Close a page by index"""
        async with self._lock:
            if 0 <= page_id < len(self.pages):
                page = self.pages.pop(page_id)
                try:
                    await page.close()
                except Exception:
                    pass
                # Adjust index
                if self.current_page_index >= len(self.pages):
                    self.current_page_index = max(0, len(self.pages) - 1)
                return True
            return False

    async def cleanup(self) -> None:
        """Clean up browser connection"""
        async with self._lock:
            await self.session.disconnect()
            self.pages = []
            self.current_page_index = 0

    @property
    def browser(self):
        return self.session.browser

    @property
    def page_count(self) -> int:
        """Get the number of open pages"""
        return len(self.pages)

    async def sync_pages(self) -> None:
        """
        Sync all pages in the browser
        """
        async with self._lock:
            await self._sync_pages_unlocked()

    async def _register_event_handlers_unlocked(self) -> None:
        """
        Register Playwright event listeners for real-time page management
        """
        if not self.session.browser or not self.session.browser.contexts:
            return

        try:
            context = self.session.browser.contexts[0]

            # Callback for new page event
            def on_page_opened(page):
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(self._handle_page_opened(page))
                except RuntimeError:
                    pass

            context.on("page", on_page_opened)

            def on_browser_disconnected():
                logger.warning("🔌 Browser disconnected event detected")

            self.session.browser.on("disconnected", on_browser_disconnected)

            # Initial binding for existing pages
            for page in context.pages:
                await self._handle_page_opened_unlocked(page)

            logger.info("Playwright event handlers registered successfully")

        except Exception as e:
            logger.warning(f"Failed to register event handlers: {e}")

    async def get_page_info_async(self) -> list[dict]:
        """Get info about all open pages"""
        info = []
        # No lock needed for read-only sync
        pages_to_scan = list(self.pages)
        for i, page in enumerate(pages_to_scan):
            try:
                title = await page.title()
                info.append({"index": i, "url": page.url, "title": title})
            except Exception:
                info.append({"index": i, "url": "unknown", "title": "error"})
        return info

    async def _handle_page_opened_unlocked(self, page: Page) -> None:
        """Handle new page event asynchronously (unlocked version for init)"""
        # Check if it's already in our list
        if page not in self.pages:
            self.pages.append(page)
            self.current_page_index = len(self.pages) - 1
            logger.info(f"🆕 Page added via init/event: {page.url[:50]}")

        # Bind close event
        def on_close(p):
            asyncio.get_event_loop().create_task(self._handle_page_closed(p))

        page.on("close", on_close)

    async def _handle_page_opened(self, page: Page) -> None:
        """Handle new page event asynchronously with lock"""
        async with self._lock:
            await self._handle_page_opened_unlocked(page)

    async def _handle_page_closed(self, page: Page) -> None:
        """Handle page close event to keep list clean"""
        async with self._lock:
            if page in self.pages:
                idx = self.pages.index(page)
                self.pages.remove(page)
                if self.current_page_index >= idx:
                    self.current_page_index = max(0, self.current_page_index - 1)
                logger.info(
                    f"🗑️ Page removed via event. Remaining: {len(self.pages)}"
                )
