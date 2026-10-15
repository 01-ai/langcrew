from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain_core.runnables.config import RunnableConfig

from langcrew_tools.fetch.langchain_tools import WebFetchInput, WebFetchTool


class TestWebFetchInput:
    """Test WebFetchInput model."""

    def test_required_url_field(self):
        """Test that url field is required."""
        with pytest.raises(ValueError):
            WebFetchInput()

    def test_url_field(self):
        """Test URL field validation."""
        input_model = WebFetchInput(url="https://example.com")
        assert input_model.url == "https://example.com"


class TestWebFetchTool:
    """Test WebFetchTool functionality."""

    config = RunnableConfig(configurable={"thread_id": "test_thread_id"})

    def test_default_configuration(self):
        """Test default configuration values."""
        tool = WebFetchTool()
        assert tool.timeout == 60
        assert tool.max_chars == 50000
        assert "User-Agent" in tool.headers
        assert (
            tool.headers["Accept"]
            == "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        )

    def test_init_with_constructor_params(self):
        """Test initialization with constructor parameters."""
        tool = WebFetchTool(
            timeout=120, max_chars=100000, headers={"Custom-Header": "test-value"}
        )
        assert tool.timeout == 120
        assert tool.max_chars == 100000
        assert tool.headers["Custom-Header"] == "test-value"

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        tool = WebFetchTool()
        assert tool.name == "web_fetch"
        assert tool.args_schema == WebFetchInput
        assert "markdown" in tool.description.lower()
        assert "url" in tool.description.lower()

    def test_url_validation_public_ip(self):
        """Test URL validation with public IP addresses."""
        tool = WebFetchTool()
        # Should not raise exception for valid URLs
        tool._validate_url("https://example.com")
        tool._validate_url("https://8.8.8.8")  # Public IP should work

    def test_url_validation_private_ip_blocked(self):
        """Test URL validation blocks private IP addresses."""
        tool = WebFetchTool()
        # Test known blocked IPs
        with pytest.raises(ValueError):
            tool._validate_url("http://127.0.0.1")

        with pytest.raises(ValueError):
            tool._validate_url("http://localhost")

    def test_url_validation_invalid_protocols(self):
        """Test URL validation rejects unsupported protocols."""
        tool = WebFetchTool()
        with pytest.raises(ValueError, match="Unsupported protocol"):
            tool._validate_url("ftp://example.com")

        with pytest.raises(ValueError, match="Unsupported protocol"):
            tool._validate_url("file:///etc/passwd")

    def test_url_validation_forbidden_domains(self):
        """Test URL validation blocks forbidden domains."""
        tool = WebFetchTool()
        with pytest.raises(ValueError, match="Access denied to"):
            tool._validate_url("http://localhost")

        with pytest.raises(ValueError, match="Access denied to"):
            tool._validate_url("http://127.0.0.1")

    @pytest.mark.asyncio
    async def test_fetch_with_httpx_403_error(self):
        """Test httpx fetch with 403 error."""
        tool = WebFetchTool()

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = Mock()
            mock_response.status_code = 403

            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)

            with pytest.raises(Exception, match="ACCESS_DENIED_403"):
                await tool._fetch_with_httpx("https://example.com")

    @pytest.mark.asyncio
    async def test_fetch_with_httpx_404_error(self):
        """Test httpx fetch with 404 error."""
        tool = WebFetchTool()

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = Mock()
            mock_response.status_code = 404

            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)

            with pytest.raises(Exception, match="NOT_FOUND_404"):
                await tool._fetch_with_httpx("https://example.com")

    def test_extract_markdown_from_html_success(self):
        """Test successful markdown extraction from HTML."""
        tool = WebFetchTool()
        html_content = (
            "<html><body><h1>Test Title</h1><p>Test paragraph</p></body></html>"
        )

        with patch(
            "langcrew_tools.fetch.langchain_tools.trafilatura.extract"
        ) as mock_extract:
            # Return content longer than 100 characters to pass the length check
            mock_extract.return_value = "<h1>Test Title</h1><p>This is a long paragraph that contains enough content to pass the minimum length check of 100 characters that is required for the extraction to be considered successful.</p>"

            with patch("langcrew_tools.fetch.langchain_tools.md") as mock_markdownify:
                mock_markdownify.return_value = "# Test Title\n\nThis is a long paragraph that contains enough content..."

                result = tool._extract_markdown_from_html(html_content)
                assert (
                    result
                    == "# Test Title\n\nThis is a long paragraph that contains enough content..."
                )
                mock_markdownify.assert_called_once()

    def test_extract_markdown_from_html_failure(self):
        """Test markdown extraction when trafilatura fails."""
        tool = WebFetchTool()
        html_content = "<html><body></body></html>"

        with patch(
            "langcrew_tools.fetch.langchain_tools.trafilatura.extract"
        ) as mock_extract:
            mock_extract.return_value = None

            result = tool._extract_markdown_from_html(html_content)
            assert result == ""

    def test_format_success(self):
        """Test success formatting."""
        tool = WebFetchTool()
        content = "This is test content"
        url = "https://example.com"

        result = tool._format_success(url, content, 100)
        assert f"# Content from {url}" in result
        assert content in result

    def test_format_success_with_truncation(self):
        """Test success formatting with content truncation."""
        tool = WebFetchTool()
        content = "This is a very long content that should be truncated"
        max_chars = 10
        url = "https://example.com"

        result = tool._format_success(url, content, max_chars)
        assert f"# Content from {url}" in result
        assert "[Content truncated:" in result
        assert len(result) <= len(content) + 100  # Allow room for truncation message

    def test_format_error_generic(self):
        """Test generic error formatting."""
        tool = WebFetchTool()
        url = "https://example.com"

        result = tool._format_error("CUSTOM_ERROR", url)
        assert "Failed to fetch" in result
        assert "CUSTOM_ERROR" in result

    def test_should_retry_with_browser_403(self):
        """Test retry decision for 403 errors."""
        tool = WebFetchTool()
        assert tool._should_retry_with_browser("403") is True
        assert tool._should_retry_with_browser("ACCESS_DENIED") is True
        assert tool._should_retry_with_browser("Cloudflare") is True

    def test_should_retry_with_browser_content_too_short(self):
        """Test retry decision for content too short."""
        tool = WebFetchTool()
        assert tool._should_retry_with_browser("CONTENT_TOO_SHORT") is True

    def test_should_retry_with_browser_non_retriable(self):
        """Test retry decision for non-retriable errors."""
        tool = WebFetchTool()
        assert tool._should_retry_with_browser("404") is False
        assert tool._should_retry_with_browser("NOT_FOUND") is False
        assert tool._should_retry_with_browser("DNS") is False
        assert tool._should_retry_with_browser("timeout") is False

    def test_should_retry_with_browser_default(self):
        """Test default retry decision."""
        tool = WebFetchTool()
        assert tool._should_retry_with_browser("UNKNOWN_ERROR") is True

    @pytest.mark.asyncio
    async def test_arun_success_with_httpx(self):
        """Test successful async execution using httpx."""
        tool = WebFetchTool()
        html_content = "<html><body><h1>Test Content</h1><p>This is test content.</p></body></html>"

        with patch.object(tool, "_fetch_with_httpx") as mock_fetch:
            mock_fetch.return_value = html_content

            with patch.object(tool, "_extract_markdown_from_html") as mock_extract:
                # Return content longer than 100 characters to pass the length check
                mock_extract.return_value = "# Test Content\n\nThis is test content that is long enough to pass the minimum length requirement of 100 characters for successful extraction. This ensures the test will pass the content validation check."

                result = await tool._arun("https://example.com")
                assert "# Test Content" in result
                assert "Content from https://example.com" in result

    @pytest.mark.asyncio
    async def test_arun_fallback_to_browser(self):
        """Test fallback to browser when httpx content is too short."""
        tool = WebFetchTool(max_chars=1000)

        with patch.object(tool, "_fetch_with_httpx") as mock_fetch:
            mock_fetch.side_effect = Exception("CONTENT_TOO_SHORT")

            with patch.object(tool, "_fetch_with_browser") as mock_browser:
                mock_browser.return_value = (
                    "# Browser Content\n\nContent from browser fallback."
                )

                result = await tool._arun("https://example.com")
                assert "# Browser Content" in result
                mock_browser.assert_called_once()

    def test_run_not_implemented(self):
        """Test that _run raises NotImplementedError."""
        tool = WebFetchTool()

        with pytest.raises(
            NotImplementedError, match="web_fetch only supports async execution"
        ):
            tool._run(url="https://example.com")

    @pytest.mark.asyncio
    async def test_arun_calls_internal(self):
        """Test that _arun calls _arun_internal."""
        tool = WebFetchTool()

        with patch.object(tool, "_arun_internal") as mock_internal:
            mock_internal.return_value = "Test result"

            result = await tool._arun("https://example.com")
            assert result == "Test result"
            mock_internal.assert_called_once_with("https://example.com")
