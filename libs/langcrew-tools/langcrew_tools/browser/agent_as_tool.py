"""
Browser automation agent based on ControllableTool

This module provides a browser automation agent that can be controlled by LLM.
Similar to cloud_phone agent, it uses LangGraph's event streaming and supports interruption.
"""

import datetime
import json
import logging
from typing import Any, ClassVar

import httpx
from langchain.agents.middleware import SummarizationMiddleware
from langcrew.utils.token_utils import count_message_tokens

try:
    from typing import override
except ImportError:
    from typing_extensions import override  # type: ignore

from langchain.agents import AgentState, create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.tools import BaseTool
from langcrew.controllable import ControllableTool
from langcrew.middleware.patch_tool_calls import PatchToolCallsMiddleware
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.errors import GraphInterrupt
from langgraph.store.memory import InMemoryStore  # 示例 store
from langgraph.types import interrupt as langgraph_interrupt
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, SkipValidation

from ..utils.s3 import S3ClientMixin
from ..utils.sandbox import SandboxMixin
from ..utils.sandbox.s3_integration import SandboxS3Toolkit
from .cdp.browser_manager import CDPBrowserManager
from .cdp.local_browser import LocalBrowser
from .middleware import (
    inject_page_state_before_model,
    remove_page_state_after_model,
)
from .middleware.element_index import remove_session
from .prompt import DEFAULT_SUMMARY_PROMPT, SYSTEM_PROMPT
from .tools.base import remove_interaction_lock

logger = logging.getLogger(__name__)

# Language mapping (constant, no need to recreate each time)
LANGUAGE_MAP = {
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
}


# Extended state schema (define once at module level)
class BrowserExtendedState(AgentState):
    """扩展的 State 类型，包含浏览器自动化所需的配置字段"""

    # 中间件配置
    use_vision: bool = False
    session_id: str = "default"
    # 自定义存储（可选）
    stored_data: dict = None


# Custom serialization annotation for CDPBrowserManager
# This prevents LangGraph from trying to serialize the browser manager
class NonSerializableBrowserManager:
    """Marker class to exclude browser manager from checkpoint serialization"""

    pass


class BrowserStreamingToolInput(BaseModel):
    """Input for BrowserStreamingTool."""

    instruction: str = Field(
        ..., description="The instruction to use browser automation"
    )


class BrowserStreamingTool(ControllableTool, SandboxMixin, S3ClientMixin):
    """Browser automation tool for web interaction based on ControllableTool.

    Supports both local and sandbox browser automation:
    - If cdp_url is not provided, launches a local browser instance
    - If cdp_url is not provided and sandbox is available, connects to sandbox browser via WSS
    - Screenshots can be automatically uploaded to S3 if S3 client is configured
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: ClassVar[str] = "browser-use"
    args_schema: type[BaseModel] = BrowserStreamingToolInput
    description: ClassVar[str] = """Use this tool to automate web browser operations.
    
**When to use:**
- When you need to navigate to websites, fill forms, click buttons, or extract information
- For web scraping, data extraction, or automated testing
- For multi-step web workflows like logging in, searching, or completing forms

**How to use:**
- Input should be a natural language description of what you want to do with the browser
- Provide high-level, comprehensive task descriptions rather than breaking them into small steps
- The agent will automatically plan and execute the necessary steps

**Examples:**
- "Go to google.com and search for 'AI news'"
- "Open github.com, search for 'langchain', and extract the top 5 repositories"
"""

    llm: SkipValidation[BaseChatModel] = Field(
        ..., description="LLM for browser automation"
    )
    recursion_limit: int = Field(default=1000, description="Recursion limit")
    session_id: str = Field(default="", description="Session id")
    checkpointer: BaseCheckpointSaver | None = Field(
        default=None, description="Checkpointer for state persistence"
    )
    request_language: str = Field(
        default="en",
        description="Request language for system prompts (e.g., 'en', 'zh', 'ja')",
    )
    cdp_url: str | None = Field(
        default=None,
        description="Chrome DevTools Protocol URL (e.g., 'http://localhost:9222')",
    )
    use_local_browser: bool = Field(
        default=False,
        description="Whether to launch a local browser",
    )
    use_vision: bool = Field(
        default=False,
        description="Whether to enable vision-enhanced page state injection (includes screenshots for AI)",
    )
    _current_browser: CDPBrowserManager | None = PrivateAttr(default=None)
    _local_browser: LocalBrowser | None = PrivateAttr(default=None)
    _sandbox_id: str | None = PrivateAttr(default=None)
    _vnc_url: str | None = PrivateAttr(default=None)
    _initialized_checkpointer: BaseCheckpointSaver = PrivateAttr()
    _base_middleware: list = PrivateAttr()

    def __init__(
        self,
        llm: BaseChatModel,
        session_id: str,
        checkpointer: BaseCheckpointSaver | None = None,
        request_language: str = "en",
        cdp_url: str | None = None,
        use_local_browser: bool = False,
        use_vision: bool = False,
        **kwargs: Any,
    ):
        # Pass all fields to kwargs before calling super().__init__
        kwargs.update({
            "llm": llm,
            "session_id": session_id,
            "checkpointer": checkpointer,
            "request_language": request_language,
            "cdp_url": cdp_url,
            "use_local_browser": use_local_browser,
            "use_vision": use_vision,
        })
        super().__init__(**kwargs)

        # Initialize checkpointer once during construction
        if self.checkpointer is None:
            from langgraph.checkpoint.memory import InMemorySaver

            self._initialized_checkpointer = InMemorySaver()
            logger.warning(
                "No checkpointer provided to BrowserStreamingTool, "
                "using InMemorySaver. Tool state will not be persisted."
            )
        else:
            self._initialized_checkpointer = self.checkpointer
            logger.info("Using provided checkpointer for tool state persistence")

        # Build middleware list once during construction
        self._base_middleware = [
            inject_page_state_before_model,
            remove_page_state_after_model,
            PatchToolCallsMiddleware(),
            SummarizationMiddleware(
                model=self.llm,
                trigger=("tokens", 120000),#[("tokens", 128000), ("messages", 150)]
                keep=("messages", 20),
                summary_prompt=DEFAULT_SUMMARY_PROMPT,
                trim_tokens_to_summarize=None,
                token_counter=lambda messages: count_message_tokens(list(messages), llm=self.llm),

            ),
        ]

        # Prepare runnable config once
        self._runnable_config = {
            "configurable": {"thread_id": self.session_id + "_browser"},
            "recursion_limit": self.recursion_limit,
        }

    @override
    async def _arun(self, instruction: str, **kwargs: Any) -> str:
        """Execute browser automation task with event streaming and intervention support"""
        # Use pre-initialized checkpointer and state manager from __init__
        checkpointer = self._initialized_checkpointer

        try:
            browser = await self._get_or_create_browser()
            config = self._runnable_config
            middleware = self._base_middleware
            # Get browser tools
            tools = self._get_browser_tools()
            # Get working language from constant map
            working_language = LANGUAGE_MAP.get(
                self.request_language, "Chinese"
            )  # Default to Chinese
            graph = create_agent(
                model=self.llm,
                tools=tools,
                system_prompt=SYSTEM_PROMPT.format(
                    current_time=datetime.datetime.now(datetime.UTC).strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),
                    working_language=working_language,
                ),
                middleware=middleware,
                checkpointer=checkpointer,
                store=InMemoryStore(),
                state_schema=BrowserExtendedState,
            )

            logger.info(f"Running browser automation with instruction: {instruction}")
            messages = [HumanMessage(content=instruction)]

            inputs = {
                "messages": messages,
                "use_vision": self.use_vision,
                "session_id": self.session_id,
            }

            # Store: 全局共享的浏览器连接信息和 VNC URL
            graph.store.put(
                ("browser",),
                "cdp_url",
                {"url": browser.cdp_url if browser else self.cdp_url},
            )
            # 🆕 保存 VNC URL 到 store（供事件使用）
            # if self._vnc_url:
            #     graph.store.put(("browser",), "vnc_url", {"url": self._vnc_url})
            # # 🆕 保存 sandbox_id 到 store
            # if self._sandbox_id:
            #     graph.store.put(("browser",), "sandbox_id", {"id": self._sandbox_id})
            pre_event = None

            try:
                # Stream events from langgraph and forward them
                async for event in graph.astream_events(inputs, config=config):
                    intervention_data = await self._check_and_extract_intervention(
                        event
                    )
                    if intervention_data:
                        logger.info(
                            f"Triggering intervention: {intervention_data.get('question', '')}"
                        )
                        # Trigger langgraph interrupt
                        langgraph_interrupt(intervention_data)

                    pre_event = event

                return self._extract_content_from_event(pre_event)

            except GraphInterrupt:
                # Re-raise GraphInterrupt to allow langgraph to handle intervention
                logger.info("GraphInterrupt raised during browser automation")
                raise

        finally:
            try:
                remove_session(self.session_id)
                session_key = f"{self.cdp_url}:{self.session_id}"
                remove_interaction_lock(session_key)
            except Exception as e:
                logger.error(f"Error cleaning: {e}")

            # Clean up browser manager (disconnect and remove from cache)
            # Note: WSS connection is closed here. Next task will create new connection.
            if self._current_browser:
                logger.info(f"Cleaning up browser manager for {self.cdp_url}...")
                try:
                    await self._current_browser.cleanup()
                    # Remove from singleton cache to free resources
                    CDPBrowserManager.remove_instance(self.cdp_url)
                    self._current_browser = None
                    logger.info("Browser manager cleaned up successfully")
                except Exception as e:
                    logger.error(f"Error cleaning up browser manager: {e}")

            # Clean up browser manager (disconnect and remove from cache)
            # Note: WSS connection is closed here. Next task will create new connection.
            if self._current_browser:
                logger.info(f"Cleaning up browser manager for {self.cdp_url}...")
                try:
                    await self._current_browser.cleanup()
                    # Remove from singleton cache to free resources
                    CDPBrowserManager.remove_instance(self.cdp_url)
                    self._current_browser = None
                    logger.info("Browser manager cleaned up successfully")
                except Exception as e:
                    logger.error(f"Error cleaning up browser manager: {e}")

            # Clean up local browser if we launched one
            if self._local_browser:
                logger.info("Shutting down local browser...")
                try:
                    await self._local_browser.kill()
                    self._local_browser = None
                    logger.info("Local browser shut down successfully")
                except Exception as e:
                    logger.error(f"Error shutting down local browser: {e}")

    def _get_browser_tools(self) -> list[BaseTool]:
        """Initialize browser tools.

        Returns:
            List of initialized browser tools
        """
        # Import here to avoid circular import
        from . import get_browser_tools

        # Vision tool is expensive (uses ~1500 tokens per call)
        # Only include it if explicitly requested
        # Use the same LLM for vision analysis (must be vision-capable like GPT-4V, Claude 3.5, etc.)
        logger.info(
            f"Initializing browser tools (vision={'enabled' if self.use_vision else 'disabled'}, "
            f"use_local_browser={self.use_local_browser})"
        )
        return get_browser_tools(
            cdp_url=self.cdp_url,
            vision_llm=self.llm,
            session_id=self.session_id,  # 🆕 传入 session_id
            sandbox_id=self._sandbox_id,
            use_local_browser=self.use_local_browser,  # 🆕 Pass use_local_browser flag
        )

    async def _get_sandbox_urls(self, async_sandbox) -> tuple[str, str]:
        """Get sandbox WebSocket URL

        Args:
            async_sandbox: AsyncSandbox instance

        Returns:
            tuple of WebSocket URL string for browser connection and VNC URL string for browser viewing
        """
        vnc_port, debug_port, schema = 6089, 9222, "s"
        params = ["autoconnect=true", "view_only=true", "resize=scale"]

        if hasattr(async_sandbox, "launch_browser"):
            data = await async_sandbox.launch_browser()
            vnc_port, debug_port = data["vnc_port"], data["debug_port"]
            schema = ""  # bubblewrap based sandbox doesn't use https

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http{schema}://{async_sandbox.get_host(debug_port)}/json", timeout=12
            )
            response.raise_for_status()
            wss_url = f"ws{schema}://{async_sandbox.get_host(debug_port)}{response.json()['wsEndpointPath']}"
            vnc_url = f"http{schema}://{async_sandbox.get_host(vnc_port)}/vnc.html?{'&'.join(params)}"
        logger.info(f"Retrieved WebSocket URL for sandbox: {wss_url}")
        logger.info(f"Retrieved VNC URL for sandbox: {vnc_url}")
        return wss_url, vnc_url

    async def _upload_screenshot_to_s3(self, screenshot_base64: str) -> str:
        """Upload screenshot to S3 and return URL.
        Args:
            screenshot_base64: Base64 encoded screenshot data

        Returns:
            S3 URL of the uploaded screenshot

        Raises:
            Exception: If S3 client is not available or upload fails
        """
        try:
            # Get S3 client
            async_s3_client = await self.get_s3_client()
            if not async_s3_client:
                logger.warning("S3 client not available, returning base64 data URL")
                return f"data:image/png;base64,{screenshot_base64}"

            # Upload to S3 using SandboxS3Toolkit
            sandbox_id = self._sandbox_id or "local"
            screenshot_url = await SandboxS3Toolkit.upload_base64_image(
                async_s3_client=async_s3_client,
                base64_data=screenshot_base64,
                sandbox_id=sandbox_id,
            )
            logger.info(f"Successfully uploaded screenshot to S3: {screenshot_url}")
            return screenshot_url

        except Exception as e:
            logger.error(f"Failed to upload screenshot to S3: {e}")
            # Fallback to base64 data URL
            return f"data:image/png;base64,{screenshot_base64}"

    async def _get_or_create_browser(self) -> CDPBrowserManager:
        """Get existing browser or create a new one.

        Supports three modes:
        1. Remote browser: Connect to existing browser via provided cdp_url
        2. Sandbox browser: Connect to sandbox browser via WSS (if sandbox available)
        3. Local browser fallback: Launch a new Chrome instance locally (if use_local_browser=True)

        Returns:
            CDPBrowserManager instance
        """
        # Mode 2 or 3: Try sandbox first, then fall back to provided cdp_url
        if self.cdp_url:
            if self._sandbox_id and not self.use_local_browser:
                await self.get_sandbox()
            # Mode 3: Use provided remote CDP URL
            logger.info(f"Using remote browser at CDP: {self.cdp_url}")
        elif self.use_local_browser:
            logger.info("Sandbox not available, launching local browser as fallback ")
            self._local_browser = LocalBrowser(
                headless=False,
                custom_args=[
                    "--window-size=1920,1080",
                ],
            )
            cdp_url = await self._local_browser.launch()
            logger.info(f"Local browser launched successfully. CDP URL: {cdp_url}")
            self.cdp_url = cdp_url
        else:
            # Mode 2: Try to get sandbox browser (with optional local browser fallback)
            logger.info("No cdp_url provided, checking for sandbox browser...")
            try:
                async_sandbox = await self.get_sandbox()
                if async_sandbox:
                    self._sandbox_id = async_sandbox.sandbox_id
                    # Get sandbox WebSocket URL and VNC URL
                    self.cdp_url, self._vnc_url = await self._get_sandbox_urls(
                        async_sandbox
                    )
                    logger.info(
                        f"Connected to sandbox browser (sandbox_id={self._sandbox_id}). "
                        f"VNC URL: {self._vnc_url}"
                    )
            except Exception as e:
                logger.error(f"Failed to initialize browser: {e}")
                raise RuntimeError(f"Browser initialization failed: {str(e)}")

        browser = CDPBrowserManager.get_instance(cdp_url=self.cdp_url)

        # Ensure browser is connected
        await browser.ensure_browser()

        return browser

    async def _check_and_extract_intervention(
        self, event: dict[str, Any]
    ) -> dict | None:
        """Check if human intervention is needed and extract intervention data

        Returns:
            dict: Intervention data if needed, None otherwise
        """
        # Browser automation typically doesn't require human intervention
        # But we could add specific logic here if needed
        # For example, if a CAPTCHA is detected or authentication fails
        event_type = event.get("event")
        event_name = event.get("name", "")
        data = event.get("data", {})
        input_data = data.get("input", {})

        # Detect user_takeover tool call
        if event_type == "on_tool_start" and "user_takeover" in event_name:
            reason = input_data.get("reason", "")
            question = input_data.get("question", "User takeover required")
            return {
                "type": "generic_interrupt",
                "question": f"{reason}\n{question}",
                "suggested_user_action": "take_over_browser",
                "intervention_info": {
                    "intervention_url": self._vnc_url.replace(
                        "view_only=true", "view_only=false"
                    ),
                },
            }

        return None

    def _extract_content_from_event(self, event: dict[str, Any]) -> str:
        """Extract the last message content as the result"""
        content = "EMPTY_CONTENT"
        if event:
            messages = event.get("data", {}).get("output", {}).get("messages", [])
            if not messages:
                logger.warning(f"No valid AI message found in the event: {event}")
                return content
            last_message = messages[-1]
            if isinstance(last_message, ToolMessage):
                args = {}
                if len(messages) >= 2 and isinstance(messages[-2], AIMessage):
                    tool_calls = getattr(messages[-2], "tool_calls", [])
                    if tool_calls:
                        args = tool_calls[0].get("args", {})

                content = (
                    f"{json.dumps(args, ensure_ascii=False)}\n{last_message.content}"
                )
            else:
                content = last_message.content
            if isinstance(content, dict | list):
                content = json.dumps(content, ensure_ascii=False)
        logger.info(f"Browser agent result: {content[:200]}...")
        return content
