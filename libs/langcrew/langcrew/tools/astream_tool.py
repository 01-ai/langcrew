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


class ToolCallback(BaseTool, ABC):
    """
    Tool interface that contains ordered callback methods

    Tools of this type will be registered in the crew and executed in order
    after the langgraph astream method returns. The execution results will
    ultimately be output in Langcrew's astream.

    This interface enables tools to participate in post-processing workflows
    and contribute to the final output stream in a controlled, ordered manner.
    """

    @abstractmethod
    def tool_order_callback(self) -> tuple[int | None, Callable]: ...


class HitlGetHandoverInfoTool(ABC):
    """
    Interface for tools that provide handover information when HITL is triggered

    When an Agent triggers HITL (Human In The Loop) - either through tool/agent
    self-determination of needing handover or user actively inputting handover intent -
    tools need to provide supplementary information to the frontend, such as:
    - Sandbox handover address links
    - Session information
    - Access credentials
    - Instructions for human operators

    This interface ensures consistent handover information provision across all
    tools that support human intervention scenarios.
    """

    @abstractmethod
    async def get_handover_info(self) -> dict | None: ...


class StreamingBaseTool(ToolCallback):
    stream_event_timeout_seconds: int = Field(
        -1,
        description="Stream event timeout in seconds. Set to -1 for no timeout. "
        "Prevents streaming tasks from blocking indefinitely by throwing "
        "StreamTimeoutError if interval between _astream_events exceeds this value.",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Optimization: Use Future to handle both waiting and data storage
        self._external_completion_future: asyncio.Future[Any] | None = None

    async def handle_external_completion(
        self, event_type: EventType, event_data: Any
    ) -> Any:
        """
        Handle external completion events and return context data to the agent

        This method processes external completion events (STOP, NEW_MESSAGE) and returns
        context data that will be sent to the upper-level Agent via _astream_events as
        an END type event. This enables proper context preservation during cancellation.

        Best Practice: Return current tool execution state to help Agent save context.
        Performance Requirement: Avoid long-running tasks to ensure interruption and
        task change events can be responded to promptly.

        Supported EventTypes:
        1. STOP: Cancel task event - tool should return current execution state
        2. NEW_MESSAGE: Update task event - tool should handle task transition

        Args:
            event_type: External event type (STOP, NEW_MESSAGE)
            event_data: Data carried by the event

        Returns:
            Context data to return to the stream processing caller, will be sent
            to upper-level Agent as END event through _astream_events

        Example:
            async def handle_external_completion(self, event_type: EventType, event_data: Any):
                if event_type == EventType.STOP:
                    return {"interrupted": True, "reason": "User stopped execution",
                           "current_state": self.get_execution_state()}
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

    async def trigger_external_completion(
        self, event_type: EventType, event_data: Any
    ) -> Any:  # type: ignore
        """
        Method for tools to accept cancellation events

        Generally registered at the Agent layer (RunnableCrew) to receive cancellation
        events. Uses _external_completion_future to determine if the current object is
        already executing/finished. For tools currently in progress, calls
        handle_external_completion to implement the actual cancellation logic.

        Workflow:
        1. Check if tool is currently executing via _external_completion_future
        2. If executing, call handle_external_completion for actual cancellation logic
        3. Set result in _external_completion_future to notify waiting stream processor
        4. Return result from handle_external_completion

        Args:
            event_type: Type of external event (STOP or NEW_MESSAGE)
            event_data: Event data to pass to cancellation handler

        Returns:
            Result from handle_external_completion, or None if tool not executing
        """
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
        Core method that business logic needs to implement for streaming event generation

        This method outputs LangGraph standard events (StreamEventType, StandardStreamEvent).
        StreamEventType indicates current event progress, where END represents completion
        event. The END event output content will be returned to the upper-level agent,
        with agent processing logic consistent with langchain tool return results.

        START and INTERMEDIATE events will be returned through langgraph's astream method
        as custom events (CustomStreamEvent) via adispatch_custom_event.

        Event Flow:
        - START: Tool initialization and input parameters
        - INTERMEDIATE: Progress updates and partial results
        - END: Final result that gets returned to the agent

        Helper Methods Available:
        - start_standard_stream_event(): Build StandardStreamEvent for START
        - end_standard_stream_event(): Build StandardStreamEvent for END

        Args:
            *args: Positional arguments passed to the tool
            **kwargs: Keyword arguments passed to the tool

        Yields:
            Tuple[StreamEventType, StandardStreamEvent]: A tuple containing:
                - StreamEventType: The type of event (START, INTERMEDIATE, END)
                - StandardStreamEvent: LangGraph standard event object

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
        Crew callback custom event hook for processing stream events

        This method implements the generic logic for tool_order_callback. It filters
        events by tool name to ensure only current tool's events are processed, and
        categorizes current tool's events into:
        1. Standard protocol processing (handle_standard_stream_event)
        2. Custom protocol processing (handle_custom_event)

        To ensure Langcrew can output standard protocol StandardStreamEvent after
        Streamtool internal custom event output (adispatch_custom_event-CustomStreamEvent),
        all astream_tools need to implement ToolCallback's callback method to convert
        langgraph output (CustomStreamEvent) to StandardStreamEvent.

        Return Behavior:
        - Returns None: Discard current result
        - Returns list: Support multiple results
        - Returns object: Single processed result

        Args:
            custom_event: Dictionary containing event information with structure:
                - event: Literal["on_custom_event"] - event type
                - name: str - tool name (should match self.name)
                - data: Any - event data that will be converted to StandardStreamEvent

        Returns:
            Any: Processed event data, original event if not handled, None to discard,
                 or list for multiple results

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
        Hook method for handling stream processing timeout errors

        Called when stream_event_timeout_seconds is exceeded between _astream_events
        returns. This prevents streaming tasks from blocking indefinitely and causing
        complete system deadlock.

        Subclasses can override this method to implement custom timeout handling logic
        such as resource cleanup, state synchronization, and user notification.

        Use Cases:
        - Clean up partial results or temporary resources
        - Synchronize tool state after timeout
        - Send timeout notifications to users
        - Log detailed timeout information for debugging

        Args:
            error: StreamTimeoutError object containing timeout details

        Example:
            def handle_timeout_error(self, error: Exception) -> None:
                logger.error(f"Tool {self.name} timed out after {error.timeout_seconds}s")
                self.cleanup_partial_results()
                self.notify_timeout_to_user()
                self.reset_tool_state()
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
        """
        Timeout version implementation that supports dual information sources

        This method handles streaming with timeout support by monitoring two information sources:
        1. Tool's _astream_events: Normal business processing events
        2. Custom cancellation protocol: External completion events

        Implementation mechanism:
        - Stores information from both message sources in asyncio.Event()
        - Uses asyncio.wait_for to set maximum time for information retrieval
        - Throws StreamTimeoutError if timeout occurs
        - Allows handle_timeout_error to synchronize class state

        The timeout mechanism prevents streaming tasks from blocking indefinitely,
        ensuring system responsiveness even when tools become unresponsive.

        Args:
            custom_event_name: Name for custom events
            config: Optional runtime configuration
            can_dispatch_events: Whether custom event dispatch is available
            *args: Arguments passed to _astream_events
            **kwargs: Keyword arguments passed to _astream_events

        Returns:
            Final result from either stream completion or external completion

        Raises:
            StreamTimeoutError: If no events received within timeout period
        """
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
    """
    Tool base class that supports fast return - for tools that primarily rely on external completion

    Usage:
    - Inherit and implement _arun_custom_event method
    - Use _arun_custom_event instead of langchain's _arun

    When to use:
    - Tools that primarily wait for external events (user input, external APIs)
    - Tools that need fast response to external completion signals
    - Simple tools that don't require complex streaming progress updates

    When NOT to use:
    - If using RunnableCrew to cancel tasks and don't need to implement
      trigger_external_completion and handle_external_completion to return
      tool current state, then this class is not needed
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @override
    async def _astream_events(
        self, *args: Any, **kwargs: Any
    ) -> AsyncIterator[tuple[StreamEventType, StandardStreamEvent]]:
        """Default implementation that wraps _arun_custom_event as a simple END event"""
        result = await self._arun_custom_event(*args, **kwargs)
        yield StreamEventType.END, self.end_standard_stream_event(result)

    @abstractmethod
    async def _arun_custom_event(self, *args: Any, **kwargs: Any) -> Any:
        """
        Run the tool asynchronously and return the result

        This method replaces langchain's _arun for tools that primarily depend on
        external completion. The result will be automatically wrapped as an END
        event in the default _astream_events implementation.

        Args:
            *args: Positional arguments for tool execution
            **kwargs: Keyword arguments for tool execution

        Returns:
            Tool execution result that will be sent as END event to agent
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
                result = await self.tool_stop_result(
                    EventType.NEW_MESSAGE, str(event_data)
                )
                self._stop_result = result
                self._new_message_event.set()
        except BaseException as e:
            result = f"Error occurred during tool execution: {e}"
        return result

    # Deprecated
    @override
    async def _astream_events(
        self, *args: Any, **kwargs: Any
    ) -> AsyncIterator[tuple[StreamEventType, StandardStreamEvent]]:
        pass
