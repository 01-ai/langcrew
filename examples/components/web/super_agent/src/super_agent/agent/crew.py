import logging

from browser_use.llm.base import BaseChatModel as BrowserBaseChatModel
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from langcrew import Agent, Crew
from langcrew.project import CrewBase, agent, crew
from langcrew.runnable_crew import RunnableCrew
from langcrew.tools import HitlGetHandoverInfoTool
from langcrew.utils.checkpointer_utils import CheckpointerSessionStateManager
from langcrew_tools.browser.browser_use_streaming_tool import BrowserStreamingTool
from langcrew_tools.cloud_phone.agent_as_tool import CloudPhoneStreamingTool
from langcrew_tools.code_interpreter import CodeInterpreterTool
from langcrew_tools.commands import RunCommandTool
from langcrew_tools.fetch.langchain_tools import WebFetchTool
from langcrew_tools.filesystem import DeleteFileTool, ReadFileTool, WriteFileTool
from langcrew_tools.filesystem.langchain_tools import (
    FileAppendTextTool,
    FileReplaceTextTool,
)
from langcrew_tools.hitl.langchain_tools import HitlHandoverTool
from langcrew_tools.image_gen import ImageGenerationTool
from langcrew_tools.search.langchain_tools import WebSearchTool
from langcrew_tools.utils.cloud_phone.base import (
    create_cloud_phone_sandbox_by_session_id,
)
from langcrew_tools.utils.s3.factory import create_s3_client
from langcrew_tools.utils.sandbox.base_sandbox import (
    SandboxMixin,
    create_sandbox_source_by_session_id,
)
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from super_agent.config.config import SuperAgentConfig, default_config

logger = logging.getLogger(__name__)


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
        self.session_id = session_id
        self.checkpointer = checkpointer or InMemorySaver()
        self.checkpointer_state_manager = CheckpointerSessionStateManager(
            self.checkpointer
        )
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
            ),
            CloudPhoneStreamingTool(
                model_name=self.config.model_name,
                base_model=self.get_llm_client(),
                session_id=self.session_id,
                sandbox_source=create_cloud_phone_sandbox_by_session_id(
                    self.session_id,
                    checkpointer_state_manager=self.checkpointer_state_manager,
                ),
            ),
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
        tools.append(
            HitlHandoverTool(
                tools=[
                    tool for tool in tools if isinstance(tool, HitlGetHandoverInfoTool)
                ],
            )
        )
        for tool in tools:
            if isinstance(tool, SandboxMixin):
                if not tool.sandbox_source:
                    tool.sandbox_source = create_sandbox_source_by_session_id(
                        self.session_id,
                        checkpointer_state_manager=self.checkpointer_state_manager,
                        create_callback=None,
                    )
        return tools

    @agent
    def super_agent(self) -> Agent:
        """Web research specialist with browser automation"""
        return Agent(
            tools=self.tools,
            llm=self.get_llm_client(),
            prompt=self.get_system_prompt(),
            verbose=self.config.verbose,
        )

    @crew
    def crew(self) -> Crew:
        """Creates the SuperAgent crew"""
        return RunnableCrew(
            agents=self.agents,  # Automatically created by @agent decorator
            async_checkpointer=self.checkpointer,
            session_id=self.session_id,
            verbose=self.config.verbose,
        )
