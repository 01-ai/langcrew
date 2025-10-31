"""
Unit tests for Token Utils.

Tests cover token counting functionality for various message types.
"""

from unittest.mock import Mock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from langcrew.context.token_utils import _to_litellm_format, count_message_tokens


class TestTokenUtils:
    """Test cases for token utility functions."""

    @pytest.fixture
    def sample_messages(self):
        """Create sample messages for testing."""
        return [
            SystemMessage(content="You are a helpful assistant"),
            HumanMessage(content="Hello"),
            AIMessage(content="Hi there!"),
            ToolMessage(content="Tool result", tool_call_id="call_1"),
        ]

    def test_to_litellm_format_basic_messages(self, sample_messages):
        """Test converting basic messages to litellm format."""
        result = _to_litellm_format(sample_messages)

        assert len(result) == 4
        assert result[0]["role"] == "system"
        assert result[0]["content"] == "You are a helpful assistant"
        assert result[1]["role"] == "user"
        assert result[1]["content"] == "Hello"
        assert result[2]["role"] == "assistant"
        assert result[2]["content"] == "Hi there!"
        assert result[3]["role"] == "tool"
        assert result[3]["content"] == "Tool result"

    def test_to_litellm_format_ai_with_tool_calls(self):
        """Test converting AI message with tool calls."""
        ai_message = AIMessage(
            content="I'll use a tool",
            tool_calls=[
                {"id": "call_1", "name": "test_tool", "args": {"param": "value"}}
            ],
        )

        result = _to_litellm_format([ai_message])

        assert len(result) == 1
        assert result[0]["role"] == "assistant"
        assert result[0]["content"] == "I'll use a tool"
        assert "tool_calls" in result[0]

    def test_to_litellm_format_empty_list(self):
        """Test converting empty message list."""
        result = _to_litellm_format([])
        assert result == []

    @patch("langcrew.context.token_utils.token_counter")
    def test_count_message_tokens_with_llm(self, mock_token_counter, sample_messages):
        """Test counting tokens with LLM model."""
        mock_llm = Mock()
        mock_llm.model_name = "gpt-4o-mini"
        mock_token_counter.return_value = 100

        result = count_message_tokens(sample_messages, mock_llm)

        assert result == 100
        mock_token_counter.assert_called_once()

    def test_count_message_tokens_without_llm(self, sample_messages):
        """Test counting tokens without LLM model raises error."""
        with pytest.raises(ValueError, match="LLM must be provided"):
            count_message_tokens(sample_messages, None)

    @patch("langcrew.context.token_utils.token_counter")
    def test_count_message_tokens_error_fallback(
        self, mock_token_counter, sample_messages
    ):
        """Test fallback when token_counter fails."""
        mock_llm = Mock()
        mock_llm.model_name = "gpt-4o-mini"
        mock_token_counter.side_effect = Exception("API Error")

        with patch(
            "langcrew.context.token_utils.count_tokens_approximately"
        ) as mock_fallback:
            mock_fallback.return_value = 90

            result = count_message_tokens(sample_messages, mock_llm)

            assert result == 90
            mock_fallback.assert_called_once_with(sample_messages)

    def test_count_message_tokens_empty_messages(self):
        """Test counting tokens for empty message list."""
        mock_llm = Mock()
        mock_llm.model_name = "gpt-3.5-turbo"

        with patch("langcrew.context.token_utils.token_counter", return_value=0):
            result = count_message_tokens([], mock_llm)
            assert result == 0

    @patch("langcrew.context.token_utils.token_counter")
    def test_count_message_tokens_various_models(self, mock_token_counter):
        """Test token counting with various model names."""
        messages = [HumanMessage(content="Test")]

        test_cases = [
            ("gpt-4o", 50),
            ("gpt-3.5-turbo", 40),
            ("claude-3-sonnet", 45),
        ]

        for model_name, expected_tokens in test_cases:
            mock_llm = Mock()
            mock_llm.model_name = model_name
            mock_token_counter.return_value = expected_tokens

            result = count_message_tokens(messages, mock_llm)
            assert result == expected_tokens


class TestTokenUtilsEdgeCases:
    """Test edge cases and error scenarios."""

    def test_to_litellm_format_message_with_additional_kwargs(self):
        """Test converting message with additional kwargs."""
        message = HumanMessage(
            content="Test message", additional_kwargs={"custom_field": "value"}
        )

        result = _to_litellm_format([message])

        assert len(result) == 1
        assert result[0]["role"] == "user"
        assert result[0]["content"] == "Test message"

    def test_to_litellm_format_tool_message_properties(self):
        """Test tool message specific properties."""
        tool_message = ToolMessage(content="Tool output", tool_call_id="call_123")

        result = _to_litellm_format([tool_message])

        assert len(result) == 1
        assert result[0]["role"] == "tool"
        assert result[0]["content"] == "Tool output"
        assert result[0]["tool_call_id"] == "call_123"

    @patch("langcrew.context.token_utils.logger")
    def test_count_tokens_logs_errors(self, mock_logger):
        """Test that token counting errors are logged."""
        with patch("langcrew.context.token_utils.token_counter") as mock_counter:
            mock_counter.side_effect = Exception("Test error")
            mock_llm = Mock()
            mock_llm.model_name = "gpt-4o"

            with patch(
                "langcrew.context.token_utils.count_tokens_approximately",
                return_value=50,
            ):
                count_message_tokens([HumanMessage(content="test")], mock_llm)

                mock_logger.warning.assert_called_once()
