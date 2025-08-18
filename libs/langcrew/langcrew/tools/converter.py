"""
Tool Converter Module for LangCrew

This module provides unified functionality to convert between various tool formats:
- CrewAI tools ↔ LangChain tools (bidirectional conversion)
- Function-based tools to both formats
- Batch conversion capabilities

Supports compatibility with LangGraph's create_react_agent and CrewAI's agent system.
"""

import asyncio
import inspect
import logging
import re
from collections.abc import Callable
from typing import Any

from crewai.tools import BaseTool as CrewAIBaseTool
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
        callable_tool: Callable, name: str = None, description: str = None
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
    def convert_langchain_tool(
        langchain_tool: LangChainBaseTool,
    ) -> CrewAIBaseTool | None:
        """
        Convert a LangChain tool to CrewAI tool format.

        Args:
            langchain_tool: LangChain tool instance

        Returns:
            CrewAIBaseTool: Converted CrewAI tool or None if conversion fails
        """
        try:
            # Extract tool metadata
            tool_name = langchain_tool.name
            tool_description = (
                langchain_tool.description
                or f"Converted from LangChain tool: {tool_name}"
            )

            # Sanitize tool name
            clean_name = ToolConverter.sanitize_tool_name(tool_name)

            # Create args schema from LangChain tool
            args_schema = ToolConverter._create_args_schema_from_langchain(
                langchain_tool
            )

            # Create dynamic CrewAI tool class
            class LangChainWrappedTool(CrewAIBaseTool):
                def _run(self, **kwargs) -> str:
                    """Execute LangChain tool (synchronous)"""
                    try:
                        # If LangChain tool has _run method, call it directly
                        if hasattr(langchain_tool, "_run"):
                            if len(kwargs) == 1:
                                return str(
                                    langchain_tool._run(list(kwargs.values())[0])
                                )
                            else:
                                return str(langchain_tool._run(**kwargs))
                        # If it has run method, call run
                        elif hasattr(langchain_tool, "run"):
                            if len(kwargs) == 1:
                                return str(langchain_tool.run(list(kwargs.values())[0]))
                            else:
                                return str(langchain_tool.run(**kwargs))
                        # If the tool is callable
                        elif callable(langchain_tool):
                            return str(langchain_tool(**kwargs))
                        else:
                            return (
                                f"Error: Unable to execute LangChain tool {tool_name}"
                            )
                    except Exception as e:
                        return f"Error executing LangChain tool {tool_name}: {str(e)}"

                async def _arun(self, **kwargs) -> str:
                    """Execute LangChain tool (asynchronous)"""
                    try:
                        # If LangChain tool has _arun method, call it directly
                        if hasattr(langchain_tool, "_arun"):
                            if len(kwargs) == 1:
                                result = await langchain_tool._arun(
                                    list(kwargs.values())[0]
                                )
                            else:
                                result = await langchain_tool._arun(**kwargs)
                            return str(result)
                        # If it has arun method, call arun
                        elif hasattr(langchain_tool, "arun"):
                            if len(kwargs) == 1:
                                result = await langchain_tool.arun(
                                    list(kwargs.values())[0]
                                )
                            else:
                                result = await langchain_tool.arun(**kwargs)
                            return str(result)
                        # If only synchronous method exists, run in executor
                        else:
                            loop = asyncio.get_event_loop()
                            result = await loop.run_in_executor(
                                None, lambda: self._run(**kwargs)
                            )
                            return str(result)
                    except Exception as e:
                        return f"Error executing LangChain tool {tool_name} (async): {str(e)}"

            # Create tool instance
            converted_tool = LangChainWrappedTool(
                name=clean_name,
                description=tool_description,
                args_schema=args_schema,
            )

            logger.info(f"Successfully converted LangChain tool: {tool_name}")
            return converted_tool

        except Exception as e:
            logger.error(f"Failed to convert LangChain tool {langchain_tool}: {str(e)}")
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


# Convenience function for direct import
def convert_crewai_tools(crewai_tools: list[Any]) -> list[LangChainBaseTool]:
    """
    Convenience function specifically for converting CrewAI tools.

    Args:
        crewai_tools: List of CrewAI tools

    Returns:
        List of converted LangChain tools
    """
    return convert_tools(crewai_tools)


# Convenience functions for LangChain to CrewAI conversion
def convert_langchain_tool(langchain_tool: LangChainBaseTool) -> CrewAIBaseTool | None:
    """
    Convenience function to convert a single LangChain tool to CrewAI tool

    Args:
        langchain_tool: The LangChain tool to convert

    Returns:
        Converted CrewAI tool
    """
    return ToolConverter.convert_langchain_tool(langchain_tool)


def convert_langchain_tools(
    langchain_tools: list[LangChainBaseTool],
) -> list[CrewAIBaseTool]:
    """
    Convenience function to batch convert LangChain tools to CrewAI tools

    Args:
        langchain_tools: List of LangChain tools

    Returns:
        List of converted CrewAI tools
    """
    converted_tools = []
    for langchain_tool in langchain_tools:
        converted_tool = ToolConverter.convert_langchain_tool(langchain_tool)
        if converted_tool:
            converted_tools.append(converted_tool)
        else:
            logger.warning(f"Failed to convert tool: {langchain_tool.name}")

    logger.info(
        f"Successfully converted {len(converted_tools)} out of {len(langchain_tools)} LangChain tools"
    )
    return converted_tools


def create_crewai_tool_from_function(
    func: Callable,
    name: str,
    description: str,
    args_schema: type[BaseModel] | None = None,
) -> CrewAIBaseTool:
    """
    Convenience method to create CrewAI tool from function

    Args:
        func: Function to wrap
        name: Tool name
        description: Tool description
        args_schema: Arguments schema (optional)

    Returns:
        CrewAI tool
    """
    # Sanitize tool name using the unified logic
    clean_name = ToolConverter.sanitize_tool_name(name)

    class FunctionTool(CrewAIBaseTool):
        def _run(self, **kwargs) -> str:
            try:
                if asyncio.iscoroutinefunction(func):
                    raise RuntimeError(
                        "In an sync context async tasks cannot be called"
                    )
                return str(func(**kwargs))
            except Exception as e:
                return f"Error executing function tool: {str(e)}"

        async def _arun(self, **kwargs) -> str:
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(**kwargs)
                else:
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(None, lambda: func(**kwargs))
                return str(result)
            except Exception as e:
                return f"Error executing function tool (async): {str(e)}"

    # If no args_schema is provided, try to create from function signature
    if args_schema is None:
        sig = inspect.signature(func)
        fields = {}

        for param_name, param in sig.parameters.items():
            param_type = (
                param.annotation if param.annotation != inspect.Parameter.empty else str
            )
            has_default = param.default != inspect.Parameter.empty

            if has_default:
                fields[param_name] = (
                    param_type,
                    Field(default=param.default, description=f"Parameter {param_name}"),
                )
            else:
                fields[param_name] = (
                    param_type,
                    Field(description=f"Parameter {param_name}"),
                )

        if fields:
            args_schema = create_model(f"{clean_name}Args", **fields)
        else:
            args_schema = create_model(
                f"{clean_name}Args", input=(str, Field(description="Tool input"))
            )

    return FunctionTool(
        name=clean_name, description=description, args_schema=args_schema
    )


# Example usage and testing utilities
def test_tool_conversion():
    """
    Test function to validate bidirectional tool conversion functionality.
    """
    print("Testing unified tool conversion...")

    # Test CrewAI → LangChain conversion
    def simple_tool_func(query: str) -> str:
        """A simple test tool."""
        return f"Processed: {query}"

    converted_langchain = ToolConverter.convert_callable_tool(simple_tool_func)
    if converted_langchain:
        print(
            f"✓ Successfully converted callable to LangChain tool: {converted_langchain.name}"
        )
        try:
            result = converted_langchain.run("test input")
            print(f"  LangChain test result: {result}")
        except Exception as e:
            print(f"  LangChain test failed: {e}")

    # Test LangChain → CrewAI conversion
    if converted_langchain:
        converted_crewai = convert_langchain_tool(converted_langchain)
        print(
            f"✓ Successfully converted LangChain to CrewAI tool: {converted_crewai.name}"
        )
        try:
            result = converted_crewai._run(query="reverse test")
            print(f"  CrewAI test result: {result}")
        except Exception as e:
            print(f"  CrewAI test failed: {e}")

    # Test function-based CrewAI tool creation
    crewai_func_tool = create_crewai_tool_from_function(
        simple_tool_func,
        name="test_function_tool",
        description="Test tool created from function",
    )
    print(f"✓ Successfully created CrewAI tool from function: {crewai_func_tool.name}")

    print("Tool conversion tests completed.")


if __name__ == "__main__":
    # Run tests when module is executed directly
    print("LangCrew Unified Tool Converter")
    print("=" * 50)
    print("Available conversion functions:")
    print("• CrewAI → LangChain:")
    print("  - convert_crewai_tools(tools) - Batch convert")
    print("  - ToolConverter.convert_tool(tool) - Single convert")
    print("• LangChain → CrewAI:")
    print("  - convert_langchain_tool(tool) - Single convert")
    print("  - convert_langchain_tools(tools) - Batch convert")
    print("  - ToolConverter.convert_langchain_tool() - Static method")
    print("• Function → CrewAI:")
    print("  - create_crewai_tool_from_function() - Create from function")
    print("=" * 50)
    test_tool_conversion()
