"""
Browser streaming tool  based on StreamingBaseTool
This is the  version of BrowserStreamingTool that uses the improved streaming architecture.
"""

import asyncio
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, ClassVar, Final, Literal, TypeVar

from browser_use import BrowserProfile, BrowserSession, Controller
from browser_use.agent.service import Agent
from browser_use.agent.views import AgentHistoryList, AgentOutput
from browser_use.browser.types import Geolocation
from browser_use.browser.views import BrowserStateSummary
from browser_use.llm.base import BaseChatModel as BrowserBaseChatModel
from langchain_core.runnables import RunnableConfig
from langchain_core.runnables.schema import StandardStreamEvent
from pydantic import BaseModel, Field, PrivateAttr
from typing_extensions import override

from ..astream_tool import (
    EventType,
    StreamEventType,
    StreamingBaseTool,
)
from ..utils.s3 import AsyncS3Client
from ..utils.sandbox import SandboxMixin
from ..utils.sandbox.s3_integration import SandboxS3Toolkit
from .browser_manager import browser_registry
from .browser_use_patches import (
    HumanInterventionAction,
    init_handle_page_created,
)
from .prompt import get_browser_tool_prompt

T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger(__name__)


class BrowserUseInput(BaseModel):
    """Input for BrowserStreamingTool."""

    instruction: str = Field(..., description="The instruction to use browser")


class BrowserStepEvent(BaseModel):
    """Event data for agent step completion"""

    step_number: int
    url: str = ""
    title: str = ""
    thinking: str | None = None
    evaluation_previous_goal: str = ""
    memory: str = ""
    next_goal: str = ""
    actions: list[dict] = Field(default_factory=list)
    screenshot: str | None = Field(default=None, repr=False)
    interactive_elements_count: int = 0
    previous_goal: str | None = None


class BrowserCompletionEvent(BaseModel):
    """Event data for agent completion"""

    success: bool
    final_result: str | None = None
    total_steps: int
    errors: list[str] = Field(default_factory=list)
    urls: list[str] = Field(default_factory=list)
    previous_goal: str | None = None
    screenshot: str | None = None
    intervention_info: dict[str, Any] | None = None


class BrowserStreamingTool(StreamingBaseTool, SandboxMixin):
    """Browser tool  for web interaction based on StreamingBaseTool."""

    DESKTOP_RESOLUTION: Final[tuple[int, int]] = (1280, 1020)

    name: ClassVar[str] = "browser-use"
    args_schema: type[BaseModel] = BrowserUseInput
    description: ClassVar[str] = (
        "Use this tool to interact with web browsers. Input should be a natural language description of what you want to do with the browser, such as 'Go to google.com and search for browser-use', or 'Navigate to Reddit and find the top post about AI'."
    )

    # Agent configuration
    step_limit: int | None = Field(default=None, description="Maximum steps for agent")
    vl_llm: BrowserBaseChatModel = Field(..., description="LLM model instance")
    page_extraction_llm: BrowserBaseChatModel = Field(
        ..., description="Page extraction LLM model instance"
    )
    agent_kwargs: dict[str, Any] | None = Field(
        default=None, description="Additional Agent constructor parameters"
    )
    first_screenshot_url: str | None = Field(
        default=None, description="First screenshot url"
    )
    request_language: str = Field(default=..., description="Request language")
    browser_profile: BrowserProfile | None = Field(
        default=None, description="Browser profile"
    )
    desktop_resolution: tuple[int, int] = Field(
        default=..., description="Desktop resolution"
    )
    async_s3_client: AsyncS3Client | None = Field(
        default=None, description="Async S3 client"
    )

    # Private attributes
    _event_queue: asyncio.Queue | None = PrivateAttr(default=None)
    _agent_finished: asyncio.Event | None = PrivateAttr(default=None)
    _agent_error: Exception | None = PrivateAttr(default=None)
    _agent: Agent | None = PrivateAttr(default=None)
    _sandbox_id: str | None = PrivateAttr(default=None)
    _vnc_url: str | None = PrivateAttr(default=None)
    _previous_goal: str | None = PrivateAttr(default=None)
    _previous_screenshot: str | None = PrivateAttr(default=None)
    _runnable_config: RunnableConfig | None = PrivateAttr(default=None)
    _browser_session: BrowserSession | None = PrivateAttr(default=None)

    def __init__(
        self,
        vl_llm: BrowserBaseChatModel,
        step_limit: int | None = 25,
        agent_kwargs: dict[str, Any] | None = None,
        first_screenshot_url: str | None = None,
        page_extraction_llm: BrowserBaseChatModel | None = None,
        request_language: str = "en",
        browser_profile: BrowserProfile | None = None,
        desktop_resolution: tuple[int, int] = DESKTOP_RESOLUTION,
        async_s3_client: AsyncS3Client | None = None,
        **kwargs,
    ):
        """Initialize BrowserStreamingTool

        Args:
            vl_llm: Browser agent language model instance
            step_limit: Maximum number of steps for agent execution
            sandbox_config_provider: Sandbox configuration provider
            lazy_init: Whether to initialize lazily
            agent_kwargs: Additional keyword arguments to pass to Agent constructor
            first_screenshot_url: URL for first screenshot
            page_extraction_llm: LLM for page extraction
            **kwargs: Additional keyword arguments for parent class
        """
        # Initialize parent classes
        super().__init__(
            stream_event_timeout_seconds=100,
            step_limit=step_limit,
            vl_llm=vl_llm,
            page_extraction_llm=page_extraction_llm,
            agent_kwargs=agent_kwargs,
            first_screenshot_url=first_screenshot_url,
            request_language=request_language,
            browser_profile=browser_profile,
            desktop_resolution=desktop_resolution,
            async_s3_client=async_s3_client,
            **kwargs,
        )

        # Handle page_extraction_llm fallback after Pydantic initialization
        if self.page_extraction_llm is None:
            self.page_extraction_llm = self.vl_llm

        # Initialize async objects
        self._event_queue = asyncio.Queue(maxsize=200)
        self._agent_finished = asyncio.Event()

    @override
    def configure_runnable(self, config: RunnableConfig):
        """Configure runnable with  interface"""
        self._runnable_config = config

    @override
    async def handle_external_completion(
        self, event_type: EventType, event_data: Any
    ) -> Any:
        """Handle external completion events"""
        logger.info(f"External completion: {event_type}, data: {event_data}")
        try:
            self.safe_pause()
        except Exception as e:
            logger.error(f"Error pausing agent: {e}")

        # Generate response based on event type
        result = ""
        if event_type == EventType.STOP:
            result = "Agent stopped by user"
        elif event_type == EventType.NEW_MESSAGE:
            result = "Agent add new task"

        agent_result = "nothing"
        if self._agent.state.last_model_output:
            output = self._agent.state.last_model_output
            agent_result = (
                f"thinking:{output.thinking}\n"
                f"evaluation_previous_goal:{output.evaluation_previous_goal}\n"
                f"memory:{output.memory}\n"
                f"next_goal:{output.next_goal}"
            )

        return {
            "is_complete": False,
            "stop_reason": result,
            "current_content": agent_result,
        }

    def _format_event(
        self,
        data: dict | None = None,
        type: Literal["start", "intermediate", "end", "error"] | None = None,
        error_msg: str | None = None,
    ) -> dict:
        """Format event with consistent structure"""
        return {
            "sandbox_id": self._sandbox_id or "local",
            "status": type,
            "sandbox_url": self._vnc_url or "",
            "msg": error_msg or "",
            "data": data or {},
        }

    def _get_default_agent_params(self) -> dict[str, Any]:
        """Get default agent parameters"""
        return {
            "max_failures": 2,
            "use_vision": False,
            "max_actions_per_step": 5,
            "retry_delay": 3,
            "controller": Controller(
                exclude_actions=[
                    "replace_file_str",
                    "write_file",
                    "read_file",
                    # Google Sheets operations
                    "read_sheet_contents",
                    "read_cell_contents",
                    "update_cell_contents",
                    "clear_cell_contents",
                    "select_cell_or_range",
                    "fallback_input_into_single_selected_cell",
                ]
            ),
        }

    def _get_default_browser_profile(self) -> BrowserProfile:
        """Get default browser profile with localization"""
        request_language = self.request_language
        locale = "zh-CN"
        timezone_id = "Asia/Shanghai"
        geolocation = Geolocation(latitude=39.9087, longitude=116.3975)

        if request_language != "zh":
            locale = "en-US"
            timezone_id = "America/New_York"
            geolocation = Geolocation(latitude=40.7128, longitude=-74.0060)

        return BrowserProfile(
            # DOM and screenshot optimization (solve slow DOM processing and screenshot issues in logs)
            chromium_sandbox=False,  # Disable sandbox to reduce startup time
            viewport_expansion=150,
            # Disable element highlighting to reduce token usage
            highlight_elements=False,
            args=[
                "--disable-dev-shm-usage",
                "--disable-extensions",  # Disable extensions
                "--disable-plugins",  # Disable plugins
                "--aggressive-cache-discard",  # Aggressively discard cache
                "--memory-pressure-off",
                "--max_old_space_size=4096",  # Increase memory limit
            ],
            locale=locale,
            timezone_id=timezone_id,
            geolocation=geolocation,
            # Security related configuration
            ignore_https_errors=True,  # Ignore HTTPS errors
            bypass_csp=True,  # Bypass CSP policy
            # Method 1: Use startup parameters
            window_position={"width": 0, "height": 0},
            # Method 2: Fixed large size (alternative)
            viewport={
                "width": self.desktop_resolution[0],
                "height": self.desktop_resolution[1],
            },
            window_size={
                "width": self.desktop_resolution[0],
                "height": self.desktop_resolution[1],
            },
            default_timeout=25_000,
            disable_security=True,
        )

    async def _init_sandbox(self, async_sandbox) -> Any:
        if self._sandbox_id is None:
            self._sandbox_id = async_sandbox.sandbox_id if async_sandbox else "local"
            sandbox_browser_session_manager = await browser_registry.get_manager(
                async_sandbox
            )
            await sandbox_browser_session_manager.init_browser_session(
                async_sandbox,
                self.browser_profile or self._get_default_browser_profile(),
            )
            self._vnc_url = (
                sandbox_browser_session_manager._browser_vnc_url
                if sandbox_browser_session_manager._browser_vnc_url
                else ""
            )
            self._browser_session = sandbox_browser_session_manager._browser_session

    async def init_agent(self, instruction: str):
        # init sandbox
        async_sandbox = await self.get_sandbox()
        await self._init_sandbox(async_sandbox)
        """Initialize browser agent"""
        request_language = self.request_language
        language_prompt, enhanced_task = get_browser_tool_prompt(
            model_name=self.vl_llm.model,
            task_name=instruction,
            request_language=request_language,
        )
        agent_params = self.agent_kwargs or self._get_default_agent_params()

        agent_params["task"] = enhanced_task
        agent_params["extend_system_message"] = language_prompt
        agent_params["llm"] = self.vl_llm
        agent_params["browser"] = self._browser_session
        agent_params["page_extraction_llm"] = self.page_extraction_llm

        agent = Agent(**agent_params)

        # Set up callbacks
        agent.register_new_step_callback = self._new_step_callback
        agent.register_done_callback = self._done_callback
        agent.register_external_agent_status_raise_error_callback = (
            self._status_callback
        )
        self._agent = agent

    async def _new_step_callback(
        self,
        browser_state: BrowserStateSummary,
        model_output: AgentOutput,
        step_number: int,
    ) -> None:
        """Callback for new step events - pushes to event queue immediately"""
        init_handle_page_created(self._agent)

        is_url = browser_state.url.startswith("http")
        if (
            not is_url
            and self._previous_screenshot is None
            and self.first_screenshot_url
        ):
            self._previous_screenshot = self.first_screenshot_url
        elif browser_state.screenshot:
            self._previous_screenshot = browser_state.screenshot

        try:
            event_data = BrowserStepEvent(
                step_number=step_number,
                url=browser_state.url if is_url else "",
                title=browser_state.title,
                thinking=model_output.thinking,
                evaluation_previous_goal=model_output.evaluation_previous_goal or "",
                memory=model_output.memory,
                next_goal=model_output.next_goal,
                actions=[
                    action.model_dump(exclude_unset=True)
                    for action in model_output.action
                ]
                if model_output.action
                else [],
                screenshot=self._previous_screenshot,
                interactive_elements_count=len(browser_state.selector_map)
                if browser_state.selector_map
                else 0,
                previous_goal=self._previous_goal,
            )
            self._previous_goal = model_output.next_goal

            # Format event with consistent structure
            formatted_event = self._format_event(
                event_data.model_dump(), "intermediate"
            )

            # Immediately push to queue (type check ensures queue is not None)
            if self._event_queue is not None:
                await self._event_queue.put(("intermediate", formatted_event))

            logger.debug(f"Step {step_number} event queued")

        except Exception as e:
            logger.error(f"Error in step callback: {e}")
            if self._event_queue is not None:
                error_event = self._format_event({"step": step_number}, "error", str(e))
                await self._event_queue.put(("intermediate", error_event))

    async def _done_callback(self, history: AgentHistoryList) -> None:
        """Completion callback - pushes end event and marks agent as finished"""
        try:
            event_data = BrowserCompletionEvent(
                success=history.is_successful() or False,
                final_result=history.final_result(),
                total_steps=len(history.history),
                errors=[e for e in history.errors() if e is not None],
                urls=[u for u in history.urls() if u is not None],
                previous_goal=self._previous_goal,
                screenshot=self._previous_screenshot,
            )

            logger.info(f"BrowserCompletionEvent errors: {event_data.errors}")

            last_action = history.last_action()
            if last_action and "request_human_intervention" in last_action:
                await self._intervention_callback(history)
            else:
                # Format event with consistent structure
                formatted_event = self._format_event(event_data.model_dump(), "end")
                # Notify converter that an intermediate event has been completed
                await self._event_queue.put(("intermediate", formatted_event))
                await self._event_queue.put(("end", history.final_result()))

        except Exception as e:
            logger.error(f"Error in done callback: {e}")
            if self._event_queue is not None:
                error_event = self._format_event({}, "error", str(e))
                await self._event_queue.put(("end", error_event))
        finally:
            # Mark agent as finished (double insurance)
            if self._agent_finished is not None:
                self._agent_finished.set()

    @override
    async def get_handover_info(self) -> dict | None:
        if self._vnc_url:
            intervention_url = self._vnc_url.replace(
                "view_only=true", "view_only=false"
            )
            return {
                "type": "take_over_browser",
                "intervention_info": {"intervention_url": intervention_url},
            }
        return None

    async def _intervention_callback(self, history: AgentHistoryList) -> None:
        """Handle human intervention callback"""
        human_intervention_action: HumanInterventionAction = (
            history.history[-1].model_output.action[-1].root.request_human_intervention
        )
        intervention_dict = human_intervention_action.to_dict()
        intervention_url = (
            self._vnc_url.replace("view_only=true", "view_only=false")
            if self._vnc_url
            else None
        )

        intervention_dict["intervention_url"] = intervention_url
        intervention_dict["screenshot"] = self._previous_screenshot
        formatted_event = self._format_event(intervention_dict, "end")
        # Notify converter that an intermediate event has been completed
        await self._event_queue.put(("intermediate", formatted_event))
        # Tool normal output result
        await self._event_queue.put((
            "end",
            self.to_human_intervention_prompt(intervention_dict["suggestion"]),
        ))

    def to_human_intervention_prompt(self, suggestion: str) -> str:
        """Convert suggestion to human-readable prompt"""
        return (
            f"Execution paused. Reason: {suggestion}.\n"
            "You MUST now use tool to request instructions from the user on how to proceed. This is a mandatory next step."
        )

    async def _status_callback(self) -> bool:
        """Status callback - returns whether agent should stop"""
        if self._agent.state:
            logger.info(f"Status callback: {self._agent.state.last_model_output}")
        return (
            self._agent_finished.is_set() if self._agent_finished is not None else False
        )

    async def _run_agent_with_completion(self, max_steps: int) -> None:
        """Wrapper for agent.run() that ensures completion flag is set"""
        try:
            await self._agent.run(max_steps=max_steps)
        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            self._agent_error = e
            # Even on error, push error event
            if self._event_queue is not None:
                error_event = self._format_event({}, "error", str(e))
                await self._event_queue.put(("end", error_event))
        finally:
            # Always mark agent as finished
            if self._agent_finished is not None:
                self._agent_finished.set()

    # The same tool will be called multiple times during agent execution, need to reset state
    def reset_state(self):
        """Reset state for new execution"""
        # Reset state
        if self._agent_finished is not None:
            self._agent_finished.clear()
        self._agent_error = None
        # Clear any existing events in queue
        if self._event_queue is not None:
            while not self._event_queue.empty():
                try:
                    self._event_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

    def safe_resume(self):
        """Safe resume method"""
        if self._agent.state.stopped:
            logger.error("Agent stopped, cannot resume")
            return False
        elif self._agent.state.paused:
            logger.info("Resuming agent execution...")
            try:
                self._agent.resume()
            except Exception as e:
                logger.warning(f"Error resuming agent: {e}")
                # Source code recovery exception, do not handle
                pass
            return True
        else:
            return True

    def safe_pause(self):
        """Safe pause method"""
        if self._agent.state.stopped:
            logger.error("Agent stopped, cannot pause")
            return False
        elif self._agent.state.paused:
            logger.info("Agent already paused")
            return True
        else:
            logger.info("Pausing agent execution...")
            self._agent.pause()
            return True

    @override
    def handle_timeout_error(self, error: Exception) -> None:
        """Handle stream timeout error"""
        self.safe_pause()

    @override
    async def _astream_events(
        self, instruction: str, **kwargs: Any
    ) -> AsyncIterator[tuple[StreamEventType, StandardStreamEvent]]:
        """Stream events using  interface"""
        self.reset_state()
        await self.init_agent(instruction)
        self._previous_goal = "open_browser"

        # Send start event with consistent format
        start_event = self._format_event(
            data={
                "task": instruction,
                "next_goal": self._previous_goal,
                "agent_id": self._agent.task_id,
                "model": self._agent.llm.model,
            },
            type="start",
        )

        yield StreamEventType.START, self.start_standard_stream_event(start_event)

        # Start agent (don't wait for completion)
        agent_task = asyncio.create_task(
            self._run_agent_with_completion(self.step_limit)
        )

        try:
            # Consume events until agent completes and queue is empty
            while True:
                try:
                    # Wait for event with timeout (type check ensures queue is not None)
                    if self._event_queue is not None:
                        event_type, event_data = await asyncio.wait_for(
                            self._event_queue.get(), timeout=0.1
                        )

                        if event_type == "intermediate":
                            yield (
                                StreamEventType.INTERMEDIATE,
                                self.start_standard_stream_event(event_data),
                            )
                        elif event_type == "end":
                            yield (
                                StreamEventType.END,
                                self.end_standard_stream_event(event_data),
                            )
                            break

                    else:
                        # If queue is None, something went wrong
                        error_event = self._format_event(
                            type="error", error_msg="Event queue is None"
                        )
                        yield StreamEventType.END, error_event
                        break

                except TimeoutError:
                    # Check if agent is finished and queue is empty
                    agent_finished = (
                        self._agent_finished.is_set()
                        if self._agent_finished is not None
                        else True
                    )
                    queue_empty = (
                        self._event_queue.empty()
                        if self._event_queue is not None
                        else True
                    )

                    if agent_finished and queue_empty:
                        # Agent finished but no end event - create one
                        if self._agent_error:
                            error_event = self._format_event(
                                type="error", error_msg=str(self._agent_error)
                            )
                            yield StreamEventType.END, error_event
                        else:
                            error_event = self._format_event(
                                type="error",
                                error_msg="Agent finished without end event",
                            )
                            yield StreamEventType.END, error_event
                        break
                    # Otherwise continue waiting
                    continue

            # Final sweep: consume any remaining events in queue
            if self._event_queue is not None:
                while not self._event_queue.empty():
                    try:
                        event_type, event_data = self._event_queue.get_nowait()
                        if event_type == "intermediate":
                            yield (
                                StreamEventType.INTERMEDIATE,
                                self.start_standard_stream_event(event_data),
                            )
                        elif event_type == "end":
                            yield (
                                StreamEventType.END,
                                self.end_standard_stream_event(event_data),
                            )
                            break
                    except asyncio.QueueEmpty:
                        break

        except Exception as e:
            logger.error(f"Error in event streaming: {e}")
            error_event = self._format_event(type="error", error_msg=str(e))
            yield StreamEventType.END, self.end_standard_stream_event(error_event)

        finally:
            # Ensure agent task is cancelled if still running
            if not agent_task.done():
                agent_task.cancel()
            # Re-raise agent error if it occurred
            if self._agent_error:
                logger.error(f"Agent error occurred: {self._agent_error}")

    @override
    async def handle_standard_stream_event(
        self, standard_stream_event: dict
    ) -> StandardStreamEvent:
        """
        Handle standard stream event
        忽略所有标准事件
        """
        pass

    @override
    async def handle_custom_event(self, custom_event: dict) -> Any:
        try:
            event_data = custom_event.get("data", {}).get("data", {}).get("input", {})
            data_content = event_data.get("data", {})
            if self.async_s3_client:
                # Check if screenshot field is included
                if "screenshot" in data_content and data_content["screenshot"]:
                    try:
                        # Get sandbox_id for upload path
                        sandbox_id = event_data.get("sandbox_id", "local")
                        data_iamge = data_content["screenshot"]
                        # If data_image is url, use it directly
                        if data_iamge.startswith("http"):
                            screenshot_url = data_iamge
                        else:
                            # Use SandboxS3Toolkit's upload_base64_image method to asynchronously convert image to url
                            screenshot_url = await SandboxS3Toolkit.upload_base64_image(
                                async_s3_client=self.async_s3_client,
                                base64_data=data_content["screenshot"],
                                sandbox_id=sandbox_id,
                            )
                        # Replace screenshot in data
                        data_content["screenshot"] = screenshot_url

                        # Log the result
                        logger.info(
                            f"Successfully uploaded screenshot to S3: {screenshot_url}"
                        )

                    except Exception as e:
                        logger.error(f"Failed to upload screenshot to S3: {e}")

            sandbox_url = event_data.get("sandbox_url", "")

            # Function to create processed data copy
            def create_tool_start_data(data_content, brief: str = None):
                """Create data copy for on_tool_start event, removing screenshot, evaluation_previous_goal, memory fields"""
                brief_obj = ""
                if "task" in data_content:
                    brief_obj = data_content.get("task", "")
                else:
                    brief_obj = brief if brief else ""
                return {
                    "sandbox_url": sandbox_url,
                    "brief": brief_obj,
                    "timestamp_ns": time.time_ns(),
                }

            def create_tool_end_data(data_content):
                """Create data copy for on_tool_end event, removing thinking, next_goal, actions fields, and rename screenshot to image_url"""
                return {
                    "url": data_content.get("url", ""),
                    "title": data_content.get("title", ""),
                    "image_url": data_content.get("screenshot", ""),
                    "final_result": data_content.get("final_result", ""),
                    # Add nanosecond timestamp
                    "timestamp_ns": time.time_ns(),
                    "sandbox_url": sandbox_url,
                }

            # Return StandardStreamEvent
            # Return corresponding StandardStreamEvent based on different status values
            status = event_data.get("status", "")

            if status == "error":
                # If status is error, return on_tool_error event
                end_data = create_tool_end_data(data_content)
                return StandardStreamEvent(
                    event="on_tool_end",
                    name=self.name,
                    data={"input": None, "output": end_data},
                    run_id=custom_event.get("run_id", ""),
                    parent_ids=custom_event.get("parent_ids", []),
                    tags=custom_event.get("tags", []),
                    metadata=custom_event.get("metadata", {}),
                    timestamp=custom_event.get("timestamp", ""),
                )

            elif status == "end":
                # If status is end, return on_tool_end event
                end_data = create_tool_end_data(data_content)
                return StandardStreamEvent(
                    event="on_tool_end",
                    name=self.name,
                    data={"input": None, "output": end_data},
                    run_id=custom_event.get("run_id", ""),
                    parent_ids=custom_event.get("parent_ids", []),
                    tags=custom_event.get("tags", []),
                    metadata=custom_event.get("metadata", {}),
                    timestamp=custom_event.get("timestamp", ""),
                )

            elif status == "start":
                # If status is start, return on_tool_start event, name is open_browser
                start_data = create_tool_start_data(
                    data_content,
                    self._brief_process(data_content.get("next_goal", self.name)),
                )
                return StandardStreamEvent(
                    event="on_tool_start",
                    name=self.name,
                    data={"input": start_data},
                    run_id=custom_event.get("run_id", ""),
                    parent_ids=custom_event.get("parent_ids", []),
                    tags=custom_event.get("tags", []),
                    metadata=custom_event.get("metadata", {}),
                    timestamp=custom_event.get("timestamp", ""),
                )

            elif status == "intermediate":
                # If status is intermediate, return two StandardStreamEvent
                # Note: objects are shared in intermediate state, need to create copies

                # First on_tool_end, name=content from previous_goal
                end_data = create_tool_end_data(data_content)
                end_event = StandardStreamEvent(
                    event="on_tool_end",
                    name=self.name,
                    data={"output": end_data},
                    run_id=custom_event.get("run_id", ""),
                    parent_ids=custom_event.get("parent_ids", []),
                    tags=custom_event.get("tags", []),
                    metadata=custom_event.get("metadata", {}),
                    timestamp=custom_event.get("timestamp", ""),
                )

                # Second on_tool_start, name takes content from next_goal
                start_data = create_tool_start_data(
                    data_content,
                    self._brief_process(data_content.get("next_goal", self.name)),
                )

                start_event = StandardStreamEvent(
                    event="on_tool_start",
                    name=self.name,
                    data={"input": start_data},
                    run_id=custom_event.get("run_id", ""),
                    parent_ids=custom_event.get("parent_ids", []),
                    tags=custom_event.get("tags", []),
                    metadata=custom_event.get("metadata", {}),
                    timestamp=custom_event.get("timestamp", ""),
                )

                # Return special structure containing two events
                return [end_event, start_event]

        except Exception as e:
            # Global error handling: if any error occurs, print log and return original object
            logger.error(f"Error in custom_event_hook_class: {e}")
            return custom_event

    def _brief_process(self, brief: str) -> str:
        """Process brief text"""
        return "" if brief == self.name else brief
