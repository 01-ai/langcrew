"""
Unit tests for LangCrew Agent class.

These tests verify the functionality of the Agent class
and its integration with various components.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain_core.language_models.fake import FakeListLLM
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from langcrew.agent import Agent


class TestAgent:
    """Test cases for Agent class."""

    def test_agent_initialization_basic(self, mock_llm: FakeListLLM):
        """Test basic agent initialization with prompt."""
        agent = Agent(
            prompt="You are a test specialist.",
            llm=mock_llm,
        )

        assert agent.prompt == "You are a test specialist."
        assert agent.llm == mock_llm
        assert agent.tools == []
        assert agent.verbose is False

    def test_agent_initialization_with_tools(self, mock_llm, mock_tool):
        """Test agent initialization with tools."""
        agent = Agent(
            prompt="You are a tool specialist.",
            llm=mock_llm,
            tools=[mock_tool],
        )

        assert mock_tool in agent.tools
        assert len(agent.tools) == 1

    def test_agent_initialization_with_name(self, mock_llm):
        """Test agent initialization with custom name."""
        agent = Agent(
            name="custom_agent",
            prompt="You are a test specialist.",
            llm=mock_llm,
        )

        assert agent.name == "custom_agent"

    def test_agent_initialization_with_mcp(self, mock_llm):
        """Test agent initialization with MCP configuration (lazy loaded)."""
        mcp_servers = {"test_server": {"command": "test"}}

        agent = Agent(
            prompt="You are an MCP specialist.",
            llm=mock_llm,
            mcp_servers=mcp_servers,
        )

        assert agent.mcp_servers == mcp_servers
        assert agent._lazy_initialized is False

    def test_agent_str_representation(self, mock_llm):
        """Test agent string representation."""
        agent = Agent(
            name="test_agent",
            llm=mock_llm,
        )

        repr_str = repr(agent)
        assert "test_agent" in repr_str

    def test_agent_str_representation_no_name(self, mock_llm):
        """Test agent string representation without name."""
        agent = Agent(llm=mock_llm)

        repr_str = repr(agent)
        assert "unnamed" in repr_str

    def test_agent_graph_attribute(self, mock_llm):
        """Test agent has graph attribute."""
        agent = Agent(
            prompt="You are a graph specialist.",
            llm=mock_llm,
        )

        assert hasattr(agent, "graph")

    def test_agent_validation_without_prompt(self, mock_llm):
        """Test agent creation without prompt works (prompt is optional)."""
        agent = Agent(llm=mock_llm)
        assert agent.prompt is None

    def test_agent_memory_config_defaults_to_none(self, mock_llm):
        """Test agent memory_config defaults to None (memory is managed by Crew)."""
        agent = Agent(
            prompt="You are a memory specialist.",
            llm=mock_llm,
        )

        assert agent.memory_config is None

    def test_agent_debug_mode(self, mock_llm):
        """Test agent debug mode configuration."""
        agent = Agent(
            prompt="You are a debug specialist.",
            llm=mock_llm,
            debug=True,
        )

        assert agent.debug is True

    def test_agent_verbose_mode(self, mock_llm):
        """Test agent verbose mode configuration."""
        agent = Agent(
            prompt="You are a verbose specialist.",
            llm=mock_llm,
            verbose=True,
        )

        assert agent.verbose is True

    def test_agent_initialization_with_guardrails(self, mock_llm):
        """Test agent initialization with guardrail functions."""
        from langcrew.guardrail import input_guard, output_guard

        @input_guard
        def sample_input_guard(data):
            return True, "Input is valid"

        @output_guard
        def sample_output_guard(data):
            return True, "Output is valid"

        agent = Agent(
            prompt="You are a guardrail specialist.",
            llm=mock_llm,
            input_guards=[sample_input_guard],
            output_guards=[sample_output_guard],
        )

        assert len(agent.input_guards) == 1
        assert len(agent.output_guards) == 1
        assert agent.input_guards[0] == sample_input_guard
        assert agent.output_guards[0] == sample_output_guard

    def test_agent_initialization_with_checkpointer(self, mock_llm):
        """Test agent initialization with checkpointer parameter."""
        agent = Agent(
            prompt="You are a stateful agent.",
            llm=mock_llm,
            checkpointer=True,
        )

        assert agent.checkpointer is True

    def test_agent_initialization_with_middleware(self, mock_llm):
        """Test agent initialization with middleware."""
        mock_middleware = Mock()
        agent = Agent(
            prompt="You are a middleware agent.",
            llm=mock_llm,
            middleware=[mock_middleware],
        )

        assert len(agent.middleware) == 1

    def test_agent_initialization_with_response_format(self, mock_llm):
        """Test agent initialization with response_format."""
        from pydantic import BaseModel

        class TestFormat(BaseModel):
            answer: str

        agent = Agent(
            prompt="You are a structured agent.",
            llm=mock_llm,
            response_format=TestFormat,
        )

        assert agent.response_format == TestFormat

    def test_agent_lazy_initialization_flag(self, mock_llm):
        """Test that lazy initialization flag starts as False."""
        agent = Agent(
            prompt="You are a lazy agent.",
            llm=mock_llm,
            mcp_servers={"server": {"command": "test"}},
        )

        assert agent._lazy_initialized is False

    def test_agent_rejects_unknown_kwargs(self, mock_llm):
        """Agent constructor should reject unknown keyword arguments."""
        with pytest.raises(TypeError):
            Agent(
                prompt="You are a test agent.",
                llm=mock_llm,
                handoff_to=["agent1"],
            )

    def test_agent_with_system_message_prompt(self, mock_llm):
        """Test agent initialization with SystemMessage prompt."""
        system_msg = SystemMessage(content="You are a code reviewer.")
        agent = Agent(prompt=system_msg, llm=mock_llm)

        assert agent.prompt == system_msg

    def test_agent_with_callable_prompt(self, mock_llm):
        """Test agent initialization with callable prompt."""
        def dynamic_prompt(state):
            return "Dynamic prompt based on state"

        agent = Agent(prompt=dynamic_prompt, llm=mock_llm)

        assert agent.prompt == dynamic_prompt
        assert callable(agent.prompt)

    def test_agent_prepare_graph_input_with_existing_messages(self, mock_llm):
        """Test _prepare_graph_input when messages already exist."""
        agent = Agent(prompt="You are a helpful assistant.", llm=mock_llm)

        input_data = {
            "messages": [
                HumanMessage(content="Initial request"),
                AIMessage(content="I understand"),
            ]
        }

        result = agent._prepare_graph_input(input_data)

        assert len(result["messages"]) == 3
        assert isinstance(result["messages"][-1], HumanMessage)
        assert "Please continue with the current request." in result["messages"][-1].content

        input_data_human_last = {
            "messages": [
                AIMessage(content="Previous response"),
                HumanMessage(content="Current request"),
            ]
        }

        result_human_last = agent._prepare_graph_input(input_data_human_last)
        assert len(result_human_last["messages"]) == 2
        assert result_human_last["messages"][-1].content == "Current request"

    def test_agent_prepare_graph_input_with_context(self, mock_llm):
        """Test _prepare_graph_input with context."""
        agent = Agent(prompt="You are a helpful assistant.", llm=mock_llm)

        input_data = {
            "messages": [AIMessage(content="Previous message")],
            "context": "Important background information",
        }

        result = agent._prepare_graph_input(input_data)

        assert len(result["messages"]) == 2
        assert isinstance(result["messages"][-1], HumanMessage)
        fallback_content = result["messages"][-1].content
        assert "Please continue with the current request." in fallback_content
        assert "Important background information" in fallback_content


class TestAgentExecution:
    """Test cases for Agent execution methods."""

    def test_agent_invoke_method(self, mock_llm):
        """Test agent invoke method with mocked executor."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "test result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an execution specialist.",
                llm=mock_llm,
            )

            input_data = {"messages": []}
            result = agent.invoke(input_data)

            assert result == {"output": "test result"}
            mock_graph.invoke.assert_called_once()

    def test_agent_graph_invoke_method(self, mock_llm):
        """Test agent _graph_invoke method directly."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "executor result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an execution specialist.",
                llm=mock_llm,
            )
            agent.graph = mock_graph

            prepared_input = {"messages": [], "test_data": "value"}
            result = agent._graph_invoke(prepared_input)

            assert result == {"output": "executor result"}
            mock_graph.invoke.assert_called_once_with(prepared_input, None)

    def test_agent_graph_invoke_with_config_and_kwargs(self, mock_llm):
        """Test agent _graph_invoke with config and kwargs."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "configured result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an execution specialist.",
                llm=mock_llm,
            )
            agent.graph = mock_graph

            prepared_input = {"messages": []}
            config = {"configurable": {"thread_id": "test123"}}
            result = agent._graph_invoke(prepared_input, config, extra_param="test")

            assert result == {"output": "configured result"}
            mock_graph.invoke.assert_called_once_with(
                prepared_input, config, extra_param="test"
            )

    @pytest.mark.asyncio
    async def test_agent_ainvoke_method(self, mock_llm):
        """Test agent ainvoke method with mocked executor."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.ainvoke = AsyncMock(
                return_value={"output": "async test result"}
            )
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an async execution specialist.",
                llm=mock_llm,
            )

            input_data = {"messages": []}
            result = await agent.ainvoke(input_data)

            assert result == {"output": "async test result"}
            mock_graph.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_agent_graph_ainvoke_method(self, mock_llm):
        """Test agent _graph_ainvoke method directly."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.ainvoke = AsyncMock(
                return_value={"output": "async executor result"}
            )
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an async execution specialist.",
                llm=mock_llm,
            )
            agent.graph = mock_graph

            prepared_input = {"messages": [], "async_data": "value"}
            result = await agent._graph_ainvoke(prepared_input)

            assert result == {"output": "async executor result"}
            mock_graph.ainvoke.assert_called_once_with(prepared_input, None)

    @pytest.mark.asyncio
    async def test_agent_graph_ainvoke_with_config_and_kwargs(self, mock_llm):
        """Test agent _graph_ainvoke with config and kwargs."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.ainvoke = AsyncMock(
                return_value={"output": "async configured result"}
            )
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an async execution specialist.",
                llm=mock_llm,
            )
            agent.graph = mock_graph

            prepared_input = {"messages": []}
            config = {"configurable": {"thread_id": "async123"}}
            result = await agent._graph_ainvoke(
                prepared_input, config, async_param="test"
            )

            assert result == {"output": "async configured result"}
            mock_graph.ainvoke.assert_called_once_with(
                prepared_input, config, async_param="test"
            )

    def test_agent_create_graph_method(self, mock_llm):
        """Test agent _create_graph method."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a graph test specialist.",
                llm=mock_llm,
            )

            state = {"context": "test context"}
            agent._create_graph(state)

            assert agent.graph == mock_graph
            mock_create_agent.assert_called_once()

    def test_agent_build_fallback_request_message(self, mock_llm):
        """Test agent _build_fallback_request_message method."""
        agent = Agent(
            prompt="You are a task specialist.",
            llm=mock_llm,
        )

        state = {"messages": [HumanMessage(content="Please help me with this task")]}
        assert (
            agent._build_fallback_request_message(state)
            == "Please help me with this task"
        )

        context_state = {"messages": [], "context": "Important background information"}
        message_with_context = agent._build_fallback_request_message(context_state)
        assert "Please continue with the current request." in message_with_context
        assert "Important background information" in message_with_context

        empty_state = {"messages": []}
        assert (
            agent._build_fallback_request_message(empty_state)
            == "Please continue with the current request."
        )


class TestAgentGuardrails:
    """Test cases for Agent guardrail integration."""

    def test_agent_guardrails_with_prepared_input(self, mock_llm):
        """Test that agent guardrails receive prepared_input format."""
        from langcrew.guardrail import input_guard, output_guard

        received_input_data = None
        received_output_data = None

        @input_guard
        def test_input_guard(data):
            nonlocal received_input_data
            received_input_data = data
            assert isinstance(data, dict)
            assert "messages" in data
            return True, "OK"

        @output_guard
        def test_output_guard(data):
            nonlocal received_output_data
            received_output_data = data
            return True, "OK"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "test result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a guardrail test agent.",
                llm=mock_llm,
                input_guards=[test_input_guard],
                output_guards=[test_output_guard],
            )

            input_data = {"messages": []}
            agent.invoke(input_data)

            assert received_input_data is not None
            assert received_output_data is not None
            assert "messages" in received_input_data
            assert received_output_data == {"output": "test result"}

    @pytest.mark.asyncio
    async def test_agent_async_guardrails_with_prepared_input(self, mock_llm):
        """Test that agent async guardrails receive prepared_input format."""
        from langcrew.guardrail import input_guard, output_guard

        received_input_data = None
        received_output_data = None

        @input_guard
        def test_async_input_guard(data):
            nonlocal received_input_data
            received_input_data = data
            assert isinstance(data, dict)
            assert "messages" in data
            return True, "OK"

        @output_guard
        def test_async_output_guard(data):
            nonlocal received_output_data
            received_output_data = data
            return True, "OK"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.ainvoke = AsyncMock(
                return_value={"output": "async test result"}
            )
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an async guardrail test agent.",
                llm=mock_llm,
                input_guards=[test_async_input_guard],
                output_guards=[test_async_output_guard],
            )

            input_data = {"messages": []}
            await agent.ainvoke(input_data)

            assert received_input_data is not None
            assert received_output_data is not None
            assert "messages" in received_input_data
            assert received_output_data == {"output": "async test result"}

    def test_agent_guardrails_with_langgraph_messages(self, mock_llm):
        """Test agent guardrails with actual LangGraph message objects."""
        from langcrew.guardrail import input_guard

        received_input_data = None

        @input_guard
        def message_format_guard(data):
            nonlocal received_input_data
            received_input_data = data
            if isinstance(data, dict) and "messages" in data:
                messages = data["messages"]
                if messages and isinstance(messages[0], HumanMessage):
                    return True, "Valid LangGraph format"
            return False, "Invalid format"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {
                "messages": [AIMessage(content="Response")]
            }
            mock_create_agent.return_value = mock_graph

            human_msg = HumanMessage(content="Test message")

            agent = Agent(
                prompt="You are a message format test agent.",
                llm=mock_llm,
                input_guards=[message_format_guard],
            )

            input_data = {"messages": [human_msg]}
            agent.invoke(input_data)

            assert received_input_data is not None
            assert "messages" in received_input_data
            messages = received_input_data["messages"]
            assert len(messages) > 0
            assert isinstance(messages[0], HumanMessage)


class TestAgentErrorHandling:
    """Test cases for Agent error handling."""

    def test_agent_missing_llm(self):
        """Test agent creation without LLM."""
        agent = Agent(prompt="You are a test specialist.")
        assert agent.llm is None

    def test_agent_empty_tools_list(self, mock_llm):
        """Test agent with empty tools list."""
        agent = Agent(
            prompt="You are a test specialist.",
            llm=mock_llm,
            tools=[],
        )
        assert agent.tools == []

    def test_agent_none_values(self, mock_llm):
        """Test agent with None values for optional parameters."""
        agent = Agent(
            prompt="You are a test specialist.",
            llm=mock_llm,
            name=None,
            tools=None,
        )
        assert agent.name is None
        assert agent.tools == []

    def test_graph_invoke_with_guardrail_failure(self, mock_llm):
        """Test _graph_invoke when input guardrail fails."""
        def failing_input_guard(data):
            return False, "Input validation failed"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a test agent.",
                llm=mock_llm,
                input_guards=[failing_input_guard],
            )
            agent.graph = mock_graph

            from langcrew.guardrail import GuardrailError
            with pytest.raises(GuardrailError, match="Input validation failed"):
                agent._graph_invoke({"test": "data"})

            mock_graph.invoke.assert_not_called()

    def test_graph_invoke_with_output_guardrail_failure(self, mock_llm):
        """Test _graph_invoke when output guardrail fails."""
        def passing_input_guard(data):
            return True, "OK"

        def failing_output_guard(data):
            return False, "Output validation failed"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a test agent.",
                llm=mock_llm,
                input_guards=[passing_input_guard],
                output_guards=[failing_output_guard],
            )
            agent.graph = mock_graph

            from langcrew.guardrail import GuardrailError
            with pytest.raises(GuardrailError, match="Output validation failed"):
                agent._graph_invoke({"test": "data"})

            mock_graph.invoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_graph_ainvoke_with_guardrail_failure(self, mock_llm):
        """Test _graph_ainvoke when input guardrail fails."""
        def failing_input_guard(data):
            return False, "Async input validation failed"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.ainvoke = AsyncMock()
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are an async test agent.",
                llm=mock_llm,
                input_guards=[failing_input_guard],
            )
            agent.graph = mock_graph

            from langcrew.guardrail import GuardrailError
            with pytest.raises(GuardrailError, match="Async input validation failed"):
                await agent._graph_ainvoke({"test": "data"})

            mock_graph.ainvoke.assert_not_called()

    def test_graph_invoke_with_graph_exception(self, mock_llm):
        """Test _graph_invoke when graph raises exception."""
        def passing_guard(data):
            return True, "OK"

        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.side_effect = RuntimeError("Executor error")
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a test agent.",
                llm=mock_llm,
                input_guards=[passing_guard],
                output_guards=[passing_guard],
            )
            agent.graph = mock_graph

            with pytest.raises(RuntimeError, match="Executor error"):
                agent._graph_invoke({"test": "data"})

    def test_graph_invoke_with_empty_input(self, mock_llm):
        """Test _graph_invoke with empty input."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "empty result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a test agent.",
                llm=mock_llm,
            )
            agent.graph = mock_graph

            result = agent._graph_invoke({})
            assert result == {"output": "empty result"}
            mock_graph.invoke.assert_called_once_with({}, None)

    def test_graph_invoke_with_none_config(self, mock_llm):
        """Test _graph_invoke with None config explicitly."""
        with patch("langcrew.agent.create_agent") as mock_create_agent:
            mock_graph = Mock()
            mock_graph.invoke.return_value = {"output": "none config result"}
            mock_create_agent.return_value = mock_graph

            agent = Agent(
                prompt="You are a test agent.",
                llm=mock_llm,
            )
            agent.graph = mock_graph

            result = agent._graph_invoke({"messages": []}, None)
            assert result == {"output": "none config result"}
            mock_graph.invoke.assert_called_once_with({"messages": []}, None)


class TestAgentNoDeprecatedParams:
    """Verify that removed parameters are no longer accepted."""

    def test_no_role_parameter(self, mock_llm):
        """Agent should not accept role parameter."""
        with pytest.raises(TypeError):
            Agent(role="Test Role", llm=mock_llm)

    def test_no_goal_parameter(self, mock_llm):
        """Agent should not accept goal parameter."""
        with pytest.raises(TypeError):
            Agent(goal="Test Goal", llm=mock_llm)

    def test_no_backstory_parameter(self, mock_llm):
        """Agent should not accept backstory parameter."""
        with pytest.raises(TypeError):
            Agent(backstory="Test Backstory", llm=mock_llm)

    def test_no_config_parameter(self, mock_llm):
        """Agent should not accept config parameter."""
        with pytest.raises(TypeError):
            Agent(config={"role": "Test"}, llm=mock_llm)

    def test_no_hitl_parameter(self, mock_llm):
        """Agent should not accept hitl parameter."""
        with pytest.raises(TypeError):
            Agent(hitl=Mock(), llm=mock_llm)

    def test_no_memory_parameter(self, mock_llm):
        """Agent should not accept memory parameter (managed by Crew)."""
        with pytest.raises(TypeError):
            Agent(memory=True, llm=mock_llm)

    def test_no_warning_with_prompt(self, mock_llm):
        """Using prompt parameter should work without any warnings."""
        import warnings
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            agent = Agent(prompt="You are a helpful assistant", llm=mock_llm)

            assert len(w) == 0
            assert agent.prompt == "You are a helpful assistant"
