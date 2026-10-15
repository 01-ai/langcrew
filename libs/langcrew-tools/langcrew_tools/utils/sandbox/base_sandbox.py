import logging
from collections.abc import Awaitable, Callable
from typing import Any, Final, TypeVar, Union

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from ...storage import StateStorage
from .async_sandbox import AsyncSandbox

T = TypeVar("T")

logger = logging.getLogger(__name__)


SANDBOX_ID_KEY: Final = "sandbox_id"
DEFAULT_CREATE_DOMAIN: Final = "sandbox-svc:8000"


class SandboxMixin(BaseModel):
    sandbox_source: Union[
        Callable[[], Awaitable["AsyncSandbox"]], "AsyncSandbox", None
    ] = Field(default=None, description="AsyncSandbox instance or factory")

    _sandbox: AsyncSandbox | None = PrivateAttr(default=None)
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, **kwargs):
        """Initialize the E2B tool with proper multiple inheritance support."""
        super().__init__(**kwargs)

    async def get_sandbox(self) -> AsyncSandbox:
        if not self._sandbox:
            if isinstance(self.sandbox_source, AsyncSandbox):
                self._sandbox = self.sandbox_source
            elif callable(self.sandbox_source):
                self._sandbox = await self.sandbox_source()
            else:
                raise RuntimeError(
                    "sandbox_source is required; create the sandbox first and assign it"
                )
        # timeout is sandbox keep-alive seconds for agentbox/E2B, not HTTP
        # connect timeout. Bubblewrap's instance connect ignores it.
        return await self._sandbox.connect(timeout=3600)


async def none_sandbox():
    pass


def create_sandbox_source_by_session_id(
    session_id: str,
    state_storage: StateStorage | None = None,
    create_callback: Callable[[AsyncSandbox], Awaitable[None]] | None = None,
    envs: dict[str, str] | None = None,
    config: dict[str, Any] | None = None,
) -> Callable[[], Awaitable["AsyncSandbox"]]:
    async def _get_async_sandbox() -> "AsyncSandbox":
        # Try to get existing sandbox_id from state storage
        sandbox_id = None
        if state_storage:
            state_data = await state_storage.load_state(session_id)
            sandbox_id = state_data.get(SANDBOX_ID_KEY) if state_data else None

        if sandbox_id:
            logger.info(f"sandbox session_id: {session_id} sandbox_id: {sandbox_id}")
            return await create_sandbox_from_env_config(
                sandbox_id, envs=envs, config=config
            )

        logger.info(f"create sandbox session_id: {session_id}")
        sandbox = await create_sandbox_from_env_config(envs=envs, config=config)

        # Save sandbox_id to state storage
        if state_storage:
            await state_storage.save_state(
                session_id, {SANDBOX_ID_KEY: sandbox.sandbox_id}
            )

        # Safely call the async callback if provided
        if create_callback is not None:
            await create_callback(sandbox)

        return sandbox

    return _get_async_sandbox


async def create_sandbox_from_env_config(
    sandbox_id: str | None = None,
    envs: dict[str, str] | None = None,
    binds: list[dict] | None = None,
    *,
    config: dict[str, Any] | None = None,
) -> AsyncSandbox:
    """get async sandbox instance. when sandbox_id provided, try resume this sandbox,
    otherwise create new sandbox from env config.

    Args:
        sandbox_id (str | None, optional): sandbox_id.
        envs (dict[str, str] | None, optional): environment variables, e.g. {"TZ": "Asia/Shanghai"}.
        binds (list[dict] | None, optional): bind mounts, each with host_path, mount_point, and optional readonly flag.
        config (dict[str, Any] | None, optional): connection settings.
            Keys: api_key, timeout, domain, template, sandbox_id.

    Returns:
        AsyncSandbox: async sandbox instance.
    """
    cfg = {k: v for k, v in (config or {}).items() if v is not None}

    if sandbox_id is None:
        sandbox_id = cfg.get("sandbox_id")

    api_key = cfg.get("api_key")
    timeout = int(cfg.get("timeout", 300))
    domain = cfg.get("domain")
    template = cfg.get("template")

    logger.info(
        f"create sandbox from env config sandbox_id: {sandbox_id} domain: {domain} template: {template}, envs: {envs}, auto pause enabled."
    )

    try:
        if sandbox_id:
            logger.info(f"connect sandbox sandbox_id: {sandbox_id}")
            return await AsyncSandbox.connect(  # type: ignore[call-arg]
                sandbox_id=sandbox_id, api_key=api_key, domain=domain, timeout=timeout, envs=envs or {}, binds=binds,
            )
        return await AsyncSandbox.beta_create(
            api_key=api_key,
            template=template,
            auto_pause=True,
            domain=domain or DEFAULT_CREATE_DOMAIN,
            timeout=timeout,
            envs=envs or {},
            binds=binds,
        )
    except Exception as e:
        logger.error(
            f"Failed to create sandbox from env config sandbox_id: {sandbox_id} error: {e}"
        )
        raise e
