"""
Unit tests for langcrew.tools.tool_converter module.

This module tests the ToolConverter functionality including:
- CrewAI ↔ LangChain tool conversion
- Function-based tool creation
- Universal tool detection and conversion
- Batch conversion capabilities
- Error handling and edge cases
"""

import asyncio
from unittest.mock import Mock, patch

import pytest
from crewai.tools import BaseTool as CrewAIBaseTool
from langchain_core.tools import BaseTool as LangChainBaseTool
from pydantic import BaseModel, Field

from langcrew.tools.tool_converter import (
    ToolConverter,
    convert_crewai_tools,
    convert_langchain_tool,
    convert_langchain_tools,
    convert_tools,
    create_crewai_tool_from_function,
)

# =====================================
# Mock Tool Classes for Testing
# =====================================


class MockCrewAITool(CrewAIBaseTool):
    """Mock CrewAI tool for testing synchronous operations."""

    name: str = "mock_crewai_tool"
    description: str = "A mock CrewAI tool for testing"

    def _run(self, query: str = "default") -> str:
        return f"CrewAI result: {query}"


class MockCrewAIToolNoParams(CrewAIBaseTool):
    """Mock CrewAI tool with no parameters."""

    name: str = "mock_crewai_no_params"
    description: str = "A mock CrewAI tool with no parameters"

    def _run(self) -> str:
        return "No params result"


class MockCrewAIToolMultiParams(CrewAIBaseTool):
    """Mock CrewAI tool with multiple parameters."""

    name: str = "mock_crewai_multi_params"
    description: str = "A mock CrewAI tool with multiple parameters"

    def _run(self, query: str, count: int = 1) -> str:
        return f"Multi params result: {query} x {count}"


class AsyncMockCrewAITool(CrewAIBaseTool):
    """Mock async CrewAI tool for testing asynchronous operations."""

    name: str = "async_mock_crewai_tool"
    description: str = "An async mock CrewAI tool for testing"

    def _run(self, query: str = "default") -> str:
        return f"Sync CrewAI result: {query}"

    async def _arun(self, query: str = "default") -> str:
        return f"Async CrewAI result: {query}"


class MockCrewAIToolWithArgsSchema(CrewAIBaseTool):
    """Mock CrewAI tool with explicit args schema."""

    class ArgsSchema(BaseModel):
        query: str = Field(description="Input query")
        limit: int = Field(default=10, description="Result limit")

    name: str = "mock_crewai_with_schema"
    description: str = "A mock CrewAI tool with args schema"
    args_schema: type[BaseModel] = ArgsSchema

    def _run(self, query: str, limit: int = 10) -> str:
        return f"Schema result: {query} (limit: {limit})"


class MockLangChainTool(LangChainBaseTool):
    """Mock LangChain tool for testing."""

    name: str = "mock_langchain_tool"
    description: str = "A mock LangChain tool for testing"

    def _run(self, query: str) -> str:
        return f"LangChain result: {query}"


class AsyncMockLangChainTool(LangChainBaseTool):
    """Mock async LangChain tool for testing."""

    name: str = "async_mock_langchain_tool"
    description: str = "An async mock LangChain tool for testing"

    def _run(self, query: str) -> str:
        return f"Sync LangChain result: {query}"

    async def _arun(self, query: str) -> str:
        return f"Async LangChain result: {query}"


class InvalidTool:
    """Invalid tool class that doesn't inherit from any base tool."""

    name = "invalid_tool"

    def run(self, query: str) -> str:
        return f"Invalid result: {query}"


# =====================================
# Test Fixtures
# =====================================


@pytest.fixture
def mock_crewai_tool():
    """Basic mock CrewAI tool."""
    return MockCrewAITool()


@pytest.fixture
def mock_crewai_tool_no_params():
    """Mock CrewAI tool with no parameters."""
    return MockCrewAIToolNoParams()


@pytest.fixture
def mock_crewai_tool_multi_params():
    """Mock CrewAI tool with multiple parameters."""
    return MockCrewAIToolMultiParams()


@pytest.fixture
def async_mock_crewai_tool():
    """Async mock CrewAI tool."""
    return AsyncMockCrewAITool()


@pytest.fixture
def mock_crewai_tool_with_schema():
    """Mock CrewAI tool with explicit args schema."""
    return MockCrewAIToolWithArgsSchema()


@pytest.fixture
def mock_langchain_tool():
    """Basic mock LangChain tool."""
    return MockLangChainTool()


@pytest.fixture
def async_mock_langchain_tool():
    """Async mock LangChain tool."""
    return AsyncMockLangChainTool()


@pytest.fixture
def invalid_tool():
    """Invalid tool for error testing."""
    return InvalidTool()


@pytest.fixture
def sample_function():
    """Simple test function."""

    def sample_func(query: str) -> str:
        """A sample function for testing."""
        return f"Function result: {query}"

    return sample_func


@pytest.fixture
def async_sample_function():
    """Async test function."""

    async def async_sample_func(query: str) -> str:
        """An async sample function for testing."""
        return f"Async function result: {query}"

    return async_sample_func


@pytest.fixture
def complex_function():
    """Function with complex parameters."""

    def complex_func(query: str, limit: int = 10, enabled: bool = True) -> str:
        """A complex function with multiple parameters."""
        return f"Complex result: {query} (limit={limit}, enabled={enabled})"

    return complex_func


@pytest.fixture
def no_param_function():
    """Function with no parameters."""

    def no_param_func() -> str:
        """A function with no parameters."""
        return "No param result"

    return no_param_func


# =====================================
# Test ToolConverter Class
# =====================================


class TestToolConverterCrewAIConversion:
    """Test CrewAI to LangChain conversion functionality."""

    def test_convert_crewai_tool_basic(self, mock_crewai_tool):
        """Test basic CrewAI tool conversion."""
        result = ToolConverter.convert_crewai_tool(mock_crewai_tool)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)
        assert result.name == "mock_crewai_tool"

        # Test execution
        output = result.run(query="test")
        assert "CrewAI result: test" in output

    def test_convert_crewai_tool_no_params(self, mock_crewai_tool_no_params):
        """Test CrewAI tool with no parameters."""
        result = ToolConverter.convert_crewai_tool(mock_crewai_tool_no_params)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)

        # Test execution with default input schema
        output = result.run(input="ignored")
        assert "No params result" in output

    def test_convert_crewai_tool_multi_params(self, mock_crewai_tool_multi_params):
        """Test CrewAI tool with multiple parameters."""
        result = ToolConverter.convert_crewai_tool(mock_crewai_tool_multi_params)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)

        # Test execution with multiple params
        output = result.run(query="test", count=5)
        assert "Multi params result: test x 5" in output

    def test_convert_crewai_tool_with_schema(self, mock_crewai_tool_with_schema):
        """Test CrewAI tool with explicit args schema."""
        result = ToolConverter.convert_crewai_tool(mock_crewai_tool_with_schema)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)

        # Check that existing schema is preserved
        assert hasattr(result, "args_schema")

    def test_convert_crewai_tool_none_input(self):
        """Test conversion with None input."""
        result = ToolConverter.convert_crewai_tool(None)
        assert result is None

    def test_convert_crewai_tool_invalid_tool(self, invalid_tool):
        """Test conversion with invalid tool."""
        # Should not raise exception but may return None or generic conversion
        ToolConverter.convert_crewai_tool(invalid_tool)
        # The behavior depends on implementation - could be None or a generic wrapper

    def test_convert_crewai_tool_name_extraction(self):
        """Test tool name extraction when name attribute is missing."""

        class NamelessCrewAITool(CrewAIBaseTool):
            def _run(self) -> str:
                return "result"

        tool = NamelessCrewAITool()
        result = ToolConverter.convert_crewai_tool(tool)

        assert result is not None
        # Should use class name as fallback
        assert "NamelessCrewAITool" in result.name

    def test_convert_crewai_tool_description_fallback(self):
        """Test description fallback when description is missing."""

        class NoDescCrewAITool(CrewAIBaseTool):
            name: str = "no_desc_tool"

            def _run(self) -> str:
                return "result"

        tool = NoDescCrewAITool()
        result = ToolConverter.convert_crewai_tool(tool)

        assert result is not None
        assert "no_desc_tool" in result.description


class TestToolConverterCallableConversion:
    """Test callable function to LangChain tool conversion."""

    def test_convert_callable_tool_basic(self, sample_function):
        """Test basic callable function conversion."""
        result = ToolConverter.convert_callable_tool(sample_function)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)
        assert result.name == "sample_func"

        # Test execution
        output = result.run("test")
        assert "Function result: test" in output

    def test_convert_callable_tool_with_custom_name_desc(self, sample_function):
        """Test callable conversion with custom name and description."""
        result = ToolConverter.convert_callable_tool(
            sample_function, name="custom_name", description="Custom description"
        )

        assert result is not None
        assert result.name == "custom_name"
        assert result.description == "Custom description"

    def test_convert_callable_tool_docstring(self, sample_function):
        """Test that function docstring is used as description."""
        result = ToolConverter.convert_callable_tool(sample_function)

        assert result is not None
        assert "A sample function for testing" in result.description

    def test_convert_callable_tool_no_name_func(self):
        """Test callable without __name__ attribute."""

        def lambda_func(x):
            return f"Lambda result: {x}"

        result = ToolConverter.convert_callable_tool(lambda_func)

        assert result is not None
        # Should use default name
        assert "custom_tool" in result.name

    def test_convert_callable_tool_error_handling(self):
        """Test error handling in callable conversion."""

        def error_func(query: str) -> str:
            raise ValueError("Test error")

        result = ToolConverter.convert_callable_tool(error_func)

        assert result is not None
        # Test that errors are caught and handled
        output = result.run("test")
        assert "error" in output.lower()


class TestToolConverterUniversal:
    """Test universal tool conversion functionality."""

    def test_convert_tool_langchain_passthrough(self, mock_langchain_tool):
        """Test that LangChain tools pass through unchanged."""
        result = ToolConverter.convert_tool(mock_langchain_tool)

        assert result is mock_langchain_tool

    def test_convert_tool_crewai_detection(self, mock_crewai_tool):
        """Test CrewAI tool detection and conversion."""
        result = ToolConverter.convert_tool(mock_crewai_tool)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)
        assert result.name == "mock_crewai_tool"

    def test_convert_tool_callable_detection(self, sample_function):
        """Test callable function detection and conversion."""
        result = ToolConverter.convert_tool(sample_function)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)

    def test_convert_tool_none_input(self):
        """Test universal converter with None input."""
        result = ToolConverter.convert_tool(None)
        assert result is None

    def test_convert_tool_unknown_type(self):
        """Test universal converter with unknown type."""
        unknown_obj = {"type": "unknown"}
        ToolConverter.convert_tool(unknown_obj)

        # Should attempt generic conversion or return None
        # Behavior depends on implementation

    def test_convert_tool_object_with_run_method(self):
        """Test object with run method (like CrewAI tool)."""

        class RunMethodTool:
            name = "run_method_tool"
            description = "Tool with run method"

            def run(self, query: str) -> str:
                return f"Run method result: {query}"

        tool = RunMethodTool()
        result = ToolConverter.convert_tool(tool)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)


class TestToolConverterLangChainConversion:
    """Test LangChain to CrewAI conversion functionality."""

    def test_convert_langchain_tool_basic(self, mock_langchain_tool):
        """Test basic LangChain to CrewAI conversion."""
        result = ToolConverter.convert_langchain_tool(mock_langchain_tool)

        assert result is not None
        assert isinstance(result, CrewAIBaseTool)
        assert result.name == "mock_langchain_tool"

        # Test execution
        output = result._run(query="test")
        assert "LangChain result: test" in output

    @pytest.mark.asyncio
    async def test_convert_langchain_tool_async(self, async_mock_langchain_tool):
        """Test async LangChain tool conversion and execution."""
        result = ToolConverter.convert_langchain_tool(async_mock_langchain_tool)

        assert result is not None
        assert isinstance(result, CrewAIBaseTool)

        # Test async execution
        output = await result._arun(query="test")
        assert "Async LangChain result: test" in output

    def test_convert_langchain_tool_name_sanitization(self):
        """Test tool name sanitization."""

        class SpecialNameTool(LangChainBaseTool):
            name: str = "special-name with spaces!"
            description: str = "Tool with special characters in name"

            def _run(self, query: str) -> str:
                return "result"

        tool = SpecialNameTool()
        result = ToolConverter.convert_langchain_tool(tool)

        assert result is not None
        # Name should be sanitized
        assert " " not in result.name
        assert "!" not in result.name

    def test_convert_langchain_tool_error_handling(self):
        """Test error handling in LangChain conversion."""

        class ErrorLangChainTool(LangChainBaseTool):
            name: str = "error_tool"
            description: str = "Tool that raises errors"

            def _run(self, query: str) -> str:
                raise ValueError("Test error")

        tool = ErrorLangChainTool()
        result = ToolConverter.convert_langchain_tool(tool)

        assert result is not None
        # Test that errors are caught and handled
        output = result._run(query="test")
        assert "error" in output.lower()

    def test_convert_langchain_tool_none_input(self):
        """Test LangChain conversion with None input."""
        result = ToolConverter.convert_langchain_tool(None)
        assert result is None


class TestToolConverterUtilities:
    """Test utility methods."""

    def test_sanitize_tool_name_basic(self):
        """Test basic tool name sanitization."""
        result = ToolConverter.sanitize_tool_name("basic_name")
        assert result == "basic_name"

    def test_sanitize_tool_name_special_chars(self):
        """Test sanitization of special characters."""
        result = ToolConverter.sanitize_tool_name("name-with spaces!@#$%")
        assert " " not in result
        assert "!" not in result
        assert "@" not in result

    def test_sanitize_tool_name_empty(self):
        """Test sanitization of empty name."""
        result = ToolConverter.sanitize_tool_name("")
        assert result == "converted_tool"  # fallback name

    def test_sanitize_tool_name_only_special_chars(self):
        """Test sanitization of name with only special characters."""
        result = ToolConverter.sanitize_tool_name("!@#$%")
        assert result == "converted_tool"  # fallback name

    @pytest.mark.parametrize(
        "input_name,expected",
        [
            ("simple_name", "simple_name"),
            ("name-with-dashes", "name_with_dashes"),
            ("name with spaces", "name_with_spaces"),
            ("NAME_WITH_CAPS", "NAME_WITH_CAPS"),
            ("name123", "name123"),
            ("123name", "123name"),
        ],
    )
    def test_sanitize_tool_name_parametrized(self, input_name, expected):
        """Test tool name sanitization with various inputs."""
        result = ToolConverter.sanitize_tool_name(input_name)
        assert result == expected

    def test_create_args_schema_from_langchain_existing_schema(
        self, mock_langchain_tool
    ):
        """Test schema creation when LangChain tool has existing schema."""

        # Mock a tool with existing schema
        class SchemaModel(BaseModel):
            query: str = Field(description="Test query")

        mock_langchain_tool.args_schema = SchemaModel

        result = ToolConverter._create_args_schema_from_langchain(mock_langchain_tool)
        assert result is SchemaModel

    def test_create_args_schema_from_langchain_inference(self):
        """Test schema inference from function signature."""

        class TestTool(LangChainBaseTool):
            name: str = "test_tool"
            description: str = "Test tool"

            def _run(self, query: str, limit: int = 10) -> str:
                return "result"

        tool = TestTool()
        result = ToolConverter._create_args_schema_from_langchain(tool)

        assert result is not None
        # Check that schema includes inferred fields
        fields = result.model_fields
        assert "query" in fields
        assert "limit" in fields

    def test_create_args_schema_from_langchain_default(self):
        """Test default schema creation."""

        class NoSignatureTool(LangChainBaseTool):
            name: str = "no_sig_tool"
            description: str = "Tool without _run method"

        tool = NoSignatureTool()
        result = ToolConverter._create_args_schema_from_langchain(tool)

        assert result is not None
        # Should create default schema
        fields = result.model_fields
        assert "input" in fields


# =====================================
# Test Convenience Functions
# =====================================


class TestConvenienceFunctions:
    """Test convenience functions for tool conversion."""

    def test_convert_tools_mixed_types(
        self, mock_crewai_tool, mock_langchain_tool, sample_function
    ):
        """Test converting a list of mixed tool types."""
        tools = [mock_crewai_tool, mock_langchain_tool, sample_function]
        results = convert_tools(tools)

        assert len(results) == 3
        for result in results:
            assert isinstance(result, LangChainBaseTool)

    def test_convert_tools_empty_list(self):
        """Test converting an empty list."""
        results = convert_tools([])
        assert results == []

    def test_convert_tools_with_none_items(self, mock_crewai_tool):
        """Test converting list with None items."""
        tools = [mock_crewai_tool, None, mock_crewai_tool]
        results = convert_tools(tools)

        # Should skip None items
        assert len(results) == 2
        for result in results:
            assert result is not None

    def test_convert_tools_error_handling(self, mock_crewai_tool):
        """Test error handling in batch conversion."""
        # Create a problematic tool that will cause conversion to fail
        problematic_tool = Mock()
        problematic_tool.name = "problematic"
        # This tool will likely fail conversion but shouldn't crash the batch

        tools = [mock_crewai_tool, problematic_tool]
        results = convert_tools(tools)

        # Should have at least one successful conversion
        assert len(results) >= 1

    def test_convert_crewai_tools_batch(
        self, mock_crewai_tool, mock_crewai_tool_no_params
    ):
        """Test batch conversion of CrewAI tools."""
        tools = [mock_crewai_tool, mock_crewai_tool_no_params]
        results = convert_crewai_tools(tools)

        assert len(results) == 2
        for result in results:
            assert isinstance(result, LangChainBaseTool)

    def test_convert_langchain_tool_single(self, mock_langchain_tool):
        """Test single LangChain tool conversion."""
        result = convert_langchain_tool(mock_langchain_tool)

        assert result is not None
        assert isinstance(result, CrewAIBaseTool)
        assert result.name == "mock_langchain_tool"

    def test_convert_langchain_tool_single_none(self):
        """Test single LangChain tool conversion with None."""
        result = convert_langchain_tool(None)
        assert result is None

    def test_convert_langchain_tools_batch(
        self, mock_langchain_tool, async_mock_langchain_tool
    ):
        """Test batch conversion of LangChain tools."""
        tools = [mock_langchain_tool, async_mock_langchain_tool]
        results = convert_langchain_tools(tools)

        assert len(results) == 2
        for result in results:
            assert isinstance(result, CrewAIBaseTool)

    def test_convert_langchain_tools_empty(self):
        """Test batch conversion of empty LangChain tools list."""
        results = convert_langchain_tools([])
        assert results == []

    def test_convert_langchain_tools_with_failures(self, mock_langchain_tool):
        """Test batch conversion with some failures."""
        # Mock a tool that will fail conversion
        failing_tool = Mock()
        failing_tool.name = "failing_tool"

        tools = [mock_langchain_tool, failing_tool]

        with patch.object(ToolConverter, "convert_langchain_tool") as mock_convert:
            mock_convert.side_effect = [
                Mock(spec=CrewAIBaseTool),  # Success for first tool
                None,  # Failure for second tool
            ]

            results = convert_langchain_tools(tools)

            assert len(results) == 1  # Only successful conversion

    def test_create_crewai_tool_from_function_basic(self, sample_function):
        """Test creating CrewAI tool from function."""
        result = create_crewai_tool_from_function(
            sample_function, name="test_tool", description="Test description"
        )

        assert result is not None
        assert isinstance(result, CrewAIBaseTool)
        assert result.name == "test_tool"
        assert result.description == "Test description"

        # Test execution
        output = result._run(query="test")
        assert "Function result: test" in output

    def test_create_crewai_tool_from_function_name_sanitization(self, sample_function):
        """Test name sanitization in function tool creation."""
        result = create_crewai_tool_from_function(
            sample_function, name="tool with spaces!", description="Test description"
        )

        assert result is not None
        assert " " not in result.name
        assert "!" not in result.name

    @pytest.mark.asyncio
    async def test_create_crewai_tool_from_async_function(self, async_sample_function):
        """Test creating CrewAI tool from async function."""
        result = create_crewai_tool_from_function(
            async_sample_function,
            name="async_test_tool",
            description="Async test description",
        )

        assert result is not None
        assert isinstance(result, CrewAIBaseTool)

        # Test sync execution of async function
        output = result._run(query="test")
        assert "Async function result: test" in output

        # Test async execution
        output = await result._arun(query="test")
        assert "Async function result: test" in output

    def test_create_crewai_tool_from_function_with_schema(self, sample_function):
        """Test creating tool with explicit args schema."""

        class CustomSchema(BaseModel):
            query: str = Field(description="Custom query field")

        result = create_crewai_tool_from_function(
            sample_function,
            name="custom_schema_tool",
            description="Tool with custom schema",
            args_schema=CustomSchema,
        )

        assert result is not None
        assert result.args_schema is CustomSchema

    def test_create_crewai_tool_from_function_complex_params(self, complex_function):
        """Test creating tool from function with complex parameters."""
        result = create_crewai_tool_from_function(
            complex_function, name="complex_tool", description="Complex function tool"
        )

        assert result is not None

        # Test with all parameters
        output = result._run(query="test", limit=5, enabled=False)
        assert "Complex result: test (limit=5, enabled=False)" in output

    def test_create_crewai_tool_from_function_no_params(self, no_param_function):
        """Test creating tool from function with no parameters."""
        result = create_crewai_tool_from_function(
            no_param_function, name="no_param_tool", description="No parameter tool"
        )

        assert result is not None

        # Should use default input schema
        output = result._run(input="ignored")
        assert "No param result" in output


# =====================================
# Test Integration Scenarios
# =====================================


class TestBidirectionalConversion:
    """Test bidirectional tool conversion scenarios."""

    def test_crewai_to_langchain_to_crewai(self, mock_crewai_tool):
        """Test CrewAI → LangChain → CrewAI conversion chain."""
        # Convert CrewAI to LangChain
        langchain_tool = ToolConverter.convert_crewai_tool(mock_crewai_tool)
        assert langchain_tool is not None
        assert isinstance(langchain_tool, LangChainBaseTool)

        # Convert back to CrewAI
        crewai_tool = ToolConverter.convert_langchain_tool(langchain_tool)
        assert crewai_tool is not None
        assert isinstance(crewai_tool, CrewAIBaseTool)

        # Test that functionality is preserved
        mock_crewai_tool._run(query="test")
        final_result = crewai_tool._run(query="test")

        # Should contain the original result (possibly wrapped)
        assert "test" in final_result

    def test_langchain_to_crewai_to_langchain(self, mock_langchain_tool):
        """Test LangChain → CrewAI → LangChain conversion chain."""
        # Convert LangChain to CrewAI
        crewai_tool = ToolConverter.convert_langchain_tool(mock_langchain_tool)
        assert crewai_tool is not None
        assert isinstance(crewai_tool, CrewAIBaseTool)

        # Convert back to LangChain
        langchain_tool = ToolConverter.convert_crewai_tool(crewai_tool)
        assert langchain_tool is not None
        assert isinstance(langchain_tool, LangChainBaseTool)

        # Test that functionality is preserved
        mock_langchain_tool._run(query="test")
        final_result = langchain_tool.run(query="test")

        # Should contain the original result (possibly wrapped)
        assert "test" in final_result

    def test_function_to_crewai_conversion_chain(self, sample_function):
        """Test function → CrewAI tool conversion."""
        # Create CrewAI tool from function
        crewai_tool = create_crewai_tool_from_function(
            sample_function, name="func_tool", description="Function tool"
        )

        assert crewai_tool is not None
        assert isinstance(crewai_tool, CrewAIBaseTool)

        # Test execution matches original function
        original_result = sample_function("test")
        tool_result = crewai_tool._run(query="test")

        assert original_result in tool_result

    @pytest.mark.asyncio
    async def test_async_conversion_chain(self, async_mock_crewai_tool):
        """Test async tool conversion chain."""
        # Convert async CrewAI to LangChain
        langchain_tool = ToolConverter.convert_crewai_tool(async_mock_crewai_tool)
        assert langchain_tool is not None

        # Convert back to CrewAI
        crewai_tool = ToolConverter.convert_langchain_tool(langchain_tool)
        assert crewai_tool is not None

        # Test async execution is preserved
        async_result = await crewai_tool._arun(query="test")
        assert "test" in async_result

    def test_batch_mixed_conversion(
        self, mock_crewai_tool, mock_langchain_tool, sample_function
    ):
        """Test batch conversion of mixed tool types."""
        # Convert all to LangChain format
        langchain_tools = convert_tools([
            mock_crewai_tool,
            mock_langchain_tool,
            sample_function,
        ])
        assert len(langchain_tools) == 3

        # Convert all to CrewAI format
        crewai_tools = convert_langchain_tools(langchain_tools)
        assert len(crewai_tools) == 3

        # Test all tools are functional
        for tool in crewai_tools:
            assert isinstance(tool, CrewAIBaseTool)
            result = tool._run(query="test")
            assert result is not None
            assert "test" in result


# =====================================
# Test Edge Cases and Error Handling
# =====================================


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_tool_names(self):
        """Test tools with empty names."""

        class EmptyNameTool(CrewAIBaseTool):
            name: str = ""
            description: str = "Tool with empty name"

            def _run(self) -> str:
                return "result"

        tool = EmptyNameTool()
        result = ToolConverter.convert_crewai_tool(tool)

        assert result is not None
        # Should handle empty name gracefully
        assert len(result.name) > 0

    def test_special_characters_in_names(self):
        """Test tools with special characters in names."""

        class SpecialCharTool(CrewAIBaseTool):
            name: str = "tool-name_with!special@chars#$%"
            description: str = "Tool with special characters"

            def _run(self) -> str:
                return "result"

        tool = SpecialCharTool()
        result = ToolConverter.convert_crewai_tool(tool)

        assert result is not None
        # Name should be sanitized but not empty
        assert len(result.name) > 0
        # Should not contain problematic characters
        assert "@" not in result.name
        assert "#" not in result.name

    @pytest.mark.asyncio
    async def test_async_function_in_sync_context(self, async_sample_function):
        """Test async function execution in sync context."""
        result = create_crewai_tool_from_function(
            async_sample_function,
            name="async_sync_test",
            description="Async function in sync",
        )

        assert result is not None

        # Should be able to run async function synchronously
        output = result._run(query="test")
        assert "Async function result: test" in output

    def test_sync_function_in_async_context(self, sample_function):
        """Test sync function execution in async context."""
        result = create_crewai_tool_from_function(
            sample_function,
            name="sync_async_test",
            description="Sync function in async",
        )

        assert result is not None

        async def test_async_execution():
            output = await result._arun(query="test")
            assert "Function result: test" in output

        # Run the async test
        asyncio.run(test_async_execution())

    def test_malformed_tool_objects(self):
        """Test handling of malformed tool objects."""

        # Tool with missing required methods
        class MalformedTool:
            name = "malformed"
            description = "Malformed tool"
            # Missing _run method

        tool = MalformedTool()
        ToolConverter.convert_tool(tool)

        # Should handle gracefully (return None or generic wrapper)
        # Exact behavior depends on implementation

    def test_tools_with_none_attributes(self):
        """Test tools with None attributes."""

        class NoneAttributesTool(CrewAIBaseTool):
            name: str = "none_attrs_tool"
            description = None  # None description

            def _run(self) -> str:
                return "result"

        tool = NoneAttributesTool()
        result = ToolConverter.convert_crewai_tool(tool)

        assert result is not None
        # Should handle None description gracefully
        assert result.description is not None
        assert len(result.description) > 0

    def test_circular_conversion_stability(self, mock_crewai_tool):
        """Test that multiple conversions don't degrade functionality."""
        original_tool = mock_crewai_tool

        # Multiple conversion cycles
        for i in range(3):
            # CrewAI → LangChain
            langchain_tool = ToolConverter.convert_crewai_tool(original_tool)
            assert langchain_tool is not None

            # LangChain → CrewAI
            crewai_tool = ToolConverter.convert_langchain_tool(langchain_tool)
            assert crewai_tool is not None

            # Test functionality is preserved
            result = crewai_tool._run(query="stability_test")
            assert "stability_test" in result

            original_tool = crewai_tool

    def test_exception_propagation_and_logging(self, mock_crewai_tool):
        """Test that exceptions are properly handled and logged."""
        with patch("langcrew.tools.tool_converter.logger"):
            # Force an exception during conversion
            with patch.object(
                mock_crewai_tool, "_run", side_effect=Exception("Test exception")
            ):
                result = ToolConverter.convert_crewai_tool(mock_crewai_tool)
                assert result is not None

                # Test that execution error is handled
                output = result.run(query="test")
                assert "error" in output.lower()

    def test_memory_efficiency_with_large_batch(self):
        """Test memory efficiency with large batches."""
        # Create a large number of mock tools
        tools = []
        for i in range(100):

            class BatchTool(CrewAIBaseTool):
                name: str = f"batch_tool_{i}"
                description: str = f"Batch tool number {i}"

                def _run(self) -> str:
                    return f"result_{i}"

            tools.append(BatchTool())

        # Convert all tools
        results = convert_tools(tools)

        assert len(results) == 100
        # Spot check a few results
        for i in [0, 49, 99]:
            assert isinstance(results[i], LangChainBaseTool)
            assert f"batch_tool_{i}" in results[i].name

    @pytest.mark.parametrize(
        "invalid_input",
        [
            "",  # Empty string
            123,  # Number
            [],  # List
            {},  # Dict
            object(),  # Generic object
        ],
    )
    def test_convert_tool_with_invalid_inputs(self, invalid_input):
        """Test convert_tool with various invalid inputs."""
        ToolConverter.convert_tool(invalid_input)

        # Should handle gracefully - exact behavior depends on implementation
        # Most likely returns None or attempts generic conversion

    def test_concurrent_tool_conversion(self, mock_crewai_tool):
        """Test thread safety of tool conversion."""
        import concurrent.futures

        results = []
        errors = []

        def convert_tool_safely(tool, index):
            try:
                result = ToolConverter.convert_crewai_tool(tool)
                if result:
                    output = result.run(query=f"test_{index}")
                    results.append(output)
            except Exception as e:
                errors.append(e)

        # Run multiple conversions concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for i in range(20):
                future = executor.submit(convert_tool_safely, mock_crewai_tool, i)
                futures.append(future)

            # Wait for all to complete
            concurrent.futures.wait(futures)

        # Should have successful results and no errors
        assert len(results) == 20
        assert len(errors) == 0

        # All results should contain expected content
        for i, result in enumerate(results):
            assert f"test_{i}" in result or "CrewAI result" in result


# =====================================
# Test Performance and Benchmarks
# =====================================


class TestPerformance:
    """Test performance characteristics."""

    def test_conversion_performance(self, mock_crewai_tool):
        """Test that tool conversion is reasonably fast."""
        import time

        start_time = time.time()

        # Convert the same tool multiple times
        for _ in range(100):
            result = ToolConverter.convert_crewai_tool(mock_crewai_tool)
            assert result is not None

        end_time = time.time()
        duration = end_time - start_time

        # Should complete 100 conversions in under 1 second
        assert duration < 1.0, f"Conversion took {duration:.2f}s, expected < 1.0s"

    def test_batch_conversion_efficiency(self):
        """Test that batch conversion is more efficient than individual conversion."""
        tools = []
        for i in range(50):

            class PerfTool(CrewAIBaseTool):
                name: str = f"perf_tool_{i}"
                description: str = f"Performance test tool {i}"

                def _run(self) -> str:
                    return f"result_{i}"

            tools.append(PerfTool())

        import time

        # Time batch conversion
        start_time = time.time()
        batch_results = convert_tools(tools)
        batch_duration = time.time() - start_time

        # Time individual conversions
        start_time = time.time()
        individual_results = []
        for tool in tools:
            result = ToolConverter.convert_tool(tool)
            if result:
                individual_results.append(result)
        individual_duration = time.time() - start_time

        # Results should be equivalent
        assert len(batch_results) == len(individual_results) == 50

        # Note: Batch might not always be faster due to overhead,
        # but it should be comparable and not significantly slower
        # This is more of a regression test than a strict performance requirement
        assert batch_duration < individual_duration * 2, (
            f"Batch conversion ({batch_duration:.3f}s) much slower than individual ({individual_duration:.3f}s)"
        )
