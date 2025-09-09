import base64
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Final

from agentbox import Sandbox
from agentbox.api.client.models import InstanceAuthInfo
from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_core.tools import BaseTool
from langcrew.utils import CheckpointerSessionStateManager
from pydantic import Field

from ..utils.env_config import env_config
from ..utils.s3 import S3ClientMixin
from ..utils.sandbox.s3_integration import SandboxS3Toolkit
from .actions import enable_a11y, get_clickables, take_screenshot

logger = logging.getLogger(__name__)

sandbox_map = {}

CLOUD_PHONE_SANDBOX_ID_KEY: Final = "cloud_phone_sandbox_id"


class CloudPhoneBaseTool(BaseTool, S3ClientMixin):
    """Base class for all CloudPhone tools providing sandbox access."""

    # adb connection configuration
    session_id: str = Field(..., description="session_id")
    sandbox_id: str | None = Field(None, description="session_id")

    sandbox: Sandbox | None = Field(None, description="cloud_phone")

    def __init__(self, **kwargs) -> None:
        """Initialize the CloudPhone tool."""
        super().__init__(**kwargs)
        self.session_id = kwargs["session_id"]
        self.sandbox_id = kwargs["sandbox_id"]
        self.sandbox = None

    def __del__(self) -> None:
        if self.sandbox:
            logger.info("close adb_shell before delete cloud phone instance!")
            self.sandbox.adb_shell.close()
            if self.session_id in sandbox_map:
                del sandbox_map[self.session_id]
                logger.info("delete agentbox instance success!")

    async def _get_cloud_phone(self) -> Sandbox:
        """Get the cloud phone sandbox."""
        config: Final[dict[str, Any]] = env_config.get_dict("AGENTBOX_")
        if self.sandbox:
            logger.info("get agentbox from directly success.")
            return self.sandbox
        if self.session_id in sandbox_map.keys():
            logger.info("get agentbox from shared session success.")
            return sandbox_map[self.session_id]
        try:
            if self.sandbox_id:
                sbx = Sandbox.connect(
                    api_key=config["api_key"], sandbox_id=self.sandbox_id
                )
                sbx.adb_shell.connect()
                await enable_a11y(sbx)
                sandbox_map[self.session_id] = sbx
                self.sandbox = sbx
                logger.info(f"get agentbox by id {self.sandbox_id} success.")
                return sbx
        except Exception as e:
            logger.warning(f"get agentbox by id {self.sandbox_id} failed, {e}")
        if self.sandbox is None:
            try:
                sbx = Sandbox(
                    api_key=config["api_key"],
                    template=config["template"],
                    timeout=int(config["timeout"]),
                )
                sbx.adb_shell.connect()
                await enable_a11y(sbx)
                auth_info = sbx.get_instance_auth_info(config["timeout"])
                dispatch_custom_event(
                    "on_langcrew_agentbox_created",
                    {
                        "sandbox_id": sbx.sandbox_id,
                        "session_id": self.session_id,
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
                    config={"configurable": {"thread_id": self.session_id}},
                )

                if self.session_id:
                    sandbox_map[self.session_id] = sbx
                self.sandbox = sbx
                logger.info(f"create agentbox {sbx.sandbox_id} success.")
                return sbx
            except Exception as e:
                logger.error(f"create new agentbox failed, {e}")
                raise RuntimeError(f"create new agentbox failed, {e}")

    async def _get_current_state(self):
        """Get the current state of the device."""
        if not self.sandbox:
            self.sandbox = await self._get_cloud_phone()
        try:
            clickable_elements = await get_clickables(self.sandbox)
            if clickable_elements:
                clickable_elements = clickable_elements.get("clickable_elements", [])
            _, image_bytes = await take_screenshot(self.sandbox)
            image_base_64 = base64.b64encode(image_bytes).decode("utf-8")
            if image_base_64:
                async_s3_client = await self.get_s3_client()
                if async_s3_client:
                    image_url = await SandboxS3Toolkit.upload_base64_image(
                        async_s3_client,
                        base64_data=image_base_64,
                    )

            return {
                "clickable_elements": clickable_elements,
                "screenshot_url": image_url,
            }
        except Exception as e:
            logging.error(f"Error getting current state: {e}")
            return {"error": str(e), "clickable_elements": None, "screenshot_url": None}


def create_cloud_phone_sandbox_by_session_id(
    session_id: str,
    checkpointer_state_manager: CheckpointerSessionStateManager | None = None,
    create_callback: Callable[[Sandbox, InstanceAuthInfo], Awaitable[None]]
    | None = None,
) -> Callable[[], Awaitable["str"]]:
    async def _get_cloud_phone_async_sandbox() -> "str":
        # For now, create a new sandbox (placeholder implementation)
        sandbox_id = await checkpointer_state_manager.get_value(
            session_id, CLOUD_PHONE_SANDBOX_ID_KEY
        )
        if sandbox_id:
            logger.info(
                f"cloud_phone_sandbox_id session_id: {session_id} cloud_phone_sandbox_id: {sandbox_id}"
            )
            return sandbox_id
        else:
            # todo 异步改造
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
            if create_callback is not None:
                await create_callback(sbx, auth_info)
            await checkpointer_state_manager.set_state(
                session_id, {CLOUD_PHONE_SANDBOX_ID_KEY: sbx.sandbox_id}
            )
            # Safely call the async callback if provided
            return sbx.sandbox_id

    return _get_cloud_phone_async_sandbox
