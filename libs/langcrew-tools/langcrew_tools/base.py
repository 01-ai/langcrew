"""Base classes for LangCrew tools.

This module provides base classes that can be inherited by all tool input models
to ensure consistency and reduce code duplication.
"""

from typing import Annotated, Any, Union

from langchain_core.tools import BaseTool, InjectedToolArg
from langcrew.utils.async_utils import run_async_wait
from pydantic import BaseModel, Field

try:
    from langgraph.prebuilt import ToolRuntime
except ImportError:
    # Use Any if langgraph is not installed
    ToolRuntime = Any

try:
    from typing import override
except ImportError:
    from typing_extensions import override
import asyncio

from .utils.s3 import S3ClientMixin
from .utils.sandbox import SandboxMixin


class BaseToolInput(BaseModel):
    """Base class for all tool input models.

    Provides common fields that all tool inputs should have.
    This ensures consistency across all tools and makes it easier
    to add new common fields in the future.
    """

    brief: str = Field(
        default="", description="One brief sentence to explain this action"
    )


class RuntimeAwareInput(BaseToolInput):
    """Base input for tools that require runtime injection."""

    model_config = {"arbitrary_types_allowed": True}
    runtime: Annotated[ToolRuntime, InjectedToolArg]


class SandboxS3ToolMixin(BaseTool, SandboxMixin, S3ClientMixin):
    """Base class for all tools that use sandbox and s3."""

    @override
    def _run(self, *args: Any, **kwargs: Any) -> Any:
        """Use the tool.

        Add run_manager: Optional[CallbackManagerForToolRun] = None
        to child implementations to enable tracing.
        """
        if asyncio.events._get_running_loop() is not None:
            return run_async_wait(self._arun(*args, **kwargs))
        else:
            return asyncio.run(self._arun(*args, **kwargs))
