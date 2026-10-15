"""
Tool Converter Module for LangCrew

This module provides unified functionality to convert between various tool formats:
- CrewAI tools ↔ LangChain tools (bidirectional conversion)
- Function-based tools to both formats
- Batch conversion capabilities

Supports compatibility with LangGraph's create_react_agent and CrewAI's agent system.
"""

import inspect
import logging
import re
from collections.abc import Callable
from typing import Any

from langchain_core.tools import BaseTool as LangChainBaseTool
from langchain_core.tools import tool
from pydantic import BaseModel, Field, create_model

logger = logging.getLogger(__name__)


class ToolConverter:
    """
    Converts various tool formats to LangChain BaseTool format.

    Supports:
    - CrewAI tools (with _run or run methods)
    - LangChain BaseTool (pass-through)
    - Callable functions
    - Custom tool objects with specific interfaces
    """

    @staticmethod
    def convert_crewai_tool(crewai_tool: Any) -> LangChainBaseTool | None:
        """
        Convert a CrewAI tool to LangChain BaseTool format.

        Args:
            crewai_tool: CrewAI tool instance

        Returns:
            BaseTool: Converted LangChain tool or None if conversion fails
        """
        try:
            # Extract tool metadata
            tool_name = getattr(crewai_tool, "name", None)
            if not tool_name:
                tool_name = crewai_tool.__class__.__name__

            tool_description = getattr(crewai_tool, "description", None)
            if not tool_description:
                tool_description = f"Tool: {tool_name}"

            # Get the tool's arguments schema if available
            args_schema = getattr(crewai_tool, "args_schema", None)

            # Create dynamic args schema based on actual tool signature
            def create_dynamic_args_schema():
                """Create args schema based on actual tool signature."""
                if args_schema:
                    # Use existing schema if available
                    return args_schema

                if hasattr(crewai_tool, "_run"):
                    try:
                        import inspect

                        from pydantic import create_model

                        sig = inspect.signature(crewai_tool._run)
                        params = {
                            name: param
                            for name, param in sig.parameters.items()
                            if name != "self"
                            and param.kind != inspect.Parameter.VAR_KEYWORD
                        }

                        if not params:
                            # Default schema for no-parameter tools
                            return create_model(
                                f"{tool_name}Args",
                                input=(str, Field(description="Tool input")),
                            )

                        # Create schema based on actual parameters
                        schema_fields = {}
                        for param_name, param in params.items():
                            param_type = (
                                param.annotation
                                if param.annotation != inspect.Parameter.empty
                                else str
                            )
                            has_default = param.default != inspect.Parameter.empty

                            if has_default:
                                schema_fields[param_name] = (
                                    param_type,
                                    Field(
                                        default=param.default,
                                        description=f"Parameter: {param_name}",
                                    ),
                                )
                            else:
                                schema_fields[param_name] = (
                                    param_type,
                                    Field(description=f"Parameter: {param_name}"),
                                )

                        return create_model(f"{tool_name}Args", **schema_fields)

                    except Exception as e:
                        logger.warning(
                            f"Failed to create dynamic schema for {tool_name}: {e}"
                        )

                # Fallback to generic schema
                from pydantic import create_model

                return create_model(
                    f"{tool_name}Args", input=(str, Field(description="Tool input"))
                )

            # Get dynamic schema
            dynamic_schema = create_dynamic_args_schema()

            # Create wrapper function that preserves the original tool's interface
            def tool_wrapper(**kwargs) -> str:
                """Wrapper function for CrewAI tool execution with dynamic parameter mapping."""
                try:
                    # Try different execution methods
                    if hasattr(crewai_tool, "_run"):
                        # Use reflection to check actual parameter requirements
                        import inspect

                        sig = inspect.signature(crewai_tool._run)
                        params = {
                            name: param
                            for name, param in sig.parameters.items()
                            if name != "self"
                            and param.kind != inspect.Parameter.VAR_KEYWORD
                        }

                        # Check if method has **kwargs parameter
                        has_var_keyword = any(
                            param.kind == inspect.Parameter.VAR_KEYWORD
                            for param in sig.parameters.values()
                        )

                        if not params and not has_var_keyword:
                            # No parameters expected
                            result = crewai_tool._run()
                        elif not params and has_var_keyword:
                            # **kwargs method - pass all parameters directly
                            result = crewai_tool._run(**kwargs)
                        elif len(params) == 1:
                            # Single parameter - get its actual name
                            param_name = next(iter(params.keys()))

                            # Fixed parameter value extraction logic
                            if param_name in kwargs:
                                param_value = kwargs[param_name]
                            elif kwargs:
                                param_value = next(iter(kwargs.values()))
                            else:
                                param_value = ""

                            result = crewai_tool._run(**{param_name: param_value})
                        else:
                            # Multiple parameters - pass all available kwargs
                            filtered_kwargs = {
                                k: v for k, v in kwargs.items() if k in params
                            }
                            result = crewai_tool._run(**filtered_kwargs)

                    elif hasattr(crewai_tool, "run"):
                        # For .run method, try to pass the first available value
                        value = next(iter(kwargs.values())) if kwargs else ""
                        result = crewai_tool.run(value)
                    elif callable(crewai_tool):
                        value = next(iter(kwargs.values())) if kwargs else ""
                        result = crewai_tool(value)
                    else:
                        return f"Tool {tool_name} execution method not found"

                    # Ensure result is a string
                    return str(result) if result is not None else ""

                except Exception as e:
                    error_msg = f"Error executing {tool_name}: {str(e)}"
                    logger.error(error_msg)
                    return error_msg

            # Clean tool name to match pattern ^[a-zA-Z0-9_-]+$
            # Replace spaces and other invalid characters with underscores
            clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", tool_name)
            tool_wrapper.__name__ = clean_name

            # Create LangChain tool using decorator with dynamic schema
            langchain_tool = tool(
                clean_name,  # use cleaned name that matches pattern
                description=tool_description,
                args_schema=dynamic_schema,  # use dynamically generated schema
            )(tool_wrapper)

            logger.info(f"Successfully converted CrewAI tool: {tool_name}")
            return langchain_tool

        except Exception as e:
            logger.error(f"Failed to convert CrewAI tool {crewai_tool}: {str(e)}")
            return None

    @staticmethod
    def convert_callable_tool(
        callable_tool: Callable, name: str | None = None, description: str | None = None
    ) -> LangChainBaseTool | None:
        """
        Convert a callable function to LangChain BaseTool format.

        Args:
            callable_tool: Callable function
            name: Optional tool name (defaults to function name)
            description: Optional tool description (defaults to function docstring)

        Returns:
            BaseTool: Converted LangChain tool or None if conversion fails
        """
        try:
            tool_name = name or getattr(callable_tool, "__name__", "custom_tool")
            tool_description = description or getattr(
                callable_tool, "__doc__", f"Custom tool: {tool_name}"
            )

            # Clean up description
            if tool_description:
                tool_description = tool_description.strip()
            else:
                tool_description = f"Custom tool: {tool_name}"

            # Clean tool name to match pattern ^[a-zA-Z0-9_-]+$
            clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", tool_name)

            # Use the tool decorator
            langchain_tool = tool(
                clean_name,  # use cleaned name that matches pattern
                description=tool_description,
            )(callable_tool)

            logger.info(f"Successfully converted callable tool: {tool_name}")
            return langchain_tool

        except Exception as e:
            logger.error(f"Failed to convert callable tool: {str(e)}")
            return None

    @staticmethod
    def convert_tool(tool_obj: Any) -> LangChainBaseTool | None:
        """
        Universal tool converter that automatically detects tool type and converts accordingly.

        Args:
            tool_obj: Tool object of any supported format

        Returns:
            BaseTool: Converted LangChain tool or None if conversion fails
        """
        if tool_obj is None:
            return None

        # Already a LangChain BaseTool
        if isinstance(tool_obj, LangChainBaseTool):
            logger.debug(
                f"Tool {getattr(tool_obj, 'name', 'unknown')} is already a BaseTool"
            )
            return tool_obj

        # CrewAI tool (has _run or run method)
        if hasattr(tool_obj, "_run") or hasattr(tool_obj, "run"):
            return ToolConverter.convert_crewai_tool(tool_obj)

        # Callable function
        if callable(tool_obj):
            return ToolConverter.convert_callable_tool(tool_obj)

        # Unknown tool format
        logger.warning(
            f"Unknown tool format: {type(tool_obj)}, attempting generic conversion"
        )

        # Try to extract basic info and create a wrapper
        try:
            tool_name = getattr(tool_obj, "name", tool_obj.__class__.__name__)
            tool_description = getattr(tool_obj, "description", f"Tool: {tool_name}")

            def generic_wrapper(query: str = "") -> str:
                try:
                    if callable(tool_obj):
                        result = tool_obj(query)
                    else:
                        return f"Tool {tool_name} is not callable"
                    return str(result)
                except Exception as e:
                    return f"Error executing {tool_name}: {str(e)}"

            # Clean tool name to match pattern ^[a-zA-Z0-9_-]+$
            clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", tool_name)
            generic_wrapper.__name__ = clean_name

            return tool(
                clean_name,  # use cleaned name that matches pattern
                description=tool_description,
            )(generic_wrapper)

        except Exception as e:
            logger.error(
                f"Failed to convert unknown tool format {type(tool_obj)}: {str(e)}"
            )
            return None

    @staticmethod
    def _create_args_schema_from_langchain(
        langchain_tool: LangChainBaseTool,
    ) -> type[BaseModel]:
        """
        Create arguments schema from LangChain tool.

        Args:
            langchain_tool: The LangChain tool

        Returns:
            Pydantic model class for arguments schema
        """
        if hasattr(langchain_tool, "args_schema") and langchain_tool.args_schema:
            return langchain_tool.args_schema

        # If no args_schema is defined, try to infer from function signature
        if hasattr(langchain_tool, "_run"):
            try:
                sig = inspect.signature(langchain_tool._run)
                fields = {}

                for param_name, param in sig.parameters.items():
                    if param_name == "self":
                        continue

                    param_type = (
                        param.annotation
                        if param.annotation != inspect.Parameter.empty
                        else str
                    )
                    has_default = param.default != inspect.Parameter.empty

                    if has_default:
                        fields[param_name] = (
                            param_type,
                            Field(
                                default=param.default,
                                description=f"Parameter {param_name}",
                            ),
                        )
                    else:
                        fields[param_name] = (
                            param_type,
                            Field(description=f"Parameter {param_name}"),
                        )

                if fields:
                    return create_model(f"{langchain_tool.name}Args", **fields)
            except Exception as e:
                logger.warning(
                    f"Failed to create schema from signature for {langchain_tool.name}: {e}"
                )

        # Default schema
        return create_model(
            f"{langchain_tool.name}Args", input=(str, Field(description="Tool input"))
        )

    @staticmethod
    def sanitize_tool_name(name: str) -> str:
        """
        Sanitize tool name to ensure it meets requirements for both CrewAI and LangChain.

        Args:
            name: Original tool name

        Returns:
            Sanitized tool name
        """
        # Remove special characters, replace with underscores
        sanitized = re.sub(r"[^\w\s-]", "_", name.strip())
        sanitized = re.sub(r"[-\s]+", "_", sanitized)
        sanitized = sanitized.strip("_")

        # Ensure it's not empty
        if not sanitized:
            sanitized = "converted_tool"

        return sanitized


def convert_tools(tools: list[Any]) -> list[LangChainBaseTool]:
    """
    Convert a list of tools to LangChain BaseTool format.

    Args:
        tools: List of tools in various formats

    Returns:
        List[BaseTool]: List of converted LangChain tools
    """
    converted_tools = []

    for i, tool_obj in enumerate(tools):
        try:
            converted_tool = ToolConverter.convert_tool(tool_obj)
            if converted_tool:
                converted_tools.append(converted_tool)
            else:
                logger.warning(
                    f"Tool at index {i} could not be converted and was skipped"
                )
        except Exception as e:
            logger.error(f"Error converting tool at index {i}: {str(e)}")

    logger.info(
        f"Successfully converted {len(converted_tools)} out of {len(tools)} tools"
    )
    return converted_tools
