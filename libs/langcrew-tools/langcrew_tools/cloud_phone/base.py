import base64
import logging

from agentbox import Sandbox
from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_core.tools import BaseTool
from langcrew.memory.tool_state import ToolStateManager
from langcrew.tools.shared_state_manager import SharedStateManager
from langcrew.utils.config import agentbox_config
from langcrew.utils.s3.sandbox_integration import SandboxS3Toolkit
from pydantic import Field

from .actions import enable_a11y, get_clickables, take_screenshot


class CloudPhoneBaseTool(BaseTool):
    """Base class for all CloudPhone tools providing sandbox access."""

    # adb connection configuration
    session_id: str = Field(..., description="session_id")
    sandbox_id: str | None = Field(None, description="session_id")

    # share state manager
    tool_state_manager: ToolStateManager | None = Field(
        None, description="Tool state manager"
    )

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
        if self.sbx:
            return self.sbx
        try:
            if not self.sandbox_id:
                self.sandbox_id = (
                    SharedStateManager.get_instance(self.session_id)
                    .get_state()
                    .get("agentbox_id")
                )
            if self.sandbox_id:
                self.sbx = Sandbox(
                    api_key=agentbox_config.api_key, sandbox_id=self.sandbox_id
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
                    api_key=agentbox_config.api_key,
                    template=agentbox_config.template,
                    timeout=agentbox_config.timeout,
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

                if self.session_id:
                    SharedStateManager.get_instance(self.session_id).update_state({
                        "agentbox_id": self.sbx.sandbox_id,
                    })
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
                    base64_data=image_base_64,
                )
            SharedStateManager.get_instance(self.session_id).update_state({
                image_url: image_base_64
            })
            return {
                "clickable_elements": clickable_elements,
                "screenshot_url": image_url,
            }
        except Exception as e:
            logging.error(f"Error getting current state: {e}")
            return {"error": str(e), "clickable_elements": None, "screenshot_url": None}

    @staticmethod
    async def disconnect(sandbox_id: str) -> None:
        try:
            sbx = Sandbox(api_key=agentbox_config.api_key, sandbox_id=sandbox_id)
            if sbx.adb_shell:
                sbx.adb_shell.close()
        except Exception as e:
            logging.error(f"Error getting current state: {e}")
