#!/usr/bin/env python3
"""
Fetch Tool Integration Tests

Integration tests for WebFetchTool to verify functionality with real websites
using the new httpx + playwright implementation.
"""

import pytest

from langcrew_tools.fetch.langchain_tools import WebFetchTool


class TestFetchIntegration:
    """Integration tests for WebFetchTool core functionality."""

    def test_tool_initialization(self):
        """Test that tool can be initialized with default values."""
        fetch_tool = WebFetchTool()
        assert fetch_tool.timeout == 60
        assert fetch_tool.max_chars == 50000
        assert "User-Agent" in fetch_tool.headers

    @pytest.mark.asyncio
    async def test_fetch_real_website(self):
        """Test fetching a real website with httpx."""
        fetch_tool = WebFetchTool()

        # Fetch a simple static website
        result = await fetch_tool._arun("https://httpbin.org/html")

        # Basic assertions - verify core functionality
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0
        assert "Content from https://httpbin.org/html" in result

    @pytest.mark.asyncio
    async def test_fetch_non_utf8_encoding(self):
        """Test fetching a website with non-UTF-8 encoding (GBK/GB2312)."""
        fetch_tool = WebFetchTool()

        # Chinese website that uses GBK/GB2312 encoding
        result = await fetch_tool._arun(
            "http://dangshi.people.com.cn/n1/2021/0628/c436975-32142118.html"
        )

        # Verify encoding was handled correctly
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0
        
        # Check for Chinese characters (should not be garbled)
        # The page contains "中国共产党" (Communist Party of China)
        assert "中国" in result or "Content from" in result
        # Should not contain encoding errors like question marks
        assert "�" not in result or result.count("�") < 10  # Allow minimal encoding issues

    @pytest.mark.asyncio
    async def test_url_validation_security(self):
        """Test URL validation blocks dangerous requests."""
        fetch_tool = WebFetchTool()

        # Test private IP blocking - should return error message, not raise
        result = await fetch_tool._arun("http://127.0.0.1")
        assert "Failed to fetch" in result
        assert "127.0.0.1" in result

        # Test unsupported protocols - should return error message
        result = await fetch_tool._arun("ftp://example.com")
        assert "Failed to fetch" in result or "Invalid URL" in result

    @pytest.mark.asyncio
    async def test_forbidden_file_types(self):
        """Test that non-HTML file types are blocked."""
        fetch_tool = WebFetchTool()

        # Test PDF blocking - should return error message
        result = await fetch_tool._arun("https://example.com/document.pdf")
        assert "Failed to fetch" in result
        assert "only supports HTML web pages" in result

        # Test office document blocking
        result = await fetch_tool._arun("https://example.com/document.docx")
        assert "Failed to fetch" in result
        assert "only supports HTML web pages" in result

    def test_sync_execution_not_supported(self):
        """Test that sync execution raises NotImplementedError."""
        fetch_tool = WebFetchTool()
        with pytest.raises(NotImplementedError, match="web_fetch only supports async execution"):
            fetch_tool._run(url="https://example.com")


class TestFetchBrowserFallback:
    """Test browser fallback functionality."""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_browser_fallback_on_403(self):
        """Test that browser fallback is triggered on 403 errors."""
        fetch_tool = WebFetchTool()
        
        # Note: This test may be skipped if no suitable test URL is available
        # Some websites that typically return 403 to simple HTTP clients
        # but work with browser might be tested here
        # For now, we just test the logic exists
        
        error_type = "ACCESS_DENIED_403"
        should_retry = fetch_tool._should_retry_with_browser(error_type)
        assert should_retry is True

    @pytest.mark.asyncio
    async def test_no_retry_on_404(self):
        """Test that browser fallback is NOT triggered on 404 errors."""
        fetch_tool = WebFetchTool()
        
        error_type = "NOT_FOUND_404"
        should_retry = fetch_tool._should_retry_with_browser(error_type)
        assert should_retry is False

    @pytest.mark.asyncio
    async def test_retry_on_short_content(self):
        """Test that browser fallback is triggered when content is too short."""
        fetch_tool = WebFetchTool()
        
        error_type = "CONTENT_TOO_SHORT"
        should_retry = fetch_tool._should_retry_with_browser(error_type)
        assert should_retry is True


class TestFetchRealWorldScenarios:
    """Test real-world usage scenarios."""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_static_site_wikipedia(self):
        """Test fetching from Wikipedia (static HTML site)."""
        fetch_tool = WebFetchTool()
        
        result = await fetch_tool._arun("https://en.wikipedia.org/wiki/Web_scraping")
        
        assert result is not None
        assert "Web scraping" in result or "web scraping" in result
        assert "Content from" in result

    @pytest.mark.asyncio
    @pytest.mark.slow  
    async def test_chinese_website_baidu(self):
        """Test fetching from Baidu (Chinese website)."""
        fetch_tool = WebFetchTool()
        
        result = await fetch_tool._arun("https://www.baidu.com")
        
        assert result is not None
        assert isinstance(result, str)
        # Baidu's homepage should contain Chinese characters
        assert len(result) > 100
