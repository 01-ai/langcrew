"""
Unit tests for Tool Call Compressor.

Tests cover message compression functionality including AI messages with tool calls,
tool result messages, and content compression strategies.
"""

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from langcrew.context.tool_call_compressor import ToolCallCompressor


class TestToolCallCompressorBasics:
    """Test basic initialization and configuration."""

    def test_initialization_with_empty_tools(self):
        """Test compressor initialization with empty tools list."""
        compressor = ToolCallCompressor(tools=[])

        assert compressor.compressible_tools == set()
        assert compressor.max_length == 1000

    def test_initialization_with_specific_tools(self):
        """Test compressor initialization with specific tools only."""
        compressor = ToolCallCompressor(tools=["tool1", "tool2"])

        expected_tools = {"tool1", "tool2"}
        assert compressor.compressible_tools == expected_tools
        assert compressor.max_length == 1000

    def test_initialization_custom_max_length(self):
        """Test compressor initialization with custom max_length."""
        compressor = ToolCallCompressor(tools=["tool1"], max_length=1000)

        expected_tools = {"tool1"}
        assert compressor.compressible_tools == expected_tools
        assert compressor.max_length == 1000

    def test_tools_override_defaults(self):
        """Test that user tools override defaults and duplicates are removed."""
        compressor = ToolCallCompressor(tools=["tool1", "tool1", "tool2"])

        expected_tools = {"tool1", "tool2"}
        assert compressor.compressible_tools == expected_tools

    def test_tool_compression_check(self):
        """Test tool compression logic."""
        compressor = ToolCallCompressor(tools=["custom_tool"])

        # Test that only specified tools are compressible
        assert "custom_tool" in compressor.compressible_tools
        assert "unknown_tool" not in compressor.compressible_tools

    def test_empty_tools_disables_compression(self):
        """Test that empty tools list disables all compression."""
        compressor = ToolCallCompressor(tools=[])

        # No tools should be compressible
        assert "web_search" not in compressor.compressible_tools
        assert "custom_tool" not in compressor.compressible_tools
        assert len(compressor.compressible_tools) == 0

    def test_specific_tools_only_compress_those(self):
        """Test that only specified tools are compressible."""
        compressor = ToolCallCompressor(tools=["web_search", "custom_tool"])

        expected_tools = {"web_search", "custom_tool"}
        assert compressor.compressible_tools == expected_tools
        assert "web_search" in compressor.compressible_tools
        assert "custom_tool" in compressor.compressible_tools
        assert "other_tool" not in compressor.compressible_tools


class TestMessageCompression:
    """Test message compression for different message types."""

    @pytest.fixture
    def compressor(self):
        """Create compressor for testing."""
        return ToolCallCompressor(tools=["compressible_tool"], max_length=100)

    def test_ai_message_with_compressible_tool(self, compressor):
        """Test AI message compression when tool is compressible."""
        message = AIMessage(
            content="A" * 150,  # Longer than max_length
            tool_calls=[
                {"id": "1", "name": "compressible_tool", "args": {"content": "B" * 150}}
            ],
        )

        result = compressor.compress(message)

        assert isinstance(result, AIMessage)
        assert len(result.content) <= 100
        # Check that args content field is compressed
        assert len(result.tool_calls[0]["args"]["content"]) <= 100

    def test_ai_message_with_non_compressible_tool(self, compressor):
        """Test AI message not compressed when tool is not compressible."""
        message = AIMessage(
            content="A" * 150,
            tool_calls=[{"id": "1", "name": "other_tool", "args": {"data": "B" * 150}}],
        )

        result = compressor.compress(message)

        # Should return original message unchanged
        assert result is message
        assert len(result.content) == 150

    def test_ai_message_without_tool_calls(self, compressor):
        """Test AI message without tool calls is not compressed."""
        message = AIMessage(content="A" * 150)

        result = compressor.compress(message)

        assert result is message

    def test_tool_message_always_compressed(self, compressor):
        """Test ToolMessage is always compressed regardless of tool name."""
        message = ToolMessage(content="A" * 150, tool_call_id="1")

        result = compressor.compress(message)

        assert isinstance(result, ToolMessage)
        assert len(result.content) <= 100
        assert result.tool_call_id == "1"

    def test_human_message_not_compressed(self, compressor):
        """Test HumanMessage is not compressed."""
        message = HumanMessage(content="A" * 150)

        result = compressor.compress(message)

        assert result is message


class TestContentCompression:
    """Test content compression for different data types."""

    @pytest.fixture
    def compressor(self):
        """Create compressor for testing."""
        return ToolCallCompressor(tools=["test_tool"], max_length=50)

    def test_tool_content_compression_string(self, compressor):
        """Test tool content compression with string input."""
        content = "A" * 100

        result = compressor._compress_tool_content(content, 50)

        assert isinstance(result, str)
        assert len(result) <= 100  # Allow for truncation message overhead
        assert "omitted" in result

    def test_tool_content_compression_dict(self, compressor):
        """Test tool content compression with dict input."""
        content = {"data": "A" * 100, "other": "info"}

        result = compressor._compress_tool_content(content, 50)

        assert isinstance(result, str)
        # Should be JSON serialized then truncated
        assert len(result) <= 100  # Allow for truncation overhead


class TestSafeTruncation:
    """Test safe truncation functionality."""

    @pytest.fixture
    def compressor(self):
        """Create compressor for testing."""
        return ToolCallCompressor(tools=["test_tool"])

    def test_truncate_long_content(self, compressor):
        """Test truncation of long content."""
        content = "A" * 1000 + "B" * 1000

        result = compressor._truncate_safely(content, 500)

        assert len(result) <= 500
        assert "omitted" in result
        assert result.startswith("A")
        assert result.endswith("B")

    def test_truncate_short_content(self, compressor):
        """Test truncation when content is already short."""
        content = "Short content"

        result = compressor._truncate_safely(content, 100)

        assert result == content

    def test_truncate_very_small_max_length(self, compressor):
        """Test truncation with very small max_length."""
        content = "ABCDEFGHIJKLMNOP" * 100

        result = compressor._truncate_safely(content, 30)

        assert len(result) <= 30
        # Should preserve actual content from the start (no truncation marker for small limits)
        assert result.startswith("A")

    def test_truncate_zero_max_length(self, compressor):
        """Test truncation with edge case max_length."""
        content = "Some content"

        result = compressor._truncate_safely(content, 15)

        assert len(result) <= 15

    def test_truncate_length_guarantee(self, compressor):
        """Test that result length never exceeds max_length."""
        test_cases = [
            ("A" * 1000, 50),
            ("A" * 1000, 100),
            ("A" * 1000, 200),
            ("Unicode测试内容" * 100, 100),
            ("Emoji😀👍🌟" * 200, 150),
        ]

        for content, max_len in test_cases:
            result = compressor._truncate_safely(content, max_len)
            assert len(result) <= max_len, (
                f"Result length {len(result)} exceeds max_length {max_len}"
            )

    def test_truncate_unicode_safety(self, compressor):
        """Test truncation with Unicode characters."""
        content = "这是中文测试内容" * 100 + "🌟emoji测试" * 50

        result = compressor._truncate_safely(content, 200)

        assert len(result) <= 200
        # Should not cause encoding errors
        assert result.encode("utf-8").decode("utf-8") == result

    def test_truncate_boundary_values(self, compressor):
        """Test truncation at boundary values."""
        content = "A" * 1000

        # Test at TRUNCATION_MSG_RESERVE boundary (50)
        result = compressor._truncate_safely(content, 50)
        assert len(result) <= 50
        assert "omitted" in result  # At boundary 50, uses normal truncation

        # Test below boundary (should use simple truncation without marker)
        result = compressor._truncate_safely(content, 49)
        assert len(result) <= 49
        assert result == "A" * 49  # Just first 49 characters, no marker

        # Test just above boundary
        result = compressor._truncate_safely(content, 51)
        assert len(result) <= 51
        assert "omitted" in result

    def test_truncate_info_accuracy(self, compressor):
        """Test that omitted length calculation is accurate."""
        content = "A" * 1000

        result = compressor._truncate_safely(content, 200)

        # Extract omitted count from result
        import re

        match = re.search(r"\[\.\.\.(\d+) chars omitted\.\.\.\]", result)
        if match:
            reported_omitted = int(match.group(1))
            # Calculate actual omitted by subtracting preserved content
            preserved_content_length = len(result) - len(
                f"\n[...{reported_omitted} chars omitted...]\n"
            )
            actual_omitted = len(content) - preserved_content_length
            # Should be exactly correct now
            assert reported_omitted == actual_omitted, (
                f"Reported: {reported_omitted}, Actual: {actual_omitted}"
            )

    def test_truncate_extreme_small_limits(self, compressor):
        """Test truncation with extremely small limits."""
        content = "HELLO WORLD TEST"

        # Test very small limits - all should just show content without any marker
        test_cases = [
            (1, "H"),  # max_length=1: just first char
            (2, "HE"),  # max_length=2: first 2 chars
            (3, "HEL"),  # max_length=3: first 3 chars
            (10, "HELLO WORL"),  # max_length=10: first 10 chars
            (49, content[:49]),  # Just under TRUNCATION_MSG_RESERVE
        ]

        for limit, expected in test_cases:
            result = compressor._truncate_safely(content, limit)
            assert len(result) <= limit, (
                f"Result length {len(result)} exceeds limit {limit}"
            )
            assert result == expected, f"Expected {expected}, got {result}"

    def test_truncate_no_truncation_needed(self, compressor):
        """Test when content is already within limits."""
        short_content = "Short"

        # Should return original for various limits
        for limit in [5, 10, 50, 100]:
            result = compressor._truncate_safely(short_content, limit)
            assert result == short_content
