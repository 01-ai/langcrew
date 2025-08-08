"""
Sandbox-based browser manager for isolated browser operations

This module provides browser management functionality with sandbox isolation.
Each sandbox gets its own browser instance to prevent cross-contamination.
"""

import asyncio
import logging
import time

import httpx
from browser_use import BrowserProfile, BrowserSession
from e2b import AsyncSandbox

from .sandbox_config import SandboxConfig

logger = logging.getLogger(__name__)


def get_browser_use_vnc_url(
    sandbox: AsyncSandbox,
    auto_connect: bool = True,
    view_only: bool = False,
    resize: str = "scale",
    port: int = 6089,
    auth_key: str | None = None,
) -> str:
    """
    Generate VNC URL for sandbox access

    Args:
        sandbox: Sandbox instance
        auto_connect: Whether to auto-connect
        view_only: Whether to enable view-only mode
        resize: Resize mode
        port: VNC port
        auth_key: Optional authentication key

    Returns:
        VNC URL string
    """
    params = []
    url = f"https://{sandbox.get_host(port)}/vnc.html"

    if auto_connect:
        params.append("autoconnect=true")
    if view_only:
        params.append("view_only=true")
    if resize:
        params.append(f"resize={resize}")
    if auth_key:
        params.append(f"password={auth_key}")

    if params:
        return f"{url}?{'&'.join(params)}"
    return url


async def async_sandbox_playwright_wss(
    sandbox: AsyncSandbox,
    timeout: int = 12,
) -> str:
    """
    Get Playwright WebSocket URL for the sandbox

    Args:
        sandbox_config: Sandbox configuration dict or AsyncSandbox instance
        timeout: HTTP request timeout in seconds

    Returns:
        WebSocket URL string

    Raises:
        RuntimeError: If WebSocket URL retrieval fails
    """

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://{sandbox.get_host(9222)}/json", timeout=timeout
        )
        response.raise_for_status()

    wss_url = f"wss://{sandbox.get_host(9222)}{response.json()['wsEndpointPath']}"

    if not wss_url:
        raise RuntimeError("Failed to retrieve WebSocket URL")

    return wss_url


class SandboxBrowserSessionManager:
    """Browser manager for a specific sandbox configuration"""

    def __init__(self, sandbox_config: SandboxConfig):
        self.sandbox_config = sandbox_config  # Keep original config immutable
        self.sandbox_key = sandbox_config.get_key()
        self._browser_session: BrowserSession | None = None
        self._browser_vnc_url: str | None = None
        self._browser_wss_url: str | None = None
        self._created_at = time.time()
        self._last_used = time.time()

    async def init_browser_session(
        self, async_sandbox: AsyncSandbox, browser_profile: BrowserProfile
    ):
        """Initialize sandbox-specific browser instance"""
        if self._browser_session is None:
            try:
                await self._init_browser_wss_url(async_sandbox)
                # Initialize browser and context
                self._browser_session = BrowserSession(
                    browser_profile=browser_profile,
                    wss_url=self._browser_wss_url,
                )
            except Exception as e:
                logger.error(
                    f"Sandbox browser initialization failed {self.sandbox_key}: {e}"
                )
                await self.cleanup()  # Clean up partial state
                raise RuntimeError(f"Sandbox browser initialization failed: {str(e)}")
        return self._browser_session

    async def _init_browser_wss_url(self, async_sandbox: AsyncSandbox):
        # Check if this is a local configuration
        if self.sandbox_config.is_local_config():
            logger.info(f"Using local browser configuration for {self.sandbox_key}")
            return

        try:
            self._browser_wss_url = await async_sandbox_playwright_wss(
                async_sandbox
            )
            self._browser_vnc_url = get_browser_use_vnc_url(async_sandbox)

        except Exception as e:
            logger.error(
                f"Failed to initialize browser config for {self.sandbox_key}: {e}"
            )
            raise e

    async def cleanup(self):
        logger.info(f"Sandbox browser cleanup: {self.sandbox_key}")
        await self._browser_session.kill()
        pass

    def is_expired(self, max_idle_time: int = 3600) -> bool:
        """Check if the sandbox browser has expired"""
        return time.time() - self._last_used > max_idle_time


class BrowserManagerRegistry:
    """Registry for managing multiple sandbox browser instances"""

    _instance = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return

        self.managers: dict[
            str, SandboxBrowserSessionManager
        ] = {}  # sandbox_key -> manager
        self.sandbox_configs: dict[str, SandboxConfig] = {}  # sandbox_key -> config
        self.cleanup_task: asyncio.Task | None = None
        self._initialized = True
        logger.info("Sandbox browser manager registry initialized")

    async def get_manager(
        self, async_sandbox: AsyncSandbox | SandboxConfig | None = None
    ) -> SandboxBrowserSessionManager:
        """Get or create sandbox browser manager"""
        if isinstance(async_sandbox, AsyncSandbox):
            sandbox_config = SandboxConfig.get_sandbox_config(async_sandbox)
        elif isinstance(async_sandbox, SandboxConfig):
            sandbox_config = async_sandbox
        else:
            sandbox_config = SandboxConfig.get_local_config()

        if not sandbox_config.is_valid():
            raise ValueError("Invalid sandbox configuration")

        sandbox_key = sandbox_config.get_key()
        logger.info(f"Getting sandbox browser manager: {sandbox_key}")
        async with self._lock:
            # Check if manager already exists
            if sandbox_key in self.managers:
                # Verify API key matches
                existing_config = self.sandbox_configs[sandbox_key]
                if existing_config.api_key != sandbox_config.api_key:
                    logger.warning(
                        f"Sandbox {sandbox_key} API key mismatch, recreating manager"
                    )
                    await self._cleanup_manager_unsafe(sandbox_key)
                else:
                    manager = self.managers[sandbox_key]
                    manager._last_used = time.time()
                    logger.info(f"get_manager manager: {manager}")
                    return manager

            # Create new manager

            manager = SandboxBrowserSessionManager(sandbox_config)
            self.managers[sandbox_key] = manager
            self.sandbox_configs[sandbox_key] = sandbox_config
            # Start cleanup task if not running
            self._start_cleanup_task()
            logger.info(f"Creating new sandbox browser manager: {sandbox_key}")
            return manager

    async def cleanup_sandbox(self, sandbox_config: SandboxConfig):
        """Clean up specific sandbox browser resources"""
        sandbox_key = sandbox_config.get_key()
        await self._cleanup_manager(sandbox_key)

    async def _cleanup_manager(self, sandbox_key: str):
        """Internal cleanup method"""
        async with self._lock:
            await self._cleanup_manager_unsafe(sandbox_key)

    async def _cleanup_manager_unsafe(self, sandbox_key: str):
        """Internal cleanup method without locking (assumes caller holds lock)"""
        if sandbox_key in self.managers:
            await self.managers[sandbox_key].cleanup()
            del self.managers[sandbox_key]
            if sandbox_key in self.sandbox_configs:
                del self.sandbox_configs[sandbox_key]
            logger.info(f"Sandbox browser manager cleaned up: {sandbox_key}")

    async def cleanup_idle_sandboxes(self, max_idle_time: int = 3600):
        """Clean up idle sandbox browsers"""
        to_cleanup = []

        async with self._lock:
            for sandbox_key, manager in self.managers.items():
                if manager.is_expired(max_idle_time):
                    to_cleanup.append(sandbox_key)

        for sandbox_key in to_cleanup:
            logger.info(f"Cleaning up idle sandbox: {sandbox_key}")
            await self._cleanup_manager(sandbox_key)

    async def cleanup_by_domain(self, domain: str):
        """Clean up all sandboxes for a specific domain"""
        to_cleanup = []

        async with self._lock:
            for sandbox_key, config in self.sandbox_configs.items():
                if config.domain == domain:
                    to_cleanup.append(sandbox_key)

        for sandbox_key in to_cleanup:
            await self._cleanup_manager(sandbox_key)

        logger.info(f"Cleaned up {len(to_cleanup)} sandboxes for domain: {domain}")

    def _start_cleanup_task(self):
        """Start periodic cleanup task"""
        if self.cleanup_task is None or self.cleanup_task.done():
            self.cleanup_task = asyncio.create_task(self._periodic_cleanup())

    async def _periodic_cleanup(self):
        """Periodic cleanup task"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                await self.cleanup_idle_sandboxes(
                    3600
                )  # Clean up 1-hour idle sandboxes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic cleanup task: {e}")

    def get_stats(self) -> dict:
        """Get registry statistics"""
        stats_by_domain = {}

        for sandbox_key, config in self.sandbox_configs.items():
            domain = config.domain
            if domain not in stats_by_domain:
                stats_by_domain[domain] = 0
            stats_by_domain[domain] += 1

        return {
            "total_sandboxes": len(self.managers),
            "domains": stats_by_domain,
            "active_cleanup_task": self.cleanup_task is not None
            and not self.cleanup_task.done(),
        }

    async def shutdown(self):
        """Shutdown all sandbox browsers"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass

        sandbox_keys = list(self.managers.keys())
        for sandbox_key in sandbox_keys:
            await self._cleanup_manager(sandbox_key)

        logger.info("All sandbox browsers have been shut down")


# Global registry instance
browser_registry = BrowserManagerRegistry()
