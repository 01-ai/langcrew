"""
Comprehensive tests for HITLToolWrapper functionality.

This test suite covers:
1. Model copy approach for tool attribute preservation
2. Thread ID extraction and execution isolation
3. Interrupt before/after logic with user feedback
4. Prevention of duplicate tool execution
5. Execution cache management
6. Schema preservation and validation
"""

import asyncio
from unittest.mock import patch

import pytest
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool
from pydantic import BaseModel, Field

from langcrew.hitl.config import HITLConfig
from langcrew.hitl.tool_wrapper import HITLToolWrapper


class SearchInput(BaseModel):
    """Input schema for search tool"""

    query: str = Field(description="Search query")
    limit: int = Field(default=10, description="Number of results")


class CustomTool(BaseTool):
    """Custom tool with additional attributes"""

    name: str = "custom_search"
    description: str = "Search for information"
    args_schema: type[BaseModel] = SearchInput
    custom_attr: str = "custom_value"
    return_direct: bool = True
    handle_tool_error: bool = False

    def _run(self, query: str, limit: int = 10, config: RunnableConfig = None) -> str:
        return f"Search results for '{query}' (limit: {limit})"

    async def _arun(
        self, query: str, limit: int = 10, config: RunnableConfig = None
    ) -> str:
        return f"Async search results for '{query}' (limit: {limit})"


@tool
def simple_search(query: str, limit: int = 10) -> str:
    """Simple search tool created with @tool decorator"""
    return f"Simple search: {query} (limit: {limit})"


class TestHITLToolWrapper:
    """Comprehensive tests for HITLToolWrapper functionality"""

    @pytest.fixture
    def hitl_config(self):
        """Create HITL config for testing"""
        return HITLConfig(
            interrupt_before_tools=["custom_search"],
            interrupt_after_tools=["simple_search"],
        )

    @pytest.fixture
    def hitl_wrapper(self, hitl_config):
        """Create HITLToolWrapper instance"""
        return HITLToolWrapper(hitl_config)

    def test_custom_tool_attributes_preserved(self, hitl_wrapper):
        """Test that all custom tool attributes are preserved with model_copy"""
        original_tool = CustomTool()

        wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        # Test basic attributes
        assert wrapped_tool.name == original_tool.name
        assert wrapped_tool.description == original_tool.description

        # Test schema preservation
        assert wrapped_tool.args_schema == original_tool.args_schema
        assert wrapped_tool.args_schema == SearchInput

        # Test custom attributes
        assert wrapped_tool.custom_attr == original_tool.custom_attr
        assert wrapped_tool.custom_attr == "custom_value"

        # Test tool configuration attributes
        assert wrapped_tool.return_direct == original_tool.return_direct
        assert wrapped_tool.handle_tool_error == original_tool.handle_tool_error

        # Test that it's a different instance
        assert wrapped_tool is not original_tool
        assert id(wrapped_tool) != id(original_tool)

    def test_tool_decorator_attributes_preserved(self, hitl_wrapper):
        """Test that @tool decorated tools preserve all attributes"""
        original_tool = simple_search

        wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        # Test basic attributes
        assert wrapped_tool.name == original_tool.name
        assert wrapped_tool.description == original_tool.description

        # Test args_schema preservation
        if hasattr(original_tool, "args_schema") and original_tool.args_schema:
            assert wrapped_tool.args_schema == original_tool.args_schema

        # Test that it's a different instance
        assert wrapped_tool is not original_tool

    def test_schema_generation_works(self, hitl_wrapper):
        """Test that schema generation works correctly for wrapped tools"""
        original_tool = CustomTool()

        wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        # Test schema generation
        original_schema = original_tool.args_schema.model_json_schema()
        wrapped_schema = wrapped_tool.args_schema.model_json_schema()

        assert original_schema == wrapped_schema

        # Test that schema contains expected fields
        assert "query" in wrapped_schema["properties"]
        assert "limit" in wrapped_schema["properties"]
        assert wrapped_schema["properties"]["query"]["description"] == "Search query"

    @pytest.mark.asyncio
    async def test_execution_with_thread_id(self, hitl_wrapper):
        """Test tool execution with thread_id extraction"""
        original_tool = CustomTool()

        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"approved": True}

            wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
            wrapped_tool = wrapped_tools[0]

            config = RunnableConfig(configurable={"thread_id": "test_thread_123"})

            result = await wrapped_tool._arun(
                query="test query", limit=5, config=config
            )

            # Should execute without errors
            assert "test query" in result
            assert "limit: 5" in result

    def test_no_interrupt_tools_unchanged(self, hitl_wrapper):
        """Test that tools not requiring interrupt are returned unchanged"""
        # Create a tool that doesn't need interrupts
        hitl_config = HITLConfig(
            interrupt_before_tools=[],
            interrupt_after_tools=[],
        )
        wrapper = HITLToolWrapper(hitl_config)

        original_tool = CustomTool()
        wrapped_tools = wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        # Should be the same instance (no wrapping needed)
        assert wrapped_tool is original_tool

    def test_thread_id_extraction_and_isolation(self, hitl_wrapper):
        """Test thread_id extraction and execution isolation"""
        original_tool = CustomTool()
        wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        execution_ids = []

        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"approved": True}

            # Test different thread_id scenarios
            configs = [
                RunnableConfig(configurable={"thread_id": "session_001"}),
                RunnableConfig(configurable={"thread_id": "session_002"}),
                None,  # Should default to "default"
            ]

            for config in configs:
                asyncio.run(wrapped_tool._arun(query="test", config=config))

                # Capture execution_id from interrupt call
                if mock_interrupt.call_count > 0:
                    call_data = mock_interrupt.call_args[0][0]
                    execution_ids.append(call_data["execution_id"])
                    mock_interrupt.reset_mock()

        # Verify different thread_ids generate different execution_ids
        assert len(set(execution_ids)) == 3, "Should have 3 unique execution_ids"
        assert execution_ids[0].startswith("session_001_")
        assert execution_ids[1].startswith("session_002_")
        assert execution_ids[2].startswith("default_")

    def test_args_schema_validation(self, hitl_wrapper):
        """Test that args_schema validation works correctly"""
        original_tool = CustomTool()

        wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        # Test that validation still works
        assert wrapped_tool.args_schema == SearchInput

        # Test schema validation
        valid_input = {"query": "test", "limit": 5}
        validated = SearchInput(**valid_input)
        assert validated.query == "test"
        assert validated.limit == 5

        # Test that wrapped tool can use the schema
        if hasattr(wrapped_tool.args_schema, "model_validate"):
            validated_wrapped = wrapped_tool.args_schema.model_validate(valid_input)
            assert validated_wrapped.query == "test"
            assert validated_wrapped.limit == 5

    def test_method_replacement_works(self, hitl_wrapper):
        """Test that _arun and _run methods are properly replaced"""
        original_tool = CustomTool()

        wrapped_tools = hitl_wrapper.wrap_tools([original_tool])
        wrapped_tool = wrapped_tools[0]

        # Test that methods exist
        assert hasattr(wrapped_tool, "_arun")
        assert hasattr(wrapped_tool, "_run")

        # Test that they're different from original
        assert wrapped_tool._arun != original_tool._arun
        assert wrapped_tool._run != original_tool._run

        # Test that helper methods were added
        assert hasattr(wrapped_tool, "_parse_user_response")
        assert hasattr(wrapped_tool, "_process_user_feedback")

    @pytest.mark.asyncio
    async def test_interrupt_before_logic(self):
        """Test interrupt before functionality"""
        tool = CustomTool()
        config = HITLConfig(interrupt_before_tools=["custom_search"])
        wrapper = HITLToolWrapper(config)
        wrapped_tool = wrapper.wrap_tools([tool])[0]

        # Test user approval
        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"approved": True}

            result = await wrapped_tool._arun(query="test")

            assert mock_interrupt.call_count == 1
            assert "test" in result

            # Verify interrupt call structure
            call_data = mock_interrupt.call_args[0][0]
            assert call_data["type"] == "tool_interrupt_before"
            assert call_data["tool"]["name"] == "custom_search"
            assert call_data["tool"]["args"]["query"] == "test"

        # Test user denial
        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"approved": False, "reason": "User denied"}

            result = await wrapped_tool._arun(query="denied")

            assert mock_interrupt.call_count == 1
            assert "Tool execution denied" in result

    @pytest.mark.asyncio
    async def test_interrupt_after_logic(self):
        """Test interrupt after functionality"""
        tool = simple_search  # This tool is configured for interrupt after
        config = HITLConfig(interrupt_after_tools=["simple_search"])
        wrapper = HITLToolWrapper(config)
        wrapped_tool = wrapper.wrap_tools([tool])[0]

        # Test result acceptance
        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"approved": True}

            result = await wrapped_tool._arun(query="test")

            assert mock_interrupt.call_count == 1
            assert "test" in result

            # Verify interrupt call structure
            call_data = mock_interrupt.call_args[0][0]
            assert call_data["type"] == "tool_interrupt_after"
            assert call_data["tool"]["name"] == "simple_search"
            assert "test" in call_data["tool"]["result"]

        # Test result modification
        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {
                "approved": True,
                "modified_result": "Modified by user",
            }

            result = await wrapped_tool._arun(query="modify")

            assert mock_interrupt.call_count == 1
            assert result == "Modified by user"

    @pytest.mark.asyncio
    async def test_both_interrupts_no_duplicate_execution(self):
        """Test that tool executes only once with both before and after interrupts"""
        tool = CustomTool()
        config = HITLConfig(
            interrupt_before_tools=["custom_search"],
            interrupt_after_tools=["custom_search"],
        )
        wrapper = HITLToolWrapper(config)
        wrapped_tool = wrapper.wrap_tools([tool])[0]

        interrupt_responses = [
            {"approved": True},  # Before interrupt
            {"approved": True},  # After interrupt
        ]

        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.side_effect = interrupt_responses

            result = await wrapped_tool._arun(query="both")

            # Should call interrupt twice (before and after)
            assert mock_interrupt.call_count == 2

            # Verify call types
            before_call = mock_interrupt.call_args_list[0][0][0]
            after_call = mock_interrupt.call_args_list[1][0][0]

            assert before_call["type"] == "tool_interrupt_before"
            assert after_call["type"] == "tool_interrupt_after"

            # Both should have the same execution_id (same execution)
            assert before_call["execution_id"] == after_call["execution_id"]

            # Tool should execute normally
            assert "both" in result

    def test_cache_cleanup(self):
        """Test that execution cache is properly cleaned up"""
        tool = CustomTool()
        config = HITLConfig(interrupt_before_tools=["custom_search"])
        wrapper = HITLToolWrapper(config)
        wrapped_tool = wrapper.wrap_tools([tool])[0]

        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"approved": True}

            initial_cache_size = len(wrapper._execution_cache)

            # Execute tool
            asyncio.run(wrapped_tool._arun(query="cache_test"))

            # Cache should be cleaned up after execution
            final_cache_size = len(wrapper._execution_cache)
            assert final_cache_size == initial_cache_size

    @pytest.mark.asyncio
    async def test_comprehensive_workflow(self):
        """Comprehensive end-to-end test of HITL workflow"""

        # Create tool with execution counter to verify no duplicate execution
        class TrackedTool(BaseTool):
            name: str = "tracked_tool"
            description: str = "Tool with execution tracking"
            execution_count: int = 0

            def _run(self, query: str, config: RunnableConfig = None) -> str:
                self.execution_count += 1
                return f"Execution #{self.execution_count}: {query}"

            async def _arun(self, query: str, config: RunnableConfig = None) -> str:
                self.execution_count += 1
                return f"Async execution #{self.execution_count}: {query}"

        tool = TrackedTool()

        # Configure both before and after interrupts
        config = HITLConfig(
            interrupt_before_tools=["tracked_tool"],
            interrupt_after_tools=["tracked_tool"],
        )
        wrapper = HITLToolWrapper(config)
        wrapped_tool = wrapper.wrap_tools([tool])[0]

        # Mock user interactions: approve both interrupts, modify result
        interrupt_responses = [
            {"approved": True},  # Approve before interrupt
            {
                "approved": True,
                "modified_result": "Final modified result",
            },  # Modify result after
        ]

        with patch("langcrew.hitl.tool_wrapper.interrupt") as mock_interrupt:
            mock_interrupt.side_effect = interrupt_responses

            # Execute with thread_id
            config_with_thread = RunnableConfig(
                configurable={"thread_id": "comprehensive_test"}
            )
            result = await wrapped_tool._arun(
                query="test_query", config=config_with_thread
            )

            # Verify comprehensive workflow
            assert mock_interrupt.call_count == 2

            # Verify before interrupt was called with original parameters
            before_call = mock_interrupt.call_args_list[0][0][0]
            assert before_call["type"] == "tool_interrupt_before"
            assert before_call["tool"]["name"] == "tracked_tool"
            assert before_call["tool"]["args"]["query"] == "test_query"
            assert before_call["execution_id"].startswith("comprehensive_test_")

            # Verify after interrupt was called with tool result
            after_call = mock_interrupt.call_args_list[1][0][0]
            assert after_call["type"] == "tool_interrupt_after"
            assert after_call["tool"]["name"] == "tracked_tool"
            assert (
                "test_query" in after_call["tool"]["result"]
            )  # Tool executed with original params

            # Verify same execution_id for both interrupts
            assert before_call["execution_id"] == after_call["execution_id"]

            # Verify final result is user-modified
            assert result == "Final modified result"

            # Verify tool executed only once (no duplicate execution)
            assert tool.execution_count == 1

            # Verify cache is cleaned up
            assert len(wrapper._execution_cache) == 0
