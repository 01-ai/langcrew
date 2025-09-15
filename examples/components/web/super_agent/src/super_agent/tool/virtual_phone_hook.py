import json
import logging

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from langcrew.utils.runnable_config_utils import RunnableStateManager

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
                "previous_clickable_elements", self.runnable_config
            )
            if not previous_clickable_elements:
                previous_clickable_elements = []
            text = {
                "current_clickable_elements": current_clickable_elements,
                "previous_clickable_elements": previous_clickable_elements,
                "description": f"""\nCurrent screenshot url: {screenshot_url}\n\n Screenshots and clickable elements are temporary and will be cleared from message history, Help you make judgments""",
                "think": """Please make full use of visual analysis:
                1. Analyze the current page image and clickable elements
                2. Determine if this is the target page
                3. Compare the differences between current page and previous page clickable elements
                4. If elements are completely identical, the click operation may not have taken effect
                5. If 2 screens have the same elements, think about not falling into repetitive operations and getting stuck in error loops
                6. Consider closing popups or finding other solutions
                7. For gaining focus or clearing textbox text, it's normal that the 2 screens may not change, you can continue with the next operation
                8. **CRITICAL: Always carefully analyze and fully consider the system prompts - do not ignore guidance while focusing solely on operations!**
                9. Before each action, verify it aligns with the overall system instructions and task objectives
                """,
            }

            text = json.dumps(text)
            RunnableStateManager.set_value(
                "previous_clickable_elements",
                current_clickable_elements,
                self.runnable_config
            )
            messages[-1].content = content
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
                    screenshot_url, self.runnable_config
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
                RunnableStateManager.del_key(screenshot_url, self.runnable_config)
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
                        {"scene": "phone"}, self.runnable_config
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
                    {"scene": "not_phone"}, self.runnable_config
                )

    async def pre_hook(self, messages: list[BaseMessage]) -> list[BaseMessage]:
        """Pre-model hook executed before the model."""
        if not messages:
            return messages

        last_message = messages[-1]
        if not await self._is_cloudphone_tool_message(last_message):
            return messages

        try:
            await self._process_message(messages)
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
