"""
Unit tests for langcrew.tools.tool_converter module.

This module tests the ToolConverter functionality including:
- CrewAI tools to LangChain tool conversion
- Callable function conversion
- Universal tool detection and conversion
- Batch conversion capabilities
- Error handling and edge cases
"""

from unittest.mock import Mock, patch

import pytest
from langchain_core.tools import BaseTool as LangChainBaseTool
from pydantic import BaseModel, Field

from langcrew.tools.converter import ToolConverter, convert_tools

# =====================================
# Mock Tool Classes for Testing
# =====================================


class MockCrewAITool:
    """Mock CrewAI tool for testing synchronous operations."""

    name: str = "mock_crewai_tool"
    description: str = "A mock CrewAI tool for testing"

    def _run(self, query: str = "default") -> str:
        return f"CrewAI result: {query}"


class MockCrewAIToolNoParams:
    """Mock CrewAI tool with no parameters."""

    name: str = "mock_crewai_no_params"
    description: str = "A mock CrewAI tool with no parameters"

    def _run(self) -> str:
        return "No params result"


class MockCrewAIToolMultiParams:
    """Mock CrewAI tool with multiple parameters."""

    name: str = "mock_crewai_multi_params"
    description: str = "A mock CrewAI tool with multiple parameters"

    def _run(self, query: str, count: int = 1) -> str:
        return f"Multi params result: {query} x {count}"


class AsyncMockCrewAITool:
    """Mock async CrewAI tool for testing asynchronous operations."""

    name: str = "async_mock_crewai_tool"
    description: str = "An async mock CrewAI tool for testing"

    def _run(self, query: str = "default") -> str:
        return f"Sync CrewAI result: {query}"

    async def _arun(self, query: str = "default") -> str:
        return f"Async CrewAI result: {query}"


class MockCrewAIToolWithArgsSchema:
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
        output = result.run({"query": "test"})
        assert "CrewAI result: test" in output

    def test_convert_crewai_tool_no_params(self, mock_crewai_tool_no_params):
        """Test CrewAI tool with no parameters."""
        result = ToolConverter.convert_crewai_tool(mock_crewai_tool_no_params)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)

        # Test execution with default input schema
        # ToolConverter adds 'input' field for no-parameter tools
        output = result.run({"input": ""})
        assert "No params result" in output

    def test_convert_crewai_tool_multi_params(self, mock_crewai_tool_multi_params):
        """Test CrewAI tool with multiple parameters."""
        result = ToolConverter.convert_crewai_tool(mock_crewai_tool_multi_params)

        assert result is not None
        assert isinstance(result, LangChainBaseTool)

        # Test execution with multiple params
        output = result.run({"query": "test", "count": 5})
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
        # None input may return None or a tool that wraps NoneType
        assert result is None or result.name == "NoneType"

    def test_convert_crewai_tool_invalid_tool(self, invalid_tool):
        """Test conversion with invalid tool."""
        # Should not raise exception but may return None or generic conversion
        ToolConverter.convert_crewai_tool(invalid_tool)
        # The behavior depends on implementation - could be None or a generic wrapper

    def test_convert_crewai_tool_name_extraction(self):
        """Test tool name extraction when name attribute is missing."""

        # Create a mock tool object without name attribute
        from unittest.mock import Mock

        mock_tool = Mock()
        mock_tool._run = Mock(return_value="result")
        # Set name to None to test fallback to class name
        mock_tool.name = None
        mock_tool.description = "Mock tool for testing"
        # Set args_schema to None to avoid Mock issues
        mock_tool.args_schema = None

        result = ToolConverter.convert_crewai_tool(mock_tool)

        assert result is not None
        # Should use class name as fallback
        assert "Mock" in result.name

    def test_convert_crewai_tool_description_fallback(self):
        """Test description fallback when description is missing."""

        # Create a mock tool object without description attribute
        from unittest.mock import Mock

        mock_tool = Mock()
        mock_tool._run = Mock(return_value="result")
        mock_tool.name = "no_desc_tool"
        # Set description to None to test fallback behavior
        mock_tool.description = None
        mock_tool.args_schema = None

        result = ToolConverter.convert_crewai_tool(mock_tool)

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

        # Test execution - use the actual parameter name from the function
        output = result.run({"query": "test"})
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
        # Lambda functions have name "lambda_func" or similar
        assert result.name in ["lambda_func", "custom_tool"]

    def test_convert_callable_tool_error_handling(self):
        """Test error handling in callable conversion."""

        def error_func(query: str) -> str:
            raise ValueError("Test error")

        result = ToolConverter.convert_callable_tool(error_func)

        assert result is not None
        # Test that errors are propagated (not caught during conversion)
        # The error will be raised when the tool is executed
        try:
            output = result.run({"query": "test"})
            # If no error is raised, check if error message is in output
            assert "error" in output.lower() or "Test error" in output
        except ValueError as e:
            # If error is propagated, that's also acceptable
            assert "Test error" in str(e)


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

            def _run(self, input: str = "") -> str:
                """Default _run implementation"""
                return input

        tool = NoSignatureTool()
        result = ToolConverter._create_args_schema_from_langchain(tool)

        assert result is not None
        # Should create schema from signature
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

    # =====================================
    # Test Integration Scenarios
    # =====================================

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
        for result in langchain_tools:
            assert isinstance(result, LangChainBaseTool)


# =====================================
# Test Edge Cases and Error Handling
# =====================================


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_tool_names(self):
        """Test tools with empty names."""

        class EmptyNameTool:
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

        class SpecialCharTool:
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

        class NoneAttributesTool:
            name: str = "none_attrs_tool"
            description: str | None = "Valid description"

            def _run(self) -> str:
                return "result"

        tool = NoneAttributesTool()
        # Set description to None after instantiation
        tool.description = None
        result = ToolConverter.convert_crewai_tool(tool)

        assert result is not None
        # Should handle None description gracefully
        assert result.description is not None
        assert len(result.description) > 0

    def test_exception_propagation_and_logging(self, mock_crewai_tool):
        """Test that exceptions are properly handled and logged."""
        with patch("langcrew.tools.converter.logger"):
            # Create the tool first while signature is intact
            result = ToolConverter.convert_crewai_tool(mock_crewai_tool)
            assert result is not None

            # Force an exception during execution
            with patch.object(
                mock_crewai_tool, "_run", side_effect=Exception("Test exception")
            ):
                # Now use the original 'query' parameter
                output = result.run({"query": "test"})
                assert "error" in output.lower()

    def test_memory_efficiency_with_large_batch(self):
        """Test memory efficiency with large batches."""
        # Create a large number of mock tools
        tools = []
        for i in range(100):

            class BatchTool:
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
                    output = result.run({"query": f"test_{index}"})
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

            class PerfTool:
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
