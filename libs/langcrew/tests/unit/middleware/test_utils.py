"""Unit tests for middleware utility functions.

Tests cover sanitization and formatting utilities.
"""

import pytest

from langcrew.middleware.utils import (
    sanitize_tool_call_id,
    format_content_with_line_numbers,
    truncate_if_too_long,
)


class TestSanitizeToolCallId:
    """Test cases for sanitize_tool_call_id function."""

    def test_sanitize_dots(self):
        """Test sanitizing dots in tool call ID."""
        result = sanitize_tool_call_id("call_abc.123")
        assert result == "call_abc_123"

    def test_sanitize_forward_slash(self):
        """Test sanitizing forward slashes."""
        result = sanitize_tool_call_id("call/abc/123")
        assert result == "call_abc_123"

    def test_sanitize_backslash(self):
        """Test sanitizing backslashes."""
        result = sanitize_tool_call_id("call\\abc\\123")
        assert result == "call_abc_123"

    def test_sanitize_mixed_characters(self):
        """Test sanitizing mixed dangerous characters."""
        result = sanitize_tool_call_id("call_abc.123/456\\789")
        assert result == "call_abc_123_456_789"

    def test_sanitize_clean_id(self):
        """Test that clean IDs remain unchanged."""
        result = sanitize_tool_call_id("call_abc_123")
        assert result == "call_abc_123"

    def test_sanitize_empty_string(self):
        """Test sanitizing empty string."""
        result = sanitize_tool_call_id("")
        assert result == ""


class TestFormatContentWithLineNumbers:
    """Test cases for format_content_with_line_numbers function."""

    def test_basic_formatting(self):
        """Test basic line number formatting."""
        lines = ["first line", "second line", "third line"]
        result = format_content_with_line_numbers(lines)

        assert "1\t" in result
        assert "2\t" in result
        assert "3\t" in result
        assert "first line" in result
        assert "second line" in result
        assert "third line" in result

    def test_custom_start_line(self):
        """Test formatting with custom start line."""
        lines = ["line a", "line b"]
        result = format_content_with_line_numbers(lines, start_line=10)

        assert "10\t" in result
        assert "11\t" in result

    def test_empty_lines(self):
        """Test formatting empty lines."""
        lines = [""]
        result = format_content_with_line_numbers(lines)

        assert "1\t" in result

    def test_long_line_chunking(self):
        """Test that long lines are chunked with continuation markers."""
        long_line = "a" * 15000  # Exceeds default max_line_length of 10000
        lines = [long_line]
        result = format_content_with_line_numbers(lines, max_line_length=10000)

        # Should have continuation markers like "1.1"
        assert "1\t" in result
        assert "1.1" in result

    def test_multiple_long_lines(self):
        """Test formatting multiple long lines."""
        long_line1 = "x" * 15000
        long_line2 = "y" * 12000
        lines = [long_line1, long_line2]
        result = format_content_with_line_numbers(lines, max_line_length=10000)

        assert "1\t" in result
        assert "1.1" in result
        assert "2\t" in result
        assert "2.1" in result

    def test_custom_line_number_width(self):
        """Test custom line number width."""
        lines = ["test"]
        result = format_content_with_line_numbers(lines, line_number_width=3)

        # Width should affect padding
        assert len(result.split("\t")[0]) >= 3


class TestTruncateIfTooLong:
    """Test cases for truncate_if_too_long function."""

    def test_string_within_limit(self):
        """Test string within length limit."""
        content = "short content"
        result = truncate_if_too_long(content, max_length=100)
        assert result == "short content"

    def test_string_exceeds_limit(self):
        """Test string exceeding length limit."""
        content = "a" * 200
        result = truncate_if_too_long(content, max_length=100)

        assert len(result) > 100  # includes truncation message
        assert "truncated" in result

    def test_list_within_limit(self):
        """Test list within length limit."""
        content = ["line1", "line2", "line3"]
        result = truncate_if_too_long(content, max_length=100)

        assert "line1" in result
        assert "line2" in result
        assert "line3" in result

    def test_list_exceeds_limit(self):
        """Test list exceeding length limit."""
        content = ["a" * 50 for _ in range(10)]  # Total 500 chars
        result = truncate_if_too_long(content, max_length=100)

        assert "truncated" in result

    def test_custom_truncation_message(self):
        """Test custom truncation message."""
        content = "a" * 200
        custom_msg = "... CUSTOM TRUNCATION ..."
        result = truncate_if_too_long(
            content, max_length=100, truncation_msg=custom_msg
        )

        assert custom_msg in result

    def test_empty_string(self):
        """Test empty string."""
        result = truncate_if_too_long("", max_length=100)
        assert result == ""

    def test_empty_list(self):
        """Test empty list."""
        result = truncate_if_too_long([], max_length=100)
        assert result == ""

    def test_exact_limit_string(self):
        """Test string at exact limit."""
        content = "a" * 100
        result = truncate_if_too_long(content, max_length=100)
        # Should not be truncated
        assert "truncated" not in result


class TestFormatContentEdgeCases:
    """Test edge cases for format_content_with_line_numbers."""

    def test_very_short_lines(self):
        """Test formatting very short lines."""
        lines = ["a", "b", "c"]
        result = format_content_with_line_numbers(lines)

        assert result.count("\t") == 3  # One tab per line

    def test_lines_with_special_characters(self):
        """Test lines with special characters."""
        lines = ["line\twith\ttabs", "line\nwith\nnewlines", "line with spaces"]
        result = format_content_with_line_numbers(lines)

        # All content should be preserved
        assert "line\twith\ttabs" in result

    def test_unicode_content(self):
        """Test unicode content."""
        lines = ["你好世界", "こんにちは", "🎉🎊"]
        result = format_content_with_line_numbers(lines)

        assert "你好世界" in result
        assert "こんにちは" in result
        assert "🎉🎊" in result
