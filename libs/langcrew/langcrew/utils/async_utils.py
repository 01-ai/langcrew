import asyncio
import logging
import threading
from collections.abc import Awaitable
from typing import Any

logger = logging.getLogger(__name__)


# Bridge utility to execute async methods from sync context
# Use case: calling async methods in __del__ methods for resource cleanup
class AsyncBridge:
    logger = logging.getLogger(__name__)
    """
    Utility class to execute async methods from sync context

    Primarily used for calling async methods in __del__ methods for resource cleanup,
    supports waiting for completion mode
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized") and self._loop and not self._loop.is_closed():
            return

        self._loop = None
        self._loop_thread = None
        self._loop_ready = None
        self._initialized = True
        self._start_event_loop()

    def _start_event_loop(self):
        """Start event loop thread"""
        self._loop_ready = threading.Event()

        def run_loop():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            try:
                # Notify main thread that event loop is ready
                self._loop_ready.set()
                self._loop.run_forever()
            except Exception as e:
                logger.error(f"Event loop error: {e}")
            finally:
                self._loop.close()

        self._loop_thread = threading.Thread(target=run_loop, daemon=True)
        self._loop_thread.start()

        # Wait for event loop to start
        if not self._loop_ready.wait(timeout=5.0):
            raise RuntimeError("Failed to start event loop within timeout")

    def run_async_wait(self, coro: Awaitable[Any], timeout: float = None) -> Any:
        """
        Execute async method from sync context and wait for completion

        Args:
            coro: Async coroutine object
            timeout: Timeout in seconds

        Returns:
            Return value of the async method
        """
        if not self.is_running():
            logger.warning("Event loop is not running")
            return None

        try:
            future = asyncio.run_coroutine_threadsafe(coro, self._loop)
            return future.result(timeout=timeout)
        except Exception as e:
            logger.error(f"Failed to execute async task: {e}")
            return None

    def is_running(self) -> bool:
        """Check if event loop is running"""
        return (
            self._loop is not None
            and not self._loop.is_closed()
            and self._loop_thread is not None
            and self._loop_thread.is_alive()
        )

    def __del__(self):
        """Destructor, cleanup resources"""
        try:
            if self._loop and not self._loop.is_closed():
                # Stop event loop
                self._loop.call_soon_threadsafe(self._loop.stop)

                # Wait for thread to finish
                if self._loop_thread and self._loop_thread.is_alive():
                    self._loop_thread.join(timeout=2.0)
        except Exception:
            pass  # Ignore exceptions in destructor


# Global instance
_async_bridge = None
_global_lock = threading.Lock()


def get_async_bridge() -> AsyncBridge:
    """Get global AsyncBridge instance"""
    global _async_bridge
    if _async_bridge is None:
        with _global_lock:
            if _async_bridge is None:
                _async_bridge = AsyncBridge()
    return _async_bridge


def run_async_wait(coro: Awaitable[Any], timeout: float = None) -> Any:
    """
    Convenience function: Execute async method from sync context and wait for completion

    Args:
        coro: Async coroutine object
        timeout: Timeout in seconds

    Returns:
        Return value of the async method
    """
    return get_async_bridge().run_async_wait(coro, timeout)
