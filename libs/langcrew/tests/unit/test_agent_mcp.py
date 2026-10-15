"""
Unit tests for Agent MCP functionality.

These tests verify the MCP (Model Context Protocol) integration
within the Agent class, including tool loading, configuration,
and error handling.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain_core.language_models.fake import FakeListLLM
from langchain_core.tools import BaseTool

from langcrew.agent import Agent
from langcrew.tools.mcp import MCPToolAdapter


class MockMCPTool(BaseTool):
    """Mock MCP tool for testing."""

    name: str = "mock_mcp_tool"
    description: str = "A mock MCP tool for testing"

    def _run(self, query: str) -> str:
        return f"Mock response for: {query}"


class TestAgentMCP:
    """Test cases for Agent MCP functionality."""

    @pytest.fixture
    def mock_llm(self):
        """Create mock LLM for testing."""
        return FakeListLLM(responses=["Test response"])

    @pytest.fixture
    def mock_mcp_servers(self):
        """Create mock MCP servers config for testing."""
        return {"test_server": {"command": "test", "args": ["--test"]}}

    @pytest.fixture
    def mock_mcp_tools(self):
        """Create mock MCP tools for testing."""
        return [MockMCPTool()]

    def test_agent_mcp_initialization_basic(
        self, mock_llm, mock_mcp_servers
    ):
        """Test basic MCP initialization in Agent (lazy loaded)."""
        agent = Agent(
            prompt="You are an MCP test agent.",
            llm=mock_llm,
            mcp_servers=mock_mcp_servers,
            mcp_tool_filter=["test_tool"],
        )

        assert agent.mcp_servers == mock_mcp_servers
        assert agent.mcp_tool_filter == ["test_tool"]
        assert agent._mcp_adapter is None
        assert agent._mcp_tools == []
        assert agent._lazy_initialized is False

    def test_agent_mcp_initialization_without_config(self, mock_llm):
        """Test Agent initialization without MCP configuration."""
        agent = Agent(
            prompt="You are a test agent.",
            llm=mock_llm,
        )

        assert agent.mcp_servers is None
        assert agent.mcp_tool_filter is None
        assert agent._mcp_adapter is None
        assert agent._mcp_tools == []

    @patch("concurrent.futures.ThreadPoolExecutor")
    @patch("langcrew.agent.asyncio.get_running_loop")
    def test_load_mcp_tools_in_async_context(
        self, mock_get_loop, mock_executor, mock_llm, mock_mcp_servers, mock_mcp_tools
    ):
        """Test MCP tools loading in async context (triggered by _load_mcp_tools)."""
        mock_get_loop.return_value = Mock()
        mock_thread_pool = Mock()
        mock_executor.return_value.__enter__.return_value = mock_thread_pool

        mock_future = Mock()
        mock_future.result.return_value = mock_mcp_tools
        mock_thread_pool.submit.return_value = mock_future

        agent = Agent(
            prompt="You are an MCP testing agent.",
            llm=mock_llm,
            mcp_servers=mock_mcp_servers,
            verbose=True,
        )

        # MCP not loaded yet (lazy)
        assert agent._lazy_initialized is False
        assert len(agent._mcp_tools) == 0

        # Trigger lazy loading directly
        agent._load_mcp_tools()

        mock_executor.assert_called_once()
        mock_thread_pool.submit.assert_called_once()
        assert len(agent._mcp_tools) == 1
        assert isinstance(agent._mcp_tools[0], MockMCPTool)
        assert agent._mcp_tools[0] in agent.tools

    @patch("langcrew.agent.asyncio.get_running_loop")
    @patch("langcrew.agent.asyncio.run")
    def test_load_mcp_tools_no_async_context(
        self,
        mock_asyncio_run,
        mock_get_loop,
        mock_llm,
        mock_mcp_servers,
        mock_mcp_tools,
    ):
        """Test MCP tools loading without async context (triggered by _load_mcp_tools)."""
        mock_get_loop.side_effect = RuntimeError("No running loop")
        mock_asyncio_run.return_value = mock_mcp_tools

        agent = Agent(
            prompt="You are an MCP testing agent.",
            llm=mock_llm,
            mcp_servers=mock_mcp_servers,
            verbose=True,
        )

        # MCP not loaded yet (lazy)
        assert len(agent._mcp_tools) == 0

        with patch.object(MCPToolAdapter, "from_servers", return_value=mock_mcp_tools):
            agent._load_mcp_tools()

        mock_asyncio_run.assert_called_once()
        assert len(agent._mcp_tools) == 1
        assert isinstance(agent._mcp_tools[0], MockMCPTool)

    def test_setup_and_process_mcp_tools_with_tools(self, mock_llm, mock_mcp_tools):
        """Test processing MCP tools result with tools."""
        agent = Agent(
            prompt="You are a test agent.",
            llm=mock_llm,
            verbose=True,
        )

        # Process tools
        agent._setup_and_process_mcp_tools(mock_mcp_tools)

        # Verify tools were added
        assert len(agent._mcp_tools) == 1
        assert agent._mcp_tools[0] in agent.tools
        assert isinstance(agent._mcp_tools[0], MockMCPTool)

    def test_setup_and_process_mcp_tools_empty(self, mock_llm):
        """Test processing MCP tools result with empty tools."""
        agent = Agent(
            prompt="You are a test agent.",
            llm=mock_llm,
            verbose=True,
        )

        # Process empty tools
        agent._setup_and_process_mcp_tools([])

        # Verify empty result
        assert len(agent._mcp_tools) == 0
        assert len(agent.tools) == 0

    def test_setup_and_process_mcp_tools_none(self, mock_llm):
        """Test processing MCP tools result with None."""
        agent = Agent(prompt="You are a test agent.", llm=mock_llm)

        # Process None tools
        agent._setup_and_process_mcp_tools(None)

        # Verify empty result
        assert len(agent._mcp_tools) == 0

    @patch("langcrew.agent.MCPToolAdapter")
    @pytest.mark.asyncio
    async def test_aload_mcp_tools(
        self, mock_adapter_class, mock_llm, mock_mcp_servers, mock_mcp_tools
    ):
        """Test async MCP tools loading."""
        # Setup mock adapter
        mock_adapter = AsyncMock()
        mock_adapter.from_servers.return_value = mock_mcp_tools
        mock_adapter_class.return_value = mock_adapter

        agent = Agent(
            prompt="You are an async MCP testing agent.",
            llm=mock_llm,
            verbose=True,
        )

        # Load tools asynchronously
        await agent._aload_mcp_tools()

        # Verify adapter was created and used
        mock_adapter_class.assert_called_once_with()
        mock_adapter.from_servers.assert_called_once_with(
            servers=None, tool_filter=None
        )

    def test_mcp_tool_filter_applied(self, mock_llm, mock_mcp_servers):
        """Test that MCP tool filter is properly applied."""
        tool_filter = ["allowed_tool_1", "allowed_tool_2"]

        agent = Agent(
            prompt="You are a filtered MCP agent.",
            llm=mock_llm,
            mcp_servers=mock_mcp_servers,
            mcp_tool_filter=tool_filter,
        )

        assert agent.mcp_tool_filter == tool_filter
        assert agent._lazy_initialized is False

    @patch("langcrew.agent.logger")
    def test_mcp_verbose_logging(self, mock_logger, mock_llm, mock_mcp_tools):
        """Test verbose logging in MCP operations."""
        agent = Agent(
            prompt="You are a verbose MCP agent.",
            llm=mock_llm,
            verbose=True,
        )

        # Test verbose logging in tool processing
        agent._setup_and_process_mcp_tools(mock_mcp_tools)

        # Verify logging was called
        mock_logger.info.assert_called_with(
            f"Loaded {len(mock_mcp_tools)} MCP tools: {[t.name for t in mock_mcp_tools]}"
        )

    def test_mcp_adapter_creation_with_config(
        self, mock_llm, mock_mcp_servers
    ):
        """Test that MCP servers config is properly stored and used."""
        agent = Agent(
            prompt="You are a config MCP agent.",
            llm=mock_llm,
            mcp_servers=mock_mcp_servers,
        )

        # Verify the config was stored correctly
        assert agent.mcp_servers == mock_mcp_servers
        assert (
            agent._mcp_adapter is None
        )  # Not created yet since _load_mcp_tools was mocked

    def test_mcp_tools_integration_with_existing_tools(self, mock_llm):
        """Test MCP tools integration with existing agent tools."""
        existing_tool = Mock(spec=BaseTool)
        existing_tool.name = "existing_tool"

        mcp_tool = MockMCPTool()

        agent = Agent(
            prompt="You are an integration testing agent.",
            llm=mock_llm,
            tools=[existing_tool],
        )

        # Add MCP tools
        agent._setup_and_process_mcp_tools([mcp_tool])

        # Verify both existing and MCP tools are present
        assert len(agent.tools) == 2
        assert existing_tool in agent.tools
        # Check if mcp_tool is in the tools list by name
        tool_names = [t.name if hasattr(t, "name") else str(t) for t in agent.tools]
        assert "mock_mcp_tool" in tool_names

    @patch("langcrew.agent.asyncio.get_running_loop")
    def test_load_mcp_tools_runtime_error_handling(
        self, mock_get_loop, mock_llm, mock_mcp_servers
    ):
        """Test proper handling of runtime errors during MCP loading."""
        mock_get_loop.side_effect = RuntimeError("No loop")

        agent = Agent(
            prompt="You are an error handling agent.",
            llm=mock_llm,
            mcp_servers=mock_mcp_servers,
        )

        # Lazy: agent created without error
        assert agent is not None
        assert agent._lazy_initialized is False

        with patch("langcrew.agent.asyncio.run", return_value=[]):
            agent._load_mcp_tools()

        assert len(agent._mcp_tools) == 0
