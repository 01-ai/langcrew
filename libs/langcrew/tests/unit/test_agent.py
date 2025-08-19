"""
Unit tests for LangCrew Agent class.

These tests verify the functionality of the Agent class
and its integration with various components.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain_core.language_models.fake import FakeListLLM

from langcrew.agent import Agent
from langcrew.guardrail import input_guard, output_guard
from langcrew.hitl import HITLConfig
from langcrew.memory import MemoryConfig


class TestAgent:
    """Test cases for Agent class."""

    def test_agent_initialization_basic(self, mock_llm: FakeListLLM):
        """Test basic agent initialization."""
        agent = Agent(
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
            llm=mock_llm,
        )

        assert agent.role == "Test Specialist"
        assert agent.goal == "Execute test operations"
        assert agent.backstory == "An experienced test specialist"
        assert agent.llm == mock_llm
        assert agent.tools == []
        assert agent.verbose is False

    def test_agent_initialization_with_tools(self, mock_llm, mock_tool):
        """Test agent initialization with tools."""
        agent = Agent(
            role="Tool Specialist",
            goal="Use tools effectively",
            backstory="Expert in tool usage",
            llm=mock_llm,
            tools=[mock_tool],
        )

        assert mock_tool in agent.tools
        assert len(agent.tools) == 1

    def test_agent_initialization_with_name(self, mock_llm):
        """Test agent initialization with custom name."""
        agent = Agent(
            name="custom_agent",
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
            llm=mock_llm,
        )

        assert agent.name == "custom_agent"

    def test_agent_initialization_with_memory(self, mock_llm):
        """Test agent initialization with memory configuration."""
        memory_config = MemoryConfig(enabled=True)
        agent = Agent(
            role="Memory Specialist",
            goal="Remember information",
            backstory="Expert in memory management",
            llm=mock_llm,
            memory=memory_config,
        )

        assert agent.memory is True
        assert agent.memory_config is not None

    def test_agent_initialization_with_mcp(self, mock_llm):
        """Test agent initialization with MCP configuration."""
        mcp_servers = {"test_server": {"command": "test"}}

        with patch.object(Agent, "_load_mcp_tools"):
            agent = Agent(
                role="MCP Specialist",
                goal="Use MCP tools",
                backstory="Expert in MCP integration",
                llm=mock_llm,
                mcp_servers=mcp_servers,
            )

        assert agent.mcp_servers == mcp_servers

    def test_agent_str_representation(self, mock_llm):
        """Test agent string representation."""
        agent = Agent(
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
            llm=mock_llm,
        )

        repr_str = repr(agent)
        assert "Test Specialist" in repr_str
        assert "Execute test operations" in repr_str

    def test_agent_str_representation_no_role(self, mock_llm):
        """Test agent string representation without role."""
        agent = Agent(
            llm=mock_llm,
        )

        repr_str = repr(agent)
        assert "N/A" in repr_str

    def test_agent_executor_type_configuration(self, mock_llm):
        """Test agent executor type configuration."""
        # Test React executor (default)
        agent_react = Agent(
            role="React Specialist",
            goal="Use React executor",
            backstory="Expert in React execution",
            llm=mock_llm,
            executor_type="react",
        )

        assert agent_react.executor_type == "react"

        # Test Plan and Execute executor
        agent_plan = Agent(
            role="Plan Specialist",
            goal="Use Plan and Execute executor",
            backstory="Expert in planning",
            llm=mock_llm,
            executor_type="plan_and_execute",
        )

        assert agent_plan.executor_type == "plan_and_execute"

    def test_agent_validation_with_custom_prompts(self, mock_llm):
        """Test agent validation with custom prompts bypasses field requirements."""
        # Should work even without role/goal/backstory
        agent = Agent(
            llm=mock_llm,
        )

        assert agent.role is None
        assert agent.goal is None
        assert agent.backstory is None

    def test_agent_memory_setup(self, mock_llm, mock_memory):
        """Test agent memory setup."""
        agent = Agent(
            role="Memory Specialist",
            goal="Use memory effectively",
            backstory="Expert in memory management",
            llm=mock_llm,
            memory=True,
        )

        # Memory is configured at agent level via MemoryConfig
        # No additional setup needed

    def test_agent_executor_kwargs(self, mock_llm):
        """Test agent executor kwargs configuration."""
        executor_kwargs = {"max_iterations": 5, "temperature": 0.7}

        agent = Agent(
            role="Executor Specialist",
            goal="Configure executor",
            backstory="Expert in executor configuration",
            llm=mock_llm,
            executor_kwargs=executor_kwargs,
        )

        assert agent.executor_kwargs == executor_kwargs

    def test_agent_debug_mode(self, mock_llm):
        """Test agent debug mode configuration."""
        agent = Agent(
            role="Debug Specialist",
            goal="Handle debugging",
            backstory="Expert in debugging",
            llm=mock_llm,
            debug=True,
        )

        assert agent.debug is True

    def test_agent_verbose_mode(self, mock_llm):
        """Test agent verbose mode configuration."""
        agent = Agent(
            role="Verbose Specialist",
            goal="Handle verbose output",
            backstory="Expert in verbose communication",
            llm=mock_llm,
            verbose=True,
        )

        assert agent.verbose is True

    def test_agent_initialization_with_guardrails(self, mock_llm):
        """Test agent initialization with guardrail functions."""

        @input_guard
        def sample_input_guard(data):
            return True, "Input is valid"

        @output_guard
        def sample_output_guard(data):
            return True, "Output is valid"

        agent = Agent(
            role="Guardrail Specialist",
            goal="Test guardrail functionality",
            backstory="Expert in guardrails",
            llm=mock_llm,
            input_guards=[sample_input_guard],
            output_guards=[sample_output_guard],
        )

        assert len(agent.input_guards) == 1
        assert len(agent.output_guards) == 1
        assert agent.input_guards[0] == sample_input_guard
        assert agent.output_guards[0] == sample_output_guard

    def test_agent_guardrails_with_prepared_input(self, mock_llm):
        """Test that agent guardrails receive prepared_input format."""
        # Track what data the guardrails receive
        received_input_data = None
        received_output_data = None

        @input_guard
        def test_input_guard(data):
            nonlocal received_input_data
            received_input_data = data
            # Verify it's prepared_input format (should have messages)
            assert isinstance(data, dict)
            assert "messages" in data
            return True, "OK"

        @output_guard
        def test_output_guard(data):
            nonlocal received_output_data
            received_output_data = data
            # Should receive the executor result
            return True, "OK"

        with (
            patch("langcrew.agent.ExecutorFactory") as mock_factory,
            patch("langcrew.agent.PromptBuilder") as mock_prompt_builder,
        ):
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "test result"}
            mock_factory.create_executor.return_value = mock_executor

            mock_builder_instance = Mock()
            mock_prompt_builder.return_value = mock_builder_instance
            mock_builder_instance.format_prompt.return_value = [Mock(), Mock()]

            agent = Agent(
                role="Guardrail Test Agent",
                goal="Test guardrail data formats",
                backstory="Expert in testing",
                llm=mock_llm,
                input_guards=[test_input_guard],
                output_guards=[test_output_guard],
            )

            # Test with initial input
            input_data = {"messages": []}
            agent.invoke(input_data)

            # Verify guardrails were called
            assert received_input_data is not None
            assert received_output_data is not None

            # Verify input guard received prepared_input format
            assert "messages" in received_input_data
            assert isinstance(received_input_data["messages"], list)

            # Verify output guard received executor result
            assert received_output_data == {"output": "test result"}

    @pytest.mark.asyncio
    async def test_agent_async_guardrails_with_prepared_input(self, mock_llm):
        """Test that agent async guardrails receive prepared_input format."""
        # Track what data the guardrails receive
        received_input_data = None
        received_output_data = None

        @input_guard
        def test_async_input_guard(data):
            nonlocal received_input_data
            received_input_data = data
            # Verify it's prepared_input format
            assert isinstance(data, dict)
            assert "messages" in data
            return True, "OK"

        @output_guard
        def test_async_output_guard(data):
            nonlocal received_output_data
            received_output_data = data
            return True, "OK"

        with (
            patch("langcrew.agent.ExecutorFactory") as mock_factory,
            patch("langcrew.agent.PromptBuilder") as mock_prompt_builder,
        ):
            mock_executor = Mock()
            mock_executor.ainvoke = AsyncMock(
                return_value={"output": "async test result"}
            )
            mock_factory.create_executor.return_value = mock_executor

            mock_builder_instance = Mock()
            mock_prompt_builder.return_value = mock_builder_instance
            mock_builder_instance.format_prompt.return_value = [Mock(), Mock()]

            agent = Agent(
                role="Async Guardrail Test Agent",
                goal="Test async guardrail data formats",
                backstory="Expert in async testing",
                llm=mock_llm,
                input_guards=[test_async_input_guard],
                output_guards=[test_async_output_guard],
            )

            # Test with initial input
            input_data = {"messages": []}
            await agent.ainvoke(input_data)

            # Verify guardrails were called
            assert received_input_data is not None
            assert received_output_data is not None

            # Verify input guard received prepared_input format
            assert "messages" in received_input_data
            assert isinstance(received_input_data["messages"], list)

            # Verify output guard received executor result
            assert received_output_data == {"output": "async test result"}

    def test_agent_guardrails_with_langgraph_messages(self, mock_llm):
        """Test agent guardrails with actual LangGraph message objects."""
        from langchain_core.messages import AIMessage, HumanMessage

        received_input_data = None

        @input_guard
        def message_format_guard(data):
            nonlocal received_input_data
            received_input_data = data
            # Should receive prepared input with proper message objects
            if isinstance(data, dict) and "messages" in data:
                messages = data["messages"]
                if messages and isinstance(messages[0], HumanMessage):
                    return True, "Valid LangGraph format"
            return False, "Invalid format"

        with (
            patch("langcrew.agent.ExecutorFactory") as mock_factory,
            patch("langcrew.agent.PromptBuilder") as mock_prompt_builder,
        ):
            mock_executor = Mock()
            mock_executor.invoke.return_value = {
                "messages": [AIMessage(content="Response")]
            }
            mock_factory.create_executor.return_value = mock_executor

            mock_builder_instance = Mock()
            mock_prompt_builder.return_value = mock_builder_instance
            # Mock to return actual message objects
            human_msg = HumanMessage(content="Test message")
            mock_builder_instance.format_prompt.return_value = [human_msg]

            agent = Agent(
                role="Message Format Test Agent",
                goal="Test LangGraph message formats",
                backstory="Expert in message testing",
                llm=mock_llm,
                input_guards=[message_format_guard],
            )

            # Test with LangGraph-style input
            input_data = {"messages": [human_msg]}
            agent.invoke(input_data)

            # Verify the guard received proper LangGraph messages
            assert received_input_data is not None
            assert "messages" in received_input_data
            messages = received_input_data["messages"]
            assert len(messages) > 0
            assert isinstance(messages[0], HumanMessage)

    def test_agent_initialization_with_hitl(self, mock_llm):
        """Test agent initialization with HITL configuration."""
        hitl_config = HITLConfig(enabled=True, interrupt_tool_mode="all")

        agent = Agent(
            role="HITL Specialist",
            goal="Test HITL functionality",
            backstory="Expert in human-in-the-loop",
            llm=mock_llm,
            hitl=hitl_config,
        )

        assert agent.hitl_config.enabled is True
        assert agent.hitl_config.interrupt_tool_mode == "all"

    def test_agent_initialization_with_handoff_config(self, mock_llm):
        """Test agent initialization with handoff configuration."""
        agent = Agent(
            role="Handoff Specialist",
            goal="Test handoff functionality",
            backstory="Expert in task handoffs",
            llm=mock_llm,
            handoff_to=["agent1", "agent2"],
            is_entry=True,
        )

        assert agent.handoff_to == ["agent1", "agent2"]
        assert agent.is_entry is True

    def test_agent_prompt_validation(self, mock_llm):
        """Test agent prompt validation."""
        # Valid prompts for react executor
        agent_react = Agent(
            role="React Specialist",
            goal="Use React executor",
            backstory="Expert in React execution",
            llm=mock_llm,
            executor_type="react",
        )
        assert agent_react.executor_type == "react"

        # Valid prompts for plan_and_execute executor
        agent_plan = Agent(
            role="Plan Specialist",
            goal="Use Plan and Execute executor",
            backstory="Expert in planning",
            llm=mock_llm,
            executor_type="plan_and_execute",
        )
        assert agent_plan.executor_type == "plan_and_execute"

    def test_agent_with_native_prompt_string(self, mock_llm):
        """Test agent initialization with native string prompt."""
        agent = Agent(
            prompt="You are an expert Python developer.", llm=mock_llm, tools=[]
        )

        assert agent.prompt == "You are an expert Python developer."
        assert agent.role is None
        assert agent.goal is None
        assert agent.backstory is None

    def test_agent_with_native_prompt_system_message(self, mock_llm):
        """Test agent initialization with SystemMessage prompt."""
        from langchain_core.messages import SystemMessage

        system_msg = SystemMessage(content="You are a code reviewer.")
        agent = Agent(prompt=system_msg, llm=mock_llm, tools=[])

        assert agent.prompt == system_msg
        assert agent.role is None
        assert agent.goal is None
        assert agent.backstory is None

    def test_agent_with_native_prompt_callable(self, mock_llm):
        """Test agent initialization with callable prompt."""

        def dynamic_prompt(state):
            return "Dynamic prompt based on state"

        agent = Agent(prompt=dynamic_prompt, llm=mock_llm, tools=[])

        assert agent.prompt == dynamic_prompt
        assert callable(agent.prompt)
        assert agent.role is None
        assert agent.goal is None

    def test_agent_prompt_modes_are_mutually_exclusive(self, mock_llm):
        """Test that prompt and CrewAI attributes cannot be used together."""
        # Should raise error when prompt is used with role
        with pytest.raises(
            ValueError,
            match="Cannot use both custom 'prompt' and CrewAI-style attributes",
        ):
            Agent(prompt="Custom prompt", role="Developer", llm=mock_llm)

        # Should raise error when prompt is used with goal
        with pytest.raises(
            ValueError,
            match="Cannot use both custom 'prompt' and CrewAI-style attributes",
        ):
            Agent(prompt="Custom prompt", goal="Write code", llm=mock_llm)

        # Should raise error when prompt is used with backstory
        with pytest.raises(
            ValueError,
            match="Cannot use both custom 'prompt' and CrewAI-style attributes",
        ):
            Agent(prompt="Custom prompt", backstory="Expert developer", llm=mock_llm)

    def test_agent_prepare_executor_input_with_existing_messages_native_prompt(
        self, mock_llm
    ):
        """Test _prepare_executor_input in native prompt mode when messages already exist."""
        from langchain_core.messages import AIMessage, HumanMessage

        from langcrew.types import TaskSpec

        agent = Agent(prompt="You are a helpful assistant.", llm=mock_llm)

        # Mock the executor and task_spec
        mock_executor = Mock()
        task_spec = TaskSpec(
            description="Help with coding task", expected_output="Complete solution"
        )
        mock_executor.task_spec = task_spec
        agent.executor = mock_executor

        # Test case 1: Messages exist but last message is not HumanMessage
        input_data = {
            "messages": [
                HumanMessage(content="Initial request"),
                AIMessage(content="I understand"),
            ]
        }

        result = agent._prepare_executor_input(input_data)

        # Should append a HumanMessage with task details
        assert len(result["messages"]) == 3
        assert isinstance(result["messages"][-1], HumanMessage)
        assert "Help with coding task" in result["messages"][-1].content
        assert "Complete solution" in result["messages"][-1].content

        # Test case 2: Messages exist and last message is already HumanMessage
        input_data_human_last = {
            "messages": [
                AIMessage(content="Previous response"),
                HumanMessage(content="Current request"),
            ]
        }

        result_human_last = agent._prepare_executor_input(input_data_human_last)

        # Should not append additional HumanMessage
        assert len(result_human_last["messages"]) == 2
        assert isinstance(result_human_last["messages"][-1], HumanMessage)
        assert result_human_last["messages"][-1].content == "Current request"

    def test_agent_prepare_executor_input_with_context_native_prompt(self, mock_llm):
        """Test _prepare_executor_input in native prompt mode with context."""
        from langchain_core.messages import AIMessage, HumanMessage

        from langcrew.types import TaskSpec

        agent = Agent(prompt="You are a helpful assistant.", llm=mock_llm)

        # Mock the executor and task_spec
        mock_executor = Mock()
        task_spec = TaskSpec(
            description="Process the request", expected_output="Detailed response"
        )
        mock_executor.task_spec = task_spec
        agent.executor = mock_executor

        # Test with context and existing non-human last message
        input_data = {
            "messages": [AIMessage(content="Previous message")],
            "context": "Important background information",
        }

        result = agent._prepare_executor_input(input_data)

        # Should append HumanMessage with task details including context
        assert len(result["messages"]) == 2
        assert isinstance(result["messages"][-1], HumanMessage)
        task_content = result["messages"][-1].content
        assert "Process the request" in task_content
        assert "Detailed response" in task_content
        assert "Important background information" in task_content


class TestAgentExecution:
    """Test cases for Agent execution methods."""

    def test_agent_invoke_method(self, mock_llm):
        """Test agent invoke method with mocked executor."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "test result"}
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Execution Specialist",
                goal="Test execution",
                backstory="Expert in execution",
                llm=mock_llm,
            )

            # Test invoke method
            input_data = {"messages": []}
            result = agent.invoke(input_data)

            assert result == {"output": "test result"}
            mock_executor.invoke.assert_called_once()

    def test_agent_executor_invoke_method(self, mock_llm):
        """Test agent _executor_invoke method directly."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "executor result"}
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Execution Specialist",
                goal="Test execution",
                backstory="Expert in execution",
                llm=mock_llm,
            )

            # Manually set executor to avoid _create_executor logic
            agent.executor = mock_executor

            # Test _executor_invoke method directly
            prepared_input = {"messages": [], "test_data": "value"}
            result = agent._executor_invoke(prepared_input)

            assert result == {"output": "executor result"}
            mock_executor.invoke.assert_called_once_with(prepared_input, None)

    def test_agent_executor_invoke_with_config_and_kwargs(self, mock_llm):
        """Test agent _executor_invoke with config and kwargs."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "configured result"}
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Execution Specialist",
                goal="Test execution",
                backstory="Expert in execution",
                llm=mock_llm,
            )

            # Manually set executor
            agent.executor = mock_executor

            # Test with config and kwargs
            prepared_input = {"messages": []}
            config = {"configurable": {"thread_id": "test123"}}
            result = agent._executor_invoke(prepared_input, config, extra_param="test")

            assert result == {"output": "configured result"}
            mock_executor.invoke.assert_called_once_with(
                prepared_input, config, extra_param="test"
            )

    @pytest.mark.asyncio
    async def test_agent_ainvoke_method(self, mock_llm):
        """Test agent ainvoke method with mocked executor."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.ainvoke = AsyncMock(
                return_value={"output": "async test result"}
            )
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Async Execution Specialist",
                goal="Test async execution",
                backstory="Expert in async execution",
                llm=mock_llm,
            )

            # Test ainvoke method
            input_data = {"messages": []}
            result = await agent.ainvoke(input_data)

            assert result == {"output": "async test result"}
            mock_executor.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_agent_executor_ainvoke_method(self, mock_llm):
        """Test agent _executor_ainvoke method directly."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.ainvoke = AsyncMock(
                return_value={"output": "async executor result"}
            )
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Async Execution Specialist",
                goal="Test async execution",
                backstory="Expert in async execution",
                llm=mock_llm,
            )

            # Manually set executor
            agent.executor = mock_executor

            # Test _executor_ainvoke method directly
            prepared_input = {"messages": [], "async_data": "value"}
            result = await agent._executor_ainvoke(prepared_input)

            assert result == {"output": "async executor result"}
            mock_executor.ainvoke.assert_called_once_with(prepared_input, None)

    @pytest.mark.asyncio
    async def test_agent_executor_ainvoke_with_config_and_kwargs(self, mock_llm):
        """Test agent _executor_ainvoke with config and kwargs."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.ainvoke = AsyncMock(
                return_value={"output": "async configured result"}
            )
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Async Execution Specialist",
                goal="Test async execution",
                backstory="Expert in async execution",
                llm=mock_llm,
            )

            # Manually set executor
            agent.executor = mock_executor

            # Test with config and kwargs
            prepared_input = {"messages": []}
            config = {"configurable": {"thread_id": "async123"}}
            result = await agent._executor_ainvoke(
                prepared_input, config, async_param="test"
            )

            assert result == {"output": "async configured result"}
            mock_executor.ainvoke.assert_called_once_with(
                prepared_input, config, async_param="test"
            )

    def test_agent_create_executor_method(self, mock_llm):
        """Test agent _create_executor method."""
        with (
            patch("langcrew.agent.ExecutorFactory") as mock_factory,
            patch("langcrew.agent.PromptBuilder") as mock_prompt_builder,
        ):
            mock_executor = Mock()
            mock_factory.create_executor.return_value = mock_executor

            mock_builder_instance = Mock()
            mock_prompt_builder.return_value = mock_builder_instance
            mock_builder_instance.format_prompt.return_value = [Mock(), Mock()]

            agent = Agent(
                role="Executor Test Specialist",
                goal="Test executor creation",
                backstory="Expert in executor testing",
                llm=mock_llm,
            )

            # Test _create_executor method
            state = {"context": "test context"}
            agent._create_executor(state)

            # The method returns None but sets the executor attribute
            assert agent.executor == mock_executor
            mock_factory.create_executor.assert_called_once()

    def test_agent_create_default_task_spec(self, mock_llm):
        """Test agent _create_default_task_spec method."""
        agent = Agent(
            role="Task Spec Specialist",
            goal="Test task spec creation",
            backstory="Expert in task specifications",
            llm=mock_llm,
        )

        # Test with user input in messages
        from langchain_core.messages import HumanMessage

        state = {"messages": [HumanMessage(content="Please help me with this task")]}

        task_spec = agent._create_default_task_spec(state)

        assert "Please help me with this task" in task_spec.description
        assert (
            task_spec.expected_output
            == "Complete and accurate response to the user's request"
        )

        # Test without user input
        empty_state = {"messages": []}
        task_spec_no_input = agent._create_default_task_spec(empty_state)

        assert "professional capabilities" in task_spec_no_input.description
        assert "professional judgment" in task_spec_no_input.expected_output


class TestAgentErrorHandling:
    """Test cases for Agent error handling."""

    def test_agent_invalid_executor_type(self, mock_llm):
        """Test agent with invalid executor type."""
        # This should still work as pydantic doesn't validate Literal at runtime
        agent = Agent(
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
            llm=mock_llm,
            executor_type="invalid_type",  # This will be accepted but may cause issues later
        )

        assert agent.executor_type == "invalid_type"

    def test_agent_missing_llm(self):
        """Test agent creation without LLM."""
        # Should work as LLM is optional in the constructor
        agent = Agent(
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
        )

        assert agent.llm is None

    def test_agent_empty_tools_list(self, mock_llm):
        """Test agent with empty tools list."""
        agent = Agent(
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
            llm=mock_llm,
            tools=[],
        )

        assert agent.tools == []

    def test_agent_none_values(self, mock_llm):
        """Test agent with None values for optional parameters."""
        agent = Agent(
            role="Test Specialist",
            goal="Execute test operations",
            backstory="An experienced test specialist",
            llm=mock_llm,
            name=None,
            tools=None,
        )

        assert agent.name is None
        assert agent.tools == []  # None gets converted to empty list


class TestAgentExecutorErrorHandling:
    """Test error handling for Agent executor methods."""

    def test_executor_invoke_with_guardrail_failure(self, mock_llm):
        """Test _executor_invoke when input guardrail fails."""

        def failing_input_guard(data):
            return False, "Input validation failed"

        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Test Agent",
                goal="Test execution",
                backstory="Expert in testing",
                llm=mock_llm,
                input_guards=[failing_input_guard],
            )
            agent.executor = mock_executor

            # Test should raise GuardrailError
            from langcrew.guardrail import GuardrailError

            with pytest.raises(GuardrailError, match="Input validation failed"):
                agent._executor_invoke({"test": "data"})

            # Executor should not be called
            mock_executor.invoke.assert_not_called()

    def test_executor_invoke_with_output_guardrail_failure(self, mock_llm):
        """Test _executor_invoke when output guardrail fails."""

        def passing_input_guard(data):
            return True, "OK"

        def failing_output_guard(data):
            return False, "Output validation failed"

        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "result"}
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Test Agent",
                goal="Test execution",
                backstory="Expert in testing",
                llm=mock_llm,
                input_guards=[passing_input_guard],
                output_guards=[failing_output_guard],
            )
            agent.executor = mock_executor

            # Test should raise GuardrailError
            from langcrew.guardrail import GuardrailError

            with pytest.raises(GuardrailError, match="Output validation failed"):
                agent._executor_invoke({"test": "data"})

            # Executor should have been called
            mock_executor.invoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_executor_ainvoke_with_guardrail_failure(self, mock_llm):
        """Test _executor_ainvoke when input guardrail fails."""

        def failing_input_guard(data):
            return False, "Async input validation failed"

        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.ainvoke = AsyncMock()
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Async Test Agent",
                goal="Test async execution",
                backstory="Expert in async testing",
                llm=mock_llm,
                input_guards=[failing_input_guard],
            )
            agent.executor = mock_executor

            # Test should raise GuardrailError
            from langcrew.guardrail import GuardrailError

            with pytest.raises(GuardrailError, match="Async input validation failed"):
                await agent._executor_ainvoke({"test": "data"})

            # Executor should not be called
            mock_executor.ainvoke.assert_not_called()

    def test_executor_invoke_with_executor_exception(self, mock_llm):
        """Test _executor_invoke when executor raises exception."""

        def passing_guard(data):
            return True, "OK"

        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.side_effect = RuntimeError("Executor error")
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Test Agent",
                goal="Test execution",
                backstory="Expert in testing",
                llm=mock_llm,
                input_guards=[passing_guard],
                output_guards=[passing_guard],
            )
            agent.executor = mock_executor

            # Exception should propagate
            with pytest.raises(RuntimeError, match="Executor error"):
                agent._executor_invoke({"test": "data"})

    def test_executor_invoke_with_empty_input(self, mock_llm):
        """Test _executor_invoke with empty input."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "empty result"}
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Test Agent",
                goal="Test execution",
                backstory="Expert in testing",
                llm=mock_llm,
            )
            agent.executor = mock_executor

            # Should handle empty dict
            result = agent._executor_invoke({})
            assert result == {"output": "empty result"}
            mock_executor.invoke.assert_called_once_with({}, None)

    def test_executor_invoke_with_none_config(self, mock_llm):
        """Test _executor_invoke with None config explicitly."""
        with patch("langcrew.agent.ExecutorFactory") as mock_factory:
            mock_executor = Mock()
            mock_executor.invoke.return_value = {"output": "none config result"}
            mock_factory.create_executor.return_value = mock_executor

            agent = Agent(
                role="Test Agent",
                goal="Test execution",
                backstory="Expert in testing",
                llm=mock_llm,
            )
            agent.executor = mock_executor

            # Test with explicit None config
            result = agent._executor_invoke({"messages": []}, None)
            assert result == {"output": "none config result"}
            mock_executor.invoke.assert_called_once_with({"messages": []}, None)
