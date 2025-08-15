from collections.abc import Awaitable, Callable
import logging
from typing import Any

from e2b import AsyncSandbox
from langgraph.checkpoint.base import BaseCheckpointSaver

from .checkpointer_state_manager import CheckpointerStateManager
from langcrew_tools.utils.sandbox import sandbox_toolkit
from agentbox import Sandbox
from langcrew_tools.cloud_phone.base import enable_a11y
from langcrew_tools.utils.env_config import env_config
from langchain_core.callbacks.manager import dispatch_custom_event

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


def create_cloud_phone_sandbox_by_session_id(
    session_id: str,
    checkpointer: BaseCheckpointSaver | None = None,
) -> Callable[[], Awaitable["str"]]:
    async def _get_cloud_phone_async_sandbox() -> "str":
        # For now, create a new sandbox (placeholder implementation)
        sandbox_id = await CheckpointerStateManager(checkpointer).get_value(
            session_id, "cloud_phone_sandbox_id"
        )
        if sandbox_id:
            logger.info(
                f"cloud_phone_sandbox_id session_id: {session_id} cloud_phone_sandbox_id: {sandbox_id}"
            )
            return sandbox_id
        else:
            logger.info(f"create cloud_phone_sandbox_id session_id: {session_id}")
            config = env_config.get_dict("AGENTBOX_")
            config = env_config.filter_valid_parameters(Sandbox, config)
            sbx = Sandbox(**config)
            sbx.adb_shell.connect()
            await enable_a11y(sbx)
            auth_info = sbx.get_instance_auth_info(config["timeout"])

            logger.info(
                f"cloud_phone_sandbox_id session_id: {session_id} auth_info: {auth_info}"
            )

            try:
                dispatch_custom_event(
                    "on_langcrew_agentbox_created",
                    {
                        "sandbox_id": sbx.sandbox_id,
                        "session_id": session_id,
                        "instance_no": auth_info.instance_no,
                        **(
                            {
                                "access_key": auth_info.access_key,
                                "access_secret_key": auth_info.access_secret_key,
                                "expire_time": auth_info.expire_time,
                                "user_id": auth_info.user_id,
                            }
                            if auth_info
                            else {}
                        ),
                    },
                    config={"configurable": {"thread_id": session_id}},
                )
            except Exception as e:
                logger.warning(
                    f"create cloud_phone_sandbox_id session_id: {session_id} error: {e}"
                )

            await CheckpointerStateManager(checkpointer).set_state(
                session_id, {"cloud_phone_sandbox_id": sbx.sandbox_id}
            )
            # Safely call the async callback if provided
            return sbx.sandbox_id

    return _get_cloud_phone_async_sandbox
