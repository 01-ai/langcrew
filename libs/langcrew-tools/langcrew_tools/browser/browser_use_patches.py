# Use (Monkey Patching) to modify browser_use code to make it more suitable for business requirements

import logging
from typing import Any, Final

from browser_use.agent.service import Agent
from browser_use.agent.views import ActionResult
from browser_use.controller.views import DoneAction
from browser_use.filesystem.file_system import FileSystem
from pydantic import BaseModel

logger = logging.getLogger(__name__)

HUMAN_ASSISTANCE_REQUIRED: Final[str] = "Human Assistance Required"


class HumanInterventionAction(BaseModel):
    intervention_type: str
    reason: str
    suggestion: str
    confidence: float = 0.0
    autonomous_attempts: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "intervention_type": self.intervention_type,
            "reason": self.reason,
            "suggestion": self.suggestion,
            "confidence": self.confidence,
            "autonomous_attempts": self.autonomous_attempts,
        }


def apply_browser_use_patches():
    """Apply browser_use Monkey Patches"""
    from browser_use.agent.prompts import SystemPrompt
    from browser_use.controller.service import Controller

    # 保存原始方法
    original_register_done_action = Controller._register_done_action

    def patched_register_done_action(
        self, output_model=None, display_files_in_done_text=True
    ):
        """Modified _register_done_action method using improved done logic"""
        if output_model is not None:
            self.display_files_in_done_text = display_files_in_done_text
            # For structured output, keep original logic
            return original_register_done_action(
                self, output_model, display_files_in_done_text
            )
        else:
            # Register standard done method
            @self.registry.action(
                "Complete task - provide a summary of results for the user. Set success=True if task completed successfully, false otherwise. Text should be your response to the user summarizing results. Include files you would like to display to the user in files_to_display.",
                param_model=DoneAction,
            )
            async def done(params: DoneAction, file_system: FileSystem):
                return await improved_done_implementation(params, file_system, self)

            # Register human intervention request method
            @self.registry.action(
                "Request human intervention when autonomous methods fail. Use this when you have exhausted all possible automated solutions and need human assistance to proceed. This will pause the task and request human help.",
                param_model=HumanInterventionAction,
            )
            async def request_human_intervention(
                params: HumanInterventionAction, file_system: FileSystem
            ):
                return await handle_human_intervention_request(params, file_system)

    # Modify SystemPrompt's __init__ method to handle language settings directly during initialization
    def patched_system_prompt_init(
        self,
        action_description: str,
        max_actions_per_step: int = 10,
        override_system_message: str | None = None,
        extend_system_message: str | None = None,
        use_thinking: bool = True,
        flash_mode: bool = False,
    ):
        self.default_action_description = action_description
        self.max_actions_per_step = max_actions_per_step
        self.use_thinking = use_thinking
        self.flash_mode = flash_mode
        prompt = ""

        if override_system_message:
            prompt = override_system_message
        else:
            # 调用原始的_load_prompt_template方法
            self._load_prompt_template()
            prompt = self.prompt_template.format(max_actions=self.max_actions_per_step)

            # Handle language settings
            if extend_system_message:
                import re

                # Check if custom language_settings tag is included
                if re.search(
                    r"<language_settings>.*?</language_settings>",
                    extend_system_message,
                    re.DOTALL,
                ):
                    # If extend_system_message contains complete language_settings, remove default language_settings from prompt
                    pattern = r"<language_settings>.*?</language_settings>"
                    prompt = re.sub(pattern, "", prompt, flags=re.DOTALL)
                    logger.info(
                        "Default language settings removed - using custom language settings from extend_system_message"
                    )

        if extend_system_message:
            prompt += f"\n{extend_system_message}"

        from browser_use.llm.messages import SystemMessage

        self.system_message = SystemMessage(content=prompt, cache=True)

    # Apply Monkey Patches
    Controller._register_done_action = patched_register_done_action
    SystemPrompt.__init__ = patched_system_prompt_init

    logger.info("Browser use patches applied successfully")


async def handle_human_intervention_request(
    params: HumanInterventionAction, file_system: FileSystem
) -> ActionResult:
    """Handle human intervention request"""
    logger.info(f"handle_human_intervention_request: {params}")
    user_message = f"""
**Human Assistance Required**
**Situation**: {params.reason}
**Suggested Action**: {params.suggestion}
**Attempted Methods**: {params.autonomous_attempts}
"""

    len_text = len(user_message)
    len_max_memory = 100
    memory = f"Human Assistance Required: {params.intervention_type} - {params.reason[:len_max_memory]}..."
    if len_text > len_max_memory:
        memory += f" - {len_text - len_max_memory} more characters"

    return ActionResult(
        is_done=True,
        success=False,
        extracted_content=user_message,
        long_term_memory=memory,
    )


async def improved_done_implementation(
    params: DoneAction, file_system: FileSystem, controller_self
):
    """Improved done method implementation with automatic file detection and human intervention detection"""

    # Check if human intervention is needed (get thinking content from file system or other state)
    # Note: Here may need to get thinking content based on actual Agent state
    # For now, implement basic done logic

    user_message = params.text

    len_text = len(params.text)
    len_max_memory = 100
    memory = f"Task completed: {params.success} - {params.text[:len_max_memory]}"
    if len_text > len_max_memory:
        memory += f" - {len_text - len_max_memory} more characters"

    # Auto-detect files if not explicitly specified
    files_to_display = params.files_to_display or []
    if not files_to_display:
        # Automatically include all files except todo.md
        all_files = file_system.list_files()
        files_to_display = [f for f in all_files if f != "todo.md"]
        if files_to_display:
            logger.info(f"Auto-detected files to display: {files_to_display}")

    attachments = []
    if files_to_display:
        if controller_self.display_files_in_done_text:
            file_msg = ""
            for i, file_name in enumerate(files_to_display):
                if file_name == "todo.md":
                    continue
                file_content = file_system.display_file(file_name)
                if file_content:
                    file_msg += f"\n\ncontent_{i + 1}:\n{file_content}"
                    attachments.append(file_name)
            if file_msg:
                user_message += file_msg
            else:
                logger.warning("Agent wanted to display files but none were found")
        else:
            for file_name in files_to_display:
                if file_name == "todo.md":
                    continue
                file_content = file_system.display_file(file_name)
                if file_content:
                    attachments.append(file_name)

    attachments = [str(file_system.get_dir() / file_name) for file_name in attachments]

    return ActionResult(
        is_done=True,
        success=params.success,
        extracted_content=user_message,
        long_term_memory=memory,
        attachments=attachments,
    )


def init_handle_page_created(agent: Agent):
    # Use context object id to track if already initialized
    # Use object attributes to track if already initialized
    if hasattr(agent.browser_session.browser_context, "_page_handler_initialized"):
        return

    """Initialize handle_page_created callback"""

    async def handle_page_created(page):
        browser_session = agent.browser_session
        # Ensure current page is selected
        index = browser_session.browser_context.pages.index(page)
        await browser_session.switch_to_tab(index)
        logger.info(f"🔗 Switched to tab {index}, current URL: {page.url}")

    agent.browser_session.browser_context.on("page", handle_page_created)
    # Mark as initialized
    agent.browser_session.browser_context._page_handler_initialized = True
