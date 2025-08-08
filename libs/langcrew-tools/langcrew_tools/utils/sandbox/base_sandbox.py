
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Any, TypeVar, Union

from e2b import AsyncSandbox
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

# Import sandbox toolkit for unified sandbox management
from .toolkit import SandboxToolkit

if TYPE_CHECKING:
    pass


T = TypeVar("T")


class SandboxMixin(BaseModel):
    # Support config object and async config method parameters
    sandbox_source: Union[
        Callable[[], Awaitable["AsyncSandbox"]], "AsyncSandbox", dict[str, Any], None
    ] = Field(default=None, description="AsyncSandbox instance")

    _sandbox: AsyncSandbox | None = PrivateAttr(default=None)
    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

    def __init__(self, **kwargs):
        """Initialize the E2B tool with proper multiple inheritance support."""
        super().__init__(**kwargs)

    async def get_sandbox(self) -> AsyncSandbox:
        if not self._sandbox:
            # Handle different types of async_sandbox_provider
            # async_sandbox_provider handles concurrent loading issues

            if isinstance(self.sandbox_source, AsyncSandbox):
                # If it's an AsyncSandbox object, use it directly
                sandbox = self.sandbox_source
            elif callable(self.sandbox_source):
                # If it's a callable object, call it to get the configuration
                sandbox = await self.sandbox_source()
            else:
                config = self.sandbox_source or {}
                if SandboxToolkit.SANDBOX_ID in config:
                    sandbox = await SandboxToolkit.connect_or_resume_async_sandbox(
                        config
                    )
                else:
                    sandbox = await SandboxToolkit.create_async_sandbox(config)
            self._sandbox = sandbox
        return self._sandbox
