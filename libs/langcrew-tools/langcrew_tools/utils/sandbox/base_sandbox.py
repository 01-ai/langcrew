import logging
from collections.abc import Awaitable, Callable
from typing import Any, Final, TypeVar, Union

from agentbox import AsyncSandbox
from langcrew.utils import CheckpointerSessionStateManager
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from ..env_config import env_config

T = TypeVar("T")

logger = logging.getLogger(__name__)


SANDBOX_ID_KEY: Final = "sandbox_id"
E2B_CONFIG: Final[dict[str, Any]] = env_config.get_dict("E2B_")


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
                sandbox = await create_sandbox_from_env_config()
            self._sandbox = sandbox
        return self._sandbox


async def none_sandbox():
    pass


def create_sandbox_source_by_session_id(
    session_id: str,
    create_callback: Callable[[AsyncSandbox], Awaitable[None]],
    checkpointer_state_manager: CheckpointerSessionStateManager,
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
                return await create_sandbox_from_env_config(sandbox_id)
        except Exception as e:
            logger.exception(f"sandbox session_id: {session_id} error: {e}")

        logger.info(f"create sandbox session_id: {session_id}")
        sandbox = await create_sandbox_from_env_config()
        await checkpointer_state_manager.set_value(
            session_id, SANDBOX_ID_KEY,sandbox.sandbox_id
        )
        # Safely call the async callback if provided
        if create_callback is not None:
            await create_callback(sandbox)

        return sandbox

    return _get_async_sandbox


async def create_sandbox_from_env_config(
    sandbox_id: str | None = None,
) -> AsyncSandbox:
    """get async sandbox instance. when sandbox_id provided, try resume this sandbox,
    otherwise create new sandbox from env config.

    Args:
        sandbox_id (str | None, optional): sandbox_id.

    Returns:
        AsyncSandbox: async sandbox instance.
    """
    if sandbox_id is None:
        sandbox_id = E2B_CONFIG.get("sandbox_id")

    api_key = E2B_CONFIG.get("api_key")
    timeout = int(E2B_CONFIG.get("timeout"))
    domain = E2B_CONFIG.get("domain")
    template = E2B_CONFIG.get("template")

    if sandbox_id:
        running_sandboxes = await AsyncSandbox.list(api_key=api_key, domain=domain)
        for sandbox in running_sandboxes:
            if sandbox.sandbox_id == sandbox_id:
                return await AsyncSandbox.connect(
                    sandbox_id=sandbox_id,
                    api_key=api_key,
                    domain=domain,
                )

    return await AsyncSandbox.create(
        api_key=api_key,
        template=template,
        timeout=timeout,
        domain=domain,
    )
