import asyncio
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

logger = logging.getLogger(__name__)


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
        self._event_queue = asyncio.Queue(maxsize=self.max_queue_size)
        self._exception_holder = {"exception": None}
        self._completion_event = asyncio.Event()
        self._stream_producer_task = None

    async def astream_event_task(self, *args, **kwargs):
        input_obj = kwargs.get("input", {})
        new_message = None
        # Handle different input types
        if hasattr(input_obj, "get") and callable(getattr(input_obj, "get")):
            new_message_obj = input_obj.get("messages", [])
            if new_message_obj and len(new_message_obj) > 0:
                new_message = getattr(new_message_obj[-1], "content", None)
        elif hasattr(input_obj, "resume"):
            new_message = getattr(input_obj, "resume", None)
        thread_id = (
            kwargs.get("config", {}).get("configurable", {}).get("thread_id", "")
        )
        if self._stream_producer_task:
            current_result = kwargs.pop("current_result", None)
            await self.cancel_fetch_task(
                cancel_reason=f"user update task :{new_message}",
                cancel_result=current_result,
            )
            self._stream_producer_task = None
            update_task_event = kwargs.pop("update_task_event", None)
            if update_task_event:
                await self._event_queue.put(update_task_event)

        async def stream_producer():
            """Producer task: execute streaming processing and put events into queue"""
            try:
                async for event in self.stream_method(*args, **kwargs):
                    # Put event into queue, will wait if queue is full
                    await self._event_queue.put(event)
                self._completion_event.set()
            except asyncio.CancelledError:
                pass
            except BaseException as e:
                self._exception_holder["exception"] = e
                self._completion_event.set()
                logger.exception(f"Error in stream_producer: {e}")
            # self._completion_event.set() cannot be put in finally block, because when current task is cancelled, completion event should not be set in finally.

        self._stream_producer_task = asyncio.create_task(
            stream_producer(), name=f"stream_producer_{thread_id}_{new_message}"
        )

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
        cancel_result = None
        try:
            # Consumer: get events from queue and yield them
            while True:
                try:
                    # Wait for event or completion signal
                    done, pending = await asyncio.wait(
                        [
                            asyncio.create_task(self._event_queue.get()),
                            self._external_completion_future,
                        ],
                        return_when=asyncio.FIRST_COMPLETED,
                    )

                    # Check if there are any exceptions
                    if self._exception_holder["exception"]:
                        raise self._exception_holder["exception"]

                    # If completion event is set, try to get all remaining events from queue
                    if self._completion_event.is_set():
                        # Process remaining events in queue
                        while not self._event_queue.empty():
                            try:
                                event_data = self._event_queue.get_nowait()
                                yield event_data
                            except asyncio.QueueEmpty:
                                break
                        return
                    if self._external_completion_future.done():
                        cancel_result = self._external_completion_future.result()
                        yield cancel_result
                        return
                    else:
                        # Get completed task results
                        for task in done:
                            event_data = task.result()
                            yield event_data
                except asyncio.CancelledError:
                    break
        finally:
            # Clean up tasks
            await self.cancel_fetch_task("cancel by user", cancel_result)
            if not self._external_completion_future.done():
                self._external_completion_future.cancel()

    def done_fetch_task(self, done_result: Any) -> None:
        self._external_completion_future.set_result(done_result)

    async def cancel_fetch_task(self, cancel_reason: str, cancel_result: Any) -> None:
        if not self._stream_producer_task.done():
            self._stream_producer_task.cancel()
            try:
                await self._stream_producer_task
            except asyncio.CancelledError:
                pass
            if self.callback_on_cancel:
                await self.callback_on_cancel(cancel_reason, cancel_result)
