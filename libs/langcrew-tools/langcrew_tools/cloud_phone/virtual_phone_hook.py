import copy
import json
import logging

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from langcrew.utils.runnable_config_utils import RunnableStateManager
from langcrew_tools.cloud_phone.context import create_async_summary_pre_hook

logger = logging.getLogger(__name__)


class CloudPhoneMessageHandler:
    """Helper class for handling CloudPhone tool messages, encapsulating all related logic."""

    def __init__(
        self,
        model_name: str | None = None,
        runnable_config: RunnableConfig | None = None,
    ):
        """Initialize CloudPhoneMessageHandler.

        Args:
            model_name: Model name, can be used in message processing
        """
        self.model_name = model_name
        self.runnable_config = runnable_config

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
                self.runnable_config, "previous_clickable_elements"
            )
            if not previous_clickable_elements:
                previous_clickable_elements = []
            text = {
                "current_clickable_elements": current_clickable_elements,
                "previous_clickable_elements": previous_clickable_elements,
                "description": f"""\nCurrent screenshot url: {screenshot_url}\n\n Screenshots and clickable elements are temporary and will be cleared from message history, Help you make judgments""",
                "think": """1、请先使用视觉分析，再做决策, 不要盲目操作
                2、请先分析当前页面和上一页面的可点击元素，再做决策
                3、如果要点击坐标，请精确计算坐标，不要估计坐标，估计的坐标不准确
                4、我以提供了当前页面的可点击元素和当前屏幕截图，不要再使用phone_task_screenshot和 phone_get_clickable_elements重复获取了，重复获取和我们的简洁高效原则不符
                """,
            }
            
            # Check for repeated tap_by_coordinates calls to detect potential error loops
            # Extract recent tool calls from message history
            recent_tool_names = []
            for msg in reversed(messages[-10:]):  # Check last 10 messages
                if isinstance(msg, AIMessage) and hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get("name", "")
                        if tool_name:
                            recent_tool_names.append(tool_name)
                            
            # If we have at least 3 recent calls and they're all phone_tap_coordinates
            if len(recent_tool_names) >= 3 and all(
                tool_name == "phone_tap_coordinates" for tool_name in recent_tool_names[-3:]
            ):
                logger.warning(
                    f"Detected potential error loop: last 3 tool calls were all 'phone_tap_coordinates'. "
                    f"Tool calls: {recent_tool_names[-3:]}"
                )
                text["warning"] = "⚠️ WARNING: Detected repeated phone_tap_coordinates calls. You may be stuck in an error loop. Consider using alternative approaches like phone_tap (index-based), phone_swipe, back button, or notifying the user."

            text = json.dumps(text)
            RunnableStateManager.set_value(
                self.runnable_config,
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
                    self.runnable_config, screenshot_url
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
                RunnableStateManager.del_key(self.runnable_config, screenshot_url)
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

        clickable_elements = current_state.get("clickable_elements")
        screenshot_url = current_state.get("screenshot_url")
        result = content.get("result")

        if clickable_elements or screenshot_url:
            await self._update_message_content(
                result, clickable_elements, screenshot_url, messages=messages
            )

    async def _restore_format(self, messages: list[BaseMessage]):
        """Restore messages to original format."""
        # Check if the third-to-last message is a CloudPhone tool message
        # If so, remove the second-to-last message (which should be a HumanMessage)
        if len(messages) >= 3:
            # Find the first CloudPhone tool message from the end, checking at most 6 messages
            phone_tool_found = False
            max_search = min(6, len(messages))

            for i in range(1, max_search + 1):
                current_message = messages[-i]
                if await self._is_cloudphone_tool_message(current_message):
                    # Mark as phone scene
                    RunnableStateManager.update_state(
                        self.runnable_config, {"scene": "phone"}
                    )
                    phone_tool_found = True

                    # Check if the next message (closer to end) is a HumanMessage
                    if i > 1:  # Make sure there's a message after this one
                        next_message = messages[-(i - 1)]
                        if isinstance(next_message, HumanMessage):
                            messages.remove(next_message)
                    break

            if not phone_tool_found:
                # Mark as not phone scene
                RunnableStateManager.update_state(
                    self.runnable_config, {"scene": "not_phone"}
                )

    async def pre_hook(self, messages: list[BaseMessage]) -> list[BaseMessage]:
        """Pre-model hook executed before the model."""
        if not messages:
            return messages
        try:
            # # 摘要处理
            # llm = ChatOpenAI(model="gpt-4.1")
            # summary_hook = create_async_summary_pre_hook(llm)
            
            # # 获取或初始化 running_summary
            # running_summary = RunnableStateManager.get_value(
            #     self.runnable_config, "running_summary"
            # )
            
            # # 构造状态字典 - 这是 LangGraphSummaryHook 期待的格式
            # state = {
            #     "messages": messages,
            #     "running_summary": running_summary
            # }
            
            # # 调用异步摘要hook
            # updated_state = await summary_hook(state)
            
            # # 更新消息和摘要状态
            # messages = updated_state.get("messages", messages)
            # new_summary = updated_state.get("running_summary")
            
            # # 保存更新的摘要状态
            # if new_summary and new_summary != running_summary:
            #     RunnableStateManager.set_value(
            #         self.runnable_config, "running_summary", new_summary
            #     )
            #     logger.info(f"Summary updated, message count: {len(messages)}")
            
            # 处理CloudPhone消息
            await self._process_message(messages)
            print(len(messages))
            
        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            logger.warning(f"Failed to process CloudPhone message: {e}")
        except Exception as e:
            logger.error(f"Unexpected error occurred in pre-model hook: {e}")
        return messages

    async def post_hook(self, messages: list[BaseMessage]) -> list[BaseMessage]:
        """Post-model hook executed after the model."""
        if messages:
            await self._restore_format(messages)
        return messages
