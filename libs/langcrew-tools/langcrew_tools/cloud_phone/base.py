import base64
import logging
from typing import Any, Final

from agentbox import Sandbox
from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_core.tools import BaseTool
from pydantic import Field

from ..utils.env_config import env_config
from ..utils.s3 import create_s3_client
from ..utils.sandbox.s3_integration import SandboxS3Toolkit
from .actions import enable_a11y, get_clickables, take_screenshot


class CloudPhoneBaseTool(BaseTool):
    """Base class for all CloudPhone tools providing sandbox access."""

    # adb connection configuration
    session_id: str = Field(..., description="session_id")
    sandbox_id: str | None = Field(None, description="session_id")

    sbx: Sandbox | None = Field(None, description="cloud_phone")

    @property
    def logger(self) -> logging.Logger:
        """Get logger for this tool."""
        return logging.getLogger(self.__class__.__name__)

    def __init__(self, **kwargs):
        """Initialize the CloudPhone tool."""
        super().__init__(**kwargs)
        self.session_id = kwargs["session_id"]
        self.sandbox_id = kwargs["sandbox_id"]
        self.sbx = None

    async def _get_cloud_phone(self) -> Sandbox:
        """Get the cloud phone sandbox."""
        config: Final[dict[str, Any]] = env_config.get_dict("AGENTBOX_")
        if self.sbx:
            return self.sbx
        try:
            if self.sandbox_id:
                self.sbx = Sandbox(
                    api_key=config["api_key"], sandbox_id=self.sandbox_id
                )
                self.sbx.adb_shell.connect()
                await enable_a11y(self.sbx)
                self.logger.info(f"get agentbox by id {self.sandbox_id} success.")
                return self.sbx
        except Exception as e:
            self.logger.warning(f"get agentbox by id {self.sandbox_id} failed, {e}")
        if self.sbx is None:
            try:
                self.sbx = Sandbox(
                    api_key=config["api_key"],
                    template=config["template"],
                    timeout=config["timeout"],
                )
                # Connect to ADB and set up the sandbox
                self.sbx.adb_shell.connect()
                await enable_a11y(self.sbx)
                dispatch_custom_event(
                    "on_langcrew_agentbox_created",
                    {
                        "sandbox_id": self.sbx.sandbox_id,
                        "session_id": self.session_id,
                        "instance_no": self.sbx.get_instance_no(),
                    },
                    config={"configurable": {"thread_id": self.session_id}},
                )
                self.sandbox_id = self.sbx.sandbox_id
                self.logger.info(f"create agentbox {self.sbx.sandbox_id} success.")
                return self.sbx
            except Exception as e:
                self.logger.error(f"create new agentbox failed, {e}")
                raise RuntimeError(f"create new agentbox failed, {e}")

    async def _get_current_state(self):
        """Get the current state of the device."""
        if not self.sbx:
            self.sbx = await self._get_cloud_phone()
        try:
            clickable_elements = await get_clickables(self.sbx)
            if clickable_elements:
                clickable_elements = clickable_elements.get("clickable_elements", [])
            _, image_bytes = await take_screenshot(self.sbx)
            image_base_64 = base64.b64encode(image_bytes).decode("utf-8")
            if image_base_64:
                image_url = await SandboxS3Toolkit.upload_base64_image(
                    create_s3_client(),
                    base64_data=image_base_64,
                )
            return {
                "clickable_elements": clickable_elements,
                "screenshot_url": image_url,
            }
        except Exception as e:
            logging.error(f"Error getting current state: {e}")
            return {"error": str(e), "clickable_elements": None, "screenshot_url": None}
