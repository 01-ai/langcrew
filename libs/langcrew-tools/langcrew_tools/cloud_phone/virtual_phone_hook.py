import copy
import json
import logging
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.runnables import ensure_config
from langcrew.utils.runnable_config_utils import RunnableStateManager

from langcrew_tools.cloud_phone.context import LangGraphSummaryHook

logger = logging.getLogger(__name__)


class CloudPhoneMessageHandler:
    """Helper class for handling CloudPhone tool messages, encapsulating all related logic."""

    def __init__(
        self,
        model_name: str | None = None,
    ):
        """Initialize CloudPhoneMessageHandler.

        Args:
            model_name: Model name, can be used in message processing
        """
        self.model_name = model_name

    @staticmethod
    async def _is_cloudphone_tool_message(message: BaseMessage) -> bool:
        """Check if the message is a CloudPhone tool message."""
        return True

    async def _update_message_content(
        self,
        content: str,
        clickable_elements: str,
        screenshot_url: str | None,
        messages: list[BaseMessage],
    ):
        """Update message content with clickable elements and screenshot."""
        if screenshot_url:
            current_clickable_elements = clickable_elements
            previous_clickable_elements = RunnableStateManager.get_value(
                ensure_config(), "previous_clickable_elements"
            )
            if not previous_clickable_elements:
                previous_clickable_elements = []
            text = {
                "current_clickable_elements": current_clickable_elements,
                "previous_clickable_elements": previous_clickable_elements,
                "description": f"""\nCurrent screenshot url: {screenshot_url}\n\n Screenshots and clickable elements are temporary and will be cleared from message history, Help you make judgments""",
                "think": """1、请先使用视觉分析，再做决策, 不要盲目操作
                2、请先分析当前页面和上一页面的可点击元素，再做决策
                3、如果要点击坐标，请精确计算坐标(x,y) = ((left+right)/2, (top+bottom)/2)，不要估计坐标，估计的坐标不准确
                4、我以提供了当前页面（最新）的可点击元素和当前屏幕截图，不要再使用phone_take_screenshot和 phone_get_clickable_elements重复获取了，重复获取和我们的简洁高效原则不符
                """,
            }

            # Check for repeated tap_by_coordinates calls to detect potential error loops
            # Extract recent tool calls from message history
            recent_tool_calls = []
            for msg in reversed(messages[-15:]):  # Check last 10 messages
                if (
                    isinstance(msg, AIMessage)
                    and hasattr(msg, "tool_calls")
                    and msg.tool_calls
                ):
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get("name", "")
                        if tool_name:
                            # Store both name and args for comparison
                            recent_tool_calls.append({
                                "name": tool_name,
                                "args": tool_call.get("args", {}),
                            })

            # If we have at least 3 recent calls, check if they're all identical phone_tap_coordinates
            if len(recent_tool_calls) >= 3:
                last_three_calls = recent_tool_calls[-3:]
                # Check if all three calls are identical (same name and same args)
                if all(
                    call["name"] == "phone_tap_coordinates" for call in last_three_calls
                ) and all(
                    call["args"] == last_three_calls[0]["args"]
                    for call in last_three_calls
                ):
                    logger.warning(
                        f"Detected potential error loop: last 3 tool calls were identical 'phone_tap_coordinates' with same args. "
                        f"Tool calls: {[call['name'] for call in last_three_calls]} with args: {last_three_calls[0]['args']}"
                    )
                    text["warning"] = (
                        "你在重复调用phone_tap_corporates。不要陷入错误循环，停下来反思，考虑使用其他方法, 如果想输入内容，现在已经点击了输入框，直接输入即可. 如果仍执行相同点击操作请说明原因！！！"
                    )

            text = json.dumps(text)
            RunnableStateManager.set_value(
                ensure_config(),
                "previous_clickable_elements",
                current_clickable_elements,
            )
            # messages[-1].content = content

            # 深度拷贝最后一条消息，然后修改content，再赋值回去
            copied_message = copy.deepcopy(messages[-1])
            copied_message.content = content
            messages[-1] = copied_message

            if self.model_name.startswith("claude"):
                messages.append(
                    HumanMessage(
                        content=[
                            {
                                "type": "image",
                                "source": {"type": "url", "url": screenshot_url},
                            },
                            {"type": "text", "text": text},
                        ]
                    )
                )
            elif self.model_name.startswith("us.anthropic.claude"):
                base_64 = RunnableStateManager.get_value(
                    ensure_config(), screenshot_url
                )
                if base_64:
                    messages.append(
                        HumanMessage(
                            content=[
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/png",
                                        "data": base_64,
                                    },
                                },
                                {"type": "text", "text": text},
                            ]
                        )
                    )
                RunnableStateManager.del_key(ensure_config(), screenshot_url)
            else:
                messages.append(
                    HumanMessage(
                        content=[
                            # {"type": "image", "source": {"type": "url", "url": screenshot_url}},
                            {"type": "image_url", "image_url": {"url": screenshot_url}},
                            {"type": "text", "text": text},
                        ]
                    )
                )
        else:
            messages[-1].content = content

    async def _process_message(self, messages: list[BaseMessage]) -> None:
        """Process a single CloudPhone tool message to add visual elements."""
        message = messages[-1]
        if isinstance(message.content, str):
            try:
                content = json.loads(message.content)
            except json.JSONDecodeError:
                return
        else:
            content = message.content

        current_state = content.get("current_state")
        if not current_state:
            return

        screenshot_url = current_state.get("screenshot_url")
        clickable_elements = RunnableStateManager.get_value(ensure_config(), "clickable_elements")
        if clickable_elements or screenshot_url:
            await self._update_message_content(
                content.get("result"), clickable_elements, screenshot_url, messages=messages
            )

    async def _restore_format(self, messages: list[BaseMessage]):
        """Restore messages to original format."""
        # Find the first CloudPhone tool message from the end, checking at most 6 messages
        for i in range(1, min(6, len(messages))):
            if (isinstance(messages[-i], HumanMessage) and 
                isinstance(messages[-i].content, list) and 
                isinstance(messages[-(i+1)], ToolMessage)):
                messages.remove(messages[-i])
                return

    async def pre_hook(
        self, base_model: BaseChatModel, state: dict[str, Any]
    ) -> list[BaseMessage]:
        """Pre-model hook executed before the model."""
        messages = state.get("messages", [])
        if not messages:
            return messages
        try:
            await self._summary(base_model, state)
            # process_message
            await self._process_message(messages)
        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            logger.warning(f"Failed to process CloudPhone message: {e}")
        except Exception as e:
            logger.error(f"Unexpected error occurred in pre-model hook: {e}")
        return state

    async def post_hook(self, messages: list[BaseMessage]) -> list[BaseMessage]:
        """Post-model hook executed after the model."""
        if messages:
            await self._restore_format(messages)
        return messages

    async def _summary(self, base_model: BaseChatModel, state: dict[str, Any]):
        summary_hook = LangGraphSummaryHook(
            base_model=base_model,
            max_messages_count_before_summary=50,
            keep_messages_count=10,
        )
        running_summary = RunnableStateManager.get_value(
            ensure_config(), "running_summary"
        )
        if running_summary:
            state["running_summary"] = running_summary
        await summary_hook.summary(state)
        if "running_summary" in state:
            RunnableStateManager.set_value(
                ensure_config(), "running_summary", state["running_summary"]
            )
