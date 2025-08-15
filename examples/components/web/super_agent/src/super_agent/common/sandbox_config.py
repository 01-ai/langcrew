from collections.abc import Awaitable, Callable
import logging
from typing import Any

from e2b import AsyncSandbox
from langgraph.checkpoint.base import BaseCheckpointSaver

from .checkpointer_state_manager import CheckpointerStateManager
from langcrew_tools.utils.sandbox import sandbox_toolkit


logger = logging.getLogger(__name__)


async def none_sandbox():
    pass


def create_sandbox_source_by_session_id(
    session_id: str,
    config: dict[str, Any] | None = None,
    create_callback: Callable[[AsyncSandbox], Awaitable[None]] | None = None,
    checkpointer: BaseCheckpointSaver | None = None,
) -> Callable[[], Awaitable["AsyncSandbox"]]:
    async def _get_async_sandbox() -> "AsyncSandbox":
        # For now, create a new sandbox (placeholder implementation)
        sandbox_id = await CheckpointerStateManager(checkpointer).get_value(
            session_id, "sandbox_id"
        )
        if sandbox_id:
            logger.info(f"sandbox session_id: {session_id} sandbox_id: {sandbox_id}")
            connect_config = config.copy() if config else {}
            connect_config["sandbox_id"] = sandbox_id
            sandbox = await sandbox_toolkit.connect_or_resume_async_sandbox(
                connect_config
            )
        else:
            logger.info(f"create sandbox session_id: {session_id}")
            sandbox = await sandbox_toolkit.create_async_sandbox(config)
            await CheckpointerStateManager(checkpointer).set_state(
                session_id, {"sandbox_id": sandbox.sandbox_id}
            )
            # Safely call the async callback if provided
            if create_callback is not None:
                await create_callback(sandbox)

        return sandbox

    return _get_async_sandbox
