"""
MCP Tool Adapter Module

This module provides the main adapter class for converting MCP servers and tools
to LangChain-compatible tools with security validation.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any

from langchain_core.documents.base import Blob
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient

from .config import MCPConfig
from .exceptions import (
    MCPConnectionException,
    MCPException,
    MCPSecurityException,
)
from .fingerprint import MCPFingerprint
from .security import MCPSecurityValidator

# Setup logger
logger = logging.getLogger(__name__)


class SecureMCPTool(BaseTool):
    """Secure wrapper for MCP tools with validation and monitoring"""

    @staticmethod
    def enhance_tool(
        tool: BaseTool,
        validator: MCPSecurityValidator,
        config: MCPConfig,
        server_name: str,
    ) -> BaseTool:
        """
        Enhance tool with security features by modifying the original tool directly
        instead of creating a wrapper layer
        """
        # Save original methods
        original_arun = tool._arun

        # Create secure execution methods with closures
        async def secure_arun(**kwargs) -> str:
            """Async execution with security validation"""
            try:
                # 0. Validate session if enabled
                if config.security.enable_session_management:
                    adapter = kwargs.pop("_adapter_instance", None)
                    if adapter and adapter.session_id:
                        is_valid, new_session_id = (
                            validator.session_manager.validate_session(
                                adapter.session_id, adapter.client_fingerprint
                            )
                        )
                        if not is_valid:
                            raise MCPSecurityException("Invalid or expired session")
                        if new_session_id:
                            adapter.session_id = new_session_id

                # 1. Check user consent for dangerous operations
                if (
                    config.security.enable_user_consent
                    and SecureMCPTool._requires_consent(tool.name, kwargs)
                ):
                    validator.check_user_consent(
                        action=f"tool_execution:{tool.name}",
                        details={"tool": tool.name, "args": kwargs},
                    )

                # 2. Execute original tool method
                result = await original_arun(**kwargs)

                # 3. Update metrics
                if not hasattr(tool, "_mcp_call_count"):
                    tool._mcp_call_count = 0
                tool._mcp_call_count += 1
                tool._mcp_last_call_time = datetime.now()

                return str(result)

            except Exception as e:
                # Re-raise or wrap exception based on config
                if config.fail_on_error:
                    raise
                else:
                    return f"Error executing tool {tool.name}: {str(e)}"

        def secure_run(**kwargs) -> str:
            """Sync execution wrapper"""
            return asyncio.run(secure_arun(**kwargs))

        # Replace tool methods directly
        tool._arun = secure_arun
        tool._run = secure_run

        # Add MCP-related attributes
        tool._mcp_enhanced = True
        tool._mcp_server_name = server_name
        tool._mcp_config = config
        tool._mcp_validator = validator

        return tool

    @staticmethod
    def _requires_consent(tool_name: str, args: dict[str, Any]) -> bool:
        """Check if the operation requires user consent"""
        # File write operations
        if tool_name in ["write_file", "delete_file", "move_file"]:
            return True

        # Network operations
        if tool_name in ["http_request", "api_call"]:
            return True

        # System commands
        if tool_name in ["execute_command", "run_script"]:
            return True

        # Check for sensitive paths
        for key in ["path", "file", "directory"]:
            if key in args:
                path = str(args[key])
                if any(sensitive in path for sensitive in [".ssh", ".aws", "private"]):
                    return True

        return False


class MCPToolAdapter:
    """Adapter for converting MCP servers to LangChain tools with security"""

    def __init__(self, config: MCPConfig | None = None):
        """
        Initialize MCP Tool Adapter

        Args:
            config: MCP configuration. If None, uses production defaults.
        """
        self.config = config or MCPConfig()
        self.validator = MCPSecurityValidator(self.config.security)
        self._client = None
        self._tool_cache = {}
        self._cache_timestamp = None

        # Create client fingerprint based on session management configuration
        if self.config.security.enable_session_management:
            # Create fingerprint with session capabilities
            self.client_fingerprint = MCPFingerprint.create_with_session(
                ttl_seconds=self.config.security.session_timeout
            )
            self.session_id = self.validator.session_manager.create_session(
                self.client_fingerprint, metadata={"adapter_version": "1.0.0"}
            )
        else:
            # Create basic fingerprint for identification only
            self.client_fingerprint = MCPFingerprint()
            self.session_id = None

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
            List of secure LangChain tools
        """
        # Check cache first
        if self._should_use_cache(servers):
            if self.config.debug:
                logger.debug("Using cached tools")
            return list(self._tool_cache.values())

        # Create MCP client
        self._client = MultiServerMCPClient(servers)

        # Get all tools
        all_tools = []

        for server_name in servers:
            try:
                if self.config.debug:
                    logger.debug(f"Loading tools from server: {server_name}")

                # Get tools from specific server
                server_tools = await self._client.get_tools(server_name=server_name)

                # Process each tool
                for tool in server_tools:
                    # Apply tool filter
                    if tool_filter and tool.name not in tool_filter:
                        continue

                    # Wrap with security
                    secure_tool = self._wrap_tool(tool, server_name)
                    all_tools.append(secure_tool)

                    if self.config.debug:
                        logger.debug(f"Loaded tool: {tool.name}")

            except Exception as e:
                error_msg = (
                    f"Failed to load tools from server '{server_name}': {str(e)}"
                )
                if self.config.fail_on_error:
                    raise MCPConnectionException(error_msg, server_name=server_name)
                else:
                    if self.config.debug:
                        logger.error(error_msg)
                    continue

        # Update cache
        if self.config.cache_tools:
            self._update_cache(all_tools, servers)

        return all_tools

    async def from_mcp_tools(
        self,
        tools: list[Any],
        session: Any,
        server_name: str = "unknown",
    ) -> list[BaseTool]:
        """
        Convert a list of MCP tools to secure LangChain tools

        Args:
            tools: List of MCP tools
            session: MCP client session
            server_name: Name of the server for audit purposes

        Returns:
            List of secure LangChain tools
        """
        secure_tools = []

        for tool in tools:
            # Convert to LangChain tool
            try:
                # Import here to avoid circular dependencies
                from langchain_mcp_adapters.tools import (
                    convert_mcp_tool_to_langchain_tool,
                )

                langchain_tool = convert_mcp_tool_to_langchain_tool(
                    session=session,
                    tool=tool,
                )

                # Wrap with security
                secure_tool = self._wrap_tool(langchain_tool, server_name)
                secure_tools.append(secure_tool)

            except Exception as e:
                if self.config.fail_on_error:
                    raise
                else:
                    if self.config.debug:
                        logger.error(f"Failed to wrap tool {tool.name}: {str(e)}")
                    continue

        return secure_tools

    def _wrap_tool(self, tool: BaseTool, server_name: str) -> BaseTool:
        """Enhance tool with security validation"""
        # Return original tool if all security features are disabled
        if (
            not self.config.security.enable_user_consent
            and not self.config.security.enable_session_management
        ):
            return tool

        # Enhance tool using SecureMCPTool (no new instance created)
        return SecureMCPTool.enhance_tool(
            tool=tool,
            validator=self.validator,
            config=self.config,
            server_name=server_name,
        )

    def _should_use_cache(self, servers: dict[str, dict[str, Any]]) -> bool:
        """Check if cached tools should be used"""
        if not self.config.cache_tools or not self._tool_cache:
            return False

        if self._cache_timestamp is None:
            return False

        # Check cache age
        cache_age = (datetime.now() - self._cache_timestamp).total_seconds()
        if cache_age > self.config.tool_cache_ttl:
            return False

        # For now, we don't check if server config changed
        # This could be improved in the future
        return True

    def _update_cache(
        self, tools: list[BaseTool], servers: dict[str, dict[str, Any]] | None = None
    ):
        """Update tool cache"""
        self._tool_cache = {tool.name: tool for tool in tools}
        self._cache_timestamp = datetime.now()

    def clear_cache(self):
        """Clear tool cache"""
        self._tool_cache = {}
        self._cache_timestamp = None

    async def get_prompts(
        self,
        server_name: str,
        prompt_name: str,
        arguments: dict[str, Any] | None = None,
    ) -> list[HumanMessage | AIMessage]:
        """Get prompts from MCP server"""
        if self._client is None:
            raise MCPException("No MCP client initialized. Call from_servers() first.")

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
            raise MCPException("No MCP client initialized. Call from_servers() first.")

        return await self._client.get_resources(server_name, uris=uris)

    def grant_consent(self, action: str, details: dict[str, Any]):
        """Grant user consent for an action"""
        self.validator.grant_consent(action, details)

    async def cleanup(self):
        """Cleanup resources"""
        # Clear cache
        self.clear_cache()

        # Note: The MCP client doesn't expose a cleanup method,
        # but it uses context managers internally for sessions
        self._client = None
