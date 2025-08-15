from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.tools import BaseTool
from langgraph.utils.runnable import RunnableLike

from langcrew.types import CrewState, TaskSpec


class BaseExecutor(ABC):
    """Base class for all task executors.

    This abstract class defines the interface that all execution strategies must implement.
    Each executor represents a different approach to executing tasks (ReAct, Plan-and-Execute, HPIE, etc.)
    """

    llm: BaseLanguageModel
    task_spec: TaskSpec
    tools: list[BaseTool]
    checkpointer: Any | None
    store: Any | None
    interrupt_before: list[str] | None
    interrupt_after: list[str] | None
    response_format: Any | None
    version: str
    debug: bool
    extra_kwargs: dict[str, Any]
    pre_model_hook: RunnableLike | None
    post_model_hook: RunnableLike | None
    context_manager: dict[str, Any] | None
    input_config: dict[str, Any] | None

    def __init__(
        self,
        llm: BaseLanguageModel,
        task_spec: TaskSpec,
        tools: list[BaseTool] | None = None,
        checkpointer: Any | None = None,
        store: Any | None = None,
        interrupt_before: list[str] | None = None,
        interrupt_after: list[str] | None = None,
        response_format: Any | None = None,
        version: str = "v2",
        debug: bool = False,
        pre_model_hook: RunnableLike | None = None,
        post_model_hook: RunnableLike | None = None,
        **kwargs,
    ):
        """Initialize the executor with common parameters.

        Args:
            llm: Language model to use for execution
            task_spec: Task specification as TaskSpec object
            agent: Agent executing the task
            tools: List of tools available to the executor
            checkpointer: Optional checkpointer for state persistence
            store: Optional store for shared context
            interrupt_before: Nodes to interrupt before
            interrupt_after: Nodes to interrupt after
            response_format: Expected response format
            version: Version of the executor
            debug: Whether to enable debug mode
            **kwargs: Additional executor-specific parameters
        """

        self.llm = llm
        if self.llm is None:
            raise ValueError("LLM is required")

        self.tools = tools or []
        self.checkpointer = checkpointer
        self.store = store
        self.interrupt_before = interrupt_before
        self.interrupt_after = interrupt_after
        self.response_format = response_format
        self.version = version
        self.debug = debug
        self.pre_model_hook = pre_model_hook
        self.post_model_hook = post_model_hook

        # Extract context_manager configuration
        self.context_manager = kwargs.get("context_manager", None)
        self.input_config = kwargs.get("config", None)
        # Set task spec directly
        self.task_spec = task_spec

        # Store additional parameters for subclass use
        self.extra_kwargs = kwargs

    @abstractmethod
    def invoke(self, state: CrewState) -> dict[str, Any] | Any:
        """Execute the task with the given inputs.

        Args:
            inputs: CrewState containing task parameters and message history

        Returns:
            Dictionary with 'messages' key containing list of AIMessage objects
        """
        pass

    @abstractmethod
    async def ainvoke(self, state: CrewState) -> dict[str, Any] | Any:
        """Asynchronously execute the task with the given inputs.

        Args:
            state: CrewState containing task parameters and message history

        Returns:
            Dictionary with 'messages' key containing list of AIMessage objects
        """
        pass
