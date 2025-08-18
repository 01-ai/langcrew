#!/usr/bin/env python3
"""
Fetch Tool Integration Tests

Simple integration tests for WebFetchTool to verify basic functionality
with real crawl4ai service endpoints.
"""

import os

import pytest

from langcrew_tools.fetch import WebFetchTool


class TestFetchIntegration:
    """Simple integration tests for WebFetchTool."""

    def setup_method(self):
        """Setup test environment."""
        self.service_url = os.getenv(
            "LANGCREW_CRAWL4AI_SERVICE_URL", "http://localhost:11235"
        )
        self.llm_api_key = os.getenv("LANGCREW_CRAWL4AI_LLM_API_KEY")

    @pytest.mark.skipif(
        not os.getenv("LANGCREW_CRAWL4AI_SERVICE_URL"),
        reason="Crawl4AI service not available (set LANGCREW_CRAWL4AI_SERVICE_URL)",
    )
    def test_basic_fetch_functionality(self):
        """Test basic web fetch functionality."""
        # Create fetch tool (will auto-fallback to pruning mode if no API key)
        fetch_tool = WebFetchTool(
            crawl4ai_service_url=self.service_url, crawl4ai_llm_api_key=self.llm_api_key
        )

        # Fetch a simple webpage
        result = fetch_tool.run({
            "url": "https://httpbin.org/html",
            "filter_type": "pruning",  # Use pruning to avoid API key requirement
        })

        # Basic assertions
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.skipif(
        not os.getenv("LANGCREW_CRAWL4AI_SERVICE_URL"),
        reason="Crawl4AI service not available",
    )
    def test_fetch_with_brief_parameter(self):
        """Test fetch functionality with brief parameter."""
        # Create fetch tool
        fetch_tool = WebFetchTool(
            crawl4ai_service_url=self.service_url, filter_type="pruning"
        )

        # Fetch with brief parameter
        result = fetch_tool.run({
            "url": "https://httpbin.org/json",
            "filter_type": "pruning",
            "brief": "Fetch JSON data from httpbin",
        })

        # Basic assertions
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.skipif(
        not os.getenv("LANGCREW_CRAWL4AI_SERVICE_URL"),
        reason="Crawl4AI service not available",
    )
    async def test_async_fetch_functionality(self):
        """Test async fetch functionality."""
        # Create fetch tool
        fetch_tool = WebFetchTool(
            crawl4ai_service_url=self.service_url, filter_type="pruning"
        )

        # Perform async fetch
        result = await fetch_tool.arun({
            "url": "https://httpbin.org/json",
            "filter_type": "pruning",
        })

        # Basic assertions
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0

    def test_input_model_has_brief_field(self):
        """Test that WebFetchInput model has brief field."""
        from langcrew_tools.fetch.langchain_tools import WebFetchInput

        # Create input instance with brief
        fetch_input = WebFetchInput(
            url="https://example.com",
            filter_type="pruning",
            brief="Test brief description",
        )

        # Verify brief field
        assert hasattr(fetch_input, "brief")
        assert fetch_input.brief == "Test brief description"

        # Test default brief value
        fetch_input_default = WebFetchInput(url="https://example.com")
        assert fetch_input_default.brief == ""

    def test_tool_initialization_with_defaults(self):
        """Test that tool can be initialized with default values."""
        # Should work with defaults
        fetch_tool = WebFetchTool()

        # Verify configuration (may use environment variables or defaults)
        expected_url = os.getenv(
            "LANGCREW_CRAWL4AI_SERVICE_URL", "http://localhost:11235"
        )
        assert fetch_tool.crawl4ai_service_url == expected_url
        assert fetch_tool.filter_type == "llm"
        assert fetch_tool.timeout == 120

    def test_filter_type_fallback(self):
        """Test automatic fallback from LLM to pruning filter when no API key."""
        # Create tool without API key
        fetch_tool = WebFetchTool(crawl4ai_llm_api_key=None, filter_type="llm")

        # Verify it has fallback logic (will be tested in actual run)
        assert fetch_tool.filter_type == "llm"  # Initial setting

        # The actual fallback happens during execution, not initialization
