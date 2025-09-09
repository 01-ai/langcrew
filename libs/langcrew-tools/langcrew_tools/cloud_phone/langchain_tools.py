import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any, ClassVar

from langchain_core.runnables import RunnableConfig
from agentbox import AsyncSandbox
from pydantic import BaseModel, Field

from ..base import BaseToolInput
from ..utils.cloud_phone.actions import (
    clear_text,
    complete,
    input_text,
    list_packages,
    press_key,
    start_app,
    swipe,
    switch_app,
    tap,
    tap_by_coordinates,
    tap_input_and_enter,
    user_takeover,
)
from ..utils.cloud_phone.base import CloudPhoneMixin

logger = logging.getLogger(__name__)


class TapToolInput(BaseToolInput):
    """Input for TapTool."""

    index: int = Field(..., description="Index of the element to tap")
   


class TapTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_tap"
    args_schema: ClassVar[type[BaseModel]] = TapToolInput
    description: ClassVar[str] = (
        "Tap on a UI element by its index. "
        "index: index of the element to tap, from Clickable elements list(eg.'index': 10)"
    )

    async def _arun(self, index: int, thinking: str = "", **kwargs) -> dict:
        """
        Asynchronously tap on a UI element by its index.
        """
        tap_result = await tap(await self.get_cloud_phone(), index)
        current_state = await self._get_current_state()
        return {
            "result": tap_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("TapTool only supports async execution.")


class SwipeToolInput(BaseToolInput):
    """Input for SwipeTool."""

    start_x: int = Field(..., description="Starting X coordinate")
    start_y: int = Field(..., description="Starting Y coordinate")
    end_x: int = Field(..., description="Ending X coordinate")
    end_y: int = Field(..., description="Ending Y coordinate")
    duration_ms: int = Field(300, description="Duration of swipe in milliseconds")
   


class SwipeTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_swipe"
    args_schema: ClassVar[type[BaseModel]] = SwipeToolInput
    description: ClassVar[str] = (
        "Perform a swipe gesture on the device screen. "
        "Args: start_x, start_y, end_x, end_y (int): Coordinates. duration_ms (int): Duration in ms."
    )

    async def _arun(
        self,
        start_x: int,
        start_y: int,
        end_x: int,
        end_y: int,
        duration_ms: int = 300,
        thinking: str = "",
        **kwargs,
    ) -> dict:
        phone = await self.get_cloud_phone()
        swipe_result = await swipe(phone, start_x, start_y, end_x, end_y, duration_ms)
        current_state = await self._get_current_state()
        return {
            "result": swipe_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("SwipeTool only supports async execution.")


class InputTextToolInput(BaseToolInput):
    """Input for InputTextTool."""

    text: str = Field(
        ..., description="Text to input. Can contain spaces and special characters."
    )
   


class InputTextTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_input_text"
    args_schema: ClassVar[type[BaseModel]] = InputTextToolInput
    description: ClassVar[str] = (
        "Input text on the device. Args: text (str): Text to input."
    )

    async def _arun(self, text: str, thinking: str = "", **kwargs) -> dict:
        input_result = await input_text(await self.get_cloud_phone(), text)
        current_state = await self._get_current_state()
        return {
            "result": input_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("InputTextTool only supports async execution.")


class PressKeyToolInput(BaseToolInput):
    """Input for PressKeyTool."""

    keycode: int = Field(
        ...,
        description="Android keycode to press. Common: 3=HOME, 4=BACK, 24=VOLUME UP, 25=VOLUME DOWN, 26=POWER, 82=MENU.",
    )
   


class PressKeyTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_press_key"
    args_schema: ClassVar[type[BaseModel]] = PressKeyToolInput
    description: ClassVar[str] = (
        "Press a key on the device. "
        "Args: keycode (int): Android keycode to press. "
        "Common keycodes: 3=HOME, 4=BACK, 24=VOLUME UP, 25=VOLUME DOWN, 26=POWER, 82=MENU."
    )

    async def _arun(self, keycode: int, thinking: str = "", **kwargs) -> dict:
        press_result = await press_key(await self.get_cloud_phone(), keycode)
        current_state = await self._get_current_state()
        return {
            "result": press_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("PressKeyTool only supports async execution.")


class StartAppToolInput(BaseToolInput):
    """Input for StartAppTool."""

    package: str = Field(..., description="Package name (e.g., 'com.android.settings')")
    activity: str = Field("", description="Optional activity name")
   


class StartAppTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_start_app"
    args_schema: ClassVar[type[BaseModel]] = StartAppToolInput
    description: ClassVar[str] = (
        "Start an app on the device. "
        "Args: package (str): Package name. activity (str): Optional activity name."
    )

    async def _arun(
        self, package: str, activity: str = "", thinking: str = "", **kwargs
    ) -> dict:
        start_result = await start_app(await self.get_cloud_phone(), package, activity)
        current_state = await self._get_current_state()
        return {
            "result": start_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("StartAppTool only supports async execution.")


class ListPackagesToolInput(BaseToolInput):
    """Input for ListPackagesTool."""

    include_system_apps: bool = Field(
        False, description="Whether to include system apps (default: False)"
    )


class ListPackagesTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_list_packages"
    args_schema: ClassVar[type[BaseModel]] = ListPackagesToolInput
    description: ClassVar[str] = (
        "List installed packages on the device. "
        "Args: include_system_apps (bool): Whether to include system apps. "
        "Returns: Dictionary with 'packages', 'count', and 'type'."
    )

    async def _arun(self, include_system_apps: bool = False, **kwargs) -> dict:
        ret = await list_packages(await self.get_cloud_phone(), include_system_apps)
        current_state = await self._get_current_state()
        return {
            "result": ", ".join(ret),
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("ListPackagesTool only supports async execution.")


class CompleteTaskToolInput(BaseToolInput):
    """Input for CompleteTaskTool."""

    success: bool = Field(..., description="Indicates if the task was successful.")
    result: str = Field(..., description="Reason for failure/success.")


class CompleteTaskTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_complete_task"
    args_schema: ClassVar[type[BaseModel]] = CompleteTaskToolInput
    description: ClassVar[str] = (
        "Mark the task as finished. "
        "Args: success (bool): Indicates if the task was successful. result (str): Reason for failure/success."
    )
    return_direct: bool = True

    async def _arun(self, success: bool, result: str, **kwargs) -> dict:
        complete_result = await complete(success, result)
        return {"result": complete_result}

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("CompleteTaskTool only supports async execution.")


class EnterToolInput(BaseToolInput):
    """Input for EnterTool."""

   


class EnterTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_enter"
    args_schema: ClassVar[type[BaseModel]] = EnterToolInput
    description: ClassVar[str] = "Press the ENTER key on the device."

    async def _arun(self, thinking: str = "", **kwargs) -> dict:
        enter_result = await press_key(await self.get_cloud_phone(), 66)
        current_state = await self._get_current_state()
        return {
            "result": enter_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("EnterTool only supports async execution.")


class SwitchAppToolInput(BaseToolInput):
    """Input for SwitchAppTool."""


class SwitchAppTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_switch_app"
    args_schema: ClassVar[type[BaseModel]] = SwitchAppToolInput
    description: ClassVar[str] = "Switch to the previous app on the device."

    async def _arun(self, **kwargs) -> dict:
        switch_result = await switch_app(await self.get_cloud_phone())
        current_state = await self._get_current_state()
        return {
            "result": switch_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("SwitchAppTool only supports async execution.")


class BackToolInput(BaseToolInput):
    """Input for BackTool."""


class BackTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_back"
    args_schema: ClassVar[type[BaseModel]] = BackToolInput
    description: ClassVar[str] = "Press the BACK key on the device."

    async def _arun(self, thinking: str = "", **kwargs) -> dict:
        back_result = await press_key(await self.get_cloud_phone(), 4)
        current_state = await self._get_current_state()
        return {
            "result": back_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("BackTool only supports async execution.")


class HomeToolInput(BaseToolInput):
    """Input for HomeTool."""


class HomeTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_home"
    args_schema: ClassVar[type[BaseModel]] = HomeToolInput
    description: ClassVar[str] = "Press the HOME key on the device."

    async def _arun(self, **kwargs) -> dict:
        home_result = await press_key(await self.get_cloud_phone(), 3)
        current_state = await self._get_current_state()
        return {
            "result": home_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("HomeTool only supports async execution.")


class WaitToolInput(BaseToolInput):
    """Input for WaitTool."""

    duration: int = Field(5, description="Duration to wait in seconds (default: 5)")


class WaitTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_wait"
    args_schema: ClassVar[type[BaseModel]] = WaitToolInput
    description: ClassVar[str] = (
        "Wait for specified duration. Args: duration (int): Duration in seconds (default: 5)."
    )

    async def _arun(self, duration: int = 5, **kwargs) -> dict:
        await asyncio.sleep(duration)
        await self.get_cloud_phone()
        current_state = await self._get_current_state()
        return {
            "result": f"Waited {duration} seconds",
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("WaitTool only supports async execution.")


class UserTakeOverToolInput(BaseToolInput):
    """Input for UserTakeOverTool."""


class UserTakeOverTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_user_takeover"
    args_schema: ClassVar[type[BaseModel]] = UserTakeOverToolInput
    description: ClassVar[str] = (
        "Let the user take over the device. No arguments. "
        "This tool is used to request user takeover. "
        "When the user needs to take over the phone to provide additional information. "
        "Use this tool when encountering scenarios that require human intervention, "
        "such as entering verification codes, solving CAPTCHAs, or providing login credentials. "
    )

    async def _arun(self, **kwargs) -> dict:
        await self.get_cloud_phone()
        await user_takeover()
        current_state = await self._get_current_state()
        return {
            "result": "requested user takeover",
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("UserTakeOverTool only supports async execution.")


class TapInputAndEnterToolInput(BaseToolInput):
    """Input for TapInputAndEnterTool."""

    x: int = Field(..., description="X coordinate to tap")
    y: int = Field(..., description="Y coordinate to tap")
    text: str = Field(..., description="Text to input after tap")


class TapInputAndEnterTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_tap_input_and_enter"
    args_schema: ClassVar[type[BaseModel]] = TapInputAndEnterToolInput
    description: ClassVar[str] = (
        "Tap at coordinates, input text, and press enter. Args: x, y (int): Coordinates. text (str): Text to input."
    )

    async def _arun(self, x: int, y: int, text: str, **kwargs) -> dict:
        phone = await self.get_cloud_phone()
        tap_input_result = await tap_input_and_enter(x, y, text, phone)
        current_state = await self._get_current_state()
        return {
            "result": tap_input_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("TapInputAndEnterTool only supports async execution.")


class TapByCoordinatesToolInput(BaseToolInput):
    """Input for TapByCoordinatesTool."""

    x: int = Field(..., description="X coordinate to tap (screen size 720*1280)")
    y: int = Field(..., description="Y coordinate to tap (screen size 720*1280)")
   


class TapByCoordinatesTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_tap_coordinates"
    args_schema: ClassVar[type[BaseModel]] = TapByCoordinatesToolInput
    description: ClassVar[str] = (
        "Tap on the device screen at specific coordinates. "
        "Calculated center point from bounds in Clickable elements, where bounds represent coordinate boundaries. (eg:'bounds': '0,978,720,1123') "
        "If no clickable elements are available, analyze coordinates through visual analysis of screenshots."
    )

    async def _arun(self, x: int, y: int, thinking: str = "", **kwargs) -> dict:
        """
        Asynchronously tap on the device screen at specific coordinates.
        """
        phone = await self.get_cloud_phone()
        tap_result = await tap_by_coordinates(x=x, y=y, sbx=phone)
        current_state = await self._get_current_state()
        return {
            "result": tap_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("TapByCoordinatesTool only supports async execution.")


class ClearTextToolInput(BaseToolInput):
    """Input for ClearTextTool."""

    x: int = Field(
        ..., description="X coordinate of text field to clear (screen size 720*1280)"
    )
    y: int = Field(
        ..., description="Y coordinate of text field to clear (screen size 720*1280)"
    )
    num_chars: int = Field(
        ..., description="Number of characters to delete. Can exceed text length."
    )


class ClearTextTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_clear_text"
    args_schema: ClassVar[type[BaseModel]] = ClearTextToolInput
    description: ClassVar[str] = (
        "Clear text from an input field by tapping and deleting characters. "
        "Args: x,y (int): Coordinates of text field. num_chars (int): Number of characters to delete."
    )

    async def _arun(self, x: int, y: int, num_chars: int = 20, **kwargs) -> dict:
        """
        Asynchronously clear text from an input field.
        First taps the field, then sends delete key events.
        """
        phone = await self.get_cloud_phone()
        clear_text_result = await clear_text(phone, x, y, num_chars)
        current_state = await self._get_current_state()
        return {
            "result": clear_text_result,
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("ClearTextTool only supports async execution.")


class TaskScreenShotToolInput(BaseToolInput):
    """Input for TaskScreenShotTool."""


class TaskScreenShotTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_task_screenshot"
    args_schema: ClassVar[type[BaseModel]] = TaskScreenShotToolInput
    description: ClassVar[str] = (
        "Take a screenshot of the current screen. No arguments. Returns base64 encoded image."
    )

    async def _arun(self, **kwargs) -> dict:
        await self.get_cloud_phone()
        current_state = await self._get_current_state()
        return {
            "result": "",
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("TaskScreenShotTool only supports async execution.")


class GetClickablesToolInput(BaseToolInput):
    """Input for GetClickablesTool."""


class GetClickablesTool(CloudPhoneMixin):
    name: ClassVar[str] = "phone_get_clickables"
    args_schema: ClassVar[type[BaseModel]] = GetClickablesToolInput
    description: ClassVar[str] = (
        "Get clickable elements on the current screen. No arguments. Returns clickable elements."
    )

    async def _arun(self, **kwargs) -> dict:
        await self.get_cloud_phone()
        current_state = await self._get_current_state()
        return {
            "result": "",
            "current_state": current_state,
        }

    def _run(self, *args, **kwargs) -> Any:
        raise NotImplementedError("GetClickablesTool only supports async execution.")


ALL_PHONE_TOOLS = [
    # TapTool,
    TapByCoordinatesTool,
    SwipeTool,
    InputTextTool,
    PressKeyTool,
    ClearTextTool,
    StartAppTool,
    ListPackagesTool,
    EnterTool,
    SwitchAppTool,
    BackTool,
    HomeTool,
    TapInputAndEnterTool,
    WaitTool,
    TaskScreenShotTool,
    GetClickablesTool,
]

        
def get_cloudphone_tools(
    sandbox_source: Callable[[], Awaitable[AsyncSandbox]]
    | dict[str, Any]
    | None,
    config: RunnableConfig | None = None,
) -> list[CloudPhoneMixin]:
    """Initialize CloudPhone specific tools.

    Returns:
        List of initialized tools for the agent
    """
    logger.info("Initializing CloudPhone tools for full capabilities")

    tools = []

    for tool_class in ALL_PHONE_TOOLS:
        tool = tool_class(sandbox_source=sandbox_source)
        # Add mobile device description prefix for each tool
        original_description = tool.description
        tool.__class__.description = (
            f"This is a mobile phone automation tool. {original_description}"
        )
        tool.config = config
        tools.append(tool)

    return tools
