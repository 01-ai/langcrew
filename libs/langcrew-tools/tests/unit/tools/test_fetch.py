from unittest.mock import AsyncMock, Mock, patch

import pytest

from langcrew_tools.fetch import WebFetchInput, WebFetchTool


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

    def test_default_filter_type(self):
        """Test default filter_type value."""
        input_model = WebFetchInput(url="https://example.com")
        assert input_model.filter_type == "llm"

    def test_custom_filter_type(self):
        """Test custom filter_type value."""
        input_model = WebFetchInput(url="https://example.com", filter_type="pruning")
        assert input_model.filter_type == "pruning"


class TestWebFetchTool:
    """Test WebFetchTool functionality."""

    def test_default_configuration(self):
        """Test default configuration values."""
        tool = WebFetchTool()
        assert tool.timeout == 120
        assert tool.max_content_length == 128000
        assert tool.filter_type == "pruning"  # Should fallback to pruning when no API key
        assert tool.crawl4ai_service_url == "http://localhost:11235"
        assert tool.crawl4ai_llm_provider == "openai/gpt-4o-mini"
        assert tool.crawl4ai_llm_api_key is None
        assert tool.proxy is None

    def test_init_with_constructor_params(self):
        """Test initialization with constructor parameters."""
        tool = WebFetchTool(
            timeout=60,
            max_content_length=50000,
            filter_type="pruning",
            crawl4ai_service_url="https://custom.example.com",
            crawl4ai_llm_provider="openai/gpt-4",
            crawl4ai_llm_api_key="test-api-key",
            proxy="http://proxy.example.com:8080",
        )
        assert tool.timeout == 60
        assert tool.max_content_length == 50000
        assert tool.filter_type == "pruning"
        assert tool.crawl4ai_service_url == "https://custom.example.com"
        assert tool.crawl4ai_llm_provider == "openai/gpt-4"
        assert tool.crawl4ai_llm_api_key == "test-api-key"
        assert tool.proxy == "http://proxy.example.com:8080"

    def test_init_with_env_vars(self, monkeypatch):
        """Test initialization with environment variables."""
        monkeypatch.setenv("LANGCREW_CRAWL4AI_SERVICE_URL", "https://env.example.com")
        monkeypatch.setenv("LANGCREW_WEB_FETCH_TIMEOUT", "90")
        monkeypatch.setenv("LANGCREW_WEB_FETCH_MAX_CONTENT_LENGTH", "64000")
        monkeypatch.setenv("LANGCREW_WEB_FETCH_FILTER_TYPE", "pruning")
        monkeypatch.setenv("LANGCREW_CRAWL4AI_LLM_PROVIDER", "openai/gpt-3.5-turbo")
        monkeypatch.setenv("LANGCREW_CRAWL4AI_LLM_API_KEY", "env-api-key")
        monkeypatch.setenv("LANGCREW_WEB_FETCH_PROXY", "http://env-proxy.com:3128")

        tool = WebFetchTool()
        assert tool.crawl4ai_service_url == "https://env.example.com"
        assert tool.timeout == 90
        assert tool.max_content_length == 64000
        assert tool.filter_type == "pruning"
        assert tool.crawl4ai_llm_provider == "openai/gpt-3.5-turbo"
        assert tool.crawl4ai_llm_api_key == "env-api-key"
        assert tool.proxy == "http://env-proxy.com:3128"

    def test_crawl4ai_llm_api_key_default(self):
        """Test that crawl4ai_llm_api_key defaults to None when not configured."""
        tool = WebFetchTool()
        assert tool.crawl4ai_llm_api_key is None

    def test_priority_order(self, monkeypatch):
        """Test configuration priority: constructor > env vars > defaults."""
        # Set environment variables
        monkeypatch.setenv("LANGCREW_CRAWL4AI_SERVICE_URL", "https://env.example.com")
        monkeypatch.setenv("LANGCREW_WEB_FETCH_TIMEOUT", "90")
        monkeypatch.setenv("LANGCREW_CRAWL4AI_LLM_API_KEY", "env-key")
        monkeypatch.setenv("OPENAI_API_KEY", "openai-key")

        # Constructor params should override env vars
        tool = WebFetchTool(
            crawl4ai_service_url="https://constructor.example.com",
            timeout=45,
            crawl4ai_llm_api_key="constructor-key",
        )

        assert tool.crawl4ai_service_url == "https://constructor.example.com"
        assert tool.timeout == 45
        assert tool.crawl4ai_llm_api_key == "constructor-key"

    def test_tool_metadata(self):
        """Test tool metadata properties."""
        assert WebFetchTool.name == "web_fetch"
        tool = WebFetchTool()
        assert tool.args_schema == WebFetchInput
        assert "crawl a web page" in WebFetchTool.description.lower()

    @pytest.mark.asyncio
    async def test_arun_success_pruning_filter(self):
        """Test successful async fetch request with pruning filter."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        # Mock successful response
        mock_response_data = {
            "success": True,
            "results": [
                {
                    "markdown": {
                        "raw_markdown": "# Test Content\n\nThis is test content from the webpage."
                    }
                }
            ],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com", filter_type="pruning")

            # Verify the result
            assert result == "# Test Content\n\nThis is test content from the webpage."

            # Verify the request was made correctly
            mock_session_instance.post.assert_called_once()
            call_args = mock_session_instance.post.call_args

            assert call_args[0][0] == "https://api.example.com/crawl"
            payload = call_args[1]["json"]
            assert payload["urls"] == ["https://example.com"]

            # Check pruning filter configuration
            markdown_gen = payload["crawler_config"]["params"]["markdown_generator"]
            content_filter = markdown_gen["params"]["content_filter"]
            assert content_filter["type"] == "PruningContentFilter"
            assert content_filter["params"]["threshold"] == 0.45

    @pytest.mark.asyncio
    async def test_arun_success_llm_filter(self):
        """Test successful async fetch request with LLM filter."""
        tool = WebFetchTool(
            crawl4ai_service_url="https://api.example.com",
            crawl4ai_llm_provider="openai/gpt-4",
            crawl4ai_llm_api_key="test-key",
        )

        # Mock successful response with fit_markdown
        mock_response_data = {
            "success": True,
            "results": [
                {
                    "markdown": {
                        "fit_markdown": "# Filtered Content\n\nThis is LLM-filtered content."
                    }
                }
            ],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com", filter_type="llm")

            # Verify the result prefers fit_markdown
            assert result == "# Filtered Content\n\nThis is LLM-filtered content."

            # Verify LLM filter configuration
            call_args = mock_session_instance.post.call_args
            payload = call_args[1]["json"]

            markdown_gen = payload["crawler_config"]["params"]["markdown_generator"]
            content_filter = markdown_gen["params"]["content_filter"]
            assert content_filter["type"] == "LLMContentFilter"

            llm_config = content_filter["params"]["llm_config"]["params"]
            assert llm_config["provider"] == "openai/gpt-4"
            assert llm_config["api_token"] == "test-key"

    @pytest.mark.asyncio
    async def test_arun_with_proxy(self):
        """Test async fetch request with proxy configuration."""
        tool = WebFetchTool(
            crawl4ai_service_url="https://api.example.com", proxy="http://proxy.example.com:8080"
        )

        mock_response_data = {
            "success": True,
            "results": [{"markdown": {"raw_markdown": "content"}}],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            await tool._arun(url="https://example.com")

            # Verify proxy is included in browser config
            call_args = mock_session_instance.post.call_args
            payload = call_args[1]["json"]
            browser_config = payload["browser_config"]["params"]
            assert browser_config["proxy"] == "http://proxy.example.com:8080"

    @pytest.mark.asyncio
    async def test_arun_without_proxy(self):
        """Test async fetch request without proxy configuration."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        mock_response_data = {
            "success": True,
            "results": [{"markdown": {"raw_markdown": "content"}}],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            await tool._arun(url="https://example.com")

            # Verify proxy is not included in browser config
            call_args = mock_session_instance.post.call_args
            payload = call_args[1]["json"]
            browser_config = payload["browser_config"]["params"]
            assert "proxy" not in browser_config

    @pytest.mark.asyncio
    async def test_arun_content_truncation(self):
        """Test content truncation when exceeding max_content_length."""
        tool = WebFetchTool(
            crawl4ai_service_url="https://api.example.com", max_content_length=20
        )

        # Mock response with long content
        long_content = (
            "This is a very long content that exceeds the maximum length limit."
        )
        mock_response_data = {
            "success": True,
            "results": [{"markdown": {"raw_markdown": long_content}}],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com")

            # Verify content is truncated
            assert len(result) <= 20 + len("\n\n[Content truncated...]")
            assert result.endswith("[Content truncated...]")

    @pytest.mark.asyncio
    async def test_arun_http_error(self):
        """Test handling of HTTP error responses."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 500
            mock_response.text = AsyncMock(return_value="Server Error")

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com")

            # Should return error message
            assert "HTTP error 500" in result
            assert "Failed to connect to crawl4ai service" in result

    @pytest.mark.asyncio
    async def test_arun_service_error(self):
        """Test handling of service error responses."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        mock_response_data = {"success": False, "error": "Service unavailable"}

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com")

            # Should return service error message
            assert "Failed to crawl the webpage: Service unavailable" in result

    @pytest.mark.asyncio
    async def test_arun_no_results(self):
        """Test handling when service returns no results."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        mock_response_data = {"success": True, "results": []}

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com")

            # Should return no results message
            assert result == "No results returned from crawl4ai service"

    @pytest.mark.asyncio
    async def test_arun_empty_content(self):
        """Test handling when extracted content is empty."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        mock_response_data = {
            "success": True,
            "results": [{"markdown": {"raw_markdown": ""}}],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await tool._arun(url="https://example.com")

            # Should return default message for empty content
            assert result == "No content extracted"

    def test_run_calls_arun(self):
        """Test that _run method calls _arun correctly."""
        tool = WebFetchTool(crawl4ai_service_url="https://api.example.com")

        expected_result = "Test content"

        with patch.object(tool, "_arun", return_value=expected_result) as mock_arun:
            result = tool._run(url="https://example.com", filter_type="pruning")

            # Verify _arun was called with correct parameters
            mock_arun.assert_called_once_with(
                url="https://example.com", filter_type="pruning"
            )
            assert result == expected_result

    @pytest.mark.asyncio
    async def test_arun_uses_instance_filter_type_when_none_provided(self):
        """Test that _arun uses instance filter_type when parameter is None."""
        tool = WebFetchTool(
            crawl4ai_service_url="https://api.example.com", filter_type="pruning"
        )

        mock_response_data = {
            "success": True,
            "results": [{"markdown": {"raw_markdown": "content"}}],
        }

        with patch("aiohttp.ClientSession") as mock_session:
            # Create a mock response
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)

            # Create mock for the context manager protocol
            mock_post = AsyncMock()
            mock_post.__aenter__ = AsyncMock(return_value=mock_response)
            mock_post.__aexit__ = AsyncMock(return_value=None)

            # Create mock session instance
            mock_session_instance = AsyncMock()
            mock_session_instance.post = Mock(return_value=mock_post)

            # Make ClientSession() return a context manager
            mock_session.return_value.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session.return_value.__aexit__ = AsyncMock(return_value=None)

            await tool._arun(url="https://example.com", filter_type=None)

            # Should use instance filter_type (pruning)
            call_args = mock_session_instance.post.call_args
            payload = call_args[1]["json"]

            markdown_gen = payload["crawler_config"]["params"]["markdown_generator"]
            content_filter = markdown_gen["params"]["content_filter"]
            assert content_filter["type"] == "PruningContentFilter"

    def test_auto_fallback_to_pruning_without_api_key(self):
        """Test that tool automatically falls back to pruning mode when no API key is provided."""
        # Create tool with default llm filter but no API key
        tool = WebFetchTool()
        
        # Should automatically fallback to pruning mode
        assert tool.filter_type == "pruning"

    def test_auto_fallback_to_pruning_with_llm_filter_but_no_key(self):
        """Test fallback when explicitly setting llm filter but providing no API key."""
        tool = WebFetchTool(filter_type="llm")  # No crawl4ai_llm_api_key provided
        
        # Should automatically fallback to pruning mode
        assert tool.filter_type == "pruning"

    def test_no_fallback_when_api_key_provided(self):
        """Test that no fallback occurs when API key is provided."""
        tool = WebFetchTool(filter_type="llm", crawl4ai_llm_api_key="test-key")
        
        # Should keep llm filter_type
        assert tool.filter_type == "llm"
        assert tool.crawl4ai_llm_api_key == "test-key"

    def test_openai_api_key_fallback(self, monkeypatch):
        """Test that OPENAI_API_KEY is used as fallback for crawl4ai_llm_api_key."""
        monkeypatch.setenv("OPENAI_API_KEY", "openai-fallback-key")
        
        tool = WebFetchTool(filter_type="llm")
        
        # Should use OPENAI_API_KEY as fallback and keep llm mode
        assert tool.filter_type == "llm"
        assert tool.crawl4ai_llm_api_key == "openai-fallback-key"

    def test_env_var_overrides_openai_api_key_fallback(self, monkeypatch):
        """Test that LANGCREW_CRAWL4AI_LLM_API_KEY overrides OPENAI_API_KEY."""
        monkeypatch.setenv("OPENAI_API_KEY", "openai-fallback-key")
        monkeypatch.setenv("LANGCREW_CRAWL4AI_LLM_API_KEY", "crawl4ai-specific-key")
        
        tool = WebFetchTool(filter_type="llm")
        
        # Should use the specific crawl4ai key, not the OPENAI_API_KEY
        assert tool.filter_type == "llm"
        assert tool.crawl4ai_llm_api_key == "crawl4ai-specific-key"
