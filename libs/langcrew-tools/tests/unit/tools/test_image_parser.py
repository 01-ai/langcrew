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
            question="What do you see in this image?",
        )
        assert input_model.image_url == "https://example.com/image.jpg"
        assert input_model.question == "What do you see in this image?"

    def test_field_validation(self):
        """Test field validation."""
        with pytest.raises(ValueError):
            ImageParserInput(question="What do you see?")  # Missing image_url

        with pytest.raises(ValueError):
            ImageParserInput(
                image_url="https://example.com/image.jpg"
            )  # Missing question


class TestImageParserConfig:
    """Test ImageParserConfig configuration management."""

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
        object.__setattr__(tool_instance, "config", config)

        # Mock the dynamic import of ChatOpenAI
        mock_llm = Mock()
        with patch(
            "langchain_openai.ChatOpenAI", return_value=mock_llm
        ) as mock_chat_openai:
            result = tool_instance._create_default_llm()

            assert result == mock_llm
            mock_chat_openai.assert_called_once_with(
                model="gpt-4o",
                temperature=0.0,
                max_tokens=4096,
                request_timeout=60,
                api_key="test-key",
                base_url="https://api.test.com",
            )

    def test_create_default_llm_import_error(self):
        """Test handling of import error when creating default LLM."""
        tool_instance = ImageParserTool.__new__(ImageParserTool)
        object.__setattr__(tool_instance, "config", ImageParserConfig())

        # Mock the import to raise ImportError
        with patch(
            "langchain_openai.ChatOpenAI",
            side_effect=ImportError("No module named 'langchain_openai'"),
        ):
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

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_validate_content_type_with_header(self, mock_create_llm):
        """Test content type validation with proper header."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()

        mime_type = tool._validate_content_type(
            "image/png", "https://example.com/test.jpg"
        )
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
            tool._validate_content_type(
                "image/unsupported", "https://example.com/test.xyz"
            )


class TestVisionModelIntegration:
    """Test vision model integration functionality."""

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
        if hasattr(mock_llm, "ainvoke"):
            delattr(mock_llm, "ainvoke")

        tool = ImageParserTool(llm=mock_llm)
        message = HumanMessage(content="test")

        with patch("asyncio.get_event_loop") as mock_get_loop:
            mock_loop = AsyncMock()
            mock_loop.run_in_executor = AsyncMock(return_value=mock_response)
            mock_get_loop.return_value = mock_loop

            result = await tool._query_vision_model(message)

            assert result == "I see a mountain landscape."
            mock_loop.run_in_executor.assert_called_once_with(
                None, mock_llm.invoke, [message]
            )

    @pytest.mark.asyncio
    async def test_query_vision_model_error(self):
        """Test handling of vision model query errors."""
        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("Model API error"))

        tool = ImageParserTool(llm=mock_llm)
        message = HumanMessage(content="test")

        with pytest.raises(
            ValueError, match="Failed to get response from vision model"
        ):
            await tool._query_vision_model(message)


class TestErrorHandling:
    """Test error handling scenarios."""

    @patch.object(ImageParserTool, "_create_default_llm")
    def test_sync_run_method(self, mock_create_llm):
        """Test that the synchronous _run method raises NotImplementedError."""
        mock_create_llm.return_value = Mock()
        tool = ImageParserTool()

        # Source code raises NotImplementedError for sync execution
        with pytest.raises(
            NotImplementedError, match="image_parser only supports async execution"
        ):
            tool._run("https://example.com/image.jpg", "What do you see?")
