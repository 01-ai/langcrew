import asyncio
import inspect
import logging
from collections.abc import AsyncGenerator, Callable, Sequence
from typing import Any

from langcrew.utils.async_utils import async_timer

try:
    from typing import override
except ImportError:
    from typing_extensions import override

from uuid import uuid4

from langchain_core.messages.human import HumanMessage

from .crew import Crew
from .tools import EventType, StreamingBaseTool
from .types import OrderCallback
from .utils import (
    AstreamEventTaskWrapper,
    CheckpointerMessageManager,
    RunnableStateManager,
)

logger = logging.getLogger(__name__)


class RunnableCrew(Crew):
    """
    Runnable Crew subclass that integrates all CrewWrapper functionality

    This class inherits from the Crew base class and adds session state management,
    streaming event processing, and agent control capabilities, providing complete
    intelligent agent functionality.
    """

    def __init__(self, session_id: str, async_checkpointer=None, **kwargs):
        """
        Initialize EnhancedCrew

        Args:
            session_id: Session id
            async_checkpointer: Async checkpointer instance for state management
            tools: Tool list, optional
            **kwargs: Other parameters passed to parent Crew class
        """
        super().__init__(**kwargs)
        self.session_id = session_id
        # Store the async checkpointer for use in callbacks
        self._async_checkpointer = async_checkpointer
        # 当前任务取消后的回调，停止取消的功能都有新类实现
        self.trigger_external_completion_callback = []
        self.recursion_limit = 180
        self._stream_wrapper = None
        self._final_config = None

    @override
    def _register_tools(self):
        """Register tools to the crew"""
        super()._register_tools()
        for tool in self._tools:
            if isinstance(tool, StreamingBaseTool):
                self.trigger_external_completion_callback.append(
                    tool.trigger_external_completion
                )

    def add_after_execute_callbacks(self, callbacks: list[Callable | OrderCallback]):
        register_callback = self.register_after_execute_callback.copy()
        for callback in callbacks:
            if isinstance(callback, OrderCallback):
                register_callback.append(callback)
            else:
                register_callback.append(
                    OrderCallback(order_id=len(register_callback), callback=callback)
                )

        register_callback.sort(key=lambda x: x.order_id)
        self.register_after_execute_callback = register_callback

    async def callback_on_cancel(
        self,
        cancel_reason: str,
        final_result: Any,
    ):
        merger = CheckpointerMessageManager(self._async_checkpointer)
        messages = await merger.merge_all_messages(self.session_id)
        # 修复取消上下文中的消息，确保tool_calls有对应的ToolMessage
        fixed_messages = CheckpointerMessageManager.fix_llm_context_messages(
            messages, cancel_reason, final_result
        )
        # 保存到 self._async_checkpointer的 root 命名空中
        await merger.save_messages_to_root_namespace(self.session_id, fixed_messages)

    async def astream_events(
        self,
        input: Any,
        *,
        config: dict[str, Any] | None = None,
        version: str = "v2",
        include_names: Sequence[str] | None = None,
        include_types: Sequence[str] | None = None,
        include_tags: Sequence[str] | None = None,
        exclude_names: Sequence[str] | None = None,
        exclude_types: Sequence[str] | None = None,
        exclude_tags: Sequence[str] | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Process user requests and return event stream

        This method overrides the parent class's astream_events method, adding session
        state management and output processing callback functionality.

        Args:
            input: User input content
            config: Runtime configuration, optional
            version: Event schema version, defaults to "v2"
            include_names: List of event names to include
            include_types: List of event types to include
            include_tags: List of tags to include
            exclude_names: List of event names to exclude
            exclude_types: List of event types to exclude
            exclude_tags: List of tags to exclude
            **kwargs: Other keyword arguments

        Yields:
            Processed event dictionaries
        """
        try:
            # Prepare messages
            if isinstance(input, str):
                messages = [HumanMessage(content=input)]
                inputs = {"messages": messages}
            else:
                inputs = input

            logger.info(f"Processing request for session {self.session_id}: {inputs}")

            # Prepare configuration - merge provided config with session thread ID
            final_config = config.copy() if config else {}
            if "configurable" not in final_config:
                final_config["configurable"] = {}
            final_config["configurable"]["thread_id"] = self.session_id
            if "recursion_limit" not in final_config:
                final_config["recursion_limit"] = self.recursion_limit
            RunnableStateManager.init_state(final_config)
            self._stream_wrapper = AstreamEventTaskWrapper(
                super().astream_events,
                callback_on_cancel=self.callback_on_cancel,
            )
            self._final_config = final_config
            await self._stream_wrapper.astream_event_task(
                input=inputs,
                config=final_config,
                version=version,
                include_names=include_names,
                include_types=include_types,
                include_tags=include_tags,
                exclude_names=exclude_names,
                exclude_types=exclude_types,
                exclude_tags=exclude_tags,
                **kwargs,
            )
            # Stream process events
            async for event in self._stream_wrapper.astream_event_result():
                yield event
        except Exception as e:
            logger.exception(
                f"Failed to process request for session {self.session_id}: {e}"
            )
            raise e

    @async_timer
    async def stop_agent(self, final_result: dict[str, Any] | None = None) -> bool:
        """
        Stop the intelligent agent for the current session

        Stop agent execution by setting a stop flag in the session state.

        Returns:
            Whether the operation was successful
        """
        logger.info(f"Received request to stop session: {self.session_id}")
        try:
            result = await self.execute_trigger_external_completion_callback(
                EventType.STOP.value, True
            )
            logger.info(f"result: {result}")
            self._stream_wrapper.done_fetch_task(final_result or {"stop": True})
            logger.info(f"Successfully set stop flag for session: {self.session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to set stop flag for session {self.session_id}: {e}")
            return False

    @async_timer
    async def send_new_message(self, message: str) -> bool:
        """
        Send new message to running intelligent agent

        Send a new message to the running agent through session state.

        Args:
            message: New message content

        Returns:
            Whether the operation was successful
        """
        try:
            result = await self.execute_trigger_external_completion_callback(
                EventType.NEW_MESSAGE.value, message
            )
            human_message = HumanMessage(content=message, id=str(uuid4()))
            use_future: asyncio.Future[
                bool
            ] = await self._stream_wrapper.astream_event_task(
                input={"messages": [human_message]},
                config=self._final_config.copy(),
                current_result=result,
                update_task_event=dict(
                    event="on_custom_event",
                    name="on_langcrew_new_message",
                    data={"new_message": message},
                ),
            )
            timeout = 10
            try:
                await asyncio.wait_for(use_future, timeout=timeout)
                ret = use_future.result()
                logger.info(f"set new message [{ret}] for session {self.session_id}")
                return ret
            except TimeoutError:
                logger.warning(
                    f"Message processing timeout after {timeout} seconds for session {self.session_id}"
                )
                use_future.cancel()
                return False
        except Exception as e:
            logger.exception(
                f"Failed to set new message for session {self.session_id}: {e}"
            )
            return False

    async def execute_trigger_external_completion_callback(
        self, event, value
    ) -> list[Any]:
        """Execute all event callbacks"""
        result = []
        for callback in self.trigger_external_completion_callback:
            try:
                if inspect.iscoroutinefunction(callback):
                    tool_result = await callback(event, value)
                else:
                    tool_result = callback(event, value)
                if tool_result:
                    result.append(tool_result)
            except Exception as e:
                logger.exception(f"Error in trigger external completion callback: {e}")
        return result or None
