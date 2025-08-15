"""
MCP Tool Adapter Module

This module provides a simplified adapter class for converting MCP servers and tools
to LangChain-compatible tools.
"""

import logging
from typing import Any

from langchain_core.documents.base import Blob
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient

# Setup logger
logger = logging.getLogger(__name__)


class MCPToolAdapter:
    """Simplified adapter for converting MCP servers to LangChain tools"""

    def __init__(self):
        self._client = None

    async def from_servers(
        self,
        servers: dict[str, dict[str, Any]],
        tool_filter: list[str] | None = None,
    ) -> list[BaseTool]:
        """
        Create LangChain tools from MCP server configurations

        Args:
            servers: Dictionary of server configurations
            tool_filter: Optional list of tool names to include

        Returns:
            List of LangChain tools
        """
        # Create MCP client
        self._client = MultiServerMCPClient(servers)

        # Get all tools
        all_tools = []

        for server_name in servers:
            if self.config.debug:
                logger.debug(f"Loading tools from server: {server_name}")

            try:
                # Get tools from specific server
                server_tools = await self._client.get_tools(server_name=server_name)
            except Exception as e:
                raise ConnectionError(
                    f"Failed to load tools from server '{server_name}': {str(e)}"
                )

            # Process each tool
            for tool in server_tools:
                # Apply tool filter
                if tool_filter and tool.name not in tool_filter:
                    continue
                # Add tool directly without security wrapper
                all_tools.append(tool)

        return all_tools

    async def get_prompts(
        self,
        server_name: str,
        prompt_name: str,
        arguments: dict[str, Any] | None = None,
    ) -> list[HumanMessage | AIMessage]:
        """Get prompts from MCP server"""
        if self._client is None:
            raise RuntimeError("No MCP client initialized. Call from_servers() first.")

        return await self._client.get_prompt(
            server_name, prompt_name, arguments=arguments
        )

    async def get_resources(
        self,
        server_name: str,
        uris: str | list[str] | None = None,
    ) -> list[Blob]:
        """Get resources from MCP server"""
        if self._client is None:
            raise RuntimeError("No MCP client initialized. Call from_servers() first.")

        return await self._client.get_resources(server_name, uris=uris)
