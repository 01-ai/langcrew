import base64
import sys
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from langchain_core.messages import HumanMessage

from langcrew_tools.image_parser.config import ImageParserConfig
from langcrew_tools.image_parser.langchain_tools import (
    ImageParserInput,
    ImageParserTool,
)

# Mock langchain_openai before importing our modules
sys.modules["langchain_openai"] = MagicMock()




class TestImageParserInput:
    """Test ImageParserInput model."""

    def test_required_fields(self):
        """Test required fields for ImageParserInput."""
        input_model = ImageParserInput(
            image_url="https://example.com/image.jpg",
            question="What do you see in this image?"
        )
        assert input_model.image_url == "https://example.com/image.jpg"
        assert input_model.question == "What do you see in this image?"

    def test_field_validation(self):
        """Test field validation."""
        with pytest.raises(ValueError):
            ImageParserInput(question="What do you see?")  # Missing image_url
        
        with pytest.raises(ValueError):
            ImageParserInput(image_url="https://example.com/image.jpg")  # Missing question


class TestImageParserConfig:
    """Test ImageParserConfig configuration management."""

    def test_default_values(self):
        """Test default configuration values."""
        config = ImageParserConfig()
        assert config.vision_model == "gpt-4o"
        assert config.vision_base_url is None
        assert config.vision_api_key is None
        assert config.request_timeout == 60
        assert config.max_image_size == 20 * 1024 * 1024
        assert config.max_tokens == 4096
        assert config.temperature == 0.0
        assert config.supported_formats is not None
        assert "jpg" in config.supported_formats
        assert "png" in config.supported_formats

    def test_env_var_loading(self, monkeypatch):
        """Test loading configuration from environment variables."""
        monkeypatch.setenv("VISION_MODEL", "gpt-4-vision-preview")
        monkeypatch.setenv("VISION_BASE_URL", "https://custom.api.com")
        monkeypatch.setenv("VISION_API_KEY", "test-api-key")
        monkeypatch.setenv("VISION_TIMEOUT", "30")
        monkeypatch.setenv("VISION_MAX_TOKENS", "2048")
        monkeypatch.setenv("VISION_TEMPERATURE", "0.5")
        monkeypatch.setenv("VISION_MAX_IMAGE_SIZE", "10485760")  # 10MB

        config = ImageParserConfig()
        assert config.vision_model == "gpt-4-vision-preview"
        assert config.vision_base_url == "https://custom.api.com"
        assert config.vision_api_key == "test-api-key"
        assert config.request_timeout == 30
        assert config.max_tokens == 2048
        assert config.temperature == 0.5
        assert config.max_image_size == 10485760

    def test_invalid_env_values(self, monkeypatch):
        """Test handling of invalid environment variable values."""
        monkeypatch.setenv("VISION_TIMEOUT", "invalid")
        monkeypatch.setenv("VISION_MAX_TOKENS", "not_a_number")
        monkeypatch.setenv("VISION_TEMPERATURE", "invalid_float")
        monkeypatch.setenv("VISION_MAX_IMAGE_SIZE", "invalid_size")

        config = ImageParserConfig()
        # Should fall back to defaults for invalid values
        assert config.request_timeout == 60
        assert config.max_tokens == 4096
        assert config.temperature == 0.0
        assert config.max_image_size == 20 * 1024 * 1024

    def test_validate_method(self):
        """Test configuration validation."""
        config = ImageParserConfig()
        config.validate()  # Should not raise

        config.vision_model = ""
        with pytest.raises(ValueError, match="Vision model is required"):
            config.validate()

    def test_supported_formats_initialization(self):
        """Test supported formats list initialization."""
        config = ImageParserConfig()
        expected_formats = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"]
        assert all(fmt in config.supported_formats for fmt in expected_formats)


class TestImageParserTool:
    """Test ImageParserTool basic functionality."""

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_tool_metadata(self, mock_create_llm):
        """Test tool metadata properties."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        assert ImageParserTool.name == "image_parser"
        assert tool.args_schema == ImageParserInput
        assert "analyze images" in ImageParserTool.description.lower()
        assert "vision models" in ImageParserTool.description.lower()

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_init_default_config(self, mock_create_llm):
        """Test initialization with default configuration."""
        mock_llm = Mock()
        mock_create_llm.return_value = mock_llm
        
        tool = ImageParserTool()
        assert tool.config is not None
        assert tool.llm == mock_llm
        mock_create_llm.assert_called_once()

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_init_custom_config(self, mock_create_llm):
        """Test initialization with custom configuration."""
        custom_config = ImageParserConfig()
        custom_config.vision_model = "custom-model"
        mock_llm = Mock()
        mock_create_llm.return_value = mock_llm
        
        tool = ImageParserTool(config=custom_config)
        assert tool.config == custom_config
        assert tool.config.vision_model == "custom-model"

    def test_init_with_custom_llm(self):
        """Test initialization with custom LLM."""
        mock_llm = Mock()
        tool = ImageParserTool(llm=mock_llm)
        assert tool.llm == mock_llm

    def test_create_default_llm_success(self):
        """Test successful creation of default LLM."""
        config = ImageParserConfig()
        config.vision_api_key = "test-key"
        config.vision_base_url = "https://api.test.com"
        
        tool_instance = ImageParserTool.__new__(ImageParserTool)
        object.__setattr__(tool_instance, 'config', config)
        
        # Mock the dynamic import of ChatOpenAI
        mock_llm = Mock()
        with patch("langchain_openai.ChatOpenAI", return_value=mock_llm) as mock_chat_openai:
            result = tool_instance._create_default_llm()
            
            assert result == mock_llm
            mock_chat_openai.assert_called_once_with(
                model="gpt-4o",
                temperature=0.0,
                max_tokens=4096,
                request_timeout=60,
                api_key="test-key",
                base_url="https://api.test.com"
            )

    def test_create_default_llm_import_error(self):
        """Test handling of import error when creating default LLM."""
        tool_instance = ImageParserTool.__new__(ImageParserTool)
        object.__setattr__(tool_instance, 'config', ImageParserConfig())

        # Mock the import to raise ImportError
        with patch("langchain_openai.ChatOpenAI", side_effect=ImportError("No module named 'langchain_openai'")):
            with pytest.raises(ImportError, match="langchain_openai is required"):
                tool_instance._create_default_llm()

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_get_supported_formats(self, mock_create_llm):
        """Test get_supported_formats method."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        formats = tool.get_supported_formats()
        expected_formats = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"]
        assert all(fmt in formats for fmt in expected_formats)

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_repr(self, mock_create_llm):
        """Test string representation of the tool."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        repr_str = repr(tool)
        assert "ImageParserTool" in repr_str
        assert "gpt-4o" in repr_str


class TestImageDownloadAndValidation:
    """Test image download and validation functionality."""

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_download_and_validate_image_success(self, mock_create_llm):
        """Test successful image download and validation."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        image_data = b"fake-image-data"
        
        mock_response = Mock()
        mock_response.content = image_data
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.raise_for_status = Mock()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_class.return_value = mock_client

            result_data, mime_type = await tool._download_and_validate_image(
                "https://example.com/image.jpg"
            )
            
            assert result_data == image_data
            assert mime_type == "image/jpeg"
            mock_client.get.assert_called_once_with("https://example.com/image.jpg")

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_download_invalid_url(self, mock_create_llm):
        """Test handling of invalid URL."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        with pytest.raises(ValueError, match="Invalid URL format"):
            await tool._download_and_validate_image("not-a-valid-url")

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_download_http_error(self, mock_create_llm):
        """Test handling of HTTP errors."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        with patch("httpx.AsyncClient") as mock_client_class:
            # Import httpx to get the proper exceptions
            import httpx
            
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
            mock_client_class.return_value = mock_client

            with pytest.raises(ValueError, match="Failed to download image"):
                await tool._download_and_validate_image("https://example.com/nonexistent.jpg")

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_download_image_too_large(self, mock_create_llm):
        """Test handling of images that are too large."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        large_image_data = b"x" * (25 * 1024 * 1024)  # 25MB, exceeds default 20MB limit
        
        mock_response = Mock()
        mock_response.content = large_image_data
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.raise_for_status = Mock()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_class.return_value = mock_client

            with pytest.raises(ValueError, match="Image too large"):
                await tool._download_and_validate_image("https://example.com/large.jpg")

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_validate_content_type_with_header(self, mock_create_llm):
        """Test content type validation with proper header."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        mime_type = tool._validate_content_type("image/png", "https://example.com/test.jpg")
        assert mime_type == "image/png"

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_validate_content_type_from_extension(self, mock_create_llm):
        """Test content type validation by guessing from file extension."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        test_cases = [
            ("https://example.com/test.jpg", "image/jpeg"),
            ("https://example.com/test.png", "image/png"),
            ("https://example.com/test.gif", "image/gif"),
            ("https://example.com/test.webp", "image/webp"),
            ("https://example.com/test.bmp", "image/bmp"),
            ("https://example.com/test.tiff", "image/tiff"),
            ("https://example.com/test.svg", "image/svg+xml"),
            ("https://example.com/test", "image/jpeg"),  # Default fallback
        ]
        
        for url, expected_mime in test_cases:
            mime_type = tool._validate_content_type("", url)
            assert mime_type == expected_mime

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_validate_content_type_unsupported(self, mock_create_llm):
        """Test handling of unsupported image formats."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        with pytest.raises(ValueError, match="Unsupported image format"):
            tool._validate_content_type("image/unsupported", "https://example.com/test.xyz")


class TestVisionModelIntegration:
    """Test vision model integration functionality."""

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_create_vision_message(self, mock_create_llm):
        """Test creation of vision model message."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        image_data = b"fake-image-data"
        mime_type = "image/jpeg"
        question = "What do you see in this image?"
        
        message = tool._create_vision_message(image_data, mime_type, question)
        
        assert isinstance(message, HumanMessage)
        assert isinstance(message.content, list)
        assert len(message.content) == 2
        
        # Check image content
        image_content = message.content[0]
        assert image_content["type"] == "image_url"
        assert "image_url" in image_content
        assert image_content["image_url"]["detail"] == "high"
        
        expected_b64 = base64.b64encode(image_data).decode("utf-8")
        expected_url = f"data:{mime_type};base64,{expected_b64}"
        assert image_content["image_url"]["url"] == expected_url
        
        # Check text content
        text_content = message.content[1]
        assert text_content["type"] == "text"
        assert text_content["text"] == question

    @pytest.mark.asyncio
    async def test_query_vision_model_with_ainvoke(self):
        """Test vision model query with async invoke."""
        mock_llm = AsyncMock()
        mock_response = Mock()
        mock_response.content = "I see a beautiful sunset over the ocean."
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        
        tool = ImageParserTool(llm=mock_llm)
        message = HumanMessage(content="test")
        
        result = await tool._query_vision_model(message)
        
        assert result == "I see a beautiful sunset over the ocean."
        mock_llm.ainvoke.assert_called_once_with([message])

    @pytest.mark.asyncio
    async def test_query_vision_model_fallback_to_sync(self):
        """Test vision model query falling back to sync invoke."""
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = "I see a mountain landscape."
        mock_llm.invoke = Mock(return_value=mock_response)
        # Remove ainvoke to force fallback
        if hasattr(mock_llm, 'ainvoke'):
            delattr(mock_llm, 'ainvoke')
        
        tool = ImageParserTool(llm=mock_llm)
        message = HumanMessage(content="test")
        
        with patch('asyncio.get_event_loop') as mock_get_loop:
            mock_loop = AsyncMock()
            mock_loop.run_in_executor = AsyncMock(return_value=mock_response)
            mock_get_loop.return_value = mock_loop
            
            result = await tool._query_vision_model(message)
            
            assert result == "I see a mountain landscape."
            mock_loop.run_in_executor.assert_called_once_with(None, mock_llm.invoke, [message])

    @pytest.mark.asyncio
    async def test_query_vision_model_error(self):
        """Test handling of vision model query errors."""
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("Model API error"))
        
        tool = ImageParserTool(llm=mock_llm)
        message = HumanMessage(content="test")
        
        with pytest.raises(ValueError, match="Failed to get response from vision model"):
            await tool._query_vision_model(message)


class TestErrorHandling:
    """Test error handling scenarios."""

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_empty_image_url(self, mock_create_llm):
        """Test handling of empty image URL."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        result = await tool._arun("", "What do you see?")
        assert "Error: No image URL provided" in result

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_empty_question(self, mock_create_llm):
        """Test handling of empty question."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        result = await tool._arun("https://example.com/image.jpg", "")
        assert "Error: No question provided" in result

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_download_failure_handling(self, mock_create_llm):
        """Test handling of download failures in main flow."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        with patch.object(tool, '_download_and_validate_image', 
                         AsyncMock(side_effect=ValueError("Download failed"))):
            result = await tool._arun("https://example.com/image.jpg", "What do you see?")
            assert "Analysis failed: Download failed" in result

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_vision_model_failure_handling(self, mock_create_llm):
        """Test handling of vision model failures in main flow."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        with patch.object(tool, '_download_and_validate_image',
                         AsyncMock(return_value=(b"fake-data", "image/jpeg"))):
            with patch.object(tool, '_query_vision_model',
                             AsyncMock(side_effect=ValueError("Model failed"))):
                result = await tool._arun("https://example.com/image.jpg", "What do you see?")
                assert "Analysis failed: Model failed" in result

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_sync_run_method(self, mock_create_llm):
        """Test the synchronous _run method wrapper."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        async def mock_arun(image_url, question):
            return "Analysis complete"
        
        with patch.object(tool, '_arun', mock_arun):
            result = tool._run("https://example.com/image.jpg", "What do you see?")
            assert result == "Analysis complete"

    @pytest.mark.asyncio
    @patch.object(ImageParserTool, "_create_default_llm")
    async def test_full_successful_flow(self, mock_create_llm):
        """Test complete successful analysis flow."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()
        
        # Mock successful download
        image_data = b"fake-image-data"
        with patch.object(tool, '_download_and_validate_image',
                         AsyncMock(return_value=(image_data, "image/jpeg"))):
            # Mock successful vision model response
            with patch.object(tool, '_query_vision_model',
                             AsyncMock(return_value="I see a beautiful landscape with mountains.")):
                result = await tool._arun(
                    "https://example.com/image.jpg",
                    "What do you see in this image?"
                )
                assert result == "I see a beautiful landscape with mountains."