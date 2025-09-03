import asyncio
import logging
import threading
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from functools import wraps
from typing import Any, Final

logger = logging.getLogger(__name__)


def async_timer(func):
    """异步方法执行时间装饰器"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            end_time = time.perf_counter()
            execution_time = (end_time - start_time) * 1000  # 转换为毫秒
            logger.info(f"{func.__name__} 执行时间: {execution_time:.2f}ms")

    return wrapper


class EventQueueTask:
    _END_EVENT: Final[object] = object()

    def __init__(
        self,
        queue: asyncio.Queue,
        stream_producer_task: asyncio.Task[Any],
    ):
        self.queue: Final[asyncio.Queue] = queue
        self.stream_producer_task: Final[asyncio.Task[Any]] = stream_producer_task
        # 业务
        self._done_event = False
        # 已经被正式使用的future
        self.use_future: Final[asyncio.Future[Any]] = asyncio.Future()

    async def get_event(self):
        self.done_use_future(True)
        if self._done_event:
            return self._done_event
        event = await self.queue.get()
        if event == EventQueueTask._END_EVENT or isinstance(event, BaseException):
            self._done_event = event
        return event

    async def put_end_event(self, execption: BaseException | None = None):
        await self.queue.put(execption or EventQueueTask._END_EVENT)

    def done_use_future(self, is_use: bool):
        if not self.use_future.done():
            self.use_future.set_result(is_use)


class AstreamEventTaskWrapper:
    """
    Generic streaming task wrapper that can execute any _astream_events method in asyncio.create_task
    and retrieve streaming results in the main thread
    """

    def __init__(
        self,
        stream_method: Callable[..., AsyncIterator[Any]],
        callback_on_cancel: Callable[..., Awaitable[Any]] | None = None,
        max_queue_size: int = 256,
    ):
        """
        Initialize streaming task wrapper

        Args:
            stream_method: _astream_events method or any method that returns AsyncIterator[Any]
            max_queue_size: Maximum size of event queue to prevent memory overflow
        """
        self.stream_method = stream_method
        self.max_queue_size = max_queue_size
        self.callback_on_cancel = callback_on_cancel
        self._external_completion_future: asyncio.Future[Any] = asyncio.Future()
        self._event_queue_task: EventQueueTask = None
        self._thread_id = None

    async def astream_event_task(self, *args, **kwargs) -> asyncio.Future[Any]:
        if self._external_completion_future.done():
            raise RuntimeError(
                f"astream_event_task is already done stream_producer_{self._thread_id}"
            )
        input_obj = kwargs.get("input", {})
        new_message = None
        # Handle different input types
        if hasattr(input_obj, "get") and callable(getattr(input_obj, "get")):
            new_message_obj = input_obj.get("messages", [])
            if new_message_obj and len(new_message_obj) > 0:
                new_message = getattr(new_message_obj[-1], "content", None)
        elif hasattr(input_obj, "resume"):
            new_message = getattr(input_obj, "resume", None)
        self._thread_id = (
            kwargs.get("config", {}).get("configurable", {}).get("thread_id", "")
        )
        pre_event_queue_task = self._event_queue_task

        if pre_event_queue_task:
            current_result = kwargs.pop("current_result", None)
            await self.cancel_fetch_task(
                current_stream_producer_task=pre_event_queue_task.stream_producer_task,
                cancel_reason=f"user update task :{new_message}",
                cancel_result=current_result,
            )

        current_queue = asyncio.Queue(maxsize=self.max_queue_size)

        update_task_event = kwargs.pop("update_task_event", None)
        if update_task_event:
            await current_queue.put(update_task_event)

        async def stream_producer():
            """Producer task: execute streaming processing and put events into queue"""
            try:
                async for event in self.stream_method(*args, **kwargs):
                    # Put event into queue, will wait if queue is full
                    await current_queue.put(event)
                await current_queue.put(EventQueueTask._END_EVENT)
            except asyncio.CancelledError:
                # 取消任务，不主动发送结束事件,由取消任务的代码来发送结束事件
                pass
            except BaseException as e:
                await current_queue.put(e)
            logger.info(
                f"stream_producer end stream_producer_{self._thread_id}_{new_message}"
            )

        stream_producer_task = asyncio.create_task(
            stream_producer(), name=f"stream_producer_{self._thread_id}_{new_message}"
        )
        self._event_queue_task = EventQueueTask(
            queue=current_queue, stream_producer_task=stream_producer_task
        )
        if pre_event_queue_task:
            await pre_event_queue_task.put_end_event()

        return self._event_queue_task.use_future

    async def astream_event_result(self) -> AsyncIterator[Any]:
        """
        Use create_task to wrap streaming processing, get streaming results in main thread

        Args:
            *args: Positional arguments passed to stream_method
            **kwargs: Keyword arguments passed to stream_method

        Yields:
            Any: Any data returned by streaming processing

        Raises:
            Exception: Any exception that occurs in stream_method
        """
        final_result = None
        try:
            # Consumer: get events from queue and yield them
            while True:
                try:
                    # Wait for event or completion signal
                    done, _ = await asyncio.wait(
                        [
                            asyncio.create_task(self._event_queue_task.get_event()),
                            self._external_completion_future,
                        ],
                        return_when=asyncio.FIRST_COMPLETED,
                    )

                    if self._external_completion_future.done():
                        final_result = self._external_completion_future.result()
                        # It must be ensured that the cancellation information is saved before returning the cancellation information; otherwise,
                        # the message cannot be saved correctly after the outer resources are cleaned up.
                        await self.cancel_fetch_task(
                            self._event_queue_task.stream_producer_task,
                            "cancel by user",
                            final_result,
                        )
                        yield final_result
                        return
                    else:
                        # Get completed task results
                        for task in done:
                            event = task.result()
                            if event == EventQueueTask._END_EVENT or isinstance(
                                event, BaseException
                            ):
                                if self._event_queue_task.stream_producer_task.done():
                                    if isinstance(event, BaseException):
                                        raise event
                                    return
                                else:
                                    # update task
                                    continue
                            final_result = event
                            yield final_result
                except asyncio.CancelledError:
                    break
        finally:
            logger.info(
                f"session {self._thread_id} stream_event_result finally {final_result}"
            )
            self._event_queue_task.done_use_future(False)
            # Clean up tasks
            if not self._external_completion_future.done():
                self._external_completion_future.cancel()

    def done_fetch_task(self, done_result: Any) -> None:
        self._external_completion_future.set_result(done_result)

    @async_timer
    async def cancel_fetch_task(
        self,
        current_stream_producer_task: asyncio.Task[Any],
        cancel_reason: str,
        cancel_result: Any,
    ) -> None:
        if current_stream_producer_task and not current_stream_producer_task.done():
            current_stream_producer_task.cancel()
            try:
                await current_stream_producer_task
            except asyncio.CancelledError:
                pass
            if self.callback_on_cancel:
                await self.callback_on_cancel(cancel_reason, cancel_result)


# Bridge utility to execute async methods from sync context without waiting
# Use case: calling async methods in __del__ methods for resource cleanup
class AsyncBridge:
    logger = logging.getLogger(__name__)
    """
    Utility class to execute async methods from sync context

    Primarily used for calling async methods in __del__ methods for resource cleanup,
    supports non-blocking execution mode
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

    def run_async_no_wait(self, coro: Awaitable[Any]) -> None:
        """
        Execute async method from sync context without waiting for completion

        Args:
            coro: Async coroutine object
        """
        if not self.is_running():
            logger.warning("Event loop is not running, attempting to restart...")
            try:
                self.restart()
            except Exception as e:
                logger.error(f"Failed to restart event loop: {e}")
                return

        try:
            # Use run_coroutine_threadsafe to schedule coroutine in event loop
            asyncio.run_coroutine_threadsafe(coro, self._loop)
            # Don't wait for result, let coroutine execute in background
        except Exception as e:
            logger.error(f"Failed to schedule async task: {e}")

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
            logger.warning("Event loop is not running, attempting to restart...")
            try:
                self.restart()
            except Exception as e:
                logger.error(f"Failed to restart event loop: {e}")
                return None

        try:
            future = asyncio.run_coroutine_threadsafe(coro, self._loop)
            return future.result(timeout=timeout)
        except Exception as e:
            logger.error(f"Failed to execute async task: {e}")
            return None

    def run_async_func_no_wait(
        self, async_func: Callable[..., Awaitable[Any]], *args, **kwargs
    ) -> None:
        """
        Execute async function from sync context without waiting for completion

        Args:
            async_func: Async function
            *args: Positional arguments
            **kwargs: Keyword arguments
        """
        try:
            coro = async_func(*args, **kwargs)
            self.run_async_no_wait(coro)
        except Exception as e:
            logger.error(f"Failed to create coroutine: {e}")

    def run_async_func_wait(
        self,
        async_func: Callable[..., Awaitable[Any]],
        timeout: float = None,
        *args,
        **kwargs,
    ) -> Any:
        """
        Execute async function from sync context and wait for completion

        Args:
            async_func: Async function
            timeout: Timeout in seconds
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Return value of the async function
        """
        try:
            coro = async_func(*args, **kwargs)
            return self.run_async_wait(coro, timeout)
        except Exception as e:
            logger.error(f"Failed to create coroutine: {e}")
            return None

    def shutdown(self):
        """Shutdown event loop and cleanup resources"""
        try:
            if self._loop and not self._loop.is_closed():
                # Cancel all pending tasks
                try:
                    pending_tasks = asyncio.all_tasks(self._loop)
                    for task in pending_tasks:
                        self._loop.call_soon_threadsafe(task.cancel)
                except Exception as e:
                    logger.warning(f"Error cancelling tasks: {e}")

                # Stop event loop
                self._loop.call_soon_threadsafe(self._loop.stop)

                # Wait for thread to finish
                if self._loop_thread and self._loop_thread.is_alive():
                    self._loop_thread.join(timeout=2.0)

                    # Force close if thread is still alive
                    if self._loop_thread.is_alive():
                        logger.warning("Event loop thread did not stop gracefully")

        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
        finally:
            # Reset state
            self._loop = None
            self._loop_thread = None
            self._loop_ready = None

    def restart(self):
        """Restart event loop"""
        self.shutdown()
        time.sleep(0.1)  # Wait for cleanup to complete
        self._start_event_loop()

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
            self.shutdown()
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


def shutdown_global_async_bridge():
    """
    Shutdown global AsyncBridge instance

    Used for cleanup when application exits
    """
    global _async_bridge
    if _async_bridge is not None:
        with _global_lock:
            if _async_bridge is not None:
                try:
                    _async_bridge.shutdown()
                    _async_bridge = None
                except Exception as e:
                    logger.error(f"Error shutting down global AsyncBridge: {e}")


def reset_global_async_bridge():
    """
    Reset global AsyncBridge instance

    Used for testing or scenarios requiring reinitialization
    """
    global _async_bridge
    with _global_lock:
        if _async_bridge is not None:
            try:
                _async_bridge.shutdown()
            except Exception as e:
                logger.error(f"Error during reset: {e}")
            finally:
                _async_bridge = None


def run_async_no_wait(coro: Awaitable[Any]) -> None:
    """
    Convenience function: Execute async method from sync context without waiting

    Usage example:
    ```python
    class MyClass:
        async def cleanup_async(self):
            # Async cleanup logic
            await some_async_cleanup()

        def __del__(self):
            # Call async cleanup method in destructor
            run_async_no_wait(self.cleanup_async())
    ```

    Args:
        coro: Async coroutine object
    """
    get_async_bridge().run_async_no_wait(coro)


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


def run_async_func_no_wait(
    async_func: Callable[..., Awaitable[Any]], *args, **kwargs
) -> None:
    """
    Convenience function: Execute async function from sync context without waiting

    Usage example:
    ```python
    async def cleanup_resource(resource_id: str):
        # Async cleanup logic
        await some_cleanup(resource_id)

    class MyClass:
        def __del__(self):
            # Call async function in destructor
            run_async_func_no_wait(cleanup_resource, self.resource_id)
    ```

    Args:
        async_func: Async function
        *args: Positional arguments
        **kwargs: Keyword arguments
    """
    get_async_bridge().run_async_func_no_wait(async_func, *args, **kwargs)


def run_async_func_wait(
    async_func: Callable[..., Awaitable[Any]], timeout: float = None, *args, **kwargs
) -> Any:
    """
    Convenience function: Execute async function from sync context and wait for completion

    Args:
        async_func: Async function
        timeout: Timeout in seconds
        *args: Positional arguments
        **kwargs: Keyword arguments

    Returns:
        Return value of the async function
    """
    return get_async_bridge().run_async_func_wait(async_func, timeout, *args, **kwargs)
