from __future__ import annotations

from collections.abc import Callable
from typing import Any

from langchain_core.messages import (
    SystemMessage,
)
from langchain_core.runnables import Runnable
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command

from .base import BaseExecutor


class ReactExecutor(BaseExecutor):
    """ReAct (Reasoning and Acting) executor based on langgraph's create_react_agent.

    This executor implements the ReAct pattern where the agent alternates between
    thinking about what to do and taking actions using available tools.

    The executor supports custom prompts through the 'prompt' parameter, allowing
    users to override the default execution behavior with their own prompt.

    Attributes:
        prompt: Optional prompt for the LLM that can be:
            - str: Converted to SystemMessage and prepended to messages
            - SystemMessage: Prepended to the message list
            - Callable: Function that takes graph state and returns prompt
            - Runnable: Runnable that takes graph state and returns prompt
        graph: Compiled state graph created by langgraph's create_react_agent
    """

    def __init__(
        self,
        prompt: str | SystemMessage | Callable | Runnable | None = None,
        **kwargs,
    ):
        """Initialize the ReAct executor.

        Args:
            prompt: Optional prompt for the LLM. Can take a few different forms:
                - str: This is converted to a SystemMessage and added to the beginning
                       of the list of messages in state["messages"].
                - SystemMessage: This is added to the beginning of the list of messages
                                in state["messages"].
                - Callable: This function should take in full graph state and the output
                           is then passed to the language model.
                - Runnable: This runnable should take in full graph state and the output
                           is then passed to the language model.
            **kwargs: Arguments passed to BaseExecutor, including:
                - llm: Language model instance (will use init_chat_model() if not provided)
                - task_spec: Task specification
                - agent: Agent instance
                - tools: List of available tools
                - checkpointer: State persistence handler
                - store: Shared context store
                - response_format: Expected response format
                - interrupt_before/after: Nodes to interrupt execution
                - debug: Enable debug mode
                - Other executor-specific parameters

        Raises:
            Exception: If LLM initialization fails when no LLM is provided
        """
        super().__init__(**kwargs)

        # Store the prompt parameter
        self.prompt = prompt

        # Build the execution graph
        self.graph: CompiledStateGraph = self._build_graph()

    # ============ Graph Construction ============

    def _build_graph(self) -> CompiledStateGraph:
        """Build the ReAct agent graph using langgraph's create_react_agent.

        The graph automatically handles:
        - Tool calling loops
        - State management
        - Message processing with context management
        - Response formatting

        Returns:
            Compiled state graph ready for execution
        """
        # Build create_react_agent arguments
        create_react_agent_kwargs = {
            "model": self.llm,
            "tools": self.tools,
            "checkpointer": self.checkpointer,
            "response_format": self.response_format,
            "store": self.store,
            "pre_model_hook": self.pre_model_hook,
            "post_model_hook": self.post_model_hook,
            "interrupt_before": self.interrupt_before,
            "interrupt_after": self.interrupt_after,
            "version": self.version,
            "debug": self.debug,
            # name=self._get_clean_agent_name(),
        }

        # Add prompt if provided
        if self.prompt is not None:
            create_react_agent_kwargs["prompt"] = self.prompt

        return create_react_agent(**create_react_agent_kwargs)

    # ============ Execution Methods ============

    def invoke(
        self,
        input: Any = None,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Execute the task using the ReAct pattern.

        This method runs the ReAct agent synchronously, processing the input
        through reasoning and action cycles until completion.

        Args:
            input: Input dictionary to be passed directly to the graph
            config: Optional execution configuration
            **kwargs: Additional keyword arguments

        Returns:
            If response_format is enabled and result contains 'structured_response':
                Returns the structured response directly
            Otherwise:
                Returns the full result dictionary

        Raises:
            Exception: If graph execution fails
        """
        # If input contains a command object (for resuming execution), use it directly
        if isinstance(input, Command):
            result = self.graph.invoke(input, config, **kwargs)
        else:
            # Execute graph directly with the provided input
            result = self.graph.invoke(input, config, **kwargs)

        # Return structured response if available and requested
        if self.response_format and "structured_response" in result:
            return result["structured_response"]

        return result

    async def ainvoke(
        self,
        input: Any = None,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Asynchronously execute the task using the ReAct pattern.

        This method runs the ReAct agent asynchronously, processing the input
        through reasoning and action cycles until completion.

        Args:
            input: Input dictionary to be passed directly to the graph
            config: Optional execution configuration
            **kwargs: Additional keyword arguments

        Returns:
            If response_format is enabled and result contains 'structured_response':
                Returns the structured response directly
            Otherwise:
                Returns the full result dictionary

        Raises:
            Exception: If graph execution fails
        """
        # If input contains a command object (for resuming execution), use it directly

        if isinstance(input, Command):
            result = await self.graph.ainvoke(input, config, **kwargs)
        else:
            # Execute graph directly with the provided input
            result = await self.graph.ainvoke(input, config, **kwargs)

        # Return structured response if available and requested
        if self.response_format and "structured_response" in result:
            return result["structured_response"]

        return result
