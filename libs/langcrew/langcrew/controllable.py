"""
Controllable Implementation for Agent, Crew and Tool Management

Provides unified lifecycle management through Controllable base class:
- stop: Stop a running task (auto-cascades to children)
- listen: Listen to run events
- status: Query run status

Architecture:
- Controllable: Base class with common management logic
- ControllableAgent: Wraps ainvoke for Agent management
- ControllableCrew: Wraps astream_events for Crew management
- ControllableTool: Wraps _arun for Tool management

Key features:
- Automatic registration using thread_id from config as run_id
- Hierarchical stop propagation (Crew -> Agent)
- Reusable helper methods for registration/cleanup

Usage pattern for switching to new message:
1. Call stop(run_id) to stop current execution
2. Call ainvoke/astream_events again with new message
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC
from enum import Enum
from typing import Any
from uuid import uuid4

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.runnables.config import (
    ensure_config,
    get_async_callback_manager_for_config,
)
from langchain_core.runnables.schema import EventData, StandardStreamEvent
from langchain_core.tools import BaseTool
from langgraph.errors import GraphInterrupt

logger = logging.getLogger(__name__)


class StopReason(str, Enum):
    """Stop reason enumeration"""

    USER_CANCEL = "user_cancel"  # User actively cancelled
    USER_NEW_MESSAGE = (
        "user_new_message"  # Automatic stop due to user sending new message
    )
    GRACEFUL_STOP = (
        "graceful_stop"  # Graceful stop for agent restart or service shutdown
    )


class RunStatus(Enum):
    """Run status enumeration"""

    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunHandle:
    """Run handle that encapsulates state and control for a single run"""

    def __init__(
        self,
        run_id: str,
        task: asyncio.Task[Any],
    ):
        """Initialize run handle

        Args:
            run_id: Unique run identifier
                - For Agent: auto-generated UUID or user-specified
                - For Crew: thread_id from config or auto-generated UUID
            task: asyncio.Task instance for this run
                - Used to cancel the run via task.cancel()
                - Used to check if run is done via task.done()
        """
        self.run_id = run_id  # For logging and error messages
        self.task = task  # Core field: cancel, status check, result retrieval
        self.error: Exception | None = None  # Stores exception if run fails
        self._status = RunStatus.RUNNING  # Current run status
        self._result: Any = None  # Cached result from task.result()

    @property
    def status(self) -> RunStatus:
        """Get current run status"""
        if self._status == RunStatus.RUNNING and self.task.done():
            self._update_status()
        return self._status

    def _update_status(self):
        """Update run status based on task state"""
        if not self.task.done():
            return

        if self.task.cancelled():
            self._status = RunStatus.CANCELLED
        elif self.task.exception() is not None:
            self._status = RunStatus.FAILED
            self.error = self.task.exception()
            logger.error(
                f"Run {self.run_id} failed with exception: {self.error}",
                exc_info=self.error,
            )
        else:
            self._status = RunStatus.COMPLETED
            try:
                self._result = self.task.result()
            except Exception as e:
                self._status = RunStatus.FAILED
                self.error = e
                logger.error(
                    f"Run {self.run_id} failed while getting result: {e}", exc_info=True
                )

    def is_done(self) -> bool:
        """Check if run is completed"""
        return self.task.done()

    async def wait(self, timeout: float | None = None) -> bool:
        """Wait for run to complete

        Note: This method is primarily used in test/demo code.

        Args:
            timeout: Timeout in seconds, None for infinite wait

        Returns:
            bool: True if completed before timeout, False if timeout occurred
        """
        try:
            if timeout is None:
                await self.task
            else:
                await asyncio.wait_for(self.task, timeout=timeout)
            return True
        except TimeoutError:
            return False
        except asyncio.CancelledError:
            return True
        except Exception as e:
            logger.error(
                f"Run {self.run_id} encountered error during wait: {e}", exc_info=True
            )
            return True

    def get_result(self) -> Any:
        """Get run result or status description

        Designed for agent framework where all states need to be communicated to LLMs.
        Returns the actual result for completed runs, or a descriptive message for other states.
        Never raises exceptions.

        Returns:
            Any: For completed runs, returns the actual result.
                 For other states, returns a string describing the state (cancelled/failed/running).
        """
        if not self.is_done():
            return "Task is still running"

        self._update_status()

        if self._status == RunStatus.COMPLETED:
            return self._result
        elif self._status == RunStatus.CANCELLED:
            return "Task was cancelled"
        elif self._status == RunStatus.FAILED:
            if self.error:
                error_type = type(self.error).__name__
                error_msg = str(self.error)
                return f"Task failed: {error_type}: {error_msg}"
            return "Task failed with unknown error"
        else:
            return f"Task in unexpected state: {self._status.value}"


class Controllable(ABC):
    """Unified controllable implementation

    Provides complete controllable capabilities:
    - stop: Stop a running task (auto-cascades to children)
    - listen: Listen to run events
    - status: Query run status

    Child component management (optional):
    - register_child: Register child components
    - track_child_run: Track child runs

    Usage:
    - Agent: Wraps ainvoke, always managed with auto-generated run_id
    - Crew: Wraps astream_events, managed when thread_id is present
    - Tool: Wraps _arun, managed during execution
    """

    def __init__(self):
        """Initialize controllable state"""
        # Run management
        self._runs: dict[str, RunHandle] = {}
        self._runs_lock = asyncio.Lock()

    async def stop(self, run_id: str) -> bool:
        """Stop a run

        Args:
            run_id: Run identifier

        Returns:
            bool: Whether stop was successful
        """
        # Stop own run
        async with self._runs_lock:
            handle = self._runs.get(run_id)
            if not handle:
                return False

            if handle.is_done():
                return True

            # Cancel task
            handle.task.cancel()

        # Wait for task to end
        try:
            await asyncio.wait_for(handle.task, timeout=20.0)
        except asyncio.CancelledError:
            # Expected: task was cancelled successfully
            logger.info(f"Task {run_id} was cancelled successfully")
        except TimeoutError:
            # Warning: task didn't stop within timeout
            logger.error(
                f"Task {run_id} did not stop within 5 seconds timeout. "
                "It may still be running in the background.",
                exc_info=True,
            )
        except Exception as e:
            # Handle cleanup exceptions (e.g., ExceptionGroup from MCP subprocess cleanup)
            logger.info(
                f"Task {run_id} stopped with cleanup exception: {type(e).__name__}"
            )

        return True

    def status(self, run_id: str) -> dict[str, Any] | None:
        """Query run status

        Args:
            run_id: Run identifier

        Returns:
            dict[str, Any] | None: Run status information
        """
        handle = self._runs.get(run_id)
        if not handle:
            return None

        return {
            "run_id": run_id,
            "status": handle.status.value,
            "error": str(handle.error) if handle.error else None,
        }

    def _extract_run_id_from_config(self, config: RunnableConfig | None) -> str:
        """Extract run_id from config (base implementation for Agent/Tool)

        Args:
            config: Run configuration

        Returns:
            str: run_id from config or auto-generated UUID
        """
        run_id = None
        if config and isinstance(config, dict):
            run_id = config.get("configurable", {}).get("run_id")
        if not run_id:
            run_id = str(uuid4())
        return run_id

    async def _unregister_run(self, run_id: str) -> None:
        """Unregister a run and perform cleanup

        Args:
            run_id: Run identifier
        """
        # Remove from _runs
        async with self._runs_lock:
            self._runs.pop(run_id, None)


class ControllableCrew(Controllable):
    """Controllable Crew for managing astream_events

    This class wraps astream_events to add controllable capabilities:
    - Automatic registration using thread_id from config as run_id
    - Stop checking during event iteration
    - Cleanup and checkpoint fixing in finally block

    Designed for Crew scenarios where astream_events is the main entry point.

    Usage:
        class Crew(ControllableCrew):
            async def astream_events(self, input, config=None, **kwargs):
                # Your implementation
                async for event in compiled_graph.astream_events(...):
                    yield event

    The parent class will automatically wrap this method to add management.

    Note:
    - Use thread_id from config as run_id for management
    - Only manages execution when thread_id is present in config
    """

    def __init__(self):
        """Initialize ControllableCrew with current run tracking"""
        super().__init__()
        self._current_run_id: str | None = None
        self._run_thread_map: dict[
            str, str
        ] = {}  # run_id -> thread_id (for checkpoint cleanup)
        self._stop_reason: StopReason | None = (
            None  # Stop reason for proper cancellation handling
        )

    async def stop(self, stop_reason: StopReason = StopReason.USER_CANCEL) -> bool:  # type: ignore
        """Stop the current crew run

        Args:
            stop_reason: Reason for stopping (defaults to USER_CANCEL)

        Returns:
            bool: Whether stop was successful
        """
        if not self._current_run_id:
            logger.warning("Crew: No active run to stop")
            return False

        # Store stop reason for proper cancellation handling in adapter
        self._stop_reason = stop_reason
        logger.info(f"Crew: stopping with reason: {stop_reason.value}")

        return await super().stop(self._current_run_id)

    def _extract_run_id_from_config(self, config: RunnableConfig | None) -> str:
        """Extract run_id from config (Crew-specific: uses thread_id)

        Overrides base implementation to use thread_id instead of run_id.
        This links the run with checkpoint persistence.

        Args:
            config: Run configuration

        Returns:
            str: run_id (thread_id if provided, otherwise auto-generated UUID)
        """
        run_id = None
        if config and isinstance(config, dict):
            thread_id = config.get("configurable", {}).get("thread_id")
            if thread_id:
                run_id = thread_id  # Use thread_id as run_id for persistent sessions

        # Generate UUID for temporary sessions without thread_id
        if not run_id:
            run_id = str(uuid4())

        return run_id

    def __init_subclass__(cls, **kwargs):
        """Intercept and wrap subclass's astream_events method"""
        super().__init_subclass__(**kwargs)

        # Subclass must implement astream_events to use ControllableCrew
        if "astream_events" not in cls.__dict__:
            raise NotImplementedError(
                f"{cls.__name__} must implement 'astream_events' method to inherit from ControllableCrew"
            )

        user_astream_events = cls.__dict__["astream_events"]

        # Create controllable wrapper
        async def controllable_astream_events(self, input, config=None, **kwargs):
            """Wrapped astream_events with controllable management"""
            # Clear stop_reason from previous execution at the start of new execution
            self._stop_reason = None

            # Extract run_id (uses thread_id if provided, else generates UUID)
            run_id = self._extract_run_id_from_config(config)

            # Track current run_id for parameter-free stop()
            self._current_run_id = run_id

            # Store run_id -> thread_id mapping for checkpoint operations
            if config and isinstance(config, dict):
                thread_id = config.get("configurable", {}).get("thread_id")
                if thread_id:
                    self._run_thread_map[run_id] = thread_id

            # Create event queue for communication between subtask and main coroutine
            event_queue: asyncio.Queue[Any] = asyncio.Queue()

            # Subtask: Execute the actual crew logic in isolation
            async def _run_crew():
                try:
                    async for event in user_astream_events(
                        self, input, config, **kwargs
                    ):
                        await event_queue.put(event)
                except asyncio.CancelledError:
                    # Task cancelled, re-raise to mark task as cancelled
                    logger.info(f"Crew {run_id}: [_run_crew] task cancelled")
                    raise
                except Exception as e:
                    # Unexpected errors
                    logger.error(
                        f"Crew {run_id}: [_run_crew] unexpected error: {e}",
                        exc_info=True,
                    )
                    # Pass exception to main coroutine via queue
                    await event_queue.put(("__error__", e))
                    raise
                finally:
                    # Signal completion
                    await event_queue.put(None)

            # Create and register subtask (isolated from caller's task)
            crew_task = asyncio.create_task(_run_crew())
            handle = RunHandle(run_id=run_id, task=crew_task)
            async with self._runs_lock:
                self._runs[run_id] = handle

            try:
                # Main coroutine: Read from queue and yield events
                while True:
                    event = await event_queue.get()

                    # Check if event is an error object from _run_crew
                    if isinstance(event, tuple) and event[0] == "__error__":
                        exception = event[1]
                        logger.error(
                            f"Crew {run_id}: [main coroutine] received exception: {exception}"
                        )
                        raise exception

                    if event is None:
                        # Check if crew_task was cancelled
                        if crew_task.done() and crew_task.cancelled():
                            logger.info(
                                f"Crew {run_id}: [main coroutine] detected _run_crew cancellation, propagating CancelledError"
                            )
                            # Propagate cancellation to caller (CancelledError bypasses except Exception below)
                            raise asyncio.CancelledError("Crew task was cancelled")
                        break
                    yield event
            except asyncio.CancelledError:
                # External cancellation from caller (e.g., HTTP disconnect, timeout)
                logger.info(
                    f"Crew {run_id}: [main coroutine] external cancellation received"
                )
                raise
            except Exception as e:
                # Unexpected errors (CancelledError above bypasses this handler)
                logger.error(
                    f"Crew {run_id}: [main coroutine] unexpected error in event loop: {e}",
                    exc_info=True,
                )
                raise
            finally:
                # Cancel crew_task if still running
                if not crew_task.done():
                    logger.info(f"Crew {run_id}: cancelling background task in cleanup")
                    crew_task.cancel()
                    try:
                        await crew_task
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(
                            f"Crew {run_id}: error during background task cancellation: {e}",
                            exc_info=True,
                        )

                # Cleanup (always)
                await self._unregister_run(run_id)
                # Clear current run_id
                self._current_run_id = None
                # Clean up thread_id mapping
                self._run_thread_map.pop(run_id, None)

        # Replace the method with wrapped version
        cls.astream_events = controllable_astream_events


class ControllableAgent(Controllable):
    """Controllable Agent for managing ainvoke execution

    This class wraps ainvoke to add controllable capabilities:
    - Automatic registration with auto-generated run_id
    - Task management for stop/status/listen
    - Cleanup in finally block

    Designed for Agent scenarios where ainvoke is the main entry point.

    Usage:
        class Agent(ControllableAgent):
            async def ainvoke(self, input, config=None, **kwargs):
                return await self.executor.ainvoke(input, config)

    The parent class will automatically wrap this method to add management.

    Note:
    - Agent always generates its own run_id (UUID)
    - Agent is always managed (every ainvoke call is tracked)
    - thread_id from config is extracted for checkpoint management (optional)
    """

    def __init__(self):
        """Initialize ControllableAgent with current run tracking"""
        super().__init__()
        self._current_run_id: str | None = None

    async def stop(self) -> bool:  # type: ignore[override]
        """Stop the current agent run

        Returns:
            bool: Whether stop was successful
        """
        if not self._current_run_id:
            logger.warning("Agent: No active run to stop")
            return False
        return await super().stop(self._current_run_id)

    def __init_subclass__(cls, **kwargs):
        """Intercept and wrap subclass's ainvoke method"""
        super().__init_subclass__(**kwargs)

        # Subclass must implement ainvoke to use ControllableAgent
        if "ainvoke" not in cls.__dict__:
            raise NotImplementedError(
                f"{cls.__name__} must implement 'ainvoke' method to inherit from ControllableAgent"
            )

        user_ainvoke = cls.__dict__["ainvoke"]

        async def controllable_ainvoke(self, input, config=None, **kwargs):
            """Wrapped ainvoke with controllable management"""
            # Extract run_id from config
            run_id = self._extract_run_id_from_config(config)

            # Track current run_id for parameter-free stop()
            self._current_run_id = run_id

            # Create and register subtask (isolated from caller's task)
            agent_task = asyncio.create_task(
                user_ainvoke(self, input, config, **kwargs)
            )
            handle = RunHandle(run_id=run_id, task=agent_task)
            async with self._runs_lock:
                self._runs[run_id] = handle

            try:
                # Wait for agent task to complete (exceptions propagate automatically)
                return await agent_task
            except asyncio.CancelledError:
                # Task was cancelled (via stop() or external cancellation)
                logger.info(f"Agent {run_id}: cancellation received")
                raise
            except GraphInterrupt:
                # GraphInterrupt is a normal HITL mechanism, not an error
                logger.info(f"Agent {run_id}: interrupted for user input (HITL)")
                raise
            except Exception as e:
                # Unexpected errors
                logger.error(f"Agent {run_id}: unexpected error: {e}", exc_info=True)
                raise
            finally:
                # Cancel agent_task if still running (handles external cancellation)
                if not agent_task.done():
                    logger.info(f"Agent {run_id}: cancelling task in cleanup")
                    agent_task.cancel()
                    try:
                        await agent_task
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(
                            f"Agent {run_id}: error during task cancellation: {e}",
                            exc_info=True,
                        )

                # Cleanup (always)
                await self._unregister_run(run_id)
                # Clear current run_id
                self._current_run_id = None

        cls.ainvoke = controllable_ainvoke


class ControllableTool(Controllable, BaseTool):
    """Manageable tool (only uses partial Controllable capabilities)

    Tool characteristics:
    - Doesn't need start_run (Tool is called by Agent)
    - Doesn't need append (Tool doesn't receive messages)
    - Only needs stop/listen/status (for managing running tools)

    User only needs to implement standard LangChain _arun:
        async def _arun(self, *args, **kwargs) -> str

    ControllableTool automatically adds:
    - Management capability (registers to _runs, can be stopped)
    - Event sending (through emit_standard_event)
    - Optional timeout support (set execution_timeout_seconds)

    Usage:
        class MyTool(ControllableTool):
            name = "my_tool"
            description = "My tool"
            execution_timeout_seconds = 60  # Optional: 60 second timeout

            async def _arun(self, text: str) -> str:
                await self.emit_standard_event("on_tool_start", {"input": text})
                result = f"Processed: {text}"
                await self.emit_standard_event("on_tool_end", {"output": result})
                return result

            def handle_timeout_error(self, error: Exception) -> None:
                # Optional: custom timeout handling
                logger.error(f"Tool timed out: {error}")
    """

    name: str = "controllable_tool"
    description: str = "A controllable tool"
    execution_timeout_seconds: int | None = None  # None means no timeout
    _runnable_config: RunnableConfig | None = None

    def __init__(self, runnable_config: RunnableConfig | None = None, **kwargs):
        """Initialize ControllableTool

        Args:
            runnable_config: Optional RunnableConfig for event emission.
                           If provided, enables emit_standard_event before _arun is called.
                           If None, config will be extracted from kwargs in _arun.
            **kwargs: Additional arguments passed to BaseTool
        """
        BaseTool.__init__(self, **kwargs)
        Controllable.__init__(self)
        # Note: Do NOT set self._user_arun_impl here!
        # It's set as a class variable by __init_subclass__
        self._runnable_config = runnable_config

    def handle_timeout_error(self, error: Exception) -> None:
        """Hook method for handling execution timeout errors

        Called when execution_timeout_seconds is exceeded during tool execution.
        Subclasses can override this method to implement custom timeout handling
        logic such as resource cleanup, state synchronization, and user notification.

        Args:
            error: TimeoutError object containing timeout details
        """
        pass

    def __init_subclass__(cls, **kwargs):
        """Capture user's _arun implementation and wrap it"""
        super().__init_subclass__(**kwargs)

        # Subclass must implement _arun to use ControllableTool
        if "_arun" not in cls.__dict__:
            raise NotImplementedError(
                f"{cls.__name__} must implement '_arun' method to inherit from ControllableTool"
            )

        user_arun = cls.__dict__["_arun"]

        # Create controllable wrapper
        async def controllable_arun(self, *args: Any, **kwargs: Any) -> str:
            """Wrapped _arun with controllable management"""
            # Extract run_id from constructor-provided config
            run_id = self._extract_run_id_from_config(self._runnable_config)

            # Define tool execution logic
            async def _execute_tool():
                return await user_arun(self, *args, **kwargs)

            # Create and register subtask (isolated from caller's task)
            tool_task = asyncio.create_task(_execute_tool())
            handle = RunHandle(run_id=run_id, task=tool_task)
            async with self._runs_lock:
                self._runs[run_id] = handle

            try:
                # Apply timeout if configured
                if self.execution_timeout_seconds is not None:
                    return await asyncio.wait_for(
                        tool_task, timeout=self.execution_timeout_seconds
                    )
                else:
                    # Wait for tool task to complete (exceptions propagate automatically)
                    return await tool_task
            except TimeoutError as e:
                # Tool execution timed out
                logger.error(
                    f"Tool {self.name} ({run_id}): execution timeout after {self.execution_timeout_seconds}s"
                )
                # Call timeout handler hook
                return (
                    self.handle_timeout_error(e)
                    or f"Execution timeout after {self.execution_timeout_seconds}s"
                )
            except asyncio.CancelledError:
                # Tool was cancelled (via stop() or external cancellation)
                logger.info(f"Tool {self.name} ({run_id}): cancellation received")
                raise
            except GraphInterrupt:
                # GraphInterrupt is a normal HITL mechanism, not an error
                logger.info(
                    f"Tool {self.name} ({run_id}): interrupted for user input (HITL)"
                )
                raise
            except Exception as e:
                # Unexpected errors
                logger.error(
                    f"Tool {self.name} ({run_id}): unexpected error: {e}", exc_info=True
                )
                return f"Unexpected error: {e}"
            finally:
                # Cancel tool_task if still running (handles external cancellation)
                if not tool_task.done():
                    logger.info(
                        f"Tool {self.name} ({run_id}): cancelling task in cleanup"
                    )
                    tool_task.cancel()
                    try:
                        await tool_task
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(
                            f"Tool {self.name} ({run_id}): error during task cancellation: {e}",
                            exc_info=True,
                        )

                # Cleanup
                self._runnable_config = None
                async with self._runs_lock:
                    self._runs.pop(run_id, None)

        # Replace the method with wrapped version
        cls._arun = controllable_arun

    def _run(self, *args: Any, **kwargs: Any) -> str:
        """Default sync implementation - not supported"""
        raise NotImplementedError(
            "ControllableTool only supports async execution. "
            "Use _arun() or ainvoke() instead of _run() or invoke()."
        )

    async def emit_standard_event(
        self,
        event_type: str,
        data: EventData,
        ext: dict[str, Any] | None = None,
        name: str = "",
    ):
        """Emit StandardStreamEvent through LangChain callback system

        Args:
            event_type: Event type (e.g., "on_tool_start", "on_chat_model_stream")
            data: Event data (EventData with fields: input, output, error, chunk)
            ext: Optional extension data (e.g., {"run_id_suffix": "abc"})
            name: Optional name to use for this event (defaults to "", which uses self.name)
        """
        config = self._runnable_config
        if not config:
            return

        # Check if adispatch_custom_event is available
        if not self._can_dispatch_custom_events(config):
            return

        # Build event data
        event_data = dict(data)
        if ext:
            event_data["ext"] = ext

        # Use provided name or fall back to self.name
        event_name = name if name else self.name

        # Create StandardStreamEvent (run_id will be added by LangGraph)
        event: StandardStreamEvent = {
            "event": event_type,
            "name": event_name,
            "data": event_data,
            "run_id": "",
            "parent_ids": [],
        }

        # Dispatch through LangChain callback system
        await adispatch_custom_event(
            event_name,
            event,
            config=config,
        )

    def _can_dispatch_custom_events(self, config: RunnableConfig | None) -> bool:
        """Check if adispatch_custom_event is available in the current context"""
        if not config:
            return False

        config = ensure_config(config)
        callback_manager = get_async_callback_manager_for_config(config)
        return callback_manager.parent_run_id is not None


__all__ = [
    "StopReason",
    "RunStatus",
    "RunHandle",
    "Controllable",
    "ControllableAgent",
    "ControllableCrew",
    "ControllableTool",
]
