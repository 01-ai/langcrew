import logging
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Any, Final, TypeVar, Union

from e2b import AsyncSandbox
from langcrew.utils import CheckpointerSessionStateManager
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

# Import sandbox toolkit for unified sandbox management
from .toolkit import SandboxToolkit

if TYPE_CHECKING:
    pass


T = TypeVar("T")

logger = logging.getLogger(__name__)


SANDBOX_ID_KEY: Final = "sandbox_id"


class SandboxMixin(BaseModel):
    # Support config object and async config method parameters
    sandbox_source: Union[
        Callable[[], Awaitable["AsyncSandbox"]], "AsyncSandbox", dict[str, Any], None
    ] = Field(default=None, description="AsyncSandbox instance")

    _sandbox: AsyncSandbox | None = PrivateAttr(default=None)
    model_config = ConfigDict(arbitrary_types_allowed=True)

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


async def none_sandbox():
    pass


def create_sandbox_source_by_session_id(
    session_id: str,
    config: dict[str, Any] | None = None,
    create_callback: Callable[[AsyncSandbox], Awaitable[None]] | None = None,
    checkpointer_state_manager: CheckpointerSessionStateManager | None = None,
) -> Callable[[], Awaitable["AsyncSandbox"]]:
    async def _get_async_sandbox() -> "AsyncSandbox":
        # For now, create a new sandbox (placeholder implementation)
        sandbox_id = await checkpointer_state_manager.get_value(
            session_id, SANDBOX_ID_KEY
        )
        try:
            if sandbox_id:
                logger.info(
                    f"sandbox session_id: {session_id} sandbox_id: {sandbox_id}"
                )
                connect_config = config.copy() if config else {}
                connect_config[SANDBOX_ID_KEY] = sandbox_id
                sandbox = await SandboxToolkit.connect_or_resume_async_sandbox(
                    connect_config
                )
                return sandbox
        except Exception as e:
            logger.exception(f"sandbox session_id: {session_id} error: {e}")

        logger.info(f"create sandbox session_id: {session_id}")
        sandbox = await SandboxToolkit.create_async_sandbox(config)
        await checkpointer_state_manager.set_state(
            session_id, {SANDBOX_ID_KEY: sandbox.sandbox_id}
        )
        # Safely call the async callback if provided
        if create_callback is not None:
            await create_callback(sandbox)

        return sandbox

    return _get_async_sandbox
