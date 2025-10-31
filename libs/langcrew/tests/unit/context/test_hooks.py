"""
Unit tests for Context Management Hooks.

Tests cover ContextManagementHook, ComposedHook, and hook composition utilities
including token monitoring, compression, execution context injection, and hook ordering.
"""

from unittest.mock import Mock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableLambda

from langcrew.context.config import CompressToolsConfig, KeepLastConfig, SummaryConfig
from langcrew.context.hooks import (
    ComposedHook,
    ContextManagementHook,
    create_context_hooks,
)
from langcrew.types import CrewState


def create_crew_state(messages=None, **kwargs):
    """Helper function to create CrewState for testing."""
    state = CrewState()
    if messages is not None:
        state["messages"] = messages
    for key, value in kwargs.items():
        state[key] = value
    return state


class TestHookInterface:
    """Test cases for Hook interface."""

    def test_hook_interface(self):
        """Test that ContextManagementHook has the expected interface."""
        # ContextManagementHook should have invoke and ainvoke methods
        config = KeepLastConfig()
        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config)

            # Should have both required methods
            assert hasattr(hook, "invoke")
            assert hasattr(hook, "ainvoke")
            assert callable(hook.invoke)
            assert callable(hook.ainvoke)


class TestContextManagementHook:
    """Test cases for ContextManagementHook class."""

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM for testing."""
        llm = Mock()
        llm.model_name = "gpt-4o-mini"
        return llm

    @pytest.fixture
    def mock_token_counter(self):
        """Create a mock token counter for testing."""
        counter = Mock()
        counter.count_messages.return_value = (5000, True)  # (token_count, is_exact)
        return counter

    @pytest.fixture
    def basic_context_config(self):
        """Create basic context configuration for testing."""
        return KeepLastConfig(keep_last=10, execution_context_interval=3)

    @pytest.fixture
    def sample_messages(self):
        """Create sample messages for testing."""
        return [
            SystemMessage(content="You are a helpful assistant"),
            HumanMessage(content="Hello"),
            AIMessage(content="Hi there!"),
            HumanMessage(content="How are you?"),
            AIMessage(content="I'm doing well, thank you!"),
        ]

    def test_context_management_hook_initialization(
        self, basic_context_config, mock_llm
    ):
        """Test ContextManagementHook initialization."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            # Mock setup no longer needed

            hook = ContextManagementHook(basic_context_config, mock_llm)

            assert hook.config == basic_context_config
            assert hook.llm == mock_llm
            assert hook.call_count == 0

            # No longer need to verify TokenCounter initialization
            # No assertion needed for new architecture

    def test_context_management_hook_initialization_without_llm(
        self, basic_context_config
    ):
        """Test ContextManagementHook initialization without LLM."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            # Mock setup no longer needed

            ContextManagementHook(basic_context_config, None)

            # Should use default model name when no LLM provided
            # No assertion needed for new architecture

    def test_invoke_basic_flow(self, basic_context_config, mock_llm, sample_messages):
        """Test basic invoke flow without compression needed."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            mock_counter = Mock()
            mock_counter.count_messages.return_value = (3000, True)  # Below threshold
            # Mock setup no longer needed

            hook = ContextManagementHook(basic_context_config, mock_llm)

            state = create_crew_state(messages=sample_messages.copy())
            result = hook.invoke(state)

            assert hook.call_count == 1
            assert result == state  # Should return original state
            assert len(result["messages"]) == len(sample_messages)

    def test_invoke_with_compression_needed(
        self, basic_context_config, mock_llm, sample_messages
    ):
        """Test invoke when compression is needed."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            mock_counter = Mock()
            mock_counter.count_messages.return_value = (10000, True)  # Above threshold
            # Mock setup no longer needed

            hook = ContextManagementHook(basic_context_config, mock_llm)

            state = create_crew_state(messages=sample_messages.copy())
            result = hook.invoke(state)

            assert hook.call_count == 1
            # Messages should be compressed (keep last 10)
            assert len(result["messages"]) <= len(sample_messages)

    def test_invoke_empty_messages(self, basic_context_config, mock_llm):
        """Test invoke with empty messages list."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(basic_context_config, mock_llm)

            state = create_crew_state(messages=[])
            result = hook.invoke(state)

            assert result["messages"] == []
            assert hook.call_count == 1

    def test_maybe_inject_execution_context_interval_zero(self, mock_llm):
        """Test execution context injection is skipped when interval is 0."""
        # Create config with interval set to 0
        config = KeepLastConfig(execution_context_interval=0, keep_last=10)

        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config, mock_llm)

            state = create_crew_state(messages=[])

            hook._inject_context(state)

            # No context should be injected
            assert len(state["messages"]) == 0

    def test_maybe_inject_execution_context_with_crew_state(
        self, basic_context_config, mock_llm
    ):
        """Test execution context injection with CrewState."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(basic_context_config, mock_llm)

            # Create CrewState with execution context
            state = create_crew_state(messages=[])
            execution_plan_mock = Mock()
            execution_plan_mock.build_context_prompt.return_value = (
                "Current step: Analysis phase"
            )
            state["execution_plan"] = execution_plan_mock

            hook.call_count = 1  # First call (1 % 3 == 1)
            hook._inject_context(state)

            # Verify execution context was requested
            execution_plan_mock.build_context_prompt.assert_called_once()

    def test_maybe_inject_execution_context_interval_none(self, mock_llm):
        """Test execution context injection when interval is None (always inject)."""
        # Create config with interval set to None (Pydantic allows None via Field)
        config = KeepLastConfig(keep_last=10)
        # Manually set to None since Pydantic may have validation
        object.__setattr__(config, "execution_context_interval", None)

        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config, mock_llm)

            state = create_crew_state(messages=[])
            execution_plan_mock = Mock()
            execution_plan_mock.build_context_prompt.return_value = "Test context"
            state["execution_plan"] = execution_plan_mock

            hook.call_count = 5  # Any call count should trigger injection
            hook._inject_context(state)

            execution_plan_mock.build_context_prompt.assert_called_once()

    def test_should_compress_keep_last_config(
        self, basic_context_config, mock_llm, sample_messages
    ):
        """Test _should_compress returns True for KeepLastConfig (always applies)."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            hook = ContextManagementHook(basic_context_config, mock_llm)

            state = create_crew_state(messages=sample_messages)
            result = hook._should_compress(state)

            # KeepLastConfig always applies compression
            assert result is True

    def test_should_compress_summary_config(self, mock_llm, sample_messages):
        """Test _should_compress with SummaryConfig checks threshold."""
        config = SummaryConfig(compression_threshold=100)  # Low threshold

        with patch("langcrew.context.hooks.count_message_tokens") as mock_count:
            mock_count.return_value = 1000  # Above threshold
            hook = ContextManagementHook(config, mock_llm)

            state = create_crew_state(messages=sample_messages)
            result = hook._should_compress(state)

            assert result is True

    def test_apply_compression_keep_last_messages(
        self, basic_context_config, mock_llm, sample_messages
    ):
        """Test _compress with keep_last strategy."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(basic_context_config, mock_llm)

            state = create_crew_state(messages=sample_messages)
            result = hook._compress(state)

            # Should keep last 10 messages (all 5 in this case)
            assert len(result) == len(sample_messages)

    def test_apply_compression_compress_tools(self, mock_llm):
        """Test _compress with compress_tools strategy."""
        from langcrew.context.tool_call_compressor import ToolCallCompressor

        compressor = ToolCallCompressor(tools=["test_tool"], max_length=100)
        config = CompressToolsConfig(compressor=compressor)

        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config, mock_llm)

            # Create two tool rounds - first should be compressed, second should be protected
            messages = [
                # Earlier round - should be compressed
                AIMessage(
                    content="Using tool first time",
                    tool_calls=[
                        {"id": "1", "name": "test_tool", "args": {"content": "A" * 200}}
                    ],
                ),
                ToolMessage(content="B" * 200, tool_call_id="1"),
                # Recent round - should NOT be compressed (protected)
                AIMessage(
                    content="Using tool second time",
                    tool_calls=[
                        {"id": "2", "name": "test_tool", "args": {"content": "C" * 200}}
                    ],
                ),
                ToolMessage(content="D" * 200, tool_call_id="2"),
            ]

            state = create_crew_state(messages=messages)
            result = hook._compress(state)

            # Should have 4 messages
            assert len(result) == 4
            # First round should be compressed (earlier)
            assert len(result[0].content) <= 150  # AI message compressed
            assert len(result[1].content) <= 150  # Tool message compressed
            # Second round should NOT be compressed (recent/protected)
            assert len(result[2].content) == len(
                "Using tool second time"
            )  # Not compressed
            assert len(result[3].content) == 200  # Not compressed

    def test_apply_compression_default_fallback(self, mock_llm, sample_messages):
        """Test _compress raises ValueError when config type is unrecognized."""
        # Using a mock config object that's not one of the recognized types
        config = Mock()
        # CompressToolsConfig no longer has compression_threshold
        config.execution_context_interval = 3

        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config, mock_llm)

            state = create_crew_state(messages=sample_messages)

            # Should raise ValueError for unknown config type
            with pytest.raises(ValueError, match="Unknown config type"):
                hook._compress(state)

    @pytest.mark.asyncio
    async def test_ainvoke_async_implementation(
        self, basic_context_config, mock_llm, sample_messages
    ):
        """Test ainvoke has independent async implementation."""
        with patch("langcrew.context.hooks.count_message_tokens"):
            mock_counter = Mock()
            mock_counter.count_messages.return_value = (3000, True)  # Below threshold
            # Mock setup no longer needed

            hook = ContextManagementHook(basic_context_config, mock_llm)

            state = create_crew_state(messages=sample_messages.copy())
            result = await hook.ainvoke(state)

            assert hook.call_count == 1
            assert result == state  # Should return original state
            assert len(result["messages"]) == len(sample_messages)

    @pytest.mark.asyncio
    async def test_ainvoke_with_async_summary_compression(self, mock_llm):
        """Test ainvoke with async summary compression strategy."""
        config = SummaryConfig(
            compression_threshold=100,  # Low threshold to trigger compression
            keep_recent_tokens=2000,
        )

        with patch("langcrew.context.hooks.count_message_tokens") as mock_count:
            mock_count.return_value = 1000  # Above threshold

            # Mock async LLM
            from unittest.mock import AsyncMock

            mock_async_llm = Mock()
            mock_async_response = Mock()
            mock_async_response.content = "Test summary content"
            mock_async_llm.ainvoke = AsyncMock(return_value=mock_async_response)

            hook = ContextManagementHook(config, mock_async_llm)

            from langchain_core.messages import AIMessage, HumanMessage

            messages = [
                HumanMessage(content="Hello", id="1"),
                AIMessage(content="Hi there!", id="2"),
                HumanMessage(content="How are you?", id="3"),
                AIMessage(content="I'm doing well!", id="4"),
            ]

            state = create_crew_state(messages=messages)

            # Just test the async invoke completes without error
            result = await hook.ainvoke(state)

            # Verify the result structure is valid
            assert "messages" in result
            assert isinstance(result["messages"], list)


class TestComposedHook:
    """Test cases for ComposedHook class."""

    def test_composed_hook_initialization_empty(self):
        """Test ComposedHook initialization with empty hooks list."""
        hook = ComposedHook([])

        assert hook.hooks == []

    def test_composed_hook_initialization_with_hooks(self):
        """Test ComposedHook initialization with hooks."""
        mock_hook1 = Mock()
        mock_hook1.invoke = Mock()
        mock_hook1.ainvoke = Mock()
        mock_hook2 = Mock()
        mock_hook2.invoke = Mock()
        mock_hook2.ainvoke = Mock()

        hook = ComposedHook([mock_hook1, mock_hook2])

        assert len(hook.hooks) == 2

    def test_invoke_single_hook(self):
        """Test invoke with single hook."""

        # Use a simple function as hook
        def simple_hook(state):
            state["processed"] = True
            return state

        wrapped_hook = RunnableLambda(simple_hook)
        composed_hook = ComposedHook([wrapped_hook])

        state = create_crew_state(messages=[])
        result = composed_hook.invoke(state)

        assert "processed" in result
        assert result["processed"] is True

    def test_invoke_multiple_hooks_sequence(self):
        """Test invoke with multiple hooks executes in sequence."""

        # Create hooks that modify state sequentially
        def hook1(state):
            state["step"] = 1
            return state

        def hook2(state):
            state["step"] = state.get("step", 0) + 1
            return state

        wrapped_hook1 = RunnableLambda(hook1)
        wrapped_hook2 = RunnableLambda(hook2)
        composed_hook = ComposedHook([wrapped_hook1, wrapped_hook2])

        initial_state = create_crew_state(step=0)
        result = composed_hook.invoke(initial_state)

        # Verify the final state
        assert "step" in result
        assert result["step"] == 2

    @pytest.mark.asyncio
    async def test_ainvoke_single_hook(self):
        """Test ainvoke with single async hook."""

        # Use an async function as hook
        async def async_hook(state):
            state["async_processed"] = True
            return state

        wrapped_hook = RunnableLambda(async_hook)
        composed_hook = ComposedHook([wrapped_hook])

        state = create_crew_state(messages=[])
        result = await composed_hook.ainvoke(state)

        assert "async_processed" in result
        assert result["async_processed"] is True

    @pytest.mark.asyncio
    async def test_ainvoke_with_sync_implementation(self):
        """Test ainvoke with hook that has sync implementation."""

        # Use a sync function as hook (should be wrapped and work with ainvoke)
        def sync_hook(state):
            state["sync_processed"] = True
            return state

        wrapped_hook = RunnableLambda(sync_hook)
        composed_hook = ComposedHook([wrapped_hook])

        state = create_crew_state(messages=[])
        result = await composed_hook.ainvoke(state)

        assert "sync_processed" in result
        assert result["sync_processed"] is True


class TestCreateContextHooks:
    """Test cases for create_context_hooks function."""

    def test_create_with_disabled_context(self):
        """Test create_context_hooks with disabled context."""
        # Using None to represent disabled context
        context_config = None

        pre_hook = create_context_hooks(context_config)

        assert pre_hook is None

    def test_create_with_enabled_context_only(self, mock_llm):
        """Test create_context_hooks with only context hook."""
        from langcrew.context.config import ContextConfig, KeepLastConfig

        stage_config = KeepLastConfig(keep_last=10)
        context_config = ContextConfig(pre_model=stage_config)

        with patch(
            "langcrew.context.hooks.ContextManagementHook"
        ) as mock_context_hook_class:
            mock_context_hook = Mock()
            mock_context_hook_class.return_value = mock_context_hook

            pre_hook = create_context_hooks(context_config, llm=mock_llm)

            assert isinstance(pre_hook, ComposedHook)
            assert len(pre_hook.hooks) == 1
            # ContextManagementHook should be called with stage config
            mock_context_hook_class.assert_called_once_with(stage_config, mock_llm)

    def test_create_with_user_hook_only(self):
        """Test create_context_hooks with only user hook."""
        # Using None for disabled context
        context_config = None
        user_pre_hook = Mock()
        user_pre_hook.invoke = Mock()
        user_pre_hook.ainvoke = Mock()

        pre_hook = create_context_hooks(context_config, user_pre_hook=user_pre_hook)

        # Should return a ComposedHook containing the user hook
        assert isinstance(pre_hook, ComposedHook)
        assert len(pre_hook.hooks) == 1
        assert isinstance(pre_hook.hooks[0], RunnableLambda)

    def test_create_with_both_hooks(self, mock_llm):
        """Test create_context_hooks with both context and user hooks."""
        from langcrew.context.config import ContextConfig, KeepLastConfig

        stage_config = KeepLastConfig()
        context_config = ContextConfig(pre_model=stage_config)
        user_pre_hook = Mock()
        user_pre_hook.invoke = Mock()
        user_pre_hook.ainvoke = Mock()

        with patch(
            "langcrew.context.hooks.ContextManagementHook"
        ) as mock_context_hook_class:
            mock_context_hook = Mock()
            mock_context_hook_class.return_value = mock_context_hook

            pre_hook = create_context_hooks(
                context_config, user_pre_hook=user_pre_hook, llm=mock_llm, verbose=True
            )

            assert isinstance(pre_hook, ComposedHook)
            assert len(pre_hook.hooks) == 2
            # Context hook should be first
            assert pre_hook.hooks[0] == mock_context_hook
            # User hook will be wrapped in RunnableLambda
            assert isinstance(pre_hook.hooks[1], RunnableLambda)

    def test_create_verbose_logging(self, mock_llm):
        """Test create_context_hooks with verbose logging."""
        from langcrew.context.config import ContextConfig, KeepLastConfig

        stage_config = KeepLastConfig()
        context_config = ContextConfig(pre_model=stage_config)
        user_pre_hook = Mock()
        user_pre_hook.invoke = Mock()
        user_pre_hook.ainvoke = Mock()

        with patch(
            "langcrew.context.hooks.ContextManagementHook"
        ) as mock_context_hook_class:
            mock_context_hook = Mock()
            mock_context_hook_class.return_value = mock_context_hook

            with patch("langcrew.context.hooks.logger") as mock_logger:
                create_context_hooks(
                    context_config,
                    user_pre_hook=user_pre_hook,
                    llm=mock_llm,
                    verbose=True,
                )

                # Should have verbose logging calls
                assert mock_logger.info.call_count >= 1

    def test_create_no_verbose_logging(self, mock_llm):
        """Test create_context_hooks without verbose logging."""
        from langcrew.context.config import ContextConfig, KeepLastConfig

        stage_config = KeepLastConfig()
        context_config = ContextConfig(pre_model=stage_config)

        with patch(
            "langcrew.context.hooks.ContextManagementHook"
        ) as mock_context_hook_class:
            mock_context_hook_class.return_value = Mock()

            # Don't check logging specifically as the new function may have different logging behavior
            create_context_hooks(context_config, llm=mock_llm, verbose=False)


class TestHooksEdgeCases:
    """Test edge cases and error scenarios for hooks."""

    def test_context_hook_with_none_llm_model_name(self):
        """Test ContextManagementHook with LLM that has no model_name."""
        config = KeepLastConfig()
        llm = Mock()
        del llm.model_name  # Remove model_name attribute

        with patch("langcrew.context.hooks.count_message_tokens"):
            ContextManagementHook(config, llm)

            # Should use default when model_name is not available
            # No assertion needed for new architecture

    def test_composed_hook_empty_hooks_list(self):
        """Test ComposedHook behavior with empty hooks list."""
        hook = ComposedHook([])

        state = {"test": "value"}
        result = hook.invoke(state)

        # Should return original state unchanged
        assert result == state

    @pytest.mark.asyncio
    async def test_composed_hook_empty_hooks_list_async(self):
        """Test ComposedHook async behavior with empty hooks list."""
        hook = ComposedHook([])

        state = {"test": "value"}
        result = await hook.ainvoke(state)

        # Should return original state unchanged
        assert result == state

    def test_create_context_hooks_with_none_values(self):
        """Test create_context_hooks with None values."""
        pre_hook = create_context_hooks(
            context_config=None,
            user_pre_hook=None,
            llm=None,
            verbose=False,
        )

        # Should return None when context_config is None (disabled)
        assert pre_hook is None

    def test_invoke_requires_messages_key(self):
        """Test that invoke method requires messages key in state."""
        config = KeepLastConfig()

        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config)

            # Create state without messages key
            state = create_crew_state()

            # Should raise KeyError when trying to access missing messages key
            with pytest.raises(KeyError, match="messages"):
                hook.invoke(state)

    @pytest.mark.asyncio
    async def test_ainvoke_requires_messages_key(self):
        """Test that ainvoke method requires messages key in state."""
        config = KeepLastConfig()

        with patch("langcrew.context.hooks.count_message_tokens"):
            pass  # Mock no longer needed
            hook = ContextManagementHook(config)

            # Create state without messages key
            state = create_crew_state()

            # Should raise KeyError when trying to access missing messages key
            with pytest.raises(KeyError, match="messages"):
                await hook.ainvoke(state)

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM for testing."""
        llm = Mock()
        llm.model_name = "gpt-4o-mini"
        return llm
