"""Executor Factory for creating different types of executors."""

from __future__ import annotations

from collections.abc import Callable
from typing import (
    Any,
    Literal,
)

from langchain_core.language_models import BaseLanguageModel
from langchain_core.messages import SystemMessage
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool
from langgraph.store.base import BaseStore
from langgraph.types import Checkpointer
from langgraph.utils.runnable import RunnableLike
from pydantic import BaseModel

from langcrew.types import TaskSpec

from .base import BaseExecutor
from .react_executor import ReactExecutor


class ExecutorFactory:
    """Factory class for creating different types of executors."""

    @staticmethod
    def create_executor(
        executor_type: Literal["react"],
        llm: BaseLanguageModel,
        task_spec: TaskSpec,
        tools: list[BaseTool] | None = None,
        prompt: str | SystemMessage | Callable | Runnable | None = None,
        checkpointer: Checkpointer | None = None,
        store: BaseStore | None = None,
        pre_model_hook: RunnableLike | None = None,
        post_model_hook: RunnableLike | None = None,
        interrupt_before: list[str] | None = None,
        interrupt_after: list[str] | None = None,
        response_format: dict | type[BaseModel] | None = None,
        version: Literal["v1", "v2"] = "v2",
        debug: bool = False,
        recursion_limit: int | None = None,
        **kwargs: Any,
    ) -> BaseExecutor:
        """Create an executor based on the specified type.

        Args:
            executor_type: Type of executor to create ('react' or 'plan_and_execute')
            llm: Language model to use
            task_spec: Task specification
            tools: List of tools available to the executor
            prompt: Prompt for ReactExecutor (only used for 'react' type)
            checkpointer: State persistence handler
            store: Shared context store
            pre_model_hook: Hook to run before model calls
            post_model_hook: Hook to run after model calls
            interrupt_before: Nodes to interrupt before execution
            interrupt_after: Nodes to interrupt after execution
            response_format: Expected response format
            version: Version of the executor
            debug: Enable debug mode
            recursion_limit: Maximum recursion depth
            **kwargs: Additional executor-specific parameters

        Returns:
            BaseExecutor instance based on executor_type

        Raises:
            ValueError: If executor_type is not recognized
        """
        # Base kwargs for all executors
        base_kwargs = {
            "llm": llm,
            "task_spec": task_spec,
            "tools": tools or [],
            "checkpointer": checkpointer,
            "store": store,
            "pre_model_hook": pre_model_hook,
            "post_model_hook": post_model_hook,
            "interrupt_before": interrupt_before,
            "interrupt_after": interrupt_after,
            "response_format": response_format,
            "version": version,
            "debug": debug,
        }

        # Handle recursion limit
        if recursion_limit:
            if "config" not in kwargs:
                kwargs["config"] = {"recursion_limit": recursion_limit}
            else:
                kwargs["config"]["recursion_limit"] = recursion_limit

        # Merge with additional kwargs
        base_kwargs.update(kwargs)

        # Create appropriate executor
        if executor_type == "react":
            # ReactExecutor uses 'prompt' parameter
            if prompt is not None:
                return ReactExecutor(prompt=prompt, **base_kwargs)
            else:
                return ReactExecutor(**base_kwargs)
        else:
            raise ValueError(
                f"Unknown executor type: {executor_type}. "
                f"Supported types are 'react' and 'plan_and_execute'."
            )

    @staticmethod
    def get_supported_types() -> list[str]:
        """Get list of supported executor types.

        Returns:
            List of supported executor type names
        """
        return ["react", "plan_and_execute"]
