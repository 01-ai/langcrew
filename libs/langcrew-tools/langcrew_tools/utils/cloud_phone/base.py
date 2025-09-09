import base64
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Final, Union

from agentbox import AsyncSandbox
from agentbox.api.client.models import InstanceAuthInfo
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool
from langcrew.utils import CheckpointerSessionStateManager
from langcrew.utils.runnable_config_utils import RunnableStateManager

from pydantic import ConfigDict, Field, PrivateAttr

from ..env_config import env_config
from ..s3 import S3ClientMixin
from ..sandbox.s3_integration import SandboxS3Toolkit
from .actions import enable_a11y, get_clickables, take_screenshot

logger = logging.getLogger(__name__)


AGENT_BOX_CONFIG: Final[dict[str, Any]] = env_config.get_dict("AGENT_BOX_")
CLOUD_PHONE_SANDBOX_ID_KEY: Final = "cloud_phone_sandbox_id"


class CloudPhoneMixin(BaseTool, S3ClientMixin):
    """Base class for all CloudPhone tools providing sandbox access."""

    sandbox_source: Union[
        Callable[[], Awaitable["AsyncSandbox"]], "AsyncSandbox", dict[str, Any], None
    ] = Field(default=None, description="AsyncSandbox instance")
    _sandbox: AsyncSandbox | None = PrivateAttr(default=None)
    model_config = ConfigDict(arbitrary_types_allowed=True)
    config: RunnableConfig | None = None
    def __init__(self, **kwargs) -> None:
        """Initialize the CloudPhone tool."""
        super().__init__(**kwargs)

    async def get_cloud_phone(self) -> AsyncSandbox:
        """Get the cloud phone sandbox."""
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
                sandbox, _ = await default_create_cloud_phone_from_env_config()
            self._sandbox = sandbox

        return self._sandbox

    async def _get_current_state(self):
        """Get the current state of the device."""
        if not self._sandbox:
            self._sandbox = await self.get_cloud_phone()
        try:
            clickable_elements = await get_clickables(self._sandbox)
            if clickable_elements:
                clickable_elements = clickable_elements.get("clickable_elements", [])
            _, image_bytes = await take_screenshot(self._sandbox)
            image_base_64 = base64.b64encode(image_bytes).decode("utf-8")
            if image_base_64:
                async_s3_client = await self.get_s3_client()
                if async_s3_client:
                    image_url = await SandboxS3Toolkit.upload_base64_image(
                        async_s3_client,
                        base64_data=image_base_64,
                        sandbox_id=self._sandbox.sandbox_id,
                    )
                    if self.config:                       
                        RunnableStateManager.set_value(
                            self.config,
                            image_url,
                            image_base_64,
                        )
            return {
                "clickable_elements": clickable_elements,
                "screenshot_url": image_url,
            }
        except Exception as e:
            logging.error(f"Error getting current state: {e}")
            return {"error": str(e), "clickable_elements": None, "screenshot_url": None}


async def default_create_cloud_phone_from_env_config(
    sandbox_id: str | None = None,
) -> tuple[AsyncSandbox, InstanceAuthInfo | None]:
    if sandbox_id:
        sandbox = await AsyncSandbox.connect(
            api_key=AGENT_BOX_CONFIG["api_key"], sandbox_id=sandbox_id
        )
        return sandbox, None
    else:
        sandbox = await AsyncSandbox.create(
            api_key=AGENT_BOX_CONFIG["api_key"],
            template=AGENT_BOX_CONFIG["template"],
            timeout=int(AGENT_BOX_CONFIG["timeout"]),
        )
        await sandbox.adb_shell.connect()
        await enable_a11y(sandbox)
        auth_info = await sandbox.get_instance_auth_info(
            int(AGENT_BOX_CONFIG["timeout"])
        )
        return sandbox, auth_info


def create_cloud_phone_sandbox_by_session_id(
    session_id: str,
    checkpointer_state_manager: CheckpointerSessionStateManager,
    create_callback: Callable[[AsyncSandbox, InstanceAuthInfo], Awaitable[None]]
    | None = None,
) -> Callable[[], Awaitable[AsyncSandbox]]:
    async def _get_cloud_phone_async_sandbox() -> AsyncSandbox:
        # For now, create a new sandbox (placeholder implementation)
        sandbox_id = await checkpointer_state_manager.get_value(
            session_id, CLOUD_PHONE_SANDBOX_ID_KEY
        )
        if sandbox_id:
            sandbox, _ = await default_create_cloud_phone_from_env_config(sandbox_id)
            logger.info(
                f"session_id: {session_id} get cloud_phone by sandbox_id: {sandbox_id}"
            )
            return sandbox
        else:
            logger.info(f"session_id: {session_id} create cloud_phone")

            sandbox, auth_info = await default_create_cloud_phone_from_env_config()

            logger.info(f"cloud_phone: {sandbox.sandbox_id} auth_info: {auth_info}")
            if create_callback is not None and auth_info:
                await create_callback(sandbox, auth_info)
            await checkpointer_state_manager.set_state(
                session_id, {CLOUD_PHONE_SANDBOX_ID_KEY: sandbox.sandbox_id}
            )
            # Safely call the async callback if provided
            return sandbox

    return _get_cloud_phone_async_sandbox
