"""
Unit tests for MCP (Model Context Protocol) tools.
"""

import pytest
from langchain_core.tools import BaseTool


class MockMCPTool(BaseTool):
    """Mock MCP tool for testing."""

    name: str = "mock_calculator"
    description: str = "A mock calculator tool"

    def _run(self, a: int, b: int) -> int:
        """Synchronous execution not supported."""
        raise NotImplementedError("Use async version")

    async def _arun(self, a: int, b: int) -> int:
        """Add two numbers."""
        return a + b


class TestMCPTool:
    """Test MCP tool functionality."""

    @pytest.mark.asyncio
    async def test_mcp_tool_execution(self):
        """Test MCP tool async execution."""
        tool = MockMCPTool()

        result = await tool._arun(a=5, b=3)
        assert result == 8

    def test_mcp_tool_interface(self):
        """Test MCP tool interface."""
        tool = MockMCPTool()

        assert tool.name == "mock_calculator"
        assert tool.description == "A mock calculator tool"
        assert isinstance(tool, BaseTool)

    @pytest.mark.asyncio
    async def test_mcp_tool_error_handling(self):
        """Test MCP tool error handling."""
        tool = MockMCPTool()

        # Test sync execution raises error
        with pytest.raises(NotImplementedError):
            tool._run(1, 2)

        # Test async execution works
        result = await tool._arun(1, 2)
        assert result == 3


class TestMCPToolFilter:
    """Test MCP tool filtering functionality."""

    def test_tool_filter_logic(self):
        """Test tool filtering logic."""
        tools = [MockMCPTool()]

        # Simulate tool filtering
        def filter_tools(tools, tool_filter=None):
            if tool_filter:
                return [t for t in tools if t.name in tool_filter]
            return tools

        # Test no filter - returns all tools
        result = filter_tools(tools)
        assert len(result) == 1

        # Test filter excludes tool
        result = filter_tools(tools, tool_filter=["other_tool"])
        assert len(result) == 0

        # Test filter includes tool
        result = filter_tools(tools, tool_filter=["mock_calculator"])
        assert len(result) == 1
