from unittest.mock import Mock, patch

import pytest

from langcrew_tools.search import WebSearchInput, WebSearchTool


class TestWebSearchInput:
    """Test WebSearchInput model."""

    def test_default_values(self):
        """Test default values for WebSearchInput."""
        input_model = WebSearchInput(query="test query")
        assert input_model.query == "test query"
        assert input_model.query_num == 20

    def test_custom_values(self):
        """Test custom values for WebSearchInput."""
        input_model = WebSearchInput(query="custom query", query_num=50)
        assert input_model.query == "custom query"
        assert input_model.query_num == 50


class TestWebSearchTool:
    """Test WebSearchTool functionality."""

    def test_init_with_constructor_params(self):
        """Test initialization with constructor parameters."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
            timeout=60,
            language="zh",
        )
        assert tool.endpoint == "https://api.example.com/search"
        assert tool.api_key == "test-api-key"
        assert tool.timeout == 60
        assert tool.language == "zh"

    def test_init_with_env_vars(self, monkeypatch):
        """Test initialization with environment variables."""
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_ENDPOINT", "https://env.example.com")
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_API_KEY", "env-api-key")
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_TIMEOUT", "45")
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_LANGUAGE", "zh")

        tool = WebSearchTool()
        assert tool.endpoint == "https://env.example.com"
        assert tool.api_key == "env-api-key"
        assert tool.timeout == 45
        assert tool.language == "zh"

    def test_init_missing_endpoint(self):
        """Test initialization fails when endpoint is missing."""
        with pytest.raises(ValueError, match="Web search endpoint is required"):
            WebSearchTool(api_key="test-key")

    def test_init_missing_api_key(self):
        """Test initialization fails when API key is missing."""
        with pytest.raises(ValueError, match="API key is required"):
            WebSearchTool(endpoint="https://api.example.com")

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert WebSearchTool.name == "web_search"
        # Create an instance to check args_schema
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
        )
        assert tool.args_schema == WebSearchInput
        assert "web search" in WebSearchTool.description.lower()

    @pytest.mark.asyncio
    async def test_arun_success(self):
        """Test successful async search request."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
        )

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "search_info": [
                    {"title": "Result 1", "url": "https://example1.com"},
                    {"title": "Result 2", "url": "https://example2.com"},
                ]
            }
        }

        with patch("requests.post", return_value=mock_response) as mock_post:
            results = await tool._arun(query="test query", query_num=10)

            # Verify the request
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            assert call_args[1]["url"] == "https://api.example.com/search"
            assert call_args[1]["headers"]["Authorization"] == "test-api-key"
            assert call_args[1]["json"]["customQuery"] == ["test query"]
            assert call_args[1]["json"]["queryNum"] == 10
            assert "retriever_source" not in call_args[1]["json"]

            # Verify the results
            assert len(results) == 2
            assert results[0]["title"] == "Result 1"
            assert results[1]["title"] == "Result 2"

    @pytest.mark.asyncio
    async def test_arun_with_chinese_language(self):
        """Test search request with Chinese language setting."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
            language="zh",
        )

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {"search_info": []}}

        with patch("requests.post", return_value=mock_response) as mock_post:
            await tool._arun(query="测试查询", query_num=5)

            # Verify retriever_source is set for Chinese
            call_args = mock_post.call_args
            assert call_args[1]["json"]["retriever_source"] == "bocha"

    @pytest.mark.asyncio
    async def test_arun_request_failure(self):
        """Test handling of request failure."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
        )

        with patch("requests.post", side_effect=Exception("Network error")):
            results = await tool._arun(query="test query")
            # Should return empty list on error
            assert results == []

    @pytest.mark.asyncio
    async def test_arun_authentication_failure(self):
        """Test handling of authentication failure."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="invalid-key",
        )

        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = Exception("401 Unauthorized")

        with patch("requests.post", return_value=mock_response):
            results = await tool._arun(query="test query")
            # Should return empty list on auth error
            assert results == []

    def test_run_calls_arun(self):
        """Test that _run method calls _arun correctly."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
        )

        expected_results = [{"title": "Test Result"}]

        with patch.object(tool, "_arun", return_value=expected_results) as mock_arun:
            results = tool._run(query="test query", query_num=15)

            # Verify _arun was called with correct parameters
            mock_arun.assert_called_once_with(query="test query", query_num=15)
            assert results == expected_results

    @pytest.mark.asyncio
    async def test_arun_timeout(self):
        """Test request timeout handling."""
        tool = WebSearchTool(
            endpoint="https://api.example.com/search",
            api_key="test-api-key",
            timeout=1,
        )

        with patch("requests.post", side_effect=Exception("Timeout")):
            results = await tool._arun(query="test query")
            # Should return empty list on timeout
            assert results == []

    def test_priority_order(self, monkeypatch):
        """Test configuration priority: constructor > env vars > defaults."""
        # Set environment variables
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_ENDPOINT", "https://env.example.com")
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_API_KEY", "env-key")
        monkeypatch.setenv("LANGCREW_WEB_SEARCH_LANGUAGE", "zh")

        # Constructor params should override env vars
        tool = WebSearchTool(
            endpoint="https://constructor.example.com",
            api_key="constructor-key",
            language="en",
        )

        assert tool.endpoint == "https://constructor.example.com"
        assert tool.api_key == "constructor-key"
        assert tool.language == "en"