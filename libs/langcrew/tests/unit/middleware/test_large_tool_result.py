"""Unit tests for LargeToolResultMiddleware.

Tests cover large result detection, eviction to filesystem, and token counting.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain_core.messages import ToolMessage
from langgraph.types import Command

from langcrew.middleware.large_tool_result import LargeToolResultMiddleware


class TestLargeToolResultMiddleware:
    """Test cases for LargeToolResultMiddleware."""

    @pytest.fixture
    def mock_backend(self):
        """Create a mock filesystem backend."""
        backend = AsyncMock()
        backend.write = AsyncMock()
        return backend

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM."""
        llm = Mock()
        llm.model_name = "gpt-4o-mini"
        return llm

    def test_init_with_backend(self, mock_backend):
        """Test middleware initialization with backend."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=1000,
        )

        assert middleware.backend == mock_backend
        assert middleware.token_limit == 1000

    def test_init_with_llm(self, mock_backend, mock_llm):
        """Test middleware initialization with LLM for token counting."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=1000,
            llm=mock_llm,
        )

        assert middleware.llm == mock_llm

    @pytest.mark.asyncio
    async def test_small_result_passes_through(self, mock_backend):
        """Test that small results pass through unchanged."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=1000,
        )

        small_message = ToolMessage(
            content="small content",
            tool_call_id="call_123",
        )

        result = await middleware._intercept_large_tool_result(small_message)

        assert result == small_message
        mock_backend.write.assert_not_called()

    @pytest.mark.asyncio
    async def test_large_result_evicted_to_filesystem(self, mock_backend):
        """Test that large results are evicted to filesystem."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=100,  # Small limit to trigger eviction
        )

        # Create a large result (exceeds char limit)
        large_content = "x" * 50000
        large_message = ToolMessage(
            content=large_content,
            tool_call_id="call_abc_123",
        )

        result = await middleware._intercept_large_tool_result(large_message)

        # Should write to filesystem
        mock_backend.write.assert_called_once()
        call_args = mock_backend.write.call_args
        assert call_args[0][0] == "/large_tool_results/call_abc_123"
        assert call_args[0][1] == large_content

        # Result should be modified
        assert isinstance(result, ToolMessage)
        assert "too large" in result.content.lower()
        assert "/large_tool_results/call_abc_123" in result.content

    @pytest.mark.asyncio
    async def test_tool_call_id_sanitization(self, mock_backend):
        """Test that tool call IDs are sanitized for filesystem paths."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=100,
        )

        large_content = "x" * 50000
        # Tool call ID with dangerous characters
        large_message = ToolMessage(
            content=large_content,
            tool_call_id="call.abc/123\\456",
        )

        await middleware._intercept_large_tool_result(large_message)

        # Should sanitize the ID
        call_args = mock_backend.write.call_args
        assert "/large_tool_results/call_abc_123_456" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_result_contains_preview(self, mock_backend):
        """Test that evicted result contains a preview."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=100,
        )

        large_content = "line1\nline2\nline3\n" + ("x" * 50000)
        large_message = ToolMessage(
            content=large_content,
            tool_call_id="call_123",
        )

        result = await middleware._intercept_large_tool_result(large_message)

        # Should contain preview of first lines
        assert "line1" in result.content or "first 10 lines" in result.content

    @pytest.mark.asyncio
    @patch("langcrew.middleware.large_tool_result.count_message_tokens")
    async def test_token_counting_with_llm(
        self, mock_count_tokens, mock_backend, mock_llm
    ):
        """Test accurate token counting with LLM."""
        mock_count_tokens.return_value = 25000  # Exceeds limit

        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=20000,
            llm=mock_llm,
        )

        # Create a message with enough content to trigger eviction
        large_message = ToolMessage(
            content="x" * 100000,  # Large enough to exceed char limit fallback
            tool_call_id="call_123",
        )

        await middleware._intercept_large_tool_result(large_message)

        # Should use token counting
        mock_count_tokens.assert_called()

        # Should evict
        mock_backend.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_command_message_processing(self, mock_backend):
        """Test processing Command with large messages."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=100,
        )

        large_content = "x" * 50000
        large_message = ToolMessage(
            content=large_content,
            tool_call_id="call_123",
        )

        small_message = ToolMessage(
            content="small",
            tool_call_id="call_456",
        )

        command = Command(update={"messages": [large_message, small_message]})

        result = await middleware._intercept_large_tool_result(command)

        # Should process Command messages
        assert isinstance(result, Command)
        mock_backend.write.assert_called_once()

        # Verify processed messages
        processed_messages = result.update["messages"]
        assert len(processed_messages) == 2
        # First message should be evicted
        assert "too large" in processed_messages[0].content.lower()
        # Second message should be unchanged
        assert processed_messages[1].content == "small"

    @pytest.mark.asyncio
    async def test_awrap_tool_call(self, mock_backend):
        """Test async wrapper for tool calls."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=100,
        )

        # Mock request and handler
        request = Mock()

        async def mock_handler(req):
            return ToolMessage(
                content="x" * 50000,
                tool_call_id="call_123",
            )

        result = await middleware.awrap_tool_call(request, mock_handler)

        # Should evict large result
        mock_backend.write.assert_called_once()
        assert isinstance(result, ToolMessage)

    def test_wrap_tool_call_passthrough(self, mock_backend):
        """Test sync wrapper passes through (no async file ops)."""
        middleware = LargeToolResultMiddleware(
            backend=mock_backend,
            token_limit=100,
        )

        request = Mock()

        def mock_handler(req):
            return ToolMessage(content="test", tool_call_id="call_123")

        result = middleware.wrap_tool_call(request, mock_handler)

        # Should pass through in sync mode
        assert result.content == "test"


class TestLargeToolResultMiddlewareEdgeCases:
    """Test edge cases for LargeToolResultMiddleware."""

    @pytest.mark.asyncio
    async def test_empty_content(self):
        """Test handling empty content."""
        backend = AsyncMock()
        middleware = LargeToolResultMiddleware(backend=backend, token_limit=1000)

        message = ToolMessage(content="", tool_call_id="call_123")
        result = await middleware._intercept_large_tool_result(message)

        assert result == message
        backend.write.assert_not_called()

    @pytest.mark.asyncio
    async def test_non_string_content(self):
        """Test handling non-string content."""
        backend = AsyncMock()
        middleware = LargeToolResultMiddleware(backend=backend, token_limit=1000)

        # ToolMessage with list content (shouldn't happen but test robustness)
        message = ToolMessage(content=["item1", "item2"], tool_call_id="call_123")
        result = await middleware._intercept_large_tool_result(message)

        # Should pass through non-string content
        assert result == message

    @pytest.mark.asyncio
    async def test_command_without_messages(self):
        """Test Command without messages field."""
        backend = AsyncMock()
        middleware = LargeToolResultMiddleware(backend=backend, token_limit=1000)

        command = Command(update={"other_field": "value"})
        result = await middleware._intercept_large_tool_result(command)

        # The middleware adds an empty messages list if not present
        assert isinstance(result, Command)
        assert result.update["other_field"] == "value"

    @pytest.mark.asyncio
    async def test_command_with_none_update(self):
        """Test Command with None update."""
        backend = AsyncMock()
        middleware = LargeToolResultMiddleware(backend=backend, token_limit=1000)

        command = Command(update=None)
        result = await middleware._intercept_large_tool_result(command)

        assert result == command

    @pytest.mark.asyncio
    async def test_multiple_large_messages_in_command(self):
        """Test Command with multiple large messages."""
        backend = AsyncMock()
        middleware = LargeToolResultMiddleware(backend=backend, token_limit=100)

        messages = [
            ToolMessage(content="x" * 50000, tool_call_id=f"call_{i}") for i in range(3)
        ]

        command = Command(update={"messages": messages})
        await middleware._intercept_large_tool_result(command)

        # Should evict all 3 large messages
        assert backend.write.call_count == 3
