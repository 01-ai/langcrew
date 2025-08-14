"""
Unit tests for PromptBuilder class.

These tests verify the functionality of the PromptBuilder class
for formatting prompts with agent and task information.
"""

from unittest.mock import Mock, PropertyMock, patch

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool

from langcrew.prompt_builder import PromptBuilder


class TestPromptBuilder:
    """Test cases for PromptBuilder class."""

    def test_initialization_default(self):
        """Test default initialization with inject_current_time=True."""
        builder = PromptBuilder()

        assert builder.inject_current_time is True
        assert builder.system_template is not None
        assert builder.user_template is not None

    def test_initialization_custom(self):
        """Test custom initialization with inject_current_time=False."""
        builder = PromptBuilder(inject_current_time=False)

        assert builder.inject_current_time is False
        assert builder.system_template is not None
        assert builder.user_template is not None

    def test_inject_current_time_enabled(self):
        """Test time injection when enabled."""
        builder = PromptBuilder(inject_current_time=True)

        # Create a mock datetime instance
        mock_now = Mock()
        mock_now.strftime.return_value = "2024-01-15 10:30:45 (Monday)"

        with patch("langcrew.prompt_builder.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_now

            original_content = "System prompt content"
            result = builder._inject_current_time(original_content)

            assert "**Current Time**: 2024-01-15 10:30:45 (Monday)" in result
            assert "System prompt content" in result

    def test_inject_current_time_disabled(self):
        """Test time injection when disabled."""
        builder = PromptBuilder(inject_current_time=False)

        original_content = "System prompt content"
        result = builder._inject_current_time(original_content)

        assert result == original_content
        assert "**Current Time**:" not in result

    def test_inject_current_time_avoid_duplicate(self):
        """Test that time injection avoids duplicates."""
        builder = PromptBuilder(inject_current_time=True)

        content_with_time = "**Current Time**: 2024-01-15 10:30:45\n\nSystem content"
        result = builder._inject_current_time(content_with_time)

        # Should not inject again
        assert result == content_with_time
        assert result.count("**Current Time**:") == 1

    def test_format_tools_no_tools(self):
        """Test formatting when no tools are available."""
        builder = PromptBuilder()

        result = builder._format_tools(None)
        assert result == "*No tools available*"

        result = builder._format_tools([])
        assert result == "*No tools available*"

    def test_format_tools_single_tool(self):
        """Test formatting a single tool."""
        builder = PromptBuilder()

        mock_tool = Mock(spec=BaseTool)
        mock_tool.name = "TestTool"
        mock_tool.description = "A tool for testing"
        mock_tool.return_direct = False
        mock_tool.tool_call_schema = None
        mock_tool.args_schema = None

        result = builder._format_tools([mock_tool])

        assert "### TestTool" in result
        assert "A tool for testing" in result

    def test_format_tools_with_return_direct(self):
        """Test formatting a tool with return_direct=True."""
        builder = PromptBuilder()

        mock_tool = Mock(spec=BaseTool)
        mock_tool.name = "DirectTool"
        mock_tool.description = "Direct return tool"
        mock_tool.return_direct = True
        mock_tool.tool_call_schema = None
        mock_tool.args_schema = None

        result = builder._format_tools([mock_tool])

        assert "### DirectTool" in result
        assert "**Note**: This tool returns results directly to the user." in result

    def test_format_tools_with_schema(self):
        """Test formatting a tool with schema."""
        builder = PromptBuilder()

        mock_tool = Mock(spec=BaseTool)
        mock_tool.name = "SchemaTool"
        mock_tool.description = "Tool with schema"
        mock_tool.return_direct = False

        # Mock schema with properties
        mock_schema = Mock()
        mock_schema.model_json_schema = Mock(
            return_value={
                "properties": {
                    "param1": {"type": "string", "description": "First parameter"},
                    "param2": {"type": "integer", "description": "Second parameter"},
                },
                "required": ["param1"],
            }
        )
        mock_tool.tool_call_schema = mock_schema
        mock_tool.args_schema = None

        result = builder._format_tools([mock_tool])

        assert "### SchemaTool" in result
        assert "**Arguments**:" in result
        assert "`param1` (string) *(required)*: First parameter" in result
        assert "`param2` (integer): Second parameter" in result

    def test_format_tools_multiple_tools(self):
        """Test formatting multiple tools."""
        builder = PromptBuilder()

        mock_tool1 = Mock(spec=BaseTool)
        mock_tool1.name = "Tool1"
        mock_tool1.description = "First tool"
        mock_tool1.return_direct = False
        mock_tool1.tool_call_schema = None
        mock_tool1.args_schema = None

        mock_tool2 = Mock(spec=BaseTool)
        mock_tool2.name = "Tool2"
        mock_tool2.description = "Second tool"
        mock_tool2.return_direct = False
        mock_tool2.tool_call_schema = None
        mock_tool2.args_schema = None

        result = builder._format_tools([mock_tool1, mock_tool2])

        assert "### Tool1" in result
        assert "First tool" in result
        assert "### Tool2" in result
        assert "Second tool" in result

    def test_format_prompt_with_agent_and_task(self):
        """Test formatting prompt with both agent and task."""
        builder = PromptBuilder(inject_current_time=False)

        # Mock agent
        mock_agent = Mock()
        mock_agent.role = "Test Role"
        mock_agent.goal = "Test Goal"
        mock_agent.backstory = "Test Backstory"
        mock_agent.name = "TestAgent"
        mock_agent.tools = []

        # Mock task
        mock_task = Mock()
        mock_task.description = "Task Description"
        mock_task.expected_output = "Expected Output"

        messages = builder.format_prompt(
            agent=mock_agent, task=mock_task, context="Test Context"
        )

        assert len(messages) == 2
        assert isinstance(messages[0], SystemMessage)
        assert isinstance(messages[1], HumanMessage)

        system_content = messages[0].content
        assert "**Role**: Test Role" in system_content
        assert "**Goal**: Test Goal" in system_content
        assert "**Background**: Test Backstory" in system_content

        human_content = messages[1].content
        assert "Task Description" in human_content
        assert "Expected Output" in human_content
        assert "**Context**: Test Context" in human_content

    def test_format_prompt_agent_only(self):
        """Test formatting prompt with only agent."""
        builder = PromptBuilder(inject_current_time=False)

        mock_agent = Mock()
        mock_agent.role = "Agent Role"
        mock_agent.goal = "Agent Goal"
        mock_agent.backstory = "Agent Story"
        mock_agent.name = "Agent"
        mock_agent.tools = []

        messages = builder.format_prompt(
            agent=mock_agent,
            task_description="Default task",
            expected_output="Default output",
        )

        assert len(messages) == 2
        assert isinstance(messages[0], SystemMessage)
        assert isinstance(messages[1], HumanMessage)

        system_content = messages[0].content
        assert "**Role**: Agent Role" in system_content

    def test_format_prompt_task_only(self):
        """Test formatting prompt with only task."""
        builder = PromptBuilder(inject_current_time=False)

        mock_task = Mock()
        mock_task.description = "Solo Task"
        mock_task.expected_output = "Solo Output"

        messages = builder.format_prompt(
            task=mock_task,
            role="Default Role",
            goal="Default Goal",
            backstory="Default Story",
        )

        assert len(messages) == 2
        assert isinstance(messages[1], HumanMessage)

        human_content = messages[1].content
        assert "Solo Task" in human_content
        assert "Solo Output" in human_content

    def test_format_prompt_with_custom_kwargs(self):
        """Test formatting prompt with custom kwargs."""
        builder = PromptBuilder(inject_current_time=False)

        messages = builder.format_prompt(
            role="Custom Role",
            goal="Custom Goal",
            backstory="Custom Story",
            task_description="Custom Task",
            expected_output="Custom Output",
            custom_field="Custom Value",
        )

        assert len(messages) == 2
        system_content = messages[0].content
        assert "**Role**: Custom Role" in system_content

        human_content = messages[1].content
        assert "Custom Task" in human_content

    def test_format_prompt_with_time_injection(self):
        """Test that format_prompt injects time into system message."""
        builder = PromptBuilder(inject_current_time=True)

        # Create a mock datetime instance
        mock_now = Mock()
        mock_now.strftime.return_value = "2024-01-15 10:30:45 (Monday)"

        with patch("langcrew.prompt_builder.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_now

            mock_agent = Mock()
            mock_agent.role = "Role"
            mock_agent.goal = "Goal"
            mock_agent.backstory = "Story"
            mock_agent.name = "Agent"
            mock_agent.tools = []

            messages = builder.format_prompt(
                agent=mock_agent, task_description="Task", expected_output="Output"
            )

            system_content = messages[0].content
            assert "**Current Time**: 2024-01-15 10:30:45 (Monday)" in system_content

    def test_format_prompt_none_values(self):
        """Test handling of None values in agent attributes."""
        builder = PromptBuilder(inject_current_time=False)

        mock_agent = Mock()
        mock_agent.role = None
        mock_agent.goal = None
        mock_agent.backstory = None
        mock_agent.name = None
        mock_agent.tools = None

        messages = builder.format_prompt(
            agent=mock_agent, task_description="Task", expected_output="Output"
        )

        assert len(messages) == 2
        system_content = messages[0].content
        # Should have empty strings for None values
        assert "**Role**: \n" in system_content or "**Role**: " in system_content

    def test_format_tools_schema_exception_handling(self):
        """Test that schema processing exceptions are silently handled."""
        builder = PromptBuilder()

        mock_tool = Mock(spec=BaseTool)
        mock_tool.name = "BrokenTool"
        mock_tool.description = "Tool with broken schema"
        mock_tool.return_direct = False

        # Mock schema that raises exception
        mock_schema = Mock()
        mock_schema.model_json_schema = Mock(side_effect=Exception("Schema error"))
        mock_tool.tool_call_schema = mock_schema
        mock_tool.args_schema = None

        # Should not raise exception
        result = builder._format_tools([mock_tool])

        assert "### BrokenTool" in result
        assert "Tool with broken schema" in result
        # Arguments section should not be present due to exception
        assert "**Arguments**:" not in result

    def test_format_tools_fallback_to_args_schema(self):
        """Test fallback from tool_call_schema to args_schema."""
        builder = PromptBuilder()

        mock_tool = Mock(spec=BaseTool)
        mock_tool.name = "FallbackTool"
        mock_tool.description = "Tool with args_schema"
        mock_tool.return_direct = False
        mock_tool.tool_call_schema = None  # No tool_call_schema

        # Provide args_schema as fallback - make it callable as property
        mock_args_schema = Mock()
        # Set hasattr to return True for schema method
        type(mock_args_schema).schema = PropertyMock(return_value=None)
        # Instead use model_json_schema since args_schema might be a Pydantic model
        mock_args_schema.model_json_schema = Mock(
            return_value={
                "properties": {"arg1": {"type": "string", "description": "Argument 1"}},
                "required": [],
            }
        )
        mock_tool.args_schema = mock_args_schema

        result = builder._format_tools([mock_tool])

        assert "### FallbackTool" in result
        assert "**Arguments**:" in result
        assert "`arg1` (string): Argument 1" in result

    def test_format_tools_dict_schema(self):
        """Test handling of direct dict schema."""
        builder = PromptBuilder()

        mock_tool = Mock(spec=BaseTool)
        mock_tool.name = "DictSchemaTool"
        mock_tool.description = "Tool with dict schema"
        mock_tool.return_direct = False

        # Direct dict schema
        mock_tool.tool_call_schema = {
            "properties": {
                "param": {"type": "boolean", "description": "Boolean param"}
            },
            "required": ["param"],
        }
        mock_tool.args_schema = None

        result = builder._format_tools([mock_tool])

        assert "### DictSchemaTool" in result
        assert "**Arguments**:" in result
        assert "`param` (boolean) *(required)*: Boolean param" in result
