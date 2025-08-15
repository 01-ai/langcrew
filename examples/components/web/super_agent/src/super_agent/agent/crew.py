import logging
from typing import Any, Callable

from browser_use.llm.base import BaseChatModel as BrowserBaseChatModel
from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_core.language_models import BaseChatModel
from langchain_core.messages.human import HumanMessage
from langchain_openai import ChatOpenAI
from langcrew_tools.utils.sandbox.base_sandbox import SandboxMixin
from super_agent.agent.enhanced_crew import EnhancedCrew
from langcrew import Agent, Crew
from langcrew.project import CrewBase, agent, crew
from langcrew_tools.browser.browser_use_streaming_tool import BrowserStreamingTool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.base import BaseCheckpointSaver

from super_agent.common.session_state import SessionState
from super_agent.common.sandbox_config import (
    create_cloud_phone_sandbox_by_session_id,
    create_sandbox_source_by_session_id,
)
from super_agent.config.config import SuperAgentConfig, default_config
from langcrew_tools.utils.s3.factory import create_s3_client
from langcrew_tools.hitl.langchain_tools import UserInputTool
from langchain_core.tools import BaseTool
from langcrew_tools.search.langchain_tools import WebSearchTool
from langcrew_tools.fetch.langchain_tools import WebFetchTool
from langcrew_tools.filesystem import WriteFileTool, ReadFileTool, DeleteFileTool
from langcrew_tools.filesystem.langchain_tools import (
    FileReplaceTextTool,
    FileAppendTextTool,
)
from langcrew_tools.image_gen import ImageGenerationTool
from langcrew_tools.code_interpreter import CodeInterpreterTool
from langcrew_tools.commands import RunCommandTool
from super_agent.tool.cloud_phone_streaming_tool import CloudPhoneStreamingTool

logger = logging.getLogger(__name__)

CHECKPOINTER: BaseCheckpointSaver = InMemorySaver()


@CrewBase
class SuperAgentCrew:
    """Super Agent crew with browser automation capabilities"""

    def __init__(
        self,
        session_id: str,
        config: SuperAgentConfig = None,
        checkpointer: BaseCheckpointSaver | None = None,
    ):
        """
        Initialize SuperAgentCrew

        Args:
            session_id: Session ID
            config: SuperAgent configuration object, defaults to default_config
        """
        super().__init__()
        self.session_id = session_id
        self.config = config or default_config
        self.session_state = SessionState(session_id)
        self.checkpointer = checkpointer or CHECKPOINTER
        self.async_s3_client = create_s3_client()

        self.tools = self.get_tools()
        # Configure logging
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format=self.config.log_format,
        )

        if self.config.verbose:
            logger.info(f"SuperAgentCrew initialized for session: {session_id}")

    def get_system_prompt(self) -> str:
        """Generate system prompt including current date"""
        return self.config.get_system_prompt()

    def get_browser_llm(self) -> BrowserBaseChatModel:
        """Create browser-specific LLM client"""
        from browser_use.llm import ChatOpenAI as BrowserChatOpenAI

        return BrowserChatOpenAI(
            model=self.config.browser_model,
            temperature=self.config.browser_temperature,
            timeout=self.config.browser_timeout,
            max_retries=self.config.browser_max_retries,
        )

    def get_llm_client(self) -> BaseChatModel:
        """Create main LLM client"""
        return ChatOpenAI(
            model=self.config.model_name,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            max_retries=self.config.max_retries,
            request_timeout=self.config.request_timeout,
        )

    def get_tools(self) -> list[BaseTool]:
        # Web and search tools
        tools = [
            BrowserStreamingTool(
                vl_llm=self.get_browser_llm(),
                async_s3_client=self.async_s3_client,
                # sandbox_source=none_sandbox,
            ),
            CloudPhoneStreamingTool(
                base_model=self.get_llm_client(),
                sandbox_source=create_cloud_phone_sandbox_by_session_id(
                    self.session_id, checkpointer=self.checkpointer
                ),
            ),
            UserInputTool(),
            WebSearchTool(),
            WebFetchTool(),
            WriteFileTool(),
            ReadFileTool(),
            DeleteFileTool(),
            FileReplaceTextTool(),
            FileAppendTextTool(),
            ImageGenerationTool(
                enable_sandbox=True, async_s3_client=self.async_s3_client
            ),
            CodeInterpreterTool(),
            RunCommandTool(),
        ]
        for tool in tools:
            if isinstance(tool, SandboxMixin):
                if not tool.sandbox_source:
                    tool.sandbox_source = create_sandbox_source_by_session_id(
                        self.session_id, checkpointer=self.checkpointer
                    )
        return tools

    def create_pre_model_hook(self) -> Callable:
        """Create preprocessing hook function"""

        async def pre_model_hook(state: dict[str, Any]) -> dict[str, Any]:
            messages = state.get("messages", [])
            if self.config.verbose:
                logger.info(f"Pre-model hook: Processing {len(messages)} messages")

            # Handle stop requests
            if self.session_state.get_value("stop"):
                messages.append(
                    HumanMessage(
                        content="User requests to stop the task immediately, please end the task"
                    )
                )
                self.session_state.set_value("stop", False)  # Reset stop flag

            # Handle new messages
            new_message = self.session_state.get_value("new_message")
            if new_message:
                messages.append(HumanMessage(content=new_message))
                config = {"configurable": {"thread_id": self.session_state.session_id}}
                dispatch_custom_event(
                    "on_langcrew_new_message",
                    {"new_message": new_message},
                    config=config,
                )
                self.session_state.set_value("new_message", None)

            return {"messages": messages}

        return pre_model_hook

    @agent
    def super_agent(self) -> Agent:
        """Web research specialist with browser automation"""
        pre_model_hook = self.create_pre_model_hook()

        return Agent(
            tools=self.tools,
            llm=self.get_llm_client(),
            prompt=self.get_system_prompt(),
            pre_model_hook=pre_model_hook,
            verbose=self.config.verbose,
        )

    @crew
    def crew(self) -> Crew:
        """Creates the SuperAgent crew"""
        return EnhancedCrew(
            agents=self.agents,  # Automatically created by @agent decorator
            async_checkpointer=self.checkpointer,
            session_state=self.session_state,
            tools=self.tools,
            verbose=self.config.verbose,
        )
