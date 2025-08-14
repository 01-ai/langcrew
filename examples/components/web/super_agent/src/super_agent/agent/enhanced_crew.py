import inspect
import logging
from typing import Any, AsyncGenerator, Sequence

from langchain_core.messages.human import HumanMessage
from langchain_core.tools import BaseTool
from langcrew.crew import Crew
from langcrew_tools.astream_tool import StreamingBaseTool
from langcrew_tools.hitl.langchain_tools import UserInputTool
from super_agent.common.session_state import SessionState
from langcrew_tools.astream_tool import EventType

logger = logging.getLogger(__name__)


class EnhancedCrew(Crew):
    """
    Enhanced Crew subclass that integrates all CrewWrapper functionality

    This class inherits from the Crew base class and adds session state management,
    streaming event processing, and agent control capabilities, providing complete
    intelligent agent functionality.
    """

    def __init__(
        self, session_state: SessionState, tools: list[BaseTool] | None = None, **kwargs
    ):
        """
        Initialize EnhancedCrew

        Args:
            session_state: Session state manager
            tools: Tool list, optional
            **kwargs: Other parameters passed to parent Crew class
        """
        super().__init__(**kwargs)

        self.session_state = session_state
        self.tools = tools or []
        self.tools_info = {}
        self.register_after_execute_callback = []
        self.trigger_external_completion_callback = []
        self.last_tool_name = None
        self.recursion_limit = 180

        # Set up streaming tool callbacks
        for tool in self.tools:
            # Get tool name and bind it to tool instance
            tool_name = getattr(tool, "name", "default")
            self.tools_info[tool_name] = tool
            if isinstance(tool, StreamingBaseTool):
                self.trigger_external_completion_callback.append(
                    tool.trigger_external_completion
                )
                self.register_after_execute_callback.append(tool.custom_event_hook)

        logger.info(f"EnhancedCrew initialized for session: {session_state.session_id}")

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

            logger.info(
                f"Processing request for session {self.session_state.session_id}: {inputs}"
            )

            # Prepare configuration - merge provided config with session thread ID
            final_config = config.copy() if config else {}
            if "configurable" not in final_config:
                final_config["configurable"] = {}
            final_config["configurable"]["thread_id"] = self.session_state.session_id
            if "recursion_limit" not in final_config:
                final_config["recursion_limit"] = self.recursion_limit

            # Stream process events
            async for event in super().astream_events(
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
            ):
                processed_event = await self._aprocess_output(event)
                if processed_event:
                    if isinstance(processed_event, list):
                        for item in processed_event:
                            yield item
                    else:
                        yield processed_event

        except Exception as e:
            logger.exception(
                f"Failed to process request for session {self.session_state.session_id}: {e}"
            )
            raise e

    async def last_callback(self, prev_result: Any) -> Any:
        if not isinstance(prev_result, dict):
            return prev_result

        event = prev_result.get("event")
        if event == "on_tool_start" or event == "on_tool_end":
            tool_name = prev_result.get("name")
            if tool_name == UserInputTool.name:
                pass
            elif tool_name:
                self.last_tool_name = tool_name
        elif (
            event == "on_custom_event"
            and prev_result.get("name") == "on_langcrew_user_input_required"
        ):
            if self.last_tool_name:
                tool = self.tools_info.get(self.last_tool_name)
                if tool and isinstance(tool, StreamingBaseTool):
                    handover_info = await tool.get_handover_info()
                    if handover_info:
                        data = prev_result.get("data", {})
                        data.update(handover_info)
                        prev_result["data"] = data
        return prev_result

    async def _aprocess_output(self, output: Any) -> Any:
        """
        Asynchronously process output data through callback functions

        This method processes any output data through registered callback functions.
        It can handle both final results and streaming data.

        Args:
            output: Output data to be processed

        Returns:
            Processed output data
        """
        if not isinstance(output, dict):
            return output

        result = output
        prev_result = result
        callback_copy = self.register_after_execute_callback.copy()
        callback_copy.append(self.last_callback)
        # Execute function callbacks
        for callback_fn in callback_copy:
            try:
                if inspect.iscoroutinefunction(callback_fn):
                    prev_result = await callback_fn(prev_result)
                else:
                    prev_result = callback_fn(prev_result)
            except Exception as e:
                logger.error(f"Error in output processing callback: {e}")

        result = prev_result
        return result

    async def stop_agent(self) -> bool:
        """
        Stop the intelligent agent for the current session

        Stop agent execution by setting a stop flag in the session state.

        Returns:
            Whether the operation was successful
        """
        logger.info(
            f"Received request to stop session: {self.session_state.session_id}"
        )
        try:
            self.session_state.set_value(EventType.STOP.value, True)
            await self.execute_trigger_external_completion_callback(
                EventType.STOP.value, True
            )
            logger.info(
                f"Successfully set stop flag for session: {self.session_state.session_id}"
            )
            return True
        except Exception as e:
            logger.error(
                f"Failed to set stop flag for session {self.session_state.session_id}: {e}"
            )
            return False

    async def send_new_message(self, message: str) -> bool:
        """
        Send new message to running intelligent agent

        Send a new message to the running agent through session state.

        Args:
            message: New message content

        Returns:
            Whether the operation was successful
        """
        logger.info(
            f"Sending new message to session {self.session_state.session_id}: {message}"
        )
        try:
            self.session_state.set_value(EventType.NEW_MESSAGE.value, message)
            await self.execute_trigger_external_completion_callback(
                EventType.NEW_MESSAGE.value, message
            )
            logger.info(
                f"Successfully set new message for session {self.session_state.session_id}"
            )
            return True
        except Exception as e:
            logger.error(
                f"Failed to set new message for session {self.session_state.session_id}: {e}"
            )
            return False

    async def execute_trigger_external_completion_callback(self, event, value) -> None:
        """Execute all event callbacks"""
        for callback in self.trigger_external_completion_callback:
            try:
                if inspect.iscoroutinefunction(callback):
                    await callback(event, value)
                else:
                    callback(event, value)
            except Exception as e:
                logger.error(f"Error in trigger external completion callback: {e}")

    def __repr__(self) -> str:
        """Return string representation of the object"""
        return (
            f"EnhancedCrew("
            f"session_id='{self.session_state.session_id}', "
            f"agents={len(self.agents)}, "
            f"tasks={len(self.tasks)}, "
            f"tools={len(self.tools)}"
            f")"
        )
