"""
Streaming Base Tool Implementation

This module defines abstract base classes for streaming tools that support intermediate event dispatching.
It extends BaseTool to provide streaming capabilities through the standard _arun interface,
using adispatch_custom_event to send intermediate events during processing.

Key Features:
- Streaming event processing with timeout support
- External completion mechanism for user interruption
- Custom event dispatching through LangChain's callback system
- Robust error handling and timeout management

Usage Examples:

1. Basic Streaming Tool Implementation:
```python
from langcrew_tools.astream_tool import StreamingBaseTool, StreamEventType

class MyStreamingTool(StreamingBaseTool):
    name = "my_streaming_tool"
    description = "A custom streaming tool that processes data incrementally"

    async def _astream_events(self, input_data: str, **kwargs):
        # Start event
        yield StreamEventType.START, self.start_standard_stream_event(input_data)

        # Intermediate processing events
        for i in range(5):
            await asyncio.sleep(1)  # Simulate processing
            intermediate_data = {"step": i, "progress": f"{i*20}%"}
            yield StreamEventType.INTERMEDIATE, StandardStreamEvent(
                event="on_tool_progress",
                name=self.name,
                data=intermediate_data
            )

        # Final result
        result = {"status": "completed", "result": f"Processed: {input_data}"}
        yield StreamEventType.END, self.end_standard_stream_event(result)
```

2. Tool with External Completion Support:
```python
class InterruptibleTool(StreamingBaseTool):
    name = "interruptible_tool"
    stream_event_timeout_seconds = 30  # 30 second timeout

    async def handle_external_completion(self, event_type: EventType, event_data: Any):
        if event_type == EventType.STOP:
            return {"interrupted": True, "reason": "User requested stop"}
        return await super().handle_external_completion(event_type, event_data)

    async def _astream_events(self, task: str, **kwargs):
        yield StreamEventType.START, self.start_standard_stream_event(task)

        # Long-running process that can be interrupted
        for i in range(100):
            await asyncio.sleep(0.5)
            yield StreamEventType.INTERMEDIATE, StandardStreamEvent(
                event="on_task_progress",
                name=self.name,
                data={"iteration": i, "task": task}
            )

        yield StreamEventType.END, self.end_standard_stream_event("Task completed")

# Usage with external interruption
tool = InterruptibleTool()
# In another coroutine, you can interrupt:
# await tool.trigger_external_completion(EventType.STOP, "User clicked stop")
```

3. Simple External Completion Tool:
```python
class WaitForUserTool(ExternalCompletionBaseTool):
    name = "wait_for_user"
    description = "Waits for user input or external completion"

    async def _arun_custom_event(self, prompt: str, **kwargs):
        # This tool waits for external completion
        # The actual result comes from trigger_external_completion()
        return f"Waiting for user response to: {prompt}"

    async def handle_external_completion(self, event_type: EventType, event_data: Any):
        if event_type == EventType.NEW_MESSAGE:
            return {"user_response": event_data, "completed": True}
        return await super().handle_external_completion(event_type, event_data)
```

Error Handling Examples:

1. Timeout Handling:
```python
class TimeoutAwareTool(StreamingBaseTool):
    stream_event_timeout_seconds = 10

    def handle_timeout_error(self, error: Exception):
        logger.error(f"Tool timed out: {error}")
        # Custom cleanup or notification logic
        self.send_timeout_notification()

    def send_timeout_notification(self):
        # Custom timeout handling
        pass
```

2. Configuration Setup:
```python
class ConfigurableTool(StreamingBaseTool):
    def configure_runnable(self, config: RunnableConfig):
        # Extract custom configuration
        self.custom_setting = config.get("configurable", {}).get("custom_setting", "default")
        self.debug_mode = config.get("configurable", {}).get("debug", False)

        if self.debug_mode:
            logger.setLevel(logging.DEBUG)
```

Integration with LangChain:

```python
from langchain_core.runnables import RunnableConfig

# Using the tool in a LangChain workflow
config = RunnableConfig(
    configurable={"custom_setting": "production", "debug": False}
)

tool = MyStreamingTool()
result = await tool.arun("input data", config=config)

# Or with streaming events
async for event in tool.astream_events("input data", config=config):
    print(f"Event: {event}")
```
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Callable
from enum import Enum
from typing import Any

try:
    from typing import override
except ImportError:
    from typing_extensions import override

from langchain_core.callbacks import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.runnables.schema import StandardStreamEvent
from langchain_core.tools.base import BaseTool
from pydantic import Field

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """External completion event type enumeration"""

    NEW_MESSAGE = "new_message"
    STOP = "stop"
    END = "end"


class StreamEventType(str, Enum):
    """Stream event state type enumeration"""

    START = "start"
    INTERMEDIATE = "intermediate"
    END = "end"


class StreamTimeoutError(Exception):
    """Stream event timeout error"""

    def __init__(self, timeout_seconds: float, last_event_type: str = None):
        self.timeout_seconds = timeout_seconds
        self.last_event_type = last_event_type
        if last_event_type:
            super().__init__(
                f"Stream event timeout after {timeout_seconds}s, last event: {last_event_type}"
            )
        else:
            super().__init__(f"Stream event timeout after {timeout_seconds}s")


class ToolCallback(BaseTool):
    @abstractmethod
    def tool_order_callback(self) -> tuple[int | None, Callable]:
        pass


class StreamingBaseTool(ToolCallback):
    stream_event_timeout_seconds: int = Field(
        -1, description="Stream event timeout seconds"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Optimization: Use Future to handle both waiting and data storage
        self._external_completion_future: asyncio.Future[Any] | None = None

    async def handle_external_completion(
        self, event_type: EventType, event_data: Any
    ) -> Any:
        """
        Handle external completion events and return context data to the agent.

        Subclasses should implement this method to customize external event handling.

        Args:
            event_type: External event type (STOP, NEW_MESSAGE)
            event_data: Data carried by the event

        Returns:
            Context data to return to the stream processing caller

        Example:
            async def handle_external_completion(self, event_type: EventType, event_data: Any):
                if event_type == EventType.STOP:
                    return {"interrupted": True, "reason": "User stopped execution"}
                elif event_type == EventType.NEW_MESSAGE:
                    return {"new_task": event_data, "continue": True}
                return await super().handle_external_completion(event_type, event_data)
        """
        if event_type == EventType.STOP:
            result = "Agent stopped by user"
        elif event_type == EventType.NEW_MESSAGE:
            result = f"Agent add new task: {event_data}"
        return {
            "is_complete": False,
            "stop_reason": result,
        }

    async def get_handover_info(self) -> dict | None:
        pass

    async def trigger_external_completion(
        self, event_type: EventType, event_data: Any
    ) -> Any:  # type: ignore
        if (
            not self._external_completion_future
            or self._external_completion_future.done()
        ):
            logger.debug("External completion ignored: future already done")
            return
        result = None
        try:
            result = await self.handle_external_completion(event_type, event_data)
            if result:
                self._external_completion_future.set_result(
                    result
                )  # Set result and notify waiters simultaneously
                logger.info(f"External completion triggered: {event_data}")
            else:
                logger.debug(
                    "External completion ignored: no result or future not ready"
                )
        except asyncio.CancelledError:
            pass
        except BaseException as e:
            self._external_completion_future.set_exception(e)
        return result

    def _reset_external_completion(self):
        """Reset external completion state for new execution"""
        self._external_completion_future = asyncio.Future()

    @abstractmethod
    async def _astream_events(
        self, *args: Any, **kwargs: Any
    ) -> AsyncIterator[tuple[StreamEventType, StandardStreamEvent]]:
        """
        Stream events from the tool execution.

        This method should be implemented by subclasses to provide streaming
        functionality. It should yield tuples of (StreamEventType, custom_event_data)
        as the tool processes.

        Args:
            *args: Positional arguments passed to the tool
            **kwargs: Keyword arguments passed to the tool

        Yields:
            Tuple[StreamEventType, Any]: A tuple containing:
                - StreamEventType: The type of event (START, INTERMEDIATE, END)
                - Any: The custom event data

        Note:
            Add run_manager: Optional[AsyncCallbackManagerForToolRun] = None
            to child implementations to enable tracing.
        """

    async def handle_custom_event(self, custom_event: dict) -> StandardStreamEvent:
        """
        Handle custom event and convert it to StandardStreamEvent format.

        Args:
            custom_event: Dictionary containing custom event data

        Returns:
            StandardStreamEvent: Formatted stream event

        Example:
            custom_event = {
                "data": {
                    "event": "on_tool_progress",
                    "name": "my_tool",
                    "data": {"progress": 50}
                },
                "run_id": "123",
                "timestamp": "2024-01-01T00:00:00Z"
            }
        """
        custom_event_data = custom_event.get("data", {})

        return StandardStreamEvent(
            event=custom_event_data.get("event", ""),
            name=custom_event_data.get("name", ""),
            data=custom_event_data.get("data", {}),
            run_id=custom_event.get("run_id", ""),
            parent_ids=custom_event.get("parent_ids", []),
            tags=custom_event.get("tags", []),
            metadata=custom_event.get("metadata", {}),
            timestamp=custom_event.get("timestamp", ""),
        )

    async def handle_standard_stream_event(
        self, standard_stream_event: dict
    ) -> StandardStreamEvent:
        """
        Handle standard stream event - pass through by default.

        Args:
            standard_stream_event: Standard stream event dictionary

        Returns:
            StandardStreamEvent: The same event passed through
        """
        return standard_stream_event

    def start_standard_stream_event(
        self, data: Any, event_name: str = "on_tool_start"
    ) -> StandardStreamEvent:
        """
        Create a standard stream event for tool start.

        Args:
            data: Input data for the tool
            event_name: Name of the event (default: "on_tool_start")

        Returns:
            StandardStreamEvent: Formatted start event
        """
        return StandardStreamEvent(
            event=event_name,
            name=self.name,
            data={"input": data},
        )

    def end_standard_stream_event(
        self, data: Any, event_name: str = "on_tool_end"
    ) -> StandardStreamEvent:
        """
        Create a standard stream event for tool completion.

        Args:
            data: Output data from the tool
            event_name: Name of the event (default: "on_tool_end")

        Returns:
            StandardStreamEvent: Formatted end event
        """
        return StandardStreamEvent(
            event=event_name,
            name=self.name,
            data={"output": data},
        )

    @override
    def tool_order_callback(self) -> tuple[int | None, Callable]:
        return None, self.custom_event_hook

    async def custom_event_hook(self, custom_event: dict) -> Any:
        """
        Crew callback custom event hook for processing stream events.

        This method is called by the crew system to handle custom events
        generated during tool execution.

        Args:
            custom_event: Dictionary containing event information with structure:
                - event: Literal["on_custom_event"] - event type
                - name: str - tool name (should match self.name)
                - data: Any - event data that will be converted to StandardStreamEvent

        Returns:
            Any: Processed event data or original event if not handled

        Example:
            custom_event = {
                "event": "on_custom_event",
                "name": "my_tool",
                "data": {
                    "event": "on_tool_progress",
                    "name": "my_tool",
                    "data": {"step": 1, "total": 5}
                }
            }
        """

        try:
            if custom_event.get("name") != self.name:
                return custom_event
            if custom_event.get("event") == "on_custom_event":
                return await self.handle_custom_event(custom_event)
            else:
                result = await self.handle_standard_stream_event(custom_event)
                return result
        except BaseException as e:
            # Global error handling: log error and return original object if any error occurs
            logger.exception(f"Error in custom_event_hook: {e}")
            return custom_event

    def configure_runnable(self, config: RunnableConfig):
        """
        Hook method for configuring runtime parameters.

        Subclasses can override this method to handle configuration initialization logic.

        Args:
            config: LangChain runtime configuration

        Example:
            def configure_runnable(self, config: RunnableConfig):
                self.debug_mode = config.get("configurable", {}).get("debug", False)
                self.max_iterations = config.get("configurable", {}).get("max_iterations", 10)
        """
        pass

    def handle_timeout_error(self, error: Exception) -> None:
        """
        Hook method for handling stream processing timeout errors.

        Subclasses can override this method to implement custom timeout handling logic.

        Args:
            error: Timeout exception object

        Example:
            def handle_timeout_error(self, error: Exception) -> None:
                logger.error(f"Tool {self.name} timed out: {error}")
                self.cleanup_resources()
                self.notify_timeout_to_user()
        """
        pass

    async def _dispatch_or_log_event(
        self,
        custom_event_name: str,
        custom_event_data: Any,
        config: RunnableConfig | None,
        can_dispatch: bool,
    ) -> None:
        """
        Either dispatch the event using adispatch_custom_event or log it.

        Args:
            custom_event_name: The name of the custom event
            custom_event_data: The data for the custom event
            config: Optional RunnableConfig
            can_dispatch: Whether event dispatch is available
        """

        if can_dispatch:
            try:
                await adispatch_custom_event(
                    custom_event_name,
                    custom_event_data,
                    config=config,
                )
            except RuntimeError as e:
                # Fallback to logging if dispatch fails
                logger.info(
                    f"Event dispatch failed, logging instead: {custom_event_name} - {custom_event_data}"
                )
                logger.debug(f"Dispatch error: {e}")
        else:
            # Log the intermediate event
            logger.info(f"Streaming event: {custom_event_name} - {custom_event_data}")

    async def _run_stream_processor(
        self,
        custom_event_name: str,
        config: RunnableConfig | None,
        can_dispatch_events: bool,
        *args,
        **kwargs,
    ) -> Any:
        """Independent stream processor that can be interrupted by external events"""
        final_event_data = None

        try:
            async for event_type, custom_event_data in self._astream_events(
                *args, **kwargs
            ):
                # Dispatch intermediate events (not the final one)
                if event_type != StreamEventType.END:
                    await self._dispatch_or_log_event(
                        custom_event_name,
                        custom_event_data,
                        config=config,
                        can_dispatch=can_dispatch_events,
                    )
                else:
                    # StandardStreamEvent - extract final output data
                    final_event_data = (
                        custom_event_data.get("data", {}).get("output", {})
                        if custom_event_data
                        else None
                    )
        except asyncio.CancelledError:
            raise
        except BaseException as e:
            logger.exception(f"Error in _run_stream_processor: {e}")
            raise e

        if final_event_data is not None:
            # logger.info(f"Stream completed with data: {final_event_data}")
            return final_event_data
        else:
            return await self.none_result()

    async def none_result(self) -> Any:
        raise RuntimeError("Tool execution failed with no result data")

    async def _process_stream_with_timeout(
        self,
        custom_event_name: str,
        config: dict | None = None,
        can_dispatch_events: bool = True,
        *args,
        **kwargs,
    ) -> Any:
        self._reset_external_completion()
        timeout_seconds = self.stream_event_timeout_seconds

        # Create event notification for waking up the main loop
        new_event = asyncio.Event()

        async def event_processor():
            """Event processor that handles the stream"""
            final_event_data = None

            try:
                async for event_type, custom_event_data in self._astream_events(
                    *args, **kwargs
                ):
                    if event_type == StreamEventType.END:
                        final_event_data = (
                            custom_event_data.get("data", {}).get("output", {})
                            if custom_event_data
                            else None
                        )
                        break
                    # Notify that a new event was received
                    new_event.set()
                    # Dispatch intermediate events (not the final one)
                    await self._dispatch_or_log_event(
                        custom_event_name,
                        custom_event_data,
                        config=config,
                        can_dispatch=can_dispatch_events,
                    )
            finally:
                new_event.set()  # Ensure the main loop unblocks if it's waiting

            return final_event_data if final_event_data else await self.none_result()

        async def external_monitor():
            """Monitor external completion future"""
            try:
                return await self._external_completion_future
            finally:
                new_event.set()  # Unblock main loop

        # Start both processors
        event_task = asyncio.create_task(event_processor())
        external_task = asyncio.create_task(external_monitor())

        try:
            while not event_task.done() and not external_task.done():
                # Key optimization: Use asyncio.wait_for to wait for new events with timeout
                try:
                    await asyncio.wait_for(new_event.wait(), timeout=timeout_seconds)
                except TimeoutError:
                    # Immediately raise timeout error
                    logger.error(f"Stream timeout after {timeout_seconds}s")
                    raise StreamTimeoutError(timeout_seconds)

                # Cooperative scheduling guarantee: code between await returns is atomic,
                # event_processor cannot call set() during this period
                new_event.clear()

            # Check task status directly for cleaner code
            if external_task.done():
                logger.info("External completion won the race")
                return await external_task
            elif event_task.done():
                logger.info("Stream processing completed normally")
                return await event_task
            else:
                # Should not reach here, but as a safety measure
                logger.warning("Unexpected loop exit condition")
                return None
        finally:
            # Cancel unfinished tasks
            if not event_task.done():
                event_task.cancel()
            if not external_task.done():
                external_task.cancel()

    def _run(self, config: RunnableConfig, *args: Any, **kwargs: Any) -> Any:
        logger.warn("sync _run in new loop")
        try:
            return asyncio.run(self._arun(config, *args, **kwargs))
        except RuntimeError as e:
            if "cannot be called from a running event loop" in str(e):
                # Fallback: manually create and manage event loop
                logger.debug("Creating new event loop for sync execution")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(
                        self._arun(config, *args, **kwargs)
                    )
                    return result
                finally:
                    loop.close()
                    # Reset event loop policy to avoid issues
                    asyncio.set_event_loop(None)
            raise e

    async def _arun(self, config: RunnableConfig, *args: Any, **kwargs: Any) -> Any:
        try:
            self.configure_runnable(config)
        except BaseException as e:
            # Unified exception handling: use exception level to record full stack trace
            logger.exception(f"Error in set_runnable_config: {e}")
            raise e
        # Check if adispatch_custom_event is available
        can_dispatch_events = self._can_dispatch_custom_events(config)
        custom_event_name = self.name

        # Get timeout configuration
        timeout_seconds = self.stream_event_timeout_seconds

        # Choose processing method based on timeout configuration
        if timeout_seconds < 0:
            try:
                return await self._process_stream_without_timeout(
                    custom_event_name=custom_event_name,
                    config=config,
                    can_dispatch_events=can_dispatch_events,
                    *args,
                    **kwargs,
                )
            except asyncio.CancelledError as e:
                raise e
            except BaseException as e:
                # Unified exception handling: use exception level to record full stack trace
                logger.exception(f"Stream processing error: {e}")
                raise e
        else:
            # Concurrent processing with timeout
            try:
                return await self._process_stream_with_timeout(
                    custom_event_name=custom_event_name,
                    config=config,
                    can_dispatch_events=can_dispatch_events,
                    *args,
                    **kwargs,
                )
            except StreamTimeoutError as e:
                # Timeout exception: log detailed information and propagate
                logger.exception("Stream processing timeout occurred")
                self.handle_timeout_error(e)
                raise e
            except BaseException as e:
                # General exception: log detailed information and propagate
                logger.exception(f"Stream processing error occurred:  {e}")
                raise e

    async def _process_stream_without_timeout(
        self,
        custom_event_name: str,
        config: RunnableConfig | None,
        can_dispatch_events: bool,
        *args,
        **kwargs,
    ) -> Any:
        self._reset_external_completion()

        stream_task = asyncio.create_task(
            self._run_stream_processor(
                custom_event_name, config, can_dispatch_events, *args, **kwargs
            )
        )

        try:
            # Wait for any task to complete - use Future and Task directly
            done, pending = await asyncio.wait(
                [stream_task, self._external_completion_future],
                return_when=asyncio.FIRST_COMPLETED,
            )
            # Check which task completed
            if self._external_completion_future in done:
                logger.info("External completion won the race")
                return await self._external_completion_future
            else:
                logger.info("Stream processing completed normally")
                return await stream_task

        finally:
            if not stream_task.done():
                stream_task.cancel()
            # Future doesn't need cancellation, it handles itself

    def _can_dispatch_custom_events(self, config: RunnableConfig | None) -> bool:
        """
        Check if adispatch_custom_event is available in the current context.

        Args:
            config: Optional RunnableConfig

        Returns:
            bool: True if adispatch_custom_event can be called, False otherwise
        """
        if not config:
            return False

        try:
            from langchain_core.runnables.config import (
                ensure_config,
                get_async_callback_manager_for_config,
            )

            config = ensure_config(config)
            callback_manager = get_async_callback_manager_for_config(config)

            # Check if we have a parent run id
            return callback_manager.parent_run_id is not None
        except BaseException:
            # If any error occurs during checking, assume not available
            return False


class ExternalCompletionBaseTool(StreamingBaseTool, ABC):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @override
    async def _astream_events(
        self, *args: Any, **kwargs: Any
    ) -> AsyncIterator[tuple[StreamEventType, StandardStreamEvent]]:
        result = await self._arun_custom_event(*args, **kwargs)
        yield StreamEventType.END, self.end_standard_stream_event(result)

    @abstractmethod
    async def _arun_custom_event(self, *args: Any, **kwargs: Any) -> Any:
        """
        Run the tool asynchronously and return the result.
        """


class GraphStreamingBaseTool(StreamingBaseTool, ABC):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._stop_event: asyncio.Event = asyncio.Event()
        self._new_message_event: asyncio.Event = asyncio.Event()
        self._is_running: bool = False
        self._stop_result: str | None = None

    @override
    async def _arun(self, config: RunnableConfig, *args: Any, **kwargs: Any) -> Any:
        self._is_running = True
        main_task = asyncio.create_task(self._arun_work(*args, **kwargs))

        try:
            # Wait for the main task to complete or the stop signal
            done, pending = await asyncio.wait(
                [
                    main_task,
                    asyncio.create_task(self._stop_event.wait()),
                    asyncio.create_task(self._new_message_event.wait()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel unfinished tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            if self._stop_event.is_set():
                logger.info("Stop signal received")
                self._stop_event.clear()
                return self._stop_result
            
            if self._new_message_event.is_set():
                logger.info("New message signal received")
                self._new_message_event.clear()
                return self._stop_result

            result = main_task.result()
            logger.info(f"Main task completed: {result}")
            return result  # Get the result of the main task

        except asyncio.CancelledError:
            logger.info("Main task cancelled")
            # Cancel main task
            if not main_task.done():
                main_task.cancel()
            return "tool execution cancelled"

        except BaseException as e:
            logger.exception(f"Error in _arun: {e}")
            # Cancel main task
            if not main_task.done():
                main_task.cancel()
            return f"Error in tool execution: {e}"
        finally:
            self._is_running = False

    @abstractmethod
    async def _arun_work(self, *args: Any, **kwargs: Any) -> Any:
        """
        Get the graph.
        """
        pass

    async def tool_stop_result(self, event_type: EventType, message: str | None = None):
        """
        can override method, return custom result of tool stop or new message

        Returns:
            str: custom result of tool stop or new message
        """
        result = ""
        if event_type == EventType.STOP:
            result = "Agent stopped by user"
        elif event_type == EventType.NEW_MESSAGE:
            result = f"Agent add new task: {message}"
        return result

    # External callback function, used to trigger the tool execution process if it needs to stop or new message
    @override
    async def trigger_external_completion(
        self, event_type: EventType, event_data: Any
    ) -> Any:
        result = None
        if not self._is_running:
            return result
        try:
            if event_type == EventType.STOP:
                result = await self.tool_stop_result(EventType.STOP, None)
                self._stop_result = result
                self._stop_event.set()
            elif event_type == EventType.NEW_MESSAGE:
                result = await self.tool_stop_result(EventType.NEW_MESSAGE, str(event_data))
                self._stop_result = result
                self._new_message_event.set()
        except BaseException as e:
            result = f"Error occurred during tool execution: {e}"
        return result

    # Get the last message content as the result
    def get_last_event_content(self, event_data: dict) -> StandardStreamEvent:
        """
        Get the last valid AI message content from the event data
        """
        try:
            if not isinstance(event_data, dict):
                return event_data

            messages = event_data.get("data", {}).get("output", {}).get("messages", [])
            if not messages:
                return event_data

            # Traverse messages in reverse order, find the last valid AI message
            for message in reversed(messages):
                if isinstance(message, dict):
                    content = message.get("content")
                else:
                    content = getattr(message, "content", None)

                if not content:
                    continue

                # Check if the message is a valid AI message
                # Check if there is a tool_call_id (if so, skip)
                has_tool_call_id = hasattr(message, "tool_call_id") or (
                    isinstance(message, dict) and "tool_call_id" in message
                )
                if has_tool_call_id:
                    continue

                # Check if the message type is valid
                if isinstance(message, dict):
                    is_valid = message.get("type") != "tool"
                else:
                    is_valid = type(message).__name__ == "AIMessage"

                if is_valid:
                    return self.end_standard_stream_event(content)

            return event_data

        except BaseException as e:
            logging.exception(f"Error in get_last_event_content: {e}")
            return event_data

    # Deprecated
    @override
    async def _astream_events(
        self, *args: Any, **kwargs: Any
    ) -> AsyncIterator[tuple[StreamEventType, StandardStreamEvent]]:
        pass
