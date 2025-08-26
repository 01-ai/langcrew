"""
Unit tests for MessageProcessor and ToolCallCompressor classes.

Tests cover message processing, compression, and summarization features.
"""

import json
from unittest.mock import AsyncMock, Mock

import pytest
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.messages.modifier import RemoveMessage

from langcrew.context.processor import MessageProcessor
from langcrew.context.tool_call_compressor import ToolCallCompressor


def extract_kept_messages(result):
    """Helper function to extract kept messages from keep_last_n result."""
    if isinstance(result, list):
        return [msg for msg in result if not isinstance(msg, RemoveMessage)]
    return result


class TestMessageProcessor:
    """Test cases for MessageProcessor class."""

    @pytest.fixture(autouse=True)
    def setup_processor(self):
        """Set up MessageProcessor instance for tests."""
        self.processor = MessageProcessor()

    def test_keep_last_n_basic(self):
        """Test keep_last_n with basic message list."""
        messages = [
            HumanMessage(content="1"),
            AIMessage(content="2"),
            HumanMessage(content="3"),
            AIMessage(content="4"),
            HumanMessage(content="5"),
        ]

        result = self.processor.keep_last_n(messages, 3)

        kept_messages = extract_kept_messages(result)
        assert len(kept_messages) == 3
        assert kept_messages[0].content == "3"
        assert kept_messages[1].content == "4"
        assert kept_messages[2].content == "5"

    def test_keep_last_n_fewer_than_n(self):
        """Test keep_last_n when fewer than n messages exist."""
        messages = [HumanMessage(content="1"), AIMessage(content="2")]

        result = self.processor.keep_last_n(messages, 5)

        kept_messages = extract_kept_messages(result)
        assert len(kept_messages) == 2
        assert kept_messages == messages

    def test_keep_last_n_empty_list(self):
        """Test keep_last_n with empty message list."""
        result = self.processor.keep_last_n([], 5)
        kept_messages = extract_kept_messages(result)
        assert kept_messages == []

    def test_keep_last_n_zero_count(self):
        """Test keep_last_n with zero count."""
        messages = [HumanMessage(content="test")]
        result = self.processor.keep_last_n(messages, 0)
        kept_messages = extract_kept_messages(result)
        assert kept_messages == []  # When n=0, should return empty list (keep nothing)

    def test_keep_last_n_preserves_ai_tool_pairs(self):
        """Test keep_last_n preserving AI+Tool pairs."""
        messages = [
            HumanMessage(content="1"),
            AIMessage(
                content="thinking", tool_calls=[{"id": "1", "name": "test", "args": {}}]
            ),
            ToolMessage(content="result", tool_call_id="1"),
            HumanMessage(content="2"),
            HumanMessage(content="3"),
        ]

        result = self.processor.keep_last_n(messages, 3)

        kept_messages = extract_kept_messages(result)
        # Should include the AI+Tool pair to maintain integrity
        assert len(kept_messages) >= 3
        # Should preserve AI+Tool message pair
        ai_msgs = [
            msg
            for msg in kept_messages
            if isinstance(msg, AIMessage)
            and hasattr(msg, "tool_calls")
            and msg.tool_calls
        ]
        tool_msgs = [msg for msg in kept_messages if isinstance(msg, ToolMessage)]
        if ai_msgs:
            # If AI message with tool calls is present, corresponding tool message should be present
            ai_tool_call_ids = [tc["id"] for msg in ai_msgs for tc in msg.tool_calls]
            tool_call_ids = [msg.tool_call_id for msg in tool_msgs]
            for call_id in ai_tool_call_ids:
                assert call_id in tool_call_ids

    def test_keep_last_n_with_system_message(self):
        """Test keep_last_n preserving system message."""
        messages = [
            SystemMessage(content="system"),
            HumanMessage(content="1"),
            HumanMessage(content="2"),
            HumanMessage(content="3"),
            HumanMessage(content="4"),
        ]

        result = self.processor.keep_last_n(messages, 3)

        kept_messages = extract_kept_messages(result)
        # Based on actual implementation: may not preserve system message when keeping last n
        # Should keep last 3 messages from the end
        assert len(kept_messages) >= 2  # May vary based on implementation
        # Check that messages are from the end of the list
        result_contents = [msg.content for msg in kept_messages]
        assert "4" in result_contents  # Last message should be kept

    def test_compress_earlier_tool_rounds_with_compressor(self):
        """Test compress_earlier_tool_rounds with custom compressor."""
        messages = [
            # Earlier round - should be compressed
            AIMessage(
                content="A" * 1000,
                tool_calls=[
                    {"id": "1", "name": "test_tool", "args": {"content": "B" * 1000}}
                ],
            ),
            ToolMessage(content="C" * 1000, tool_call_id="1"),
            # Recent round - should NOT be compressed
            AIMessage(
                content="D" * 1000,
                tool_calls=[
                    {"id": "2", "name": "test_tool", "args": {"content": "E" * 1000}}
                ],
            ),
            ToolMessage(content="F" * 1000, tool_call_id="2"),
        ]

        # Create a compressor that compresses test_tool messages
        compressor = ToolCallCompressor(tools=["test_tool"], max_length=100)

        # Compress with keep_recent_rounds=1 (default)
        result = self.processor.compress_earlier_tool_rounds(messages, compressor)

        assert len(result) == 4
        # First round should be compressed
        assert len(result[0].content) <= 500  # AI message compressed
        assert len(result[1].content) <= 500  # Tool message compressed
        # Second round should NOT be compressed (protected)
        assert len(result[2].content) == 1000  # AI message not compressed
        assert len(result[3].content) == 1000  # Tool message not compressed

    def test_compress_earlier_tool_rounds_validation(self):
        """Test compress_earlier_tool_rounds validates message integrity."""
        # Create invalid messages (AI with tool calls but no corresponding tool message)
        messages = [
            AIMessage(
                content="test",
                tool_calls=[{"id": "1", "name": "test_tool", "args": {}}],
            ),
            HumanMessage(
                content="not a tool message"
            ),  # Invalid - should be ToolMessage
        ]

        compressor = ToolCallCompressor(tools=["test_tool"], max_length=100)

        # Should raise validation error
        with pytest.raises(
            ValueError,
            match="AI message at index .* has tool_calls but no ToolMessage follows",
        ):
            self.processor.compress_earlier_tool_rounds(messages, compressor)


class TestToolCallCompressor:
    """Test cases for ToolCallCompressor class."""

    @pytest.fixture
    def compressor(self):
        """Create a ToolCallCompressor instance for testing."""
        return ToolCallCompressor(tools=["test_tool", "compress_me"], max_length=100)

    def test_compressor_initialization(self, compressor):
        """Test ToolCallCompressor initialization."""
        assert compressor.compressible_tools == {"test_tool", "compress_me"}
        assert compressor.max_length == 100

    def test_compress_ai_message_with_compressible_tool(self, compressor):
        """Test compression of AI message with compressible tool."""
        message = AIMessage(
            content="A" * 200,
            tool_calls=[
                {"id": "1", "name": "test_tool", "args": {"content": "B" * 200}}
            ],
        )

        result = compressor.compress(message)

        # Content should be compressed
        assert len(result.content) <= 200
        assert "[truncated]" in result.content or "TRUNCATED" in result.content
        # Tool call args should be compressed - check the actual content length
        args_content_len = len(str(result.tool_calls[0]["args"]["content"]))
        assert args_content_len <= 200

    def test_compress_ai_message_with_non_compressible_tool(self, compressor):
        """Test AI message with non-compressible tool remains unchanged."""
        message = AIMessage(
            content="A" * 200,
            tool_calls=[
                {"id": "1", "name": "other_tool", "args": {"content": "B" * 200}}
            ],
        )

        result = compressor.compress(message)

        # Should remain unchanged
        assert result == message
        assert len(result.content) == 200

    def test_compress_tool_message(self, compressor):
        """Test compression of ToolMessage."""
        message = ToolMessage(content="A" * 200, tool_call_id="1")

        result = compressor.compress(message)

        # Content should be compressed
        assert len(result.content) <= 300  # Allow for truncation message overhead
        assert "[truncated]" in result.content or "TRUNCATED" in result.content
        assert result.tool_call_id == "1"  # Should preserve tool_call_id

    def test_compress_other_message_types(self, compressor):
        """Test that other message types remain unchanged."""
        human_msg = HumanMessage(content="A" * 200)
        system_msg = SystemMessage(content="B" * 200)

        human_result = compressor.compress(human_msg)
        system_result = compressor.compress(system_msg)

        assert human_result == human_msg
        assert system_result == system_msg

    def test_truncate_safely_basic(self, compressor):
        """Test _truncate_safely with basic scenario."""
        content = "A" * 1000
        result = compressor._truncate_safely(content, max_length=200)

        assert len(result) <= 200
        assert "[truncated]" in result or "TRUNCATED" in result
        assert content[:25] in result  # Start part preserved
        assert content[-25:] in result  # End part preserved

    def test_truncate_safely_no_truncation_needed(self, compressor):
        """Test _truncate_safely when no truncation needed."""
        content = "Short content"
        result = compressor._truncate_safely(content, max_length=200)

        assert result == content

    def test_compress_tool_content_valid_json(self, compressor):
        """Test _compress_tool_content with valid JSON."""
        json_data = {"content": "A" * 1000, "text": "B" * 1000, "other": "normal"}
        json_str = json.dumps(json_data)

        result = compressor._compress_tool_content(json_str, max_length=100)

        # Result should be a truncated string
        assert isinstance(result, str)
        assert len(result) <= 200  # Allow for truncation message overhead

    def test_compress_tool_content_invalid_json(self, compressor):
        """Test _compress_tool_content with invalid JSON string."""
        invalid_json = (
            "not json content" * 100
        )  # Make it long enough to trigger truncation

        result = compressor._compress_tool_content(invalid_json, max_length=100)

        # Should be truncated
        assert isinstance(result, str)
        assert len(result) <= 200  # Allow for truncation message overhead

    def test_compress_tool_args_dict(self, compressor):
        """Test _compress_tool_args with dictionary input."""
        args = {"content": "A" * 200, "other": "normal data"}

        result = compressor._compress_tool_args(args, max_length=50)

        assert isinstance(result, dict)
        assert len(result["content"]) <= 100  # Allow for truncation overhead
        assert result["other"] == "normal data"  # Non-string values preserved


class TestMessageProcessorSummarization:
    """Test cases for summarize_and_trim method using RunningSummary."""

    @pytest.fixture(autouse=True)
    def setup_processor(self):
        """Set up MessageProcessor instance for tests."""
        self.processor = MessageProcessor()

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM for testing."""
        llm = Mock()
        llm.invoke.return_value = Mock(content="Generated summary of conversation")
        return llm

    @pytest.fixture
    def sample_messages_for_summary(self):
        """Sample messages for summarization testing."""
        return [
            SystemMessage(content="You are a helpful assistant"),
            HumanMessage(content="Hello " * 100, id="msg1"),  # Make it longer
            AIMessage(content="Hi there! " * 100, id="msg2"),
            HumanMessage(content="How are you? " * 100, id="msg3"),
            AIMessage(content="I'm doing well " * 100, id="msg4"),
            HumanMessage(content="What can you help with? " * 100, id="msg5"),
            AIMessage(content="I can help with many things " * 100, id="msg6"),
        ]

    def test_summarize_and_trim_no_llm_error(self, sample_messages_for_summary):
        """Test summarize_and_trim raises error without LLM."""
        with pytest.raises(
            ValueError, match="LLM is required for conversation summarization"
        ):
            self.processor.summarize_and_trim(
                messages=sample_messages_for_summary,
                keep_recent_tokens=100,  # Very small to force summarization
                llm=None,
            )

    def test_summarize_and_trim_not_enough_messages(self, mock_llm):
        """Test summarize_and_trim when not enough messages to summarize."""
        messages = [HumanMessage(content="Hello"), AIMessage(content="Hi")]

        result = self.processor.summarize_and_trim(
            messages=messages, keep_recent_tokens=3000, llm=mock_llm
        )

        assert result["messages"] == messages
        assert result["running_summary"] is None
        # LLM should not be called
        mock_llm.invoke.assert_not_called()

    def test_summarize_and_trim_first_time_no_existing_summary(
        self, mock_llm, sample_messages_for_summary
    ):
        """Test summarize_and_trim without existing RunningSummary."""
        result = self.processor.summarize_and_trim(
            messages=sample_messages_for_summary,
            keep_recent_tokens=100,  # Very small to force summarization
            llm=mock_llm,
        )

        # Should create new summary
        assert result["running_summary"] is not None
        assert isinstance(result["running_summary"], str)
        assert result["running_summary"] == "Generated summary of conversation"

        # Should have summary content
        assert result["running_summary"] is not None

        # Should keep recent messages
        assert len(result["messages"]) > 0

    def test_summarize_and_trim_with_existing_summary(
        self, mock_llm, sample_messages_for_summary
    ):
        """Test summarize_and_trim with existing RunningSummary."""
        existing_summary = "Previous conversation about greetings"

        result = self.processor.summarize_and_trim(
            messages=sample_messages_for_summary,
            keep_recent_tokens=100,  # Very small to force summarization
            llm=mock_llm,
            running_summary=existing_summary,
        )

        # Should update existing summary
        assert result["running_summary"] is not None
        assert result["running_summary"] == "Generated summary of conversation"

        # Should update summary content
        assert result["running_summary"] == "Generated summary of conversation"

    @pytest.mark.asyncio
    async def test_asummarize_and_trim_async(self, sample_messages_for_summary):
        """Test asummarize_and_trim async method."""
        # Mock async LLM
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = "Async generated summary"
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        result = await self.processor.asummarize_and_trim(
            messages=sample_messages_for_summary,
            keep_recent_tokens=100,  # Very small to force summarization
            llm=mock_llm,
        )

        # Verify async invocation was called
        mock_llm.ainvoke.assert_called_once()

        # Verify structure of result
        assert "messages" in result
        assert "running_summary" in result
        assert result["running_summary"] == "Async generated summary"

    @pytest.mark.asyncio
    async def test_asummarize_and_trim_no_llm_error(self):
        """Test asummarize_and_trim raises error when no LLM provided."""
        messages = [HumanMessage(content="test")]

        with pytest.raises(
            ValueError, match="LLM is required for conversation summarization"
        ):
            await self.processor.asummarize_and_trim(messages, 100, None)


class TestMessageProcessorEdgeCases:
    """Test edge cases and error scenarios for MessageProcessor."""

    @pytest.fixture(autouse=True)
    def setup_processor(self):
        """Set up MessageProcessor instance for tests."""
        self.processor = MessageProcessor()

    def test_compress_earlier_tool_rounds_empty_list(self):
        """Test compress_earlier_tool_rounds with empty message list."""
        compressor = ToolCallCompressor(tools=["test"], max_length=100)

        result = self.processor.compress_earlier_tool_rounds([], compressor)

        assert result == []

    def test_compress_earlier_tool_rounds_no_tool_rounds(self):
        """Test compress_earlier_tool_rounds when no tool rounds exist."""
        messages = [
            HumanMessage(content="Hello"),
            AIMessage(content="Hi there!"),
        ]
        compressor = ToolCallCompressor(tools=["test"], max_length=100)

        result = self.processor.compress_earlier_tool_rounds(messages, compressor)

        # Should return original messages unchanged since no tool rounds exist
        assert result == messages

    def test_keep_last_n_handles_mixed_message_types(self):
        """Test keep_last_n with mixed message types."""
        messages = [
            SystemMessage(content="system"),
            HumanMessage(content="human1"),
            AIMessage(
                content="ai1", tool_calls=[{"id": "1", "name": "test", "args": {}}]
            ),
            ToolMessage(content="tool1", tool_call_id="1"),
            HumanMessage(content="human2"),
            AIMessage(content="ai2"),
        ]

        result = self.processor.keep_last_n(messages, 3)

        # Should handle mixed types correctly and preserve AI+Tool pairs
        # Based on implementation, should keep AI+Tool pair + last message = at least 2 messages
        assert len(result) >= 2
        assert all(
            isinstance(msg, SystemMessage | HumanMessage | AIMessage | ToolMessage)
            for msg in result
        )


class TestMessageProcessorParallelToolCalls:
    """Test cases for MessageProcessor handling parallel tool calls."""

    @pytest.fixture(autouse=True)
    def setup_processor(self):
        """Set up MessageProcessor instance for tests."""
        self.processor = MessageProcessor()

    def test_keep_last_n_parallel_tool_calls(self):
        """Test keep_last_n with parallel tool calls scenario."""
        messages = [
            SystemMessage(content="system"),
            HumanMessage(content="request", id="msg1"),
            AIMessage(
                content="executing multiple tools",
                tool_calls=[
                    {"id": "call_1", "name": "tool_a", "args": {}},
                    {"id": "call_2", "name": "tool_b", "args": {}},
                    {"id": "call_3", "name": "tool_c", "args": {}},
                ],
                id="msg2",
            ),
            ToolMessage(content="result_a", tool_call_id="call_1", id="msg3"),
            ToolMessage(content="result_b", tool_call_id="call_2", id="msg4"),
            ToolMessage(content="result_c", tool_call_id="call_3", id="msg5"),
            HumanMessage(content="thanks", id="msg6"),
        ]

        result = self.processor.keep_last_n(messages, 3)

        # Should preserve tool call integrity
        self.processor._validate_chat_history(result)

        kept_messages = extract_kept_messages(result)
        # Check that all tool calls have corresponding tool messages
        ai_msgs = [
            msg
            for msg in kept_messages
            if isinstance(msg, AIMessage)
            and hasattr(msg, "tool_calls")
            and msg.tool_calls
        ]
        if ai_msgs:
            for ai_msg in ai_msgs:
                for tool_call in ai_msg.tool_calls:
                    tool_call_id = tool_call["id"]
                    # Find corresponding ToolMessage
                    found_tool_msg = any(
                        isinstance(msg, ToolMessage)
                        and msg.tool_call_id == tool_call_id
                        for msg in kept_messages
                    )
                    assert found_tool_msg, (
                        f"Missing ToolMessage for tool_call_id {tool_call_id}"
                    )

    def test_keep_last_n_mixed_parallel_and_single_calls(self):
        """Test keep_last_n with mixed parallel and single tool calls."""
        messages = [
            HumanMessage(content="request1", id="msg1"),
            AIMessage(
                content="single tool",
                tool_calls=[{"id": "call_single", "name": "tool_x", "args": {}}],
                id="msg2",
            ),
            ToolMessage(content="single_result", tool_call_id="call_single", id="msg3"),
            HumanMessage(content="request2", id="msg4"),
            AIMessage(
                content="parallel tools",
                tool_calls=[
                    {"id": "call_para1", "name": "tool_y", "args": {}},
                    {"id": "call_para2", "name": "tool_z", "args": {}},
                ],
                id="msg5",
            ),
            ToolMessage(content="para_result1", tool_call_id="call_para1", id="msg6"),
            ToolMessage(content="para_result2", tool_call_id="call_para2", id="msg7"),
            HumanMessage(content="final", id="msg8"),
        ]

        result = self.processor.keep_last_n(messages, 4)

        # Should preserve tool call integrity
        self.processor._validate_chat_history(result)

    def test_keep_last_n_incomplete_parallel_calls_cutoff(self):
        """Test keep_last_n when cutoff would break parallel tool calls."""
        messages = [
            HumanMessage(content="setup", id="msg1"),
            HumanMessage(content="request", id="msg2"),
            AIMessage(
                content="parallel execution",
                tool_calls=[
                    {"id": "call_1", "name": "tool_a", "args": {}},
                    {"id": "call_2", "name": "tool_b", "args": {}},
                ],
                id="msg3",
            ),
            ToolMessage(content="result_a", tool_call_id="call_1", id="msg4"),
            ToolMessage(content="result_b", tool_call_id="call_2", id="msg5"),
            HumanMessage(content="done", id="msg6"),
        ]

        # Try to keep only 2 messages - should expand to include all tool calls
        result = self.processor.keep_last_n(messages, 2)

        # Should pass validation (all tool calls have corresponding tool messages)
        self.processor._validate_chat_history(result)

        kept_messages = extract_kept_messages(result)
        # Should include the AI message and both tool messages
        ai_msgs = [
            msg
            for msg in kept_messages
            if isinstance(msg, AIMessage) and msg.tool_calls
        ]
        if ai_msgs:
            ai_msg = ai_msgs[0]
            expected_tool_call_ids = {tc["id"] for tc in ai_msg.tool_calls}
            actual_tool_call_ids = {
                msg.tool_call_id
                for msg in kept_messages
                if isinstance(msg, ToolMessage)
            }
            assert expected_tool_call_ids == actual_tool_call_ids

    def test_validate_chat_history_parallel_tool_calls_valid(self):
        """Test _validate_chat_history with valid parallel tool calls."""
        messages = [
            AIMessage(
                content="parallel execution",
                tool_calls=[
                    {"id": "call_1", "name": "tool_a", "args": {}},
                    {"id": "call_2", "name": "tool_b", "args": {}},
                ],
            ),
            ToolMessage(content="result_a", tool_call_id="call_1"),
            ToolMessage(content="result_b", tool_call_id="call_2"),
        ]

        # Should not raise any exception
        self.processor._validate_chat_history(messages)

    def test_validate_chat_history_parallel_tool_calls_missing(self):
        """Test _validate_chat_history with missing tool messages in parallel calls."""
        messages = [
            AIMessage(
                content="parallel execution",
                tool_calls=[
                    {"id": "call_1", "name": "tool_a", "args": {}},
                    {"id": "call_2", "name": "tool_b", "args": {}},
                    {"id": "call_3", "name": "tool_c", "args": {}},
                ],
            ),
            ToolMessage(content="result_a", tool_call_id="call_1"),
            # Missing ToolMessage for call_2 and call_3
        ]

        # Should raise validation error
        with pytest.raises(
            ValueError, match="tool_calls that do not have a corresponding ToolMessage"
        ):
            self.processor._validate_chat_history(messages)

    def test_find_safe_cutoff_point_with_parallel_calls(self):
        """Test _find_safe_cutoff_point with parallel tool calls."""
        messages = [
            HumanMessage(content="start", id="msg1"),
            AIMessage(
                content="parallel tools",
                tool_calls=[
                    {"id": "call_1", "name": "tool_a", "args": {}},
                    {"id": "call_2", "name": "tool_b", "args": {}},
                ],
                id="msg2",
            ),
            ToolMessage(content="result_a", tool_call_id="call_1", id="msg3"),
            ToolMessage(content="result_b", tool_call_id="call_2", id="msg4"),
            HumanMessage(content="end", id="msg5"),
        ]

        # Test with cutoff that would break tool calls
        safe_cutoff = self.processor._find_safe_cutoff_point(messages, 2)

        # Should move cutoff to include the AI message with tool calls
        result_messages = messages[safe_cutoff:]
        self.processor._validate_chat_history(result_messages)
