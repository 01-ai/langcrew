"""
Browser connection management using Playwright

This module handles browser connection using Playwright.
Supports both Playwright server (launch-server) and CDP connections.

Note: Despite the module name 'cdp', this primarily uses Playwright's connect() API,
      not connect_over_cdp(). The name is historical.
"""

import asyncio
import logging

from playwright.async_api import Browser, BrowserContext, Playwright, async_playwright

logger = logging.getLogger(__name__)


class CDPSession:
    """
    Manages browser connection using Playwright

    This class handles connecting to a browser via Playwright.
    Supports two connection modes:

    1. Playwright Server (launch-server) - WebSocket connection
       Start server: python3 -m playwright launch-server chromium --port 9222
       Connect URL: ws://host:port/guid

    2. Chrome CDP - HTTP endpoint
       Start Chrome: chrome --remote-debugging-port=9222
       Connect URL: http://localhost:9222

    Usage:
        # For Playwright server:
        session = CDPSession(cdp_url="ws://localhost:9222/guid")
        await session.connect()

        # For Chrome CDP:
        session = CDPSession(cdp_url="http://localhost:9222")
        await session.connect()

        # Use session.browser...
        await session.disconnect()

    Note: The class name 'CDPSession' is historical and somewhat misleading.
          It primarily uses Playwright's connect() API for WebSocket connections.
    """

    def __init__(
        self,
        cdp_url: str,
    ):
        """
        Initialize browser connection session

        Args:
            cdp_url: Browser connection URL. Supports:
                    - Playwright server WebSocket: "ws://host:port/guid"
                    - Chrome CDP endpoint: "http://localhost:9222"
        """
        self.cdp_url = cdp_url
        self.playwright: Playwright | None = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self._connection_lock = asyncio.Lock()
        self._is_connected = False

    async def connect(self) -> None:
        """
        Connect to browser via Playwright

        Supports two modes:
        1. HTTP URL for Chrome CDP: http://localhost:9222
        2. WebSocket URL for Playwright server:
           - ws://host:port/path (insecure WebSocket)
           - wss://host:port/path (secure WebSocket, recommended for remote)

        Raises:
            ConnectionError: If connection fails
        """
        async with self._connection_lock:
            if self._is_connected and self.browser:
                logger.debug("Already connected to browser")
                return

            try:
                self.playwright = await async_playwright().start()

                # Determine connection method based on URL format
                if self.cdp_url.startswith("ws://") or self.cdp_url.startswith(
                    "wss://"
                ):
                    try:
                        self.browser = await self.playwright.chromium.connect(
                            self.cdp_url, timeout=60000
                        )
                    except Exception as ws_error:
                        logger.error(f"WebSocket connection failed: {ws_error}")
                        raise

                else:
                    # HTTP URL - use CDP (local Chrome with --remote-debugging-port)
                    try:
                        self.browser = await self.playwright.chromium.connect_over_cdp(
                            self.cdp_url, timeout=30000
                        )
                    except Exception as cdp_error:
                        logger.error(f"CDP connection failed: {cdp_error}")
                        raise

                # Get or create context
                try:
                    if self.browser.contexts:
                        self.context = self.browser.contexts[0]
                    else:
                        self.context = await self.browser.new_context(
                            viewport={"width": 1920, "height": 1080},
                            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                        )

                    # Set timeouts
                    self.context.set_default_timeout(30_000)
                    self.context.set_default_navigation_timeout(60_000)

                except Exception as ctx_error:
                    logger.error(f"Failed to create browser context: {ctx_error}")
                    self._is_connected = False
                    raise RuntimeError(
                        f"Context creation failed: {ctx_error}"
                    ) from ctx_error

                self._is_connected = True

            except Exception as e:
                logger.error(
                    f"❌ Failed to connect to browser: {type(e).__name__}: {e}"
                )
                await self._cleanup()
                error_msg = f"Cannot connect to browser. Error: {e}\n"
                error_msg += f"URL: {self.cdp_url}\n"
                raise ConnectionError(error_msg) from e

    async def disconnect(self) -> None:
        """
        Clean disconnect from browser

        Note: For CDP connections, this only disconnects but does not close the browser.
        The browser continues running and can be reconnected to.
        """
        async with self._connection_lock:
            await self._cleanup()

    async def _cleanup(self) -> None:
        """Internal cleanup method"""
        # For CDP connections, we should NOT close the context or browser
        # as it will close the user's browser. Just disconnect.
        logger.info("Disconnecting from browser (not closing it)")
        self.context = None
        self.browser = None

        if self.playwright:
            try:
                await self.playwright.stop()
            except Exception as e:
                logger.warning(f"Error stopping playwright: {e}")
            self.playwright = None

        self._is_connected = False

    @property
    def is_connected(self) -> bool:
        """Check if currently connected to browser with active heartbeat"""
        if not self._is_connected or self.browser is None:
            return False

        # Check if browser is still alive and responding
        try:
            return self.browser.is_connected()
        except Exception:
            logger.warning("Browser connection lost (heartbeat failed)")
            self._is_connected = False
            return False

    async def ensure_connected(self) -> None:
        """Ensure we're connected, reconnect if necessary"""
        if not self.is_connected:
            logger.info("Connection lost, attempting to reconnect...")
            await self._cleanup()
            await self.connect()

    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.disconnect()
