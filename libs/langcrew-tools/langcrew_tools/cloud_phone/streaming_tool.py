"""
Browser streaming tool  based on StreamingBaseTool
This is the  version of BrowserStreamingTool that uses the improved streaming architecture.
"""

import datetime
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, ClassVar

try:
    from typing import override
except ImportError:
    from typing_extensions import override

from agentbox import AsyncSandbox
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from langcrew.tools import GraphStreamingBaseTool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field, PrivateAttr

from langcrew_tools.cloud_phone.langchain_tools import get_cloudphone_tools

from .virtual_phone_hook import CloudPhoneMessageHandler

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
# Virtual Cell Phone(Cloud phone)


## Overview
You can control an Android device to achieve a specified goal the user is asking for.
You receive screenshots and clickable elements list before each operation. Use these together for precise control.

## Context Information
- **Current Time**: {current_time}
- **Time Zone**: UTC

## Core Principles
- **Auto-Provided Data**: Screenshots and clickable elements are provided automatically. Only call `phone_task_screenshot()` and `phone_get_clickables()` if not received in current request
- **Context Analysis**: Calculate center coordinates from bounds: (x,y) = ((left+right)/2, (top+bottom)/2)
- If user requests to stop the task immediately, please use agent_end_task to end the task
- **Visual Information Utilization**: Make full use of visual information, carefully analyze all elements on the screen, especially obvious close buttons or other operable elements.
- **Handle Ineffective Clicks**: After discovering that repeated clicking on search boxes is ineffective, analyze whether there are popups/recommendation lists on the interface, look for close buttons, or try using the back key to exit the current interface level, then continue the task.
- **Modal Layer Handling**: Modal layers are likely to cause ineffective clicks. Need to analyze whether there are popups/recommendation lists on the interface, look for close buttons, or try using the back key to exit the current interface level, then continue the task. (e.g., 下载应用时，请先点击右上角关闭按钮、请务必先关闭推荐应用的弹窗， 弹窗里应用无法正常下载，不要使用一键下载！！)
## Please make full use of visual analysis
1. Analyze the current page image and clickable elements
2. Determine if this is the target page
3. Compare the differences between current page and previous page clickable elements
4. If elements are completely identical, the click operation may not have taken effect
5. If 2 screens have the same elements, think about not falling into repetitive operations and getting stuck in error loops
6. Consider closing popups or finding other solutions
7. For gaining focus or clearing textbox text, it's normal that the 2 screens may not change, you can continue with the next operation
8. 仔细分析并充分考虑系统提示词，不要只操作而忽略系统提示词的提示！！！
                
## Core Analysis & Planning Process
1. **Screen State Analysis**: Examine all UI elements in current screenshot
2. **Step-by-Step Planning**: Break down task into sequential actions
3. **Tool Selection**: Choose appropriate tool for each step
4. **Result Validation**: Verify action outcomes match expectations
5. **Error Recovery**: Re-execute if results are inconsistent

## Navigation & Search
- **Search Issues**: If results don't appear, click search button again
- **No Search Button**: Try return/back to regain focus, then re-enter
- **Alternative Search**: Use enter tool as equivalent to search trigger
- **App Management**: Use list_packages to get app names, then start_app to open

## Input & Text Handling
- **Input Focus**: ALWAYS phone_tap_coordinates input box before using input_text tool, 点击后就可以获取到焦点（焦点选中可能不会显示在可点击元素中），就可以输入文字
- **Pre-existing Content**: Input boxes may contain previous/placeholder text (normal)
- **Keyboard Blocking**: Use back button or scroll if keyboard obscures view

## Shopping & E-commerce
- **Add to Cart Process**: 
- First click opens cart view (doesn't add item)
- Second click on cart page actually adds item
- **Navigation**: Use "Next" to return to search results
- **Modal Handling**: Close via back button, outside click, or close button
- **Payment**: Do not add any payment information

### Opening Apps
- The virtual phone may have multiple screens - If the app is not found, use horizontal left or right swipes to navigate between them when searching for apps.
- Don't keep scrolling left, you can try scrolling right to find the app
- Apps can be opened either by tapping their icon on screen (`phone_tap`) or by launching directly with the package name (`phone_list_packages` + `phone_start_app`).
- The 应用列表 in the clickable element is not clickable now. Click on the screen app to open it
- Calculator（计算器） is a built-in application on mobile phones, which can be opened using ` phone_ist_mackages `+` phone_start_app `

## Error Handling Strategies
- If unresolved, try alternative methods or tools, but NEVER repeat the same action
- **Stuck State**: Try back button, retry, or home button
- **Loading Issues**: Use wait action or retry
- **Content Discovery**: Swipe up for more content, swipe down for history
- **Task Completion**: If unable to complete (e.g., app not installed), call complete tool directly
- If all attempts fail, explain the failure to the user and request further guidance (use `message_notify_user` tool)
- If I'm repeating the same tool more than 3 times without success, try alternatives or notify user and end task

### Common Scenarios
- **Page scrolling**: Use `phone_swipe()` for vertical scrolling
- **Text input**: First phone_tap_coordinates input() field, then `phone_input_text()`
- **Index tap** (preferred): `phone_tap(index)` - Based on elements list, more accurate
- **Coordinate tap** (backup): `phone_tap_coordinates(x, y)` - Requires coordinate calculation
- **Clear text** : `phone_clear_text(x, y, num_chars, brief)` - Clear text from an input field by tapping and deleting characters, then input correct text
- For downloads use `phone_wait` to verify completion before proceeding
- When downloading an application, please turn off the recommended application pop-up layer
- Do not click repeatedly, use phone_tap_coordinates instead
- Mobile browser search requires simple and efficient access to answers, controlled frequency, and no redundant operations
- When logging into the application, it is likely necessary to first check the 'Agree to User Agreement' option

## Special Tools & Scenarios 
`ask_user(question, suggested_user_action="take_over_phone")` - if need user to take over the phone (eg: login, input verification code)

## Note
The response style should be concise, clear, and not overly designed.

In the cloud phone environment, you may use the file management tools as your memory to store important intermediate results and avoid loss, and retrieve them later as necessary. However, avoid using other sandbox tools (like command execution) unless explicitly permitted. Browser tools should only be used for phone-related tasks in this environment.

Do not fall into error loops. If repeatedly executing tools still cannot complete the task, please explain the situation and report task failure.
"""


class CloudPhoneStreamingToolInput(BaseModel):
    """Input for CloudPhoneStreamingTool."""

    instruction: str = Field(..., description="The instruction to use cloud phone")


class CloudPhoneStreamingTool(GraphStreamingBaseTool):
    """Cloud phone tool  for cloud phone interaction based on StreamingBaseTool."""

    name: ClassVar[str] = "cloud-phone"
    args_schema: type[BaseModel] = CloudPhoneStreamingToolInput
    description: ClassVar[str] = (
        "Use this tool to interact with cloud phones. Input should be a natural language description of what you want to do with the cloud phone, such as 'Open WeChat and send a message', 'Take a screenshot of the home screen', or 'Navigate to a specific app and perform actions'."
    )

    sandbox_source: Callable[[], Awaitable[AsyncSandbox]] | None = Field(
        default=None, description="AsyncSandbox"
    )
    base_model: BaseChatModel | None = Field(default=None, description="Base model")
    recursion_limit: int = Field(default=120, description="Recursion limit")
    model_name: str | None = Field(default=None, description="Model name")

    _session_id: str | None = PrivateAttr(default=None)
    _cloudphone_handler_with_model: CloudPhoneMessageHandler | None = PrivateAttr(
        default=None
    )

    def __init__(
        self,
        model_name: str,
        base_model: BaseChatModel,
        sandbox_source: Callable[[], Awaitable[AsyncSandbox]],
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        self.sandbox_source = sandbox_source
        self.base_model = base_model
        self.model_name = model_name

    @override
    async def _arun_graph_astream_events(
        self, graph: CompiledStateGraph, instruction: str, **kwargs: Any
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Run the tool asynchronously and return the result.
        """
        logger.info(f"run graph with instruction: {instruction}")
        messages = [HumanMessage(content=instruction)]
        inputs = {"messages": messages}
        final_config = {
            "configurable": {"thread_id": self.get_agent_session_id()},
            "recursion_limit": self.recursion_limit,
        }
        async for event in graph.astream_events(inputs, config=final_config):
            yield event

    @override
    async def init_graph(self) -> CompiledStateGraph:
        """
        Get the graph.
        """
        system_prompt = SYSTEM_PROMPT.format(
            current_time=datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
        )
        tools = await self._initialize_tools()

        checkpointer = InMemorySaver()

        return create_react_agent(
            model=self.base_model,
            tools=tools,
            prompt=system_prompt,
            pre_model_hook=self.pre_model_hook,
            post_model_hook=self.post_model_hook,
            checkpointer=checkpointer,
        )

    async def pre_model_hook(self, state: dict[str, Any]) -> dict[str, Any]:
        messages = state.get("messages", [])
        await self._cloudphone_handler_with_model.pre_hook(messages)

    async def post_model_hook(self, state: dict[str, Any]) -> dict[str, Any]:
        messages = state.get("messages", [])
        await self._cloudphone_handler_with_model.post_hook(messages)

    @override
    def configure_runnable(self, config: RunnableConfig):
        self._session_id = config.get("configurable", {}).get("thread_id")
        self._cloudphone_handler_with_model = CloudPhoneMessageHandler(
            model_name=self.model_name, runnable_config=config
        )

    def get_agent_session_id(self) -> str:
        if self._session_id:
            return self._session_id
        else:
            raise ValueError("session_id is not set")

    async def _initialize_tools(self) -> list[Any]:
        tools = get_cloudphone_tools(self.sandbox_source)
        return tools
