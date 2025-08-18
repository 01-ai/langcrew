#!/usr/bin/env python3
"""
Search Tool Integration Tests

Simple integration tests for WebSearchTool to verify basic functionality
with real search service endpoints.
"""

import os

import pytest

from langcrew_tools.search import WebSearchTool


class TestSearchIntegration:
    """Simple integration tests for WebSearchTool."""

    def setup_method(self):
        """Setup test environment."""
        self.endpoint = os.getenv("LANGCREW_WEB_SEARCH_ENDPOINT")
        self.api_key = os.getenv("LANGCREW_WEB_SEARCH_API_KEY")

    @pytest.mark.skipif(
        not os.getenv("LANGCREW_WEB_SEARCH_ENDPOINT")
        or not os.getenv("LANGCREW_WEB_SEARCH_API_KEY"),
        reason="Search service credentials not provided in environment variables",
    )
    def test_basic_search_functionality(self):
        """Test basic web search functionality."""
        # Create search tool
        search_tool = WebSearchTool(endpoint=self.endpoint, api_key=self.api_key)

        # Perform a simple search
        results = search_tool.run({"query": "Python programming", "query_num": 5})

        # Basic assertions
        assert results is not None
        assert isinstance(results, list)
        assert len(results) <= 5

        # Check if results contain expected fields
        if results:
            first_result = results[0]
            assert isinstance(first_result, dict)

    @pytest.mark.skipif(
        not os.getenv("LANGCREW_WEB_SEARCH_ENDPOINT")
        or not os.getenv("LANGCREW_WEB_SEARCH_API_KEY"),
        reason="Search service credentials not provided in environment variables",
    )
    def test_search_with_brief_parameter(self):
        """Test search functionality with brief parameter."""
        # Create search tool
        search_tool = WebSearchTool(endpoint=self.endpoint, api_key=self.api_key)

        # Perform search with brief parameter
        results = search_tool.run({
            "query": "artificial intelligence",
            "query_num": 3,
            "brief": "Search for AI information",
        })

        # Basic assertions
        assert results is not None
        assert isinstance(results, list)
        assert len(results) <= 3

    @pytest.mark.skipif(
        not os.getenv("LANGCREW_WEB_SEARCH_ENDPOINT")
        or not os.getenv("LANGCREW_WEB_SEARCH_API_KEY"),
        reason="Search service credentials not provided in environment variables",
    )
    async def test_async_search_functionality(self):
        """Test async search functionality."""
        # Create search tool
        search_tool = WebSearchTool(endpoint=self.endpoint, api_key=self.api_key)

        # Perform async search
        results = await search_tool.arun({"query": "machine learning", "query_num": 3})

        # Basic assertions
        assert results is not None
        assert isinstance(results, list)
        assert len(results) <= 3

    def test_input_model_has_brief_field(self):
        """Test that WebSearchInput model has brief field."""
        from langcrew_tools.search.langchain_tools import WebSearchInput

        # Create input instance with brief
        search_input = WebSearchInput(
            query="test query", query_num=5, brief="Test brief description"
        )

        # Verify brief field
        assert hasattr(search_input, "brief")
        assert search_input.brief == "Test brief description"

        # Test default brief value
        search_input_default = WebSearchInput(query="test")
        assert search_input_default.brief == ""

    def test_tool_initialization_without_credentials(self, monkeypatch):
        """Test that tool initialization fails gracefully without credentials."""
        # Clear any existing environment variables
        monkeypatch.delenv("LANGCREW_WEB_SEARCH_ENDPOINT", raising=False)
        monkeypatch.delenv("LANGCREW_WEB_SEARCH_API_KEY", raising=False)

        with pytest.raises(ValueError, match="Web search endpoint is required"):
            WebSearchTool()

        with pytest.raises(ValueError, match="API key is required"):
            WebSearchTool(endpoint="http://test.com")
