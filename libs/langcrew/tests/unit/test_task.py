"""
Unit tests for LangCrew Task class.

These tests verify the functionality of the Task class
with mocked dependencies to isolate the logic being tested.
"""

from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from langcrew.guardrail import GuardrailError, GuardrailFunc
from langcrew.task import Task


class TestTaskInitialization:
    """Test cases for Task initialization and parameter validation."""

    def test_init_with_required_params(self):
        """Test Task initialization with required parameters."""
        mock_agent = Mock()
        mock_agent.role = "Test Agent"
        
        task = Task(
            agent=mock_agent,
            description="Test task description",
            expected_output="Expected test output"
        )
        
        assert task.agent == mock_agent
        assert task.description == "Test task description"
        assert task.expected_output == "Expected test output"
        assert task.name is None
        assert task.verbose is False
        assert task.input_guards == []
        assert task.output_guards == []
        assert task.context == []
        assert task.handoff_to == []

    def test_init_with_all_params(self):
        """Test Task initialization with all parameters."""
        mock_agent = Mock()
        mock_agent.role = "Test Agent"
        
        input_guard = Mock(spec=GuardrailFunc)
        output_guard = Mock(spec=GuardrailFunc)
        context_task = Mock()
        
        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task",
            verbose=True,
            metadata={"key": "value"},
            output_json=Mock(),
            context=[context_task],
            handoff_to=["agent1", "agent2"],
            input_guards=[input_guard],
            output_guards=[output_guard]
        )
        
        assert task.name == "test_task"
        assert task.verbose is True
        assert task.metadata == {"key": "value"}
        assert task.context == [context_task]
        assert task.handoff_to == ["agent1", "agent2"]
        assert task.input_guards == [input_guard]
        assert task.output_guards == [output_guard]

    def test_init_with_crewai_config(self):
        """Test Task initialization with CrewAI-style config."""
        mock_agent = Mock()
        
        config = {
            "description": "Config description",
            "expected_output": "Config output",
            "handoff_to": ["agent3"]
        }
        
        task = Task(
            agent=mock_agent,
            config=config
        )
        
        assert task.description == "Config description"
        assert task.expected_output == "Config output"
        assert task.handoff_to == ["agent3"]

    def test_init_missing_description(self):
        """Test that missing description raises ValueError."""
        mock_agent = Mock()
        
        with pytest.raises(ValueError, match="description is required"):
            Task(
                agent=mock_agent,
                expected_output="Test output"
            )

    def test_init_missing_expected_output(self):
        """Test that missing expected_output raises ValueError."""
        mock_agent = Mock()
        
        with pytest.raises(ValueError, match="expected_output is required"):
            Task(
                agent=mock_agent,
                description="Test description"
            )

    def test_init_missing_agent(self):
        """Test that missing agent raises ValueError."""
        with pytest.raises(ValueError, match="agent is required"):
            Task(
                agent=None,
                description="Test description",
                expected_output="Test output"
            )

    def test_name_property_setter(self):
        """Test name property setter."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        assert task.name is None
        task.name = "new_name"
        assert task.name == "new_name"


class TestContextProcessing:
    """Test cases for context extraction from state."""

    def test_get_context_from_state_empty_context(self):
        """Test context extraction when task has no context dependencies."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[]
        )
        
        state = {"task_outputs": [{"name": "task1", "raw": "output1"}]}
        result = task._get_context_from_state(state)
        
        assert result == ""

    def test_get_context_from_state_with_dict_outputs(self):
        """Test context extraction with dict-type task outputs."""
        mock_agent = Mock()
        context_task = Mock()
        context_task.name = "task1"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[context_task]
        )
        
        state = {
            "task_outputs": [
                {"name": "task1", "raw": "Task 1 output"},
                {"name": "task2", "raw": "Task 2 output"}
            ]
        }
        
        result = task._get_context_from_state(state)
        expected = "**Output from task1:**\nTask 1 output"
        assert result == expected

    def test_get_context_from_state_with_object_outputs(self):
        """Test context extraction with object-type task outputs."""
        mock_agent = Mock()
        context_task = Mock()
        context_task.name = "task1"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[context_task]
        )
        
        mock_output = Mock()
        mock_output.name = "task1"
        mock_output.raw = "Task 1 output from object"
        
        state = {"task_outputs": [mock_output]}
        
        result = task._get_context_from_state(state)
        expected = "**Output from task1:**\nTask 1 output from object"
        assert result == expected

    def test_get_context_from_state_multiple_dependencies(self):
        """Test context extraction with multiple task dependencies."""
        mock_agent = Mock()
        
        context_task1 = Mock()
        context_task1.name = "task1"
        context_task2 = Mock()
        context_task2.name = "task2"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[context_task1, context_task2]
        )
        
        state = {
            "task_outputs": [
                {"name": "task1", "raw": "Output 1"},
                {"name": "task2", "raw": "Output 2"},
                {"name": "task3", "raw": "Output 3"}
            ]
        }
        
        result = task._get_context_from_state(state)
        expected = "**Output from task1:**\nOutput 1\n\n**Output from task2:**\nOutput 2"
        assert result == expected


class TestResultContentExtraction:
    """Test cases for extracting content from results."""

    def test_extract_result_content_string(self):
        """Test extraction when result is a string."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        result = task._extract_result_content("Simple string result")
        assert result == "Simple string result"

    def test_extract_result_content_dict_with_output(self):
        """Test extraction from dict with 'output' key."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        result_dict = {"output": "Result from output key"}
        result = task._extract_result_content(result_dict)
        assert result == "Result from output key"

    def test_extract_result_content_dict_with_messages(self):
        """Test extraction from dict with messages."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        ai_msg = AIMessage(content="AI response content")
        human_msg = HumanMessage(content="Human message")
        
        result_dict = {"messages": [human_msg, ai_msg]}
        result = task._extract_result_content(result_dict)
        assert result == "AI response content"

    def test_extract_result_content_dict_with_list_content(self):
        """Test extraction from message with list-format content."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        # Mock message with list content
        mock_msg = Mock()
        mock_msg.content = [
            {"text": "Part 1"},
            {"text": "Part 2"},
            "Part 3"
        ]
        
        result_dict = {"messages": [mock_msg]}
        result = task._extract_result_content(result_dict)
        assert result == "Part 1Part 2Part 3"

    def test_extract_result_content_fallback(self):
        """Test extraction fallback to str() conversion."""
        mock_agent = Mock()
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        result_dict = {"other_key": "value"}
        result = task._extract_result_content(result_dict)
        assert result == str(result_dict)


class TestSaveTaskOutput:
    """Test cases for saving task output to state."""

    def test_save_task_output_to_state_new(self):
        """Test saving output when state has no task_outputs."""
        mock_agent = Mock()
        mock_agent.role = "Test Agent"
        
        task = Task(
            agent=mock_agent,
            description="Test description",
            expected_output="Expected output",
            name="test_task"
        )
        
        state = {}
        result = {"output": "Task result"}
        
        task._save_task_output_to_state(state, result)
        
        assert "task_outputs" in state
        assert len(state["task_outputs"]) == 1
        output = state["task_outputs"][0]
        assert output["name"] == "test_task"
        assert output["description"] == "Test description"
        assert output["expected_output"] == "Expected output"
        assert output["raw"] == "Task result"
        assert output["agent"] == "Test Agent"

    def test_save_task_output_to_state_append(self):
        """Test appending output to existing task_outputs."""
        mock_agent = Mock()
        mock_agent.role = "Agent 2"
        
        task = Task(
            agent=mock_agent,
            description="Task 2",
            expected_output="Output 2",
            name="task2"
        )
        
        state = {
            "task_outputs": [
                {"name": "task1", "raw": "Previous output"}
            ]
        }
        result = {"output": "Task 2 result"}
        
        task._save_task_output_to_state(state, result)
        
        assert len(state["task_outputs"]) == 2
        assert state["task_outputs"][0]["name"] == "task1"
        assert state["task_outputs"][1]["name"] == "task2"
        assert state["task_outputs"][1]["raw"] == "Task 2 result"

    def test_save_task_output_verbose_logging(self, caplog):
        """Test verbose logging when saving output."""
        mock_agent = Mock()
        mock_agent.role = "Test Agent"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            name="test_task",
            verbose=True
        )
        
        state = {}
        result = {"output": "Result"}
        
        with caplog.at_level("INFO"):
            task._save_task_output_to_state(state, result)
        
        assert "Task 'test_task' output saved to state" in caplog.text
        assert "Length: 6" in caplog.text


class TestTaskExecutorMethods:
    """Test cases for Task executor methods (_executor_invoke and _executor_ainvoke)."""

    def test_executor_invoke_method(self):
        """Test Task _executor_invoke method directly."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "executor result"})
        mock_agent.role = "Test Agent"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task"
        )

        # Test _executor_invoke method directly
        processed_input = {"messages": [], "context": "some context"}
        result = task._executor_invoke(processed_input)

        assert result == {"output": "executor result"}
        mock_agent.invoke.assert_called_once_with(processed_input, None, task=task)

        # Check that output was saved to state
        assert "task_outputs" in processed_input
        assert len(processed_input["task_outputs"]) == 1
        assert processed_input["task_outputs"][0]["raw"] == "executor result"

    def test_executor_invoke_with_config_and_kwargs(self):
        """Test Task _executor_invoke with config and kwargs."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "configured result"})
        mock_agent.role = "Test Agent"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task"
        )

        # Test with config and kwargs
        processed_input = {"messages": []}
        config = {"configurable": {"thread_id": "test123"}}
        result = task._executor_invoke(processed_input, config, extra_param="test")

        assert result == {"output": "configured result"}
        mock_agent.invoke.assert_called_once_with(
            processed_input, config, task=task, extra_param="test"
        )

    @pytest.mark.asyncio
    async def test_executor_ainvoke_method(self):
        """Test Task _executor_ainvoke method directly."""
        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock(return_value={"output": "async executor result"})
        mock_agent.role = "Async Test Agent"

        task = Task(
            agent=mock_agent,
            description="Async test task",
            expected_output="Async test output",
            name="async_test_task"
        )

        # Test _executor_ainvoke method directly
        processed_input = {"messages": [], "context": "async context"}
        result = await task._executor_ainvoke(processed_input)

        assert result == {"output": "async executor result"}
        mock_agent.ainvoke.assert_called_once_with(processed_input, None, task=task)

        # Check that output was saved to state
        assert "task_outputs" in processed_input
        assert len(processed_input["task_outputs"]) == 1
        assert processed_input["task_outputs"][0]["raw"] == "async executor result"

    @pytest.mark.asyncio
    async def test_executor_ainvoke_with_config_and_kwargs(self):
        """Test Task _executor_ainvoke with config and kwargs."""
        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock(return_value={"output": "async configured result"})
        mock_agent.role = "Async Test Agent"

        task = Task(
            agent=mock_agent,
            description="Async test task",
            expected_output="Async test output",
            name="async_test_task"
        )

        # Test with config and kwargs
        processed_input = {"messages": []}
        config = {"configurable": {"thread_id": "async123"}}
        result = await task._executor_ainvoke(processed_input, config, async_param="test")

        assert result == {"output": "async configured result"}
        mock_agent.ainvoke.assert_called_once_with(
            processed_input, config, task=task, async_param="test"
        )


class TestGuardrailIntegration:
    """Test cases for guardrail decorator integration."""

    def test_guardrails_decorator_applied(self):
        """Test that with_guardrails decorator is applied to _executor_invoke/_executor_ainvoke."""
        # Verify that the decorator has been applied by checking the methods
        # The decorator wraps the original methods
        from langcrew.task import Task
        
        # Check that executor methods exist and are callable
        assert hasattr(Task, '_executor_invoke')
        assert hasattr(Task, '_executor_ainvoke') 
        assert callable(Task._executor_invoke)
        assert callable(Task._executor_ainvoke)
        
        # Check that public methods exist
        assert hasattr(Task, 'invoke')
        assert hasattr(Task, 'ainvoke')
        assert callable(Task.invoke)
        assert callable(Task.ainvoke)
        
        # The actual decorator functionality is tested in other tests
        # This test just confirms the methods are present and decorated

    def test_invoke_with_guardrails(self):
        """Test invoke method with guardrail functions."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "Result"})
        
        # Create guardrail functions
        input_guard_called = False
        output_guard_called = False
        
        def input_guard(data: Any) -> tuple[bool, str]:
            nonlocal input_guard_called
            input_guard_called = True
            return True, "OK"
        
        def output_guard(result: Any) -> tuple[bool, str]:
            nonlocal output_guard_called
            output_guard_called = True
            # Verify that output guard receives the full result dict
            assert isinstance(result, dict)
            assert "output" in result
            return True, "OK"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            input_guards=[input_guard],
            output_guards=[output_guard]
        )
        
        # Note: Since we're testing with the actual decorator,
        # we need to ensure the guards are called properly
        input_data = {"test": "data"}
        result = task.invoke(input_data)
        
        assert mock_agent.invoke.called
        assert result == {"output": "Result"}

    def test_guardrail_error_propagation(self):
        """Test that GuardrailError is properly propagated."""
        mock_agent = Mock()
        
        def failing_guard(data: Any) -> tuple[bool, str]:
            return False, "Guard check failed"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            input_guards=[failing_guard]
        )
        
        # The actual decorator should raise GuardrailError
        with pytest.raises(GuardrailError, match="Guard check failed"):
            task.invoke({"test": "data"})


class TestInvokeFlow:
    """Test cases for invoke method execution flow."""

    def test_invoke_with_context_injection(self):
        """Test invoke injects context into input."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "Result"})
        
        context_task = Mock()
        context_task.name = "task1"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[context_task],
            name="current_task"
        )
        
        input_data = {
            "task_outputs": [
                {"name": "task1", "raw": "Previous output"}
            ]
        }
        
        result = task.invoke(input_data)
        
        # Verify agent.invoke was called
        mock_agent.invoke.assert_called_once()
        
        # Check that context was injected
        call_args = mock_agent.invoke.call_args
        actual_input = call_args[0][0]
        assert "context" in actual_input
        assert "Output from task1" in actual_input["context"]
        
        # Verify task was passed as keyword argument
        assert call_args[1]["task"] == task

    def test_invoke_without_dict_input(self):
        """Test invoke with non-dict input."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value="String result")
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output"
        )
        
        result = task.invoke("string input")
        
        mock_agent.invoke.assert_called_once_with(
            "string input", None, task=task
        )
        assert result == "String result"

    def test_invoke_saves_output_to_state(self):
        """Test that invoke saves output to state."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "Task completed"})
        mock_agent.role = "Worker"
        
        task = Task(
            agent=mock_agent,
            description="Do work",
            expected_output="Work done",
            name="work_task"
        )
        
        input_data = {}
        result = task.invoke(input_data)
        
        assert "task_outputs" in input_data
        assert len(input_data["task_outputs"]) == 1
        assert input_data["task_outputs"][0]["raw"] == "Task completed"

    def test_invoke_verbose_logging(self, caplog):
        """Test verbose logging during invoke."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "Result"})
        
        context_task = Mock()
        context_task.name = "prev_task"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[context_task],
            name="test_task",
            verbose=True
        )
        
        input_data = {
            "task_outputs": [{"name": "prev_task", "raw": "Previous"}]
        }
        
        with caplog.at_level("INFO"):
            task.invoke(input_data)
        
        assert "found context" in caplog.text

    def test_task_guardrails_with_context_injection(self):
        """Test that task guardrails receive context-enhanced input."""
        # Track what data the guardrails receive
        received_input_data = None
        received_output_data = None

        def test_input_guard(data):
            nonlocal received_input_data
            received_input_data = data
            # Verify it's processed input with context
            assert isinstance(data, dict)
            assert "context" in data
            assert "task_outputs" in data
            return True, "OK"

        def test_output_guard(data):
            nonlocal received_output_data
            received_output_data = data
            return True, "OK"

        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "test result"})
        mock_agent.role = "Test Agent"

        context_task = Mock()
        context_task.name = "dependency_task"

        task = Task(
            agent=mock_agent,
            description="Test task with context",
            expected_output="Test output",
            context=[context_task],
            name="test_task",
            input_guards=[test_input_guard],
            output_guards=[test_output_guard]
        )

        # Input data with context from dependency
        input_data = {
            "task_outputs": [
                {"name": "dependency_task", "raw": "Dependency output"}
            ]
        }
        
        result = task.invoke(input_data)

        # Verify guardrails were called
        assert received_input_data is not None
        assert received_output_data is not None

        # Verify input guard received context-enhanced data
        assert "context" in received_input_data
        assert "Output from dependency_task" in received_input_data["context"]
        assert "task_outputs" in received_input_data

        # Verify output guard received the result
        assert received_output_data == {"output": "test result"}

    @pytest.mark.asyncio
    async def test_task_async_guardrails_with_context_injection(self):
        """Test that task async guardrails receive context-enhanced input."""
        # Track what data the guardrails receive
        received_input_data = None
        received_output_data = None

        def test_async_input_guard(data):
            nonlocal received_input_data
            received_input_data = data
            # Verify it's processed input with context
            assert isinstance(data, dict)
            assert "context" in data
            assert "task_outputs" in data
            return True, "OK"

        def test_async_output_guard(data):
            nonlocal received_output_data
            received_output_data = data
            return True, "OK"

        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock(return_value={"output": "async test result"})
        mock_agent.role = "Async Test Agent"

        context_task1 = Mock()
        context_task1.name = "task1"
        context_task2 = Mock()
        context_task2.name = "task2"

        task = Task(
            agent=mock_agent,
            description="Async test task with multiple context",
            expected_output="Async test output",
            context=[context_task1, context_task2],
            name="async_test_task",
            input_guards=[test_async_input_guard],
            output_guards=[test_async_output_guard]
        )

        # Input data with multiple context dependencies
        input_data = {
            "task_outputs": [
                {"name": "task1", "raw": "Output from task 1"},
                {"name": "task2", "raw": "Output from task 2"},
                {"name": "task3", "raw": "Output from unrelated task"}
            ]
        }
        
        result = await task.ainvoke(input_data)

        # Verify guardrails were called
        assert received_input_data is not None
        assert received_output_data is not None

        # Verify input guard received context with both dependencies
        assert "context" in received_input_data
        context_content = received_input_data["context"]
        assert "Output from task1" in context_content
        assert "Output from task 1" in context_content
        assert "Output from task2" in context_content
        assert "Output from task 2" in context_content
        # Unrelated task3 should not be in context
        assert "task3" not in context_content

        # Verify output guard received the async result
        assert received_output_data == {"output": "async test result"}


class TestAsyncInvoke:
    """Test cases for async ainvoke method."""

    @pytest.mark.asyncio
    async def test_ainvoke_basic_flow(self):
        """Test basic async invoke flow."""
        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock(return_value={"output": "Async result"})
        mock_agent.role = "Async Agent"
        
        task = Task(
            agent=mock_agent,
            description="Async test",
            expected_output="Async output",
            name="async_task"
        )
        
        input_data = {}
        result = await task.ainvoke(input_data)
        
        mock_agent.ainvoke.assert_called_once()
        assert result == {"output": "Async result"}
        assert "task_outputs" in input_data

    @pytest.mark.asyncio
    async def test_ainvoke_with_context(self):
        """Test async invoke with context injection."""
        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock(return_value={"output": "Result"})
        
        context_task = Mock()
        context_task.name = "dependency"
        
        task = Task(
            agent=mock_agent,
            description="Test",
            expected_output="Output",
            context=[context_task]
        )
        
        input_data = {
            "task_outputs": [
                {"name": "dependency", "raw": "Dependency output"}
            ]
        }
        
        result = await task.ainvoke(input_data)
        
        call_args = mock_agent.ainvoke.call_args
        actual_input = call_args[0][0]
        assert "context" in actual_input
        assert "Dependency output" in actual_input["context"]

    @pytest.mark.asyncio
    async def test_ainvoke_saves_output(self):
        """Test that async invoke saves output to state."""
        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock(return_value={"output": "Async done"})
        mock_agent.role = "Async Worker"
        
        task = Task(
            agent=mock_agent,
            description="Async work",
            expected_output="Done",
            name="async_work"
        )
        
        input_data = {}
        await task.ainvoke(input_data)
        
        assert "task_outputs" in input_data
        assert input_data["task_outputs"][0]["raw"] == "Async done"


class TestTaskProperties:
    """Test cases for Task property delegation to TaskSpec."""

    def test_property_delegation(self):
        """Test that properties are correctly delegated to TaskSpec."""
        mock_agent = Mock()
        
        task = Task(
            agent=mock_agent,
            description="Test description",
            expected_output="Test output",
            name="test_name",
            metadata={"key": "value"}
        )
        
        # Properties should be accessible through Task
        assert task.description == "Test description"
        assert task.expected_output == "Test output"
        assert task.name == "test_name"
        assert task.metadata == {"key": "value"}
        
        # Verify TaskSpec was created with correct values
        assert task._spec.description == "Test description"
        assert task._spec.expected_output == "Test output"
        assert task._spec.name == "test_name"


class TestTaskExecutorErrorHandling:
    """Test error handling for Task executor methods."""

    def test_executor_invoke_with_input_guardrail_failure(self):
        """Test _executor_invoke when input guardrail fails."""
        def failing_input_guard(data):
            return False, "Task input validation failed"

        mock_agent = Mock()
        mock_agent.role = "Test Agent"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task",
            input_guards=[failing_input_guard]
        )

        # Test should raise GuardrailError
        from langcrew.guardrail import GuardrailError
        with pytest.raises(GuardrailError, match="Task input validation failed"):
            task._executor_invoke({"test": "data"})

        # Agent should not be called
        mock_agent.invoke.assert_not_called()

    def test_executor_invoke_with_output_guardrail_failure(self):
        """Test _executor_invoke when output guardrail fails."""
        def passing_input_guard(data):
            return True, "OK"
            
        def failing_output_guard(data):
            return False, "Task output validation failed"

        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "result"})
        mock_agent.role = "Test Agent"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task",
            input_guards=[passing_input_guard],
            output_guards=[failing_output_guard]
        )

        # Test should raise GuardrailError
        from langcrew.guardrail import GuardrailError
        with pytest.raises(GuardrailError, match="Task output validation failed"):
            task._executor_invoke({"test": "data"})

        # Agent should have been called
        mock_agent.invoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_executor_ainvoke_with_input_guardrail_failure(self):
        """Test _executor_ainvoke when input guardrail fails."""
        def failing_input_guard(data):
            return False, "Async task input validation failed"

        mock_agent = Mock()
        mock_agent.ainvoke = AsyncMock()
        mock_agent.role = "Async Test Agent"

        task = Task(
            agent=mock_agent,
            description="Async test task",
            expected_output="Async test output",
            name="async_test_task",
            input_guards=[failing_input_guard]
        )

        # Test should raise GuardrailError
        from langcrew.guardrail import GuardrailError
        with pytest.raises(GuardrailError, match="Async task input validation failed"):
            await task._executor_ainvoke({"test": "data"})

        # Agent should not be called
        mock_agent.ainvoke.assert_not_called()

    def test_executor_invoke_with_agent_exception(self):
        """Test _executor_invoke when agent raises exception."""
        def passing_guard(data):
            return True, "OK"

        mock_agent = Mock()
        mock_agent.invoke.side_effect = RuntimeError("Agent execution error")
        mock_agent.role = "Test Agent"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task",
            input_guards=[passing_guard],
            output_guards=[passing_guard]
        )

        # Exception should propagate
        with pytest.raises(RuntimeError, match="Agent execution error"):
            task._executor_invoke({"test": "data"})

    def test_executor_invoke_with_non_dict_input(self):
        """Test _executor_invoke with non-dict input."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value="string result")
        mock_agent.role = "Test Agent"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            name="test_task"
        )

        # Should handle non-dict input (no context injection, no state saving)
        result = task._executor_invoke("string input")
        assert result == "string result"
        mock_agent.invoke.assert_called_once_with("string input", None, task=task)

    def test_executor_invoke_with_context_but_no_matching_outputs(self):
        """Test _executor_invoke with context dependencies but no matching outputs."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "result"})
        mock_agent.role = "Test Agent"

        context_task = Mock()
        context_task.name = "missing_task"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            context=[context_task],
            name="test_task"
        )

        # Input with no matching context outputs
        input_data = {
            "task_outputs": [
                {"name": "other_task", "raw": "Other output"}
            ]
        }

        result = task._executor_invoke(input_data)
        
        # Should still work, just with empty context
        assert result == {"output": "result"}
        call_args = mock_agent.invoke.call_args
        actual_input = call_args[0][0]
        assert "context" in actual_input
        assert actual_input["context"] == ""  # Empty context

    def test_executor_invoke_context_extraction_error_handling(self):
        """Test _executor_invoke with malformed task_outputs."""
        mock_agent = Mock()
        mock_agent.invoke = Mock(return_value={"output": "result"})
        mock_agent.role = "Test Agent"

        context_task = Mock()
        context_task.name = "task1"

        task = Task(
            agent=mock_agent,
            description="Test task",
            expected_output="Test output",
            context=[context_task],
            name="test_task"
        )

        # Input with malformed task_outputs (missing 'raw' field)
        input_data = {
            "task_outputs": [
                {"name": "task1"}  # Missing 'raw' field
            ]
        }

        # Should handle gracefully and continue execution
        result = task._executor_invoke(input_data)
        assert result == {"output": "result"}
        
        # Context should be empty due to missing 'raw' field
        call_args = mock_agent.invoke.call_args
        actual_input = call_args[0][0]
        assert "context" in actual_input
        assert actual_input["context"] == ""