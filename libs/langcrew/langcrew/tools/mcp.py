"""
MCP Tool Adapter - A minimal wrapper for langchain_mcp_adapters.

Simplified adapter to convert MCP (Model Context Protocol) servers
to LangChain-compatible tools with callbacks and interceptors support.
"""

import logging
import re
from typing import Any

from langchain_core.documents.base import Blob
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.callbacks import Callbacks
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import ToolCallInterceptor
from pydantic import BaseModel, Field, create_model

# Setup logger
logger = logging.getLogger(__name__)


class SanitizedTool(BaseTool):
    """Wrapper for MCP tools to sanitize parameter names for LLM compatibility.

    Claude and some LLMs require parameter names to match '^[a-zA-Z0-9_.-]{1,64}$'.
    This wrapper maps sanitized names back to original names before execution.
    """

    original_tool: BaseTool = Field(exclude=True)
    name_mapping: dict[str, str] = Field(default_factory=dict, exclude=True)

    def __init__(self, original_tool: BaseTool, name_mapping: dict[str, str], **kwargs):
        # We need to compute args_schema first
        super().__init__(
            original_tool=original_tool,
            name_mapping=name_mapping,
            name=original_tool.name,
            description=original_tool.description,
            **kwargs,
        )

    @classmethod
    def from_tool(cls, tool: BaseTool) -> BaseTool:
        """Create a SanitizedTool if it has invalid parameter names."""
        if not tool.args_schema:
            return tool

        original_schema = tool.args_schema
        # Determine properties from schema (could be Pydantic V2, V1, or dict)
        if isinstance(original_schema, dict):
            properties = original_schema.get("properties", {})
        elif hasattr(original_schema, "model_json_schema"):
            properties = original_schema.model_json_schema().get("properties", {})
        elif hasattr(original_schema, "schema"):
            properties = original_schema.schema().get("properties", {})
        else:
            # Fallback to tool.args if schema type is unknown
            try:
                properties = tool.args
            except Exception:
                return tool

        if not properties:
            return tool

        name_mapping = {}
        sanitized_fields = {}
        needs_sanitization = False

        for name, info in properties.items():
            # Check if name matches pattern '^[a-zA-Z0-9_.-]{1,64}$'
            if not re.match(r"^[a-zA-Z0-9_.-]{1,64}$", name):
                needs_sanitization = True
                # Sanitize: replace illegal characters with underscores
                sanitized_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", name)
                # Pydantic doesn't allow field names starting with underscores
                if sanitized_name.startswith("_"):
                    sanitized_name = f"p{sanitized_name}"
                # Handle name collisions
                base_sanitized_name = sanitized_name
                counter = 1
                while (
                    sanitized_name in sanitized_fields
                    or sanitized_name in properties
                    and sanitized_name != name
                ):
                    sanitized_name = f"{base_sanitized_name}_{counter}"
                    counter += 1

                name_mapping[sanitized_name] = name
            else:
                sanitized_name = name

            # Extract type and field info from the original schema
            if hasattr(original_schema, "model_fields"):
                field_info = original_schema.model_fields.get(name)
                if field_info:
                    sanitized_fields[sanitized_name] = (
                        field_info.annotation,
                        field_info,
                    )
                else:
                    sanitized_fields[sanitized_name] = (Any, Field())
            else:
                # Fallback for dict schemas: try to infer basic type
                param_type = Any
                desc = ""
                if isinstance(info, dict):
                    json_type = info.get("type")
                    desc = info.get("description", "")
                    if json_type == "string":
                        param_type = str
                    elif json_type == "integer":
                        param_type = int
                    elif json_type == "number":
                        param_type = float
                    elif json_type == "boolean":
                        param_type = bool

                sanitized_fields[sanitized_name] = (param_type, Field(description=desc))

        if not needs_sanitization:
            return tool

        # Create new schema with sanitized names
        schema_name = "SanitizedSchema"
        if hasattr(original_schema, "__name__"):
            schema_name = f"Sanitized{original_schema.__name__}"

        new_schema = create_model(
            schema_name,
            **sanitized_fields,
            __base__=BaseModel,
        )

        return cls(
            original_tool=tool,
            name_mapping=name_mapping,
            args_schema=new_schema,
        )

    def _map_args(self, kwargs: dict[str, Any]) -> dict[str, Any]:
        """Map sanitized names back to original names."""
        mapped_args = {}
        for k, v in kwargs.items():
            original_name = self.name_mapping.get(k, k)
            mapped_args[original_name] = v
        return mapped_args

    def _run(self, *args: Any, **kwargs: Any) -> Any:
        return self.original_tool._run(*args, **self._map_args(kwargs))

    async def _arun(self, *args: Any, **kwargs: Any) -> Any:
        return await self.original_tool._arun(*args, **self._map_args(kwargs))


class MCPToolAdapter:
    """Minimal adapter for converting MCP servers to LangChain tools.

    Wraps MultiServerMCPClient with callbacks and interceptors support.

    Example:
        >>> adapter = MCPToolAdapter()
        >>> tools = await adapter.from_servers(servers_config)
    """

    def __init__(
        self,
        callbacks: Callbacks | None = None,
        tool_interceptors: list[ToolCallInterceptor] | None = None,
    ):
        """Initialize adapter with optional callbacks and interceptors.

        Args:
            callbacks: Event callbacks (logging, progress).
            tool_interceptors: Request/response modifiers.
        """
        self._client: MultiServerMCPClient | None = None
        self._callbacks = callbacks
        self._tool_interceptors = tool_interceptors

    async def from_servers(
        self,
        servers: dict[str, dict[str, Any]],
        tool_filter: list[str] | None = None,
    ) -> list[BaseTool]:
        """Create LangChain tools from MCP server configurations.

        Args:
            servers: MCP server configs with command/args/url/transport.
            tool_filter: Optional tool names to include.

        Returns:
            List of LangChain-compatible tools.
        """
        # Create MCP client with callbacks and interceptors
        client = MultiServerMCPClient(
            connections=servers,
            callbacks=self._callbacks,
            tool_interceptors=self._tool_interceptors,
        )
        self._client = client

        # Get all tools
        all_tools = []

        for server_name in servers:
            # Get tools from specific server
            server_tools = await client.get_tools(server_name=server_name)

            # Process each tool
            for tool in server_tools:
                # Apply tool filter
                if tool_filter and tool.name not in tool_filter:
                    continue
                # Sanitize tool parameters for Claude compatibility
                sanitized_tool = SanitizedTool.from_tool(tool)
                all_tools.append(sanitized_tool)

        return all_tools

    async def get_prompts(
        self,
        server_name: str,
        prompt_name: str,
        arguments: dict[str, Any] | None = None,
    ) -> list[HumanMessage | AIMessage]:
        """Get prompts from MCP server.

        Args:
            server_name: MCP server name.
            prompt_name: Prompt name to retrieve.
            arguments: Optional prompt arguments.

        Returns:
            List of messages from the prompt.

        Raises:
            RuntimeError: If client not initialized.
        """
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
        """Get resources from MCP server.

        Args:
            server_name: MCP server name.
            uris: Optional resource URI(s).

        Returns:
            List of resource blobs.

        Raises:
            RuntimeError: If client not initialized.
        """
        if self._client is None:
            raise RuntimeError("No MCP client initialized. Call from_servers() first.")

        return await self._client.get_resources(server_name, uris=uris)
